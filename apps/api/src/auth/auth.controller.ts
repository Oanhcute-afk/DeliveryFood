import {
  Body,
  Controller,
  Get,
  Post,
  Query,
  Redirect,
  Request,
  UseGuards,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { GoogleLoginDto } from './dto/google-login.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { Request as ExpressRequest } from 'express';
import { JwtPayload } from '@food-delivery/types';

@Controller('auth') // /api/auth
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('register') // /api/auth/register
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Post('login')
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Post('google') // /api/auth/google
  googleLogin(@Body() dto: GoogleLoginDto) {
    return this.authService.googleLogin(dto);
  }

  // Mở trong trình duyệt từ app → chuyển sang trang đăng nhập Google
  @Get('google/start')
  @Redirect()
  googleStart(@Query('redirect') redirect: string) {
    return { url: this.authService.getGoogleAuthUrl(redirect) };
  }

  // Google gọi lại sau khi đăng nhập → trả Google ID token về app qua deep link
  @Get('google/callback')
  @Redirect()
  async googleCallback(
    @Query('state') state: string,
    @Query('code') code?: string,
    @Query('error') error?: string,
  ) {
    return {
      url: await this.authService.handleGoogleCallback(state, code, error),
    };
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  me(@Request() req: ExpressRequest & { user: JwtPayload }) {
    return req.user;
  }
}
