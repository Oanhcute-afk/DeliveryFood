import { Module } from '@nestjs/common';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';
import { AuthModule } from '../auth/auth.module';
import { GatewayModule } from '../gateway/gateway.module';
import { DriverModule } from '../driver/driver.module';
import { VouchersModule } from '../vouchers/vouchers.module';

@Module({
  imports: [AuthModule, GatewayModule, DriverModule, VouchersModule],
  controllers: [OrdersController],
  providers: [OrdersService],
})
export class OrdersModule {}
