import { Global, Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { MetricsService } from './metrics.service';
import { BusinessStatsService } from './business-stats.service';
import { MonitorController } from './monitor.controller';

@Global()
@Module({
  imports: [AuthModule],
  controllers: [MonitorController],
  providers: [MetricsService, BusinessStatsService],
  exports: [MetricsService, BusinessStatsService],
})
export class MonitorModule {}
