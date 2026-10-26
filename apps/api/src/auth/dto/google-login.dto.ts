import { IsIn, IsOptional, IsString } from 'class-validator';
import { SIGNUP_ROLES, type SignupRole } from '@food-delivery/types';

export class GoogleLoginDto {
  // Firebase ID token sau khi đăng nhập Google trên app
  @IsString()
  idToken!: string;

  // Chỉ cần khi tạo tài khoản mới bằng Google
  @IsOptional()
  @IsIn(SIGNUP_ROLES)
  role?: SignupRole;
}
