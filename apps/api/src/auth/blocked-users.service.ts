import {
  Inject,
  Injectable,
  Logger,
  OnApplicationBootstrap,
} from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { NeonHttpDatabase } from 'drizzle-orm/neon-http';
import * as schema from '../db/schema';

// Giữ danh sách user bị khoá trong bộ nhớ để JwtAuthGuard chặn cả token cũ
// mà không phải truy vấn DB mỗi request
@Injectable()
export class BlockedUsersService implements OnApplicationBootstrap {
  private readonly logger = new Logger(BlockedUsersService.name);
  private blocked = new Set<string>();

  constructor(@Inject('DB') private db: NeonHttpDatabase<typeof schema>) {}

  async onApplicationBootstrap() {
    try {
      const rows = await this.db
        .select({ id: schema.users.id })
        .from(schema.users)
        .where(eq(schema.users.isBlocked, true));
      this.blocked = new Set(rows.map((r) => r.id));
    } catch (error) {
      this.logger.error(
        'Could not load blocked users',
        error instanceof Error ? error.message : String(error),
      );
    }
  }

  isBlocked(userId: string) {
    return this.blocked.has(userId);
  }

  setBlocked(userId: string, blocked: boolean) {
    if (blocked) this.blocked.add(userId);
    else this.blocked.delete(userId);
  }
}
