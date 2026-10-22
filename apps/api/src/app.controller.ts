import { Controller, Get, Inject } from '@nestjs/common';
import type { HealthCheckResponse } from '@food-delivery/types';
import { NeonHttpDatabase } from 'drizzle-orm/neon-http';
import * as schema from './db/schema';

@Controller()
export class AppController {
  constructor(@Inject('DB') private db: NeonHttpDatabase<typeof schema>) {}

  @Get('db-test')
  async dbTest() {
    const result = await this.db.select().from(schema.users);
    return { users: result, count: result.length };
  }

  @Get('health') // /api/health
  health(): HealthCheckResponse {
    return {
      status: 'ok',
      timestamp: new Date(),
    };
  }
}
