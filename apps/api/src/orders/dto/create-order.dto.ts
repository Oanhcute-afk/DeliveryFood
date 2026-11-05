import {
  IsArray,
  IsOptional,
  IsString,
  IsUUID,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { OrderItemDto } from './order-item.dto';

export class CreateOrderDto {
  @IsString()
  restaurantId!: string;

  @IsString()
  deliveryAddress!: string;

  @IsArray()
  @ValidateNested({ each: true }) // validates each item in the array against OrderItemDto
  @Type(() => OrderItemDto) // transforms each item into an OrderItemDto instance
  items!: OrderItemDto[];

  // Voucher khách chọn (server kiểm tra lại và tự tính số tiền giảm)
  @IsOptional()
  @IsUUID()
  voucherId?: string;

  // Phương thức thanh toán ('STRIPE' | 'CASH')
  @IsOptional()
  @IsString()
  paymentMethod?: string;

  // Ghi chú của khách cho nhà hàng (VD: ít đường, không cay, không hành...)
  @IsOptional()
  @IsString()
  note?: string;
}
