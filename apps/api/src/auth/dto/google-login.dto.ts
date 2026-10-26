import { IsEnum, IsOptional, IsString } from 'class-validator';
import { UserRole } from '@food-delivery/types';

export class GoogleLoginDto {
  @IsString()
  idToken!: string;

  // Chỉ cần khi tạo tài khoản mới bằng Google
  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole;
}
