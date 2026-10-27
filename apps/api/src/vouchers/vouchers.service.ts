import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { and, desc, eq, gt, isNull, lte, or, sql } from 'drizzle-orm';
import { NeonHttpDatabase } from 'drizzle-orm/neon-http';
import type { CustomerVoucher } from '@food-delivery/types';
import * as schema from '../db/schema';
import { CreateVoucherDto } from './dto/voucher.dto';

// Stripe không thu được dưới $0.50 → luôn để lại tối thiểu số này
const MIN_CHARGE = 0.5;

// Đơn được tính là đã dùng voucher: đã thanh toán, hoặc đang chờ thanh toán
// trong 30 phút (giữ chỗ). Đơn bị huỷ/bỏ dở quá lâu sẽ trả lại lượt dùng.
const COUNTS_AS_USED = sql.raw(
  `("orders"."status" in ('CONFIRMED','PREPARING','READY','PICKED_UP','DELIVERED')
    or ("orders"."status" = 'PENDING' and "orders"."created_at" > now() - interval '30 minutes'))`,
);

const round2 = (n: number) => Math.round(n * 100) / 100;

/** Số tiền được giảm cho một tạm tính (chưa xét điều kiện áp dụng). */
export function computeDiscount(voucher: schema.Voucher, subtotal: number) {
  const value = Number(voucher.discountValue);
  let discount =
    voucher.discountType === 'PERCENT' ? (subtotal * value) / 100 : value;
  if (voucher.discountType === 'PERCENT' && voucher.maxDiscount != null) {
    discount = Math.min(discount, Number(voucher.maxDiscount));
  }
  return round2(Math.max(0, Math.min(discount, subtotal - MIN_CHARGE)));
}

/** "20%" hoặc "$5.00" — dùng trong thông báo cho khách. */
export function discountLabel(voucher: schema.Voucher) {
  return voucher.discountType === 'PERCENT'
    ? `${Number(voucher.discountValue)}%`
    : `$${Number(voucher.discountValue).toFixed(2)}`;
}

@Injectable()
export class VouchersService {
  constructor(@Inject('DB') private db: NeonHttpDatabase<typeof schema>) {}

  // Voucher đang trong thời gian hiệu lực và được bật
  private runningFilter() {
    const { vouchers } = schema;
    const now = new Date();
    return and(
      eq(vouchers.isActive, true),
      lte(vouchers.startsAt, now),
      or(isNull(vouchers.expiresAt), gt(vouchers.expiresAt, now)),
    );
  }

  private usedCount() {
    return sql<number>`(select count(*) from "orders" where "orders"."voucher_id" = "vouchers"."id" and ${COUNTS_AS_USED})`.mapWith(
      Number,
    );
  }

  private usedByUser(userId: string) {
    return sql<number>`(select count(*) from "orders" where "orders"."voucher_id" = "vouchers"."id" and "orders"."customer_id" = ${userId} and ${COUNTS_AS_USED})`.mapWith(
      Number,
    );
  }

  // ===== Khách hàng =====

  /** Voucher đang chạy kèm số tiền giảm cho tạm tính; voucher tốt nhất đứng đầu. */
  async listForCustomer(userId: string, subtotal: number) {
    const rows = await this.db
      .select({
        voucher: schema.vouchers,
        usedCount: this.usedCount(),
        usedByMe: this.usedByUser(userId),
      })
      .from(schema.vouchers)
      .where(this.runningFilter())
      .orderBy(desc(schema.vouchers.createdAt));

    const vouchers: CustomerVoucher[] = rows.map(
      ({ voucher, usedCount, usedByMe }) => {
        const reason = this.ineligibleReason(
          voucher,
          subtotal,
          usedCount,
          usedByMe,
        );
        return {
          ...this.serialize(voucher),
          eligible: reason === null,
          reason,
          discount: reason === null ? computeDiscount(voucher, subtotal) : 0,
          usedByMe,
        };
      },
    );

    vouchers.sort(
      (a, b) =>
        Number(b.eligible) - Number(a.eligible) || b.discount - a.discount,
    );
    const best = vouchers.find((v) => v.eligible && v.discount > 0);

    return { vouchers, bestVoucherId: best?.id ?? null };
  }

  /** Voucher mới nhất đang chạy — app khách dùng để hiện thông báo. */
  async latest() {
    const [voucher] = await this.db
      .select()
      .from(schema.vouchers)
      .where(this.runningFilter())
      .orderBy(desc(schema.vouchers.createdAt))
      .limit(1);

    if (!voucher) return null;
    return {
      id: voucher.id,
      code: voucher.code,
      title: voucher.title,
      discountLabel: discountLabel(voucher),
      minOrderAmount: Number(voucher.minOrderAmount),
    };
  }

  /** Kiểm tra lại voucher ở server khi tạo đơn; trả về số tiền giảm. */
  async applyToOrder(userId: string, voucherId: string, subtotal: number) {
    const [row] = await this.db
      .select({
        voucher: schema.vouchers,
        usedCount: this.usedCount(),
        usedByMe: this.usedByUser(userId),
      })
      .from(schema.vouchers)
      .where(and(eq(schema.vouchers.id, voucherId), this.runningFilter()));

    if (!row) {
      throw new BadRequestException('Voucher không tồn tại hoặc đã hết hạn');
    }

    const reason = this.ineligibleReason(
      row.voucher,
      subtotal,
      row.usedCount,
      row.usedByMe,
    );
    if (reason) throw new BadRequestException(reason);

    return {
      voucher: row.voucher,
      discount: computeDiscount(row.voucher, subtotal),
    };
  }

  private ineligibleReason(
    voucher: schema.Voucher,
    subtotal: number,
    usedCount: number,
    usedByMe: number,
  ) {
    if (voucher.usageLimit != null && usedCount >= voucher.usageLimit) {
      return 'Voucher đã hết lượt sử dụng';
    }
    if (usedByMe >= voucher.perUserLimit) {
      return 'Bạn đã dùng hết lượt của voucher này';
    }
    const minOrder = Number(voucher.minOrderAmount);
    if (subtotal < minOrder) {
      return `Đơn tối thiểu $${minOrder.toFixed(2)}`;
    }
    return null;
  }

  // ===== Admin =====

  async listAll() {
    const rows = await this.db
      .select({ voucher: schema.vouchers, usedCount: this.usedCount() })
      .from(schema.vouchers)
      .orderBy(desc(schema.vouchers.createdAt));

    const now = Date.now();
    return rows.map(({ voucher, usedCount }) => ({
      ...this.serialize(voucher),
      usedCount,
      isExpired:
        voucher.expiresAt != null && voucher.expiresAt.getTime() <= now,
    }));
  }

  async create(adminId: string, dto: CreateVoucherDto) {
    if (dto.discountType === 'PERCENT' && dto.discountValue > 100) {
      throw new BadRequestException('Percent discount cannot exceed 100');
    }
    if (dto.expiresAt && new Date(dto.expiresAt).getTime() <= Date.now()) {
      throw new BadRequestException('expiresAt must be in the future');
    }

    const [existing] = await this.db
      .select({ id: schema.vouchers.id })
      .from(schema.vouchers)
      .where(eq(schema.vouchers.code, dto.code));
    if (existing) throw new ConflictException('Voucher code already exists');

    const [voucher] = await this.db
      .insert(schema.vouchers)
      .values({
        code: dto.code,
        title: dto.title.trim(),
        description: dto.description?.trim() || null,
        discountType: dto.discountType,
        discountValue: dto.discountValue.toFixed(2),
        maxDiscount:
          dto.discountType === 'PERCENT' && dto.maxDiscount != null
            ? dto.maxDiscount.toFixed(2)
            : null,
        minOrderAmount: (dto.minOrderAmount ?? 0).toFixed(2),
        expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : null,
        usageLimit: dto.usageLimit ?? null,
        perUserLimit: dto.perUserLimit ?? 1,
        createdBy: adminId,
      })
      .returning();

    return { ...this.serialize(voucher), usedCount: 0, isExpired: false };
  }

  async setActive(id: string, isActive: boolean) {
    const [voucher] = await this.db
      .update(schema.vouchers)
      .set({ isActive, updatedAt: new Date() })
      .where(eq(schema.vouchers.id, id))
      .returning();
    if (!voucher) throw new NotFoundException('Voucher not found');
    return this.serialize(voucher);
  }

  private serialize(voucher: schema.Voucher) {
    const { createdBy, updatedAt, ...rest } = voucher;
    void createdBy;
    void updatedAt;
    return {
      ...rest,
      startsAt: voucher.startsAt.toISOString(),
      expiresAt: voucher.expiresAt?.toISOString() ?? null,
      createdAt: voucher.createdAt.toISOString(),
    };
  }
}
