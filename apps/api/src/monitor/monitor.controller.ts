import { Controller, Get, Header, UseGuards } from '@nestjs/common';
import { UserRole } from '@food-delivery/types';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { MetricsService } from './metrics.service';
import { BusinessStatsService } from './business-stats.service';
import { monitorPage } from './monitor-page';

// /monitor nằm ngoài prefix /api (xem main.ts)
@Controller('monitor')
export class MonitorController {
  constructor(
    private metrics: MetricsService,
    private businessStats: BusinessStatsService,
  ) {}

  // Trang HTML không chứa dữ liệu; trang tự đăng nhập bằng tài khoản admin
  @Get()
  @Header('Content-Type', 'text/html; charset=utf-8')
  @Header('Cache-Control', 'no-store')
  page() {
    return monitorPage();
  }

  @Get('data')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Header('Cache-Control', 'no-store')
  async data() {
    return {
      traffic: this.metrics.snapshot(),
      business: await this.businessStats.getStats(),
    };
  }
}
