import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { eq, and } from 'drizzle-orm';
import { NeonHttpDatabase } from 'drizzle-orm/neon-http';

import * as schema from '../db/schema';

import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { CreateMenuItemDto } from './dto/create-menu-item.dto';
import { UpdateMenuItemDto } from './dto/update-menu-item.dto';

import { CacheService } from '../cache/cache.service';
import { CacheKeys } from '../cache/cache-keys';

@Injectable()
export class MenuService {
  private readonly logger = new Logger(MenuService.name);

  constructor(
    @Inject('DB')
    private readonly db: NeonHttpDatabase<typeof schema>,
    private readonly cacheService: CacheService,
  ) {}

  // ==========================================
  // CACHE
  // ==========================================

  /**
   * Xóa cache danh mục và món ăn của nhà hàng.
   * Gọi hàm này sau mỗi thao tác thay đổi dữ liệu.
   */
  private async invalidateMenuCache(restaurantId: string): Promise<void> {
    try {
      await this.cacheService.del(
        CacheKeys.MENU_CATEGORIES(restaurantId),
        CacheKeys.MENU_ITEMS(restaurantId),
      );

      this.logger.log(
        `Menu cache invalidated for restaurant ${restaurantId}`,
      );
    } catch (error) {
      // Cache lỗi không nên làm mất kết quả của thao tác database đã thành công.
      this.logger.error(
        `Failed to invalidate menu cache for restaurant ${restaurantId}`,
        error instanceof Error ? error.stack : String(error),
      );
    }
  }

  // ==========================================
  // RESTAURANT
  // ==========================================

  /**
   * Lấy nhà hàng thuộc về chủ nhà hàng đang đăng nhập.
   */
  private async getRestaurantByOwner(ownerId: string) {
    const [restaurant] = await this.db
      .select()
      .from(schema.restaurants)
      .where(eq(schema.restaurants.ownerId, ownerId))
      .limit(1);

    if (!restaurant) {
      throw new NotFoundException('Create a restaurant first');
    }

    return restaurant;
  }

  /**
   * Kiểm tra danh mục có tồn tại và thuộc nhà hàng hay không.
   */
  private async getCategoryById(
    categoryId: string,
    restaurantId: string,
  ) {
    const [category] = await this.db
      .select()
      .from(schema.menuCategories)
      .where(
        and(
          eq(schema.menuCategories.id, categoryId),
          eq(schema.menuCategories.restaurantId, restaurantId),
        ),
      )
      .limit(1);

    if (!category) {
      throw new BadRequestException(
        'Category does not exist or does not belong to your restaurant',
      );
    }

    return category;
  }

  // ==========================================
  // CATEGORIES
  // ==========================================

  /**
   * Tạo danh mục món ăn.
   */
  async createCategory(ownerId: string, dto: CreateCategoryDto) {
    const restaurant = await this.getRestaurantByOwner(ownerId);

    const [category] = await this.db
      .insert(schema.menuCategories)
      .values({
        restaurantId: restaurant.id,
        name: dto.name,
      })
      .returning();

    await this.invalidateMenuCache(restaurant.id);

    return category;
  }

  /**
   * Lấy danh sách danh mục của nhà hàng.
   */
  /**
   * Lấy tất cả danh mục do các nhà hàng tạo ra trên toàn hệ thống,
   * gộp theo tên danh mục, kèm danh sách nhà hàng và số lượng món ăn khả dụng.
   */
  async getAllPublicCategories() {
    const categories = await this.db
      .select({
        id: schema.menuCategories.id,
        name: schema.menuCategories.name,
        restaurantId: schema.menuCategories.restaurantId,
        isOpen: schema.restaurants.isOpen,
      })
      .from(schema.menuCategories)
      .innerJoin(
        schema.restaurants,
        eq(schema.menuCategories.restaurantId, schema.restaurants.id),
      );

    const items = await this.db
      .select({
        id: schema.menuItems.id,
        categoryId: schema.menuItems.categoryId,
        restaurantId: schema.menuItems.restaurantId,
        isAvailable: schema.menuItems.isAvailable,
      })
      .from(schema.menuItems);

    const countMap = new Map<string, { total: number; available: number }>();
    for (const item of items) {
      const c = countMap.get(item.categoryId) || { total: 0, available: 0 };
      c.total += 1;
      if (item.isAvailable) c.available += 1;
      countMap.set(item.categoryId, c);
    }

    const grouped = new Map<
      string,
      {
        name: string;
        categoryIds: string[];
        restaurantIds: Set<string>;
        totalItems: number;
        availableItems: number;
      }
    >();

    for (const cat of categories) {
      const trimmedName = (cat.name || '').trim();
      if (!trimmedName) continue;
      const key = trimmedName.toLowerCase();
      const counts = countMap.get(cat.id) || { total: 0, available: 0 };

      if (!grouped.has(key)) {
        grouped.set(key, {
          name: trimmedName,
          categoryIds: [],
          restaurantIds: new Set<string>(),
          totalItems: 0,
          availableItems: 0,
        });
      }

      const g = grouped.get(key)!;
      g.categoryIds.push(cat.id);
      if (cat.isOpen) {
        g.restaurantIds.add(cat.restaurantId);
      }
      g.totalItems += counts.total;
      g.availableItems += counts.available;
    }

    return Array.from(grouped.values()).map((g) => ({
      id: g.name,
      name: g.name,
      restaurantIds: Array.from(g.restaurantIds),
      categoryIds: g.categoryIds,
      totalItems: g.totalItems,
      availableItems: g.availableItems,
      hasProducts: g.availableItems > 0,
    }));
  }

  async getCategories(restaurantId: string) {
    const cacheKey = CacheKeys.MENU_CATEGORIES(restaurantId);

    const cached = await this.cacheService.get<
      (typeof schema.menuCategories.$inferSelect)[]
    >(cacheKey);

    if (cached !== null && cached !== undefined) {
      this.logger.debug(
        `Returning categories for restaurant ${restaurantId} from cache`,
      );

      return cached;
    }

    const categories = await this.db
      .select()
      .from(schema.menuCategories)
      .where(eq(schema.menuCategories.restaurantId, restaurantId));

    await this.cacheService.set(cacheKey, categories, 300);

    return categories;
  }

  /**
   * Cập nhật danh mục.
   */
  async updateCategory(
    id: string,
    ownerId: string,
    dto: UpdateCategoryDto,
  ) {
    const restaurant = await this.getRestaurantByOwner(ownerId);

    const [category] = await this.db
      .select()
      .from(schema.menuCategories)
      .where(eq(schema.menuCategories.id, id))
      .limit(1);

    if (!category) {
      throw new NotFoundException('Category not found');
    }

    if (category.restaurantId !== restaurant.id) {
      throw new ForbiddenException(
        'This category does not belong to your restaurant',
      );
    }

    const [updated] = await this.db
      .update(schema.menuCategories)
      .set({
        ...dto,
      })
      .where(eq(schema.menuCategories.id, id))
      .returning();

    await this.invalidateMenuCache(restaurant.id);

    return updated;
  }

  /**
   * Xóa danh mục.
   */
  async deleteCategory(id: string, ownerId: string) {
    const restaurant = await this.getRestaurantByOwner(ownerId);

    const [category] = await this.db
      .select()
      .from(schema.menuCategories)
      .where(eq(schema.menuCategories.id, id))
      .limit(1);

    if (!category) {
      throw new NotFoundException('Category not found');
    }

    if (category.restaurantId !== restaurant.id) {
      throw new ForbiddenException(
        'This category does not belong to your restaurant',
      );
    }

    await this.db
      .delete(schema.menuCategories)
      .where(eq(schema.menuCategories.id, id));

    await this.invalidateMenuCache(restaurant.id);

    return {
      message: 'Category deleted',
    };
  }

  // ==========================================
  // MENU ITEMS
  // ==========================================

  /**
   * Tạo món ăn.
   */
  async createItem(ownerId: string, dto: CreateMenuItemDto) {
    const restaurant = await this.getRestaurantByOwner(ownerId);

    // Đảm bảo danh mục thuộc đúng nhà hàng.
    await this.getCategoryById(dto.categoryId, restaurant.id);

    const [item] = await this.db
      .insert(schema.menuItems)
      .values({
        restaurantId: restaurant.id,
        categoryId: dto.categoryId,
        name: dto.name,
        description: dto.description,
        price: dto.price,
        imageUrl: dto.imageUrl,
      })
      .returning();

    await this.invalidateMenuCache(restaurant.id);

    return item;
  }

  /**
   * Lấy tất cả món ăn của nhà hàng.
   * Frontend có thể nhóm các món theo categoryId.
   */
  async getItemsByRestaurant(restaurantId: string) {
    const cacheKey = CacheKeys.MENU_ITEMS(restaurantId);

    const cached = await this.cacheService.get<
      (typeof schema.menuItems.$inferSelect)[]
    >(cacheKey);

    if (cached !== null && cached !== undefined) {
      this.logger.debug(
        `Returning menu items for restaurant ${restaurantId} from cache`,
      );

      return cached;
    }

    const items = await this.db
      .select()
      .from(schema.menuItems)
      .where(eq(schema.menuItems.restaurantId, restaurantId));

    await this.cacheService.set(cacheKey, items, 300);

    return items;
  }

  /**
   * Cập nhật món ăn.
   */
  async updateItem(
    id: string,
    ownerId: string,
    dto: UpdateMenuItemDto,
  ) {
    const restaurant = await this.getRestaurantByOwner(ownerId);

    const [item] = await this.db
      .select()
      .from(schema.menuItems)
      .where(eq(schema.menuItems.id, id))
      .limit(1);

    if (!item) {
      throw new NotFoundException('Menu item not found');
    }

    if (item.restaurantId !== restaurant.id) {
      throw new ForbiddenException(
        'This item does not belong to your restaurant',
      );
    }

    // Nếu đổi danh mục, phải xác nhận danh mục mới thuộc nhà hàng.
    if (dto.categoryId && dto.categoryId !== item.categoryId) {
      await this.getCategoryById(dto.categoryId, restaurant.id);
    }

    const [updated] = await this.db
      .update(schema.menuItems)
      .set({
        ...dto,
        updatedAt: new Date(),
      })
      .where(eq(schema.menuItems.id, id))
      .returning();

    await this.invalidateMenuCache(restaurant.id);

    return updated;
  }

  /**
   * Xóa món ăn.
   */
  async deleteItem(id: string, ownerId: string) {
    const restaurant = await this.getRestaurantByOwner(ownerId);

    const [item] = await this.db
      .select()
      .from(schema.menuItems)
      .where(eq(schema.menuItems.id, id))
      .limit(1);

    if (!item) {
      throw new NotFoundException('Menu item not found');
    }

    if (item.restaurantId !== restaurant.id) {
      throw new ForbiddenException(
        'This item does not belong to your restaurant',
      );
    }

    await this.db
      .delete(schema.menuItems)
      .where(eq(schema.menuItems.id, id));

    await this.invalidateMenuCache(restaurant.id);

    return {
      message: 'Item deleted',
    };
  }
}