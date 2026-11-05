import { Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { sql } from 'drizzle-orm';
import { NeonHttpDatabase } from 'drizzle-orm/neon-http';
import * as schema from './schema';

// Thay đổi chỉ thêm (không xoá dữ liệu) và chạy lại nhiều lần vẫn an toàn.
// Giúp deploy không bị lỗi khi chưa chạy `pnpm db:push`.
const MIGRATIONS = [
  `ALTER TABLE users ALTER COLUMN password DROP NOT NULL`,
  `ALTER TABLE users ADD COLUMN IF NOT EXISTS google_id text UNIQUE`,
  `ALTER TABLE users ADD COLUMN IF NOT EXISTS is_blocked boolean NOT NULL DEFAULT false`,
  `ALTER TABLE users ADD COLUMN IF NOT EXISTS phone text`,
  `ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_url text`,
  `ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'ADMIN'`,
  // Voucher
  `DO $$ BEGIN
     CREATE TYPE voucher_discount_type AS ENUM ('PERCENT', 'FIXED');
   EXCEPTION WHEN duplicate_object THEN NULL; END $$`,
  `CREATE TABLE IF NOT EXISTS vouchers (
     id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
     code text NOT NULL UNIQUE,
     title text NOT NULL,
     description text,
     discount_type voucher_discount_type NOT NULL,
     discount_value numeric(10, 2) NOT NULL,
     max_discount numeric(10, 2),
     min_order_amount numeric(10, 2) NOT NULL DEFAULT 0,
     starts_at timestamp NOT NULL DEFAULT now(),
     expires_at timestamp,
     usage_limit integer,
     per_user_limit integer NOT NULL DEFAULT 1,
     is_active boolean NOT NULL DEFAULT true,
     created_by uuid REFERENCES users(id),
     created_at timestamp NOT NULL DEFAULT now(),
     updated_at timestamp NOT NULL DEFAULT now()
   )`,
  `ALTER TABLE orders ADD COLUMN IF NOT EXISTS subtotal_amount numeric(10, 2)`,
  `ALTER TABLE orders ADD COLUMN IF NOT EXISTS discount_amount numeric(10, 2) NOT NULL DEFAULT 0`,
  `ALTER TABLE orders ADD COLUMN IF NOT EXISTS voucher_id uuid REFERENCES vouchers(id)`,
  `ALTER TABLE orders ADD COLUMN IF NOT EXISTS voucher_code text`,
  `ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_method text NOT NULL DEFAULT 'STRIPE'`,
  `ALTER TABLE orders ADD COLUMN IF NOT EXISTS is_paid boolean NOT NULL DEFAULT false`,
  `ALTER TABLE orders ADD COLUMN IF NOT EXISTS cash_received_at timestamp`,
  `ALTER TABLE orders ADD COLUMN IF NOT EXISTS driver_delivered_at timestamp`,
  `ALTER TABLE orders ADD COLUMN IF NOT EXISTS customer_confirmed_at timestamp`,
  `ALTER TABLE orders ADD COLUMN IF NOT EXISTS note text`,
  `CREATE TABLE IF NOT EXISTS order_messages (
     id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
     order_id uuid NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
     sender_id uuid NOT NULL REFERENCES users(id),
     sender_name text NOT NULL,
     sender_role text NOT NULL,
     content text NOT NULL,
     created_at timestamp NOT NULL DEFAULT now()
   )`,
];

@Injectable()
export class SchemaSyncService implements OnModuleInit {
  private readonly logger = new Logger(SchemaSyncService.name);

  constructor(@Inject('DB') private db: NeonHttpDatabase<typeof schema>) {}

  async onModuleInit() {
    for (const statement of MIGRATIONS) {
      try {
        await this.db.execute(sql.raw(statement));
      } catch (error) {
        this.logger.error(
          `Schema sync failed: ${statement}`,
          error instanceof Error ? error.message : String(error),
        );
      }
    }
  }
}
