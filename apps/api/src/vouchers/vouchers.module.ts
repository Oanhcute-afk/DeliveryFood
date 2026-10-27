import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { VouchersService } from './vouchers.service';
import {
  AdminVouchersController,
  VouchersController,
} from './vouchers.controller';

@Module({
  imports: [AuthModule],
  controllers: [VouchersController, AdminVouchersController],
  providers: [VouchersService],
  exports: [VouchersService],
})
export class VouchersModule {}
