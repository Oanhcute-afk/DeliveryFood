import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import type { Request as ExpressRequest } from 'express';
import { JwtPayload, UserRole } from '@food-delivery/types';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { VouchersService } from './vouchers.service';
import {
  AvailableVouchersQueryDto,
  CreateVoucherDto,
  UpdateVoucherDto,
} from './dto/voucher.dto';

type AuthRequest = ExpressRequest & { user: JwtPayload };

@Controller('vouchers') // /api/vouchers — khách hàng
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.CUSTOMER)
export class VouchersController {
  constructor(private vouchersService: VouchersService) {}

  @Get('available') // ?subtotal=12.5
  available(
    @Request() req: AuthRequest,
    @Query() query: AvailableVouchersQueryDto,
  ) {
    return this.vouchersService.listForCustomer(
      req.user.sub,
      query.subtotal ?? 0,
    );
  }

  @Get('latest')
  latest() {
    return this.vouchersService.latest();
  }
}

@Controller('admin/vouchers') // /api/admin/vouchers — chỉ ADMIN
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class AdminVouchersController {
  constructor(private vouchersService: VouchersService) {}

  @Get()
  list() {
    return this.vouchersService.listAll();
  }

  @Post()
  create(@Request() req: AuthRequest, @Body() dto: CreateVoucherDto) {
    return this.vouchersService.create(req.user.sub, dto);
  }

  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateVoucherDto,
  ) {
    return this.vouchersService.setActive(id, dto.isActive);
  }
}
