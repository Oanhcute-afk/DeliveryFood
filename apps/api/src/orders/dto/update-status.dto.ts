import { IsEnum, IsOptional, IsString } from 'class-validator';
import { OrderStatus } from '@food-delivery/types';

export class UpdateStatusDto {
  @IsEnum(OrderStatus) // only accepts valid OrderStatus values
  status!: OrderStatus;

  @IsOptional()
  @IsString()
  cancelReason?: string;
}
