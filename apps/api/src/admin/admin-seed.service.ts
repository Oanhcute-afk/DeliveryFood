import {
  Inject,
  Injectable,
  Logger,
  OnApplicationBootstrap,
} from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { NeonHttpDatabase } from 'drizzle-orm/neon-http';
import * as bcrypt from 'bcryptjs';
import * as schema from '../db/schema';

const DEFAULT_ADMIN_EMAIL = 'onadmin@gmail.com';
const DEFAULT_ADMIN_PASSWORD = 'admin123';

// Tạo tài khoản admin mặc định nếu chưa có (đổi bằng ADMIN_EMAIL / ADMIN_PASSWORD)
@Injectable()
export class AdminSeedService implements OnApplicationBootstrap {
  private readonly logger = new Logger(AdminSeedService.name);

  constructor(@Inject('DB') private db: NeonHttpDatabase<typeof schema>) {}

  async onApplicationBootstrap() {
    const email = (
      process.env.ADMIN_EMAIL ?? DEFAULT_ADMIN_EMAIL
    ).toLowerCase();
    const password = process.env.ADMIN_PASSWORD ?? DEFAULT_ADMIN_PASSWORD;

    try {
      const [existing] = await this.db
        .select({ id: schema.users.id, role: schema.users.role })
        .from(schema.users)
        .where(eq(schema.users.email, email));

      if (existing) {
        if (existing.role !== 'ADMIN') {
          this.logger.warn(
            `${email} already exists with role ${existing.role}; admin account not created`,
          );
        }
        return;
      }

      await this.db.insert(schema.users).values({
        firstName: 'Admin',
        lastName: 'delifood',
        email,
        password: await bcrypt.hash(password, 10),
        role: 'ADMIN',
      });
      this.logger.log(`Created default admin account ${email}`);
    } catch (error) {
      this.logger.error(
        'Could not create default admin account',
        error instanceof Error ? error.message : String(error),
      );
    }
  }
}
