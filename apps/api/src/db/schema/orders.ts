import {
  boolean,
  numeric,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core';
import { menuItems } from './menus';
import { restaurants } from './restaurants';
import { users } from './users';
import { vouchers } from './vouchers';

export const orderStatusEnum = pgEnum('order_status', [
  'PENDING', // placed, waiting for payment,
  'CONFIRMED', // payment confirmed by stripe webhook or cash on delivery
  'PREPARING', // restaurant accepted and is cooking
  'READY', // ready for driver pickup
  'PICKED_UP', // driver has picked up the item
  'DELIVERED', // order delivered to customer
  'CANCELLED', // cancelled at any stage
]);

export const orders = pgTable('orders', {
  id: uuid('id').primaryKey().defaultRandom(),
  customerId: uuid('customer_id')
    .notNull()
    .references(() => users.id),
  restaurantId: uuid('restaurant_id')
    .notNull()
    .references(() => restaurants.id),
  driverId: uuid('driver_id').references(() => users.id),
  status: orderStatusEnum('status').notNull().default('PENDING'),
  paymentMethod: text('payment_method').default('STRIPE').notNull(),
  isPaid: boolean('is_paid').default(false).notNull(),
  cashReceivedAt: timestamp('cash_received_at'),
  driverDeliveredAt: timestamp('driver_delivered_at'),
  customerConfirmedAt: timestamp('customer_confirmed_at'),
  // Số tiền khách trả (đã trừ voucher) — Stripe thu đúng số này hoặc thu tiền mặt
  totalAmount: numeric('total_amount', { precision: 10, scale: 2 }).notNull(),
  subtotalAmount: numeric('subtotal_amount', { precision: 10, scale: 2 }),
  discountAmount: numeric('discount_amount', { precision: 10, scale: 2 })
    .default('0')
    .notNull(),
  voucherId: uuid('voucher_id').references(() => vouchers.id),
  voucherCode: text('voucher_code'),
  cancelReason: text('cancel_reason'),
  deliveryAddress: text('delivery_address').notNull(),
  stripePaymentIntentId: text('stripe_payment_intent_id'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const orderItems = pgTable('order_items', {
  id: uuid('id').primaryKey().defaultRandom(),
  orderId: uuid('order_id')
    .notNull()
    .references(() => orders.id, { onDelete: 'cascade' }),
  menuItemId: uuid('menu_item_id')
    .notNull()
    .references(() => menuItems.id),
  quantity: numeric('quantity').notNull(),
  unitPrice: numeric('unit_price', { precision: 10, scale: 2 }).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const orderMessages = pgTable('order_messages', {
  id: uuid('id').primaryKey().defaultRandom(),
  orderId: uuid('order_id')
    .notNull()
    .references(() => orders.id, { onDelete: 'cascade' }),
  senderId: uuid('sender_id')
    .notNull()
    .references(() => users.id),
  senderName: text('sender_name').notNull(),
  senderRole: text('sender_role').notNull(),
  content: text('content').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export type Order = typeof orders.$inferSelect;
export type NewOrder = typeof orders.$inferInsert;
export type OrderItem = typeof orderItems.$inferSelect;
export type OrderMessage = typeof orderMessages.$inferSelect;
export type NewOrderMessage = typeof orderMessages.$inferInsert;
