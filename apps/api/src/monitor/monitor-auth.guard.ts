import {
  CanActivate,
  ExecutionContext,
  Injectable,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { timingSafeEqual } from 'crypto';
import type { Request, Response } from 'express';

const safeEqual = (a: string, b: string) => {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  return bufA.length === bufB.length && timingSafeEqual(bufA, bufB);
};

// Trình duyệt hiện hộp đăng nhập (HTTP Basic Auth) với MONITOR_USERNAME/PASSWORD
@Injectable()
export class MonitorAuthGuard implements CanActivate {
  canActivate(context: ExecutionContext) {
    const username = process.env.MONITOR_USERNAME;
    const password = process.env.MONITOR_PASSWORD;
    if (!username || !password) {
      throw new ServiceUnavailableException(
        'Monitor is disabled. Set MONITOR_USERNAME and MONITOR_PASSWORD to enable it.',
      );
    }

    const req = context.switchToHttp().getRequest<Request>();
    const [scheme, encoded] = (req.headers.authorization ?? '').split(' ');
    if (scheme === 'Basic' && encoded) {
      const decoded = Buffer.from(encoded, 'base64').toString();
      const separator = decoded.indexOf(':');
      if (
        separator > 0 &&
        safeEqual(decoded.slice(0, separator), username) &&
        safeEqual(decoded.slice(separator + 1), password)
      ) {
        return true;
      }
    }

    context
      .switchToHttp()
      .getResponse<Response>()
      .setHeader('WWW-Authenticate', 'Basic realm="delifood monitor"');
    throw new UnauthorizedException();
  }
}
