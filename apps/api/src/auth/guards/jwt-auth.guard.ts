import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';
import { JwtPayload } from '@food-delivery/types';
import { BlockedUsersService } from '../blocked-users.service';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private jwtService: JwtService,
    private blockedUsers: BlockedUsersService,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context
      .switchToHttp()
      .getRequest<Request & { user: JwtPayload }>();

    // header format: "Bearer frgsrgrg..."
    const authHeader = request.headers.authorization;
    if (!authHeader) throw new UnauthorizedException('No token provided');

    const token = authHeader.split(' ')[1];
    if (!token) throw new UnauthorizedException('Invalid token format');

    let payload: JwtPayload;
    try {
      payload = this.jwtService.verify<JwtPayload>(token);
    } catch {
      throw new UnauthorizedException('Invalid or expired token');
    }

    if (this.blockedUsers.isBlocked(payload.sub)) {
      throw new ForbiddenException('ACCOUNT_BLOCKED');
    }

    request.user = payload;
    return true;
  }
}
