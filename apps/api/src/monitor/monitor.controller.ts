import { Controller, Get, Header, UseGuards } from '@nestjs/common';
import { MetricsService } from './metrics.service';
import { BusinessStatsService } from './business-stats.service';
import { MonitorAuthGuard } from './monitor-auth.guard';
import { monitorPage } from './monitor-page';

// /monitor nằm ngoài prefix /api (xem main.ts)
@Controller('monitor')
@UseGuards(MonitorAuthGuard)
export class MonitorController {
  constructor(
    private metrics: MetricsService,
    private businessStats: BusinessStatsService,
  ) {}

  @Get()
  @Header('Content-Type', 'text/html; charset=utf-8')
  @Header('Cache-Control', 'no-store')
  page() {
    return monitorPage();
  }

  @Get('data')
  @Header('Cache-Control', 'no-store')
  async data() {
    return {
      traffic: this.metrics.snapshot(),
      business: await this.businessStats.getStats(),
    };
  }
}
