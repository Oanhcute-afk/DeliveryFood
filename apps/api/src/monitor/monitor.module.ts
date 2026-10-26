import { Global, Module } from '@nestjs/common';
import { MetricsService } from './metrics.service';
import { BusinessStatsService } from './business-stats.service';
import { MonitorController } from './monitor.controller';

@Global()
@Module({
  controllers: [MonitorController],
  providers: [MetricsService, BusinessStatsService],
  exports: [MetricsService],
})
export class MonitorModule {}
