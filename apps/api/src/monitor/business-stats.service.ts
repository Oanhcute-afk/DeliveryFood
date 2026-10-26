import { Inject, Injectable, Logger } from '@nestjs/common';
import { and, count, eq, gte, inArray, isNotNull, sql, sum } from 'drizzle-orm';
import { NeonHttpDatabase } from 'drizzle-orm/neon-http';
import * as schema from '../db/schema';

// Đơn đã thanh toán (không tính PENDING chưa trả tiền và CANCELLED)
const PAID_STATUSES = [
  'CONFIRMED',
  'PREPARING',
  'READY',
  'PICKED_UP',
  'DELIVERED',
] as const;

const TIME_ZONE = 'Asia/Ho_Chi_Minh';

@Injectable()
export class BusinessStatsService {
  private readonly logger = new Logger(BusinessStatsService.name);

  constructor(@Inject('DB') private db: NeonHttpDatabase<typeof schema>) {}

  async getStats() {
    const { users, orders, restaurants } = schema;
    const dayAgo = new Date(Date.now() - 24 * 3600 * 1000);
    const weekAgo = new Date(Date.now() - 7 * 24 * 3600 * 1000);
    const paid = inArray(orders.status, [...PAID_STATUSES]);

    try {
      const [
        usersByRole,
        [newUsers],
        [driversOnline],
        [restaurantStats],
        ordersByStatus,
        [orders24h],
        [orders7d],
        ordersPerDay,
      ] = await Promise.all([
        this.db
          .select({ role: users.role, count: count() })
          .from(users)
          .groupBy(users.role),
        this.db
          .select({ count: count() })
          .from(users)
          .where(gte(users.createdAt, dayAgo)),
        this.db
          .select({ count: count() })
          .from(users)
          .where(and(eq(users.role, 'DRIVER'), eq(users.isOnline, true))),
        this.db
          .select({
            total: count(),
            open: sql<number>`count(*) filter (where ${restaurants.isOpen})`.mapWith(
              Number,
            ),
          })
          .from(restaurants),
        this.db
          .select({ status: orders.status, count: count() })
          .from(orders)
          .groupBy(orders.status),
        this.db
          .select({
            count: count(),
            revenue: sum(orders.totalAmount),
            voucherCost: sum(orders.discountAmount),
          })
          .from(orders)
          .where(and(paid, gte(orders.createdAt, dayAgo))),
        this.db
          .select({
            count: count(),
            revenue: sum(orders.totalAmount),
            voucherCost: sum(orders.discountAmount),
          })
          .from(orders)
          .where(and(paid, gte(orders.createdAt, weekAgo))),
        this.db
          .select({
            day: sql<string>`to_char(date_trunc('day', ${orders.createdAt} at time zone 'UTC' at time zone ${TIME_ZONE}), 'YYYY-MM-DD')`,
            count: count(),
          })
          .from(orders)
          .where(gte(orders.createdAt, weekAgo))
          .groupBy(sql`1`),
      ]);

      return {
        ok: true as const,
        users: {
          total: usersByRole.reduce((a, r) => a + r.count, 0),
          byRole: Object.fromEntries(usersByRole.map((r) => [r.role, r.count])),
          new24h: newUsers.count,
          googleLinked: await this.countGoogleUsers(),
        },
        driversOnline: driversOnline.count,
        restaurants: restaurantStats,
        orders: {
          byStatus: Object.fromEntries(
            ordersByStatus.map((r) => [r.status, r.count]),
          ),
          paid24h: orders24h.count,
          paid7d: orders7d.count,
          revenue24h: Number(orders24h.revenue ?? 0),
          revenue7d: Number(orders7d.revenue ?? 0),
          // Tiền voucher app bù cho nhà hàng (khách trả ít hơn, nhà hàng nhận đủ)
          voucherCost24h: Number(orders24h.voucherCost ?? 0),
          voucherCost7d: Number(orders7d.voucherCost ?? 0),
          perDay: this.fillDays(ordersPerDay),
        },
      };
    } catch (error) {
      this.logger.error('Failed to load business stats', error);
      return {
        ok: false as const,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  // Cột google_id chỉ có sau khi chạy migration Google login
  private async countGoogleUsers() {
    try {
      const [row] = await this.db
        .select({ count: count() })
        .from(schema.users)
        .where(isNotNull(schema.users.googleId));
      return row.count;
    } catch {
      return null;
    }
  }

  // 7 ngày gần nhất theo giờ Việt Nam, ngày không có đơn = 0
  private fillDays(rows: { day: string; count: number }[]) {
    const byDay = new Map(rows.map((r) => [r.day, r.count]));
    const formatter = new Intl.DateTimeFormat('en-CA', { timeZone: TIME_ZONE });
    return Array.from({ length: 7 }, (_, i) => {
      const day = formatter.format(
        new Date(Date.now() - (6 - i) * 24 * 3600 * 1000),
      );
      return { day, count: byDay.get(day) ?? 0 };
    });
  }
}
