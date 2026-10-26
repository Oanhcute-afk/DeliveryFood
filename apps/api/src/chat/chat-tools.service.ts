import { Inject, Injectable } from '@nestjs/common';
import { and, desc, eq, gte, ilike, inArray, lte, or, sql } from 'drizzle-orm';
import { NeonHttpDatabase } from 'drizzle-orm/neon-http';
import * as schema from '../db/schema';
import { VouchersService } from '../vouchers/vouchers.service';
import type { ChatLocationDto } from './dto/chat.dto';

const PAID = [
  'CONFIRMED',
  'PREPARING',
  'READY',
  'PICKED_UP',
  'DELIVERED',
] as const;

/** Thẻ món/nhà hàng app hiển thị dưới câu trả lời để khách bấm vào */
export interface ChatCard {
  type: 'item' | 'restaurant';
  id: string;
  restaurantId: string;
  name: string;
  restaurantName: string;
  price: number | null;
  imageUrl: string | null;
  rating: number | null;
  isOpen: boolean;
}

export interface ToolContext {
  userId: string;
  location?: ChatLocationDto;
  cards: Map<string, ChatCard>;
}

const clampLimit = (n: unknown, fallback = 5) =>
  Math.min(Math.max(Number(n) || fallback, 1), 10);

@Injectable()
export class ChatToolsService {
  constructor(
    @Inject('DB') private db: NeonHttpDatabase<typeof schema>,
    private vouchersService: VouchersService,
  ) {}

  /** Khai báo hàm cho Gemini (JSON Schema) */
  readonly declarations = [
    {
      name: 'get_best_sellers',
      description:
        'Các món bán chạy nhất trong app (theo tổng số phần đã bán của đơn đã thanh toán trong N ngày gần nhất).',
      parametersJsonSchema: {
        type: 'object',
        properties: {
          limit: { type: 'integer', description: 'Số món, 1-10' },
          days: {
            type: 'integer',
            description: 'Số ngày gần nhất, mặc định 30',
          },
        },
      },
    },
    {
      name: 'get_top_rated_restaurants',
      description:
        'Nhà hàng được khách đánh giá cao nhất (điểm sao trung bình và số lượt đánh giá), kèm vài món nổi bật.',
      parametersJsonSchema: {
        type: 'object',
        properties: {
          limit: { type: 'integer', description: 'Số nhà hàng, 1-10' },
        },
      },
    },
    {
      name: 'find_restaurants_near_customer',
      description:
        'Tìm nhà hàng có địa chỉ cùng khu vực với khách (so khớp tên đường/phường/quận/thành phố). Dùng khi khách hỏi quán gần, quanh đây, gần nhà.',
      parametersJsonSchema: {
        type: 'object',
        properties: {
          area: {
            type: 'string',
            description:
              'Tên khu vực khách nói tới (VD "Quận 1", "Cầu Giấy"). Bỏ trống để dùng vị trí hiện tại của khách.',
          },
          limit: { type: 'integer' },
        },
      },
    },
    {
      name: 'search_menu',
      description:
        'Tìm món theo tên, mô tả, loại ẩm thực hoặc tên nhà hàng; có thể lọc giá tối đa (USD).',
      parametersJsonSchema: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'VD: "phở", "gà rán", "chay"' },
          max_price: { type: 'number' },
          limit: { type: 'integer' },
        },
        required: ['query'],
      },
    },
    {
      name: 'get_available_vouchers',
      description:
        'Voucher giảm giá đang chạy mà khách có thể dùng khi thanh toán.',
      parametersJsonSchema: { type: 'object', properties: {} },
    },
  ];

  async run(name: string, args: Record<string, unknown>, ctx: ToolContext) {
    switch (name) {
      case 'get_best_sellers':
        return this.bestSellers(
          clampLimit(args.limit),
          Number(args.days) || 30,
          ctx,
        );
      case 'get_top_rated_restaurants':
        return this.topRated(clampLimit(args.limit), ctx);
      case 'find_restaurants_near_customer':
        return this.nearby(
          typeof args.area === 'string' ? args.area : undefined,
          clampLimit(args.limit),
          ctx,
        );
      case 'search_menu':
        return this.searchMenu(
          typeof args.query === 'string' ? args.query : '',
          args.max_price != null ? Number(args.max_price) : undefined,
          clampLimit(args.limit, 8),
          ctx,
        );
      case 'get_available_vouchers':
        return this.vouchers(ctx);
      default:
        return { error: `Unknown tool ${name}` };
    }
  }

  private async bestSellers(limit: number, days: number, ctx: ToolContext) {
    const { menuItems, orderItems, orders, restaurants } = schema;
    const since = new Date(Date.now() - Math.min(days, 365) * 86_400_000);
    const sold = sql<number>`sum(${orderItems.quantity}::numeric)`.mapWith(
      Number,
    );

    const rows = await this.db
      .select({
        id: menuItems.id,
        name: menuItems.name,
        description: menuItems.description,
        price: menuItems.price,
        imageUrl: menuItems.imageUrl,
        isAvailable: menuItems.isAvailable,
        restaurantId: restaurants.id,
        restaurantName: restaurants.name,
        isOpen: restaurants.isOpen,
        rating: restaurants.rating,
        sold,
      })
      .from(orderItems)
      .innerJoin(orders, eq(orders.id, orderItems.orderId))
      .innerJoin(menuItems, eq(menuItems.id, orderItems.menuItemId))
      .innerJoin(restaurants, eq(restaurants.id, menuItems.restaurantId))
      .where(
        and(inArray(orders.status, [...PAID]), gte(orders.createdAt, since)),
      )
      .groupBy(menuItems.id, restaurants.id)
      .orderBy(desc(sold))
      .limit(limit);

    rows.forEach((r) => this.addItemCard(ctx, r));
    return {
      period_days: days,
      items: rows.map((r) => ({
        name: r.name,
        restaurant: r.restaurantName,
        price_usd: Number(r.price),
        sold_portions: r.sold,
        available: r.isAvailable && r.isOpen,
        description: r.description,
      })),
    };
  }

  private async topRated(limit: number, ctx: ToolContext) {
    const { restaurants, reviews } = schema;
    const avg = sql<number>`avg(${reviews.restaurantRating})`.mapWith(Number);
    const reviewCount = sql<number>`count(${reviews.id})`.mapWith(Number);

    const rows = await this.db
      .select({
        id: restaurants.id,
        name: restaurants.name,
        cuisineType: restaurants.cuisineType,
        address: restaurants.address,
        imageUrl: restaurants.imageUrl,
        isOpen: restaurants.isOpen,
        avg,
        reviewCount,
      })
      .from(restaurants)
      .innerJoin(reviews, eq(reviews.restaurantId, restaurants.id))
      .groupBy(restaurants.id)
      .orderBy(desc(avg), desc(reviewCount))
      .limit(limit);

    const highlights = await this.highlightItems(rows.map((r) => r.id));
    rows.forEach((r) => this.addRestaurantCard(ctx, { ...r, rating: r.avg }));

    return {
      restaurants: rows.map((r) => ({
        name: r.name,
        cuisine: r.cuisineType,
        address: r.address,
        average_rating: Math.round(r.avg * 10) / 10,
        review_count: r.reviewCount,
        open_now: r.isOpen,
        popular_items: highlights.get(r.id) ?? [],
      })),
    };
  }

  private async nearby(
    area: string | undefined,
    limit: number,
    ctx: ToolContext,
  ) {
    const loc = ctx.location;
    // Từ cụ thể → chung: tên đường, phường/quận, thành phố
    const terms = (
      area
        ? [area]
        : [loc?.street, loc?.district, loc?.subregion, loc?.city, loc?.region]
    )
      .map((t) => t?.trim())
      .filter((t): t is string => !!t && t.length >= 2);

    if (terms.length === 0) {
      return {
        error:
          'Chưa biết vị trí của khách. Hãy nhờ khách bật vị trí (nút 📍) hoặc cho biết quận/khu vực.',
      };
    }

    const { restaurants } = schema;
    for (const term of terms) {
      const rows = await this.db
        .select()
        .from(restaurants)
        .where(ilike(restaurants.address, `%${term}%`))
        .orderBy(desc(restaurants.isOpen), desc(restaurants.rating))
        .limit(limit);

      if (rows.length) {
        const highlights = await this.highlightItems(rows.map((r) => r.id));
        rows.forEach((r) =>
          this.addRestaurantCard(ctx, { ...r, rating: Number(r.rating ?? 0) }),
        );
        return {
          matched_area: term,
          note: 'So khớp theo địa chỉ, không phải khoảng cách GPS chính xác.',
          restaurants: rows.map((r) => ({
            name: r.name,
            cuisine: r.cuisineType,
            address: r.address,
            rating: Number(r.rating ?? 0),
            open_now: r.isOpen,
            popular_items: highlights.get(r.id) ?? [],
          })),
        };
      }
    }
    return { matched_area: null, restaurants: [], searched: terms };
  }

  private async searchMenu(
    query: string,
    maxPrice: number | undefined,
    limit: number,
    ctx: ToolContext,
  ) {
    const { menuItems, restaurants } = schema;
    const q = `%${query.trim()}%`;
    const rows = await this.db
      .select({
        id: menuItems.id,
        name: menuItems.name,
        description: menuItems.description,
        price: menuItems.price,
        imageUrl: menuItems.imageUrl,
        isAvailable: menuItems.isAvailable,
        restaurantId: restaurants.id,
        restaurantName: restaurants.name,
        isOpen: restaurants.isOpen,
        rating: restaurants.rating,
      })
      .from(menuItems)
      .innerJoin(restaurants, eq(restaurants.id, menuItems.restaurantId))
      .where(
        and(
          or(
            ilike(menuItems.name, q),
            ilike(menuItems.description, q),
            ilike(restaurants.cuisineType, q),
            ilike(restaurants.name, q),
          ),
          maxPrice != null && Number.isFinite(maxPrice)
            ? lte(menuItems.price, maxPrice.toFixed(2))
            : undefined,
        ),
      )
      .orderBy(
        desc(menuItems.isAvailable),
        desc(restaurants.isOpen),
        desc(restaurants.rating),
      )
      .limit(limit);

    rows.forEach((r) => this.addItemCard(ctx, r));
    return {
      items: rows.map((r) => ({
        name: r.name,
        restaurant: r.restaurantName,
        price_usd: Number(r.price),
        restaurant_rating: Number(r.rating ?? 0),
        available: r.isAvailable && r.isOpen,
        description: r.description,
      })),
    };
  }

  private async vouchers(ctx: ToolContext) {
    const { vouchers } = await this.vouchersService.listForCustomer(
      ctx.userId,
      0,
    );
    return {
      vouchers: vouchers
        .filter((v) => v.reason !== 'Bạn đã dùng hết lượt của voucher này')
        .map((v) => ({
          code: v.code,
          title: v.title,
          discount:
            v.discountType === 'PERCENT'
              ? `${Number(v.discountValue)}%` +
                (v.maxDiscount ? ` (tối đa $${Number(v.maxDiscount)})` : '')
              : `$${Number(v.discountValue)}`,
          min_order_usd: Number(v.minOrderAmount),
          expires_at: v.expiresAt,
        })),
      note: 'App tự áp dụng voucher tốt nhất khi thanh toán.',
    };
  }

  // 3 món nổi bật (bán chạy nhất, nếu chưa bán thì món mới) của mỗi nhà hàng
  private async highlightItems(restaurantIds: string[]) {
    const map = new Map<string, { name: string; price_usd: number }[]>();
    if (!restaurantIds.length) return map;
    const { menuItems } = schema;
    const sold = sql<number>`(select coalesce(sum("order_items"."quantity"::numeric), 0) from "order_items" where "order_items"."menu_item_id" = "menu_items"."id")`;
    const rows = await this.db
      .select({
        restaurantId: menuItems.restaurantId,
        name: menuItems.name,
        price: menuItems.price,
      })
      .from(menuItems)
      .where(
        and(
          inArray(menuItems.restaurantId, restaurantIds),
          eq(menuItems.isAvailable, true),
        ),
      )
      .orderBy(desc(sold), desc(menuItems.createdAt));

    for (const r of rows) {
      const list = map.get(r.restaurantId) ?? [];
      if (list.length < 3)
        list.push({ name: r.name, price_usd: Number(r.price) });
      map.set(r.restaurantId, list);
    }
    return map;
  }

  private addItemCard(
    ctx: ToolContext,
    r: {
      id: string;
      name: string;
      price: string;
      imageUrl: string | null;
      restaurantId: string;
      restaurantName: string;
      isOpen: boolean;
      rating: string | null;
    },
  ) {
    ctx.cards.set(r.id, {
      type: 'item',
      id: r.id,
      restaurantId: r.restaurantId,
      name: r.name,
      restaurantName: r.restaurantName,
      price: Number(r.price),
      imageUrl: r.imageUrl,
      rating: r.rating != null ? Number(r.rating) : null,
      isOpen: r.isOpen,
    });
  }

  private addRestaurantCard(
    ctx: ToolContext,
    r: {
      id: string;
      name: string;
      imageUrl: string | null;
      isOpen: boolean;
      rating: number;
    },
  ) {
    ctx.cards.set(r.id, {
      type: 'restaurant',
      id: r.id,
      restaurantId: r.id,
      name: r.name,
      restaurantName: r.name,
      price: null,
      imageUrl: r.imageUrl,
      rating: Math.round(r.rating * 10) / 10,
      isOpen: r.isOpen,
    });
  }
}
