import { IsBoolean, IsIn, IsOptional, IsString } from 'class-validator';
import { SIGNUP_ROLES, type SignupRole } from '@food-delivery/types';

export class ListUsersQueryDto {
  @IsIn(SIGNUP_ROLES)
  role!: SignupRole;

  @IsOptional()
  @IsString()
  search?: string;
}

export class SearchQueryDto {
  @IsOptional()
  @IsString()
  search?: string;
}

export class SetBlockedDto {
  @IsBoolean()
  blocked!: boolean;
}

export class SetOpenDto {
  @IsBoolean()
  isOpen!: boolean;
}
