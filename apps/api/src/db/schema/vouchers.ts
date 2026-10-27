import {
  boolean,
  integer,
  numeric,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core';
import { users } from './users';

export const voucherDiscountTypeEnum = pgEnum('voucher_discount_type', [
  'PERCENT', // giảm theo % tạm tính (có thể giới hạn bằng maxDiscount)
  'FIXED', // giảm số tiền cố định
]);

export const vouchers = pgTable('vouchers', {
  id: uuid('id').primaryKey().defaultRandom(),
  code: text('code').notNull().unique(),
  title: text('title').notNull(),
  description: text('description'),
  discountType: voucherDiscountTypeEnum('discount_type').notNull(),
  discountValue: numeric('discount_value', {
    precision: 10,
    scale: 2,
  }).notNull(),
  maxDiscount: numeric('max_discount', { precision: 10, scale: 2 }),
  minOrderAmount: numeric('min_order_amount', { precision: 10, scale: 2 })
    .default('0')
    .notNull(),
  startsAt: timestamp('starts_at').defaultNow().notNull(),
  expiresAt: timestamp('expires_at'),
  usageLimit: integer('usage_limit'), // null = không giới hạn tổng lượt
  perUserLimit: integer('per_user_limit').default(1).notNull(),
  isActive: boolean('is_active').default(true).notNull(),
  createdBy: uuid('created_by').references(() => users.id),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export type Voucher = typeof vouchers.$inferSelect;
export type NewVoucher = typeof vouchers.$inferInsert;
