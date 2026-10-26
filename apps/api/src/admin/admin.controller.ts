import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Query,
  UseGuards,
} from '@nestjs/common';
import { UserRole } from '@food-delivery/types';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { BusinessStatsService } from '../monitor/business-stats.service';
import { AdminService } from './admin.service';
import {
  ListUsersQueryDto,
  SearchQueryDto,
  SetBlockedDto,
  SetOpenDto,
} from './dto/admin.dto';

@Controller('admin') // /api/admin — chỉ ADMIN
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class AdminController {
  constructor(
    private adminService: AdminService,
    private businessStats: BusinessStatsService,
  ) {}

  @Get('overview')
  overview() {
    return this.businessStats.getStats();
  }

  @Get('users') // ?role=CUSTOMER|DRIVER|RESTAURANT_OWNER&search=
  listUsers(@Query() query: ListUsersQueryDto) {
    return this.adminService.listUsers(query.role, query.search);
  }

  @Patch('users/:id/block')
  setUserBlocked(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: SetBlockedDto,
  ) {
    return this.adminService.setUserBlocked(id, dto.blocked);
  }

  @Get('restaurants')
  listRestaurants(@Query() query: SearchQueryDto) {
    return this.adminService.listRestaurants(query.search);
  }

  @Patch('restaurants/:id')
  setRestaurantOpen(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: SetOpenDto,
  ) {
    return this.adminService.setRestaurantOpen(id, dto.isOpen);
  }
}
