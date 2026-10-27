import { Controller, Get, Inject, UseGuards } from '@nestjs/common';
import { UserRole, type HealthCheckResponse } from '@food-delivery/types';
import { NeonHttpDatabase } from 'drizzle-orm/neon-http';
import * as schema from './db/schema';
import { JwtAuthGuard } from './auth/guards/jwt-auth.guard';
import { RolesGuard } from './auth/guards/roles.guard';
import { Roles } from './auth/decorators/roles.decorator';

@Controller()
export class AppController {
  constructor(@Inject('DB') private db: NeonHttpDatabase<typeof schema>) {}

  // Chỉ admin; không trả về mật khẩu (hash)
  @Get('db-test')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async dbTest() {
    const result = await this.db.select().from(schema.users);
    const users = result.map(({ password, ...user }) => {
      void password;
      return user;
    });
    return { users, count: users.length };
  }

  @Get('health') // /api/health
  health(): HealthCheckResponse {
    return {
      status: 'ok',
      timestamp: new Date(),
    };
  }
}
