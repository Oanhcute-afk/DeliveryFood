import { Body, Controller, Post, Request, UseGuards } from '@nestjs/common';
import type { Request as ExpressRequest } from 'express';
import { JwtPayload, UserRole } from '@food-delivery/types';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { ChatService } from './chat.service';
import { ChatRequestDto } from './dto/chat.dto';

@Controller('chat') // /api/chat — trợ lý AI cho khách hàng
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.CUSTOMER)
export class ChatController {
  constructor(private chatService: ChatService) {}

  @Post()
  chat(
    @Request() req: ExpressRequest & { user: JwtPayload },
    @Body() dto: ChatRequestDto,
  ) {
    return this.chatService.chat(req.user.sub, dto);
  }
}
