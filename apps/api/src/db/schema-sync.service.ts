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
  `ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'ADMIN'`,
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
