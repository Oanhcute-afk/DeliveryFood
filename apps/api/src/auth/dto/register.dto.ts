import { IsEmail, IsIn, IsString, MinLength } from 'class-validator';
import { SIGNUP_ROLES, type SignupRole } from '@food-delivery/types';

export class RegisterDto {
  @IsString()
  firstName!: string;

  @IsString()
  lastName!: string;

  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(6)
  password!: string;

  // Không cho tự đăng ký làm ADMIN
  @IsIn(SIGNUP_ROLES)
  role!: SignupRole;
}
