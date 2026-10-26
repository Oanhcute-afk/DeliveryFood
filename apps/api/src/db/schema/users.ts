import { boolean } from 'drizzle-orm/pg-core';
import { pgEnum, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';

export const userRoleEnum = pgEnum('user_role', [
  'CUSTOMER',
  'RESTAURANT_OWNER',
  'DRIVER',
  'ADMIN',
]);

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  firstName: text('first_name').notNull(),
  lastName: text('last_name').notNull(),
  email: text('email').notNull().unique(),
  // null cho tài khoản chỉ đăng nhập bằng Google
  password: text('password'),
  googleId: text('google_id').unique(),
  role: userRoleEnum('role').notNull().default('CUSTOMER'),
  pushToken: text('push_token'),
  isOnline: boolean('is_online').default(false).notNull(),
  // Admin khoá tài khoản → không đăng nhập/gọi API được
  isBlocked: boolean('is_blocked').default(false).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
