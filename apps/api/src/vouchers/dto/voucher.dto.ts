import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsDateString,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { VoucherDiscountType } from '@food-delivery/types';

export class CreateVoucherDto {
  // Mã khách nhìn thấy, VD: GIAM20, FREESHIP_50
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim().toUpperCase() : value,
  )
  @Matches(/^[A-Z0-9_-]{3,20}$/, {
    message: 'code must be 3-20 characters: A-Z, 0-9, _ or -',
  })
  code!: string;

  @IsString()
  @MaxLength(80)
  title!: string;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  description?: string;

  @IsIn(Object.values(VoucherDiscountType))
  discountType!: VoucherDiscountType;

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  discountValue!: number;

  // Giảm tối đa (chỉ dùng cho PERCENT)
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  maxDiscount?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  minOrderAmount?: number;

  @IsOptional()
  @IsDateString()
  expiresAt?: string;

  // Tổng số lượt dùng cho tất cả khách (bỏ trống = không giới hạn)
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  usageLimit?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  perUserLimit?: number;
}

export class UpdateVoucherDto {
  @IsBoolean()
  isActive!: boolean;
}

export class AvailableVouchersQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  subtotal?: number;
}
