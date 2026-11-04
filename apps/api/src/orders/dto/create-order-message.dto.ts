import { IsNotEmpty, IsString } from 'class-validator';

export class CreateOrderMessageDto {
  @IsString()
  @IsNotEmpty()
  content!: string;
}
