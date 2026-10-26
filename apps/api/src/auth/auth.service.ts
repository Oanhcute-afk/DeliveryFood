import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { eq, or } from 'drizzle-orm';
import { NeonHttpDatabase } from 'drizzle-orm/neon-http';
import * as bcrypt from 'bcryptjs';
import * as schema from '../db/schema';
import { JwtPayload } from '@food-delivery/types';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { GoogleLoginDto } from './dto/google-login.dto';
import { getApps, initializeApp } from 'firebase-admin/app';
import { DecodedIdToken, getAuth } from 'firebase-admin/auth';

// Chỉ cần projectId để xác thực Firebase ID token (không cần service account)
function firebaseAuth() {
  const app =
    getApps()[0] ??
    initializeApp({ projectId: process.env.FIREBASE_PROJECT_ID });
  return getAuth(app);
}

// Deep link được phép nhận kết quả: Expo Go (exp/exps) và app đã build (mobile)
const APP_REDIRECT_PROTOCOLS = ['exp:', 'exps:', 'mobile:'];

// Ký state bằng secret riêng để không dùng được như JWT đăng nhập
const oauthStateSecret = () => `${process.env.JWT_SECRET}:google-oauth-state`;

const googleRedirectUri = () =>
  `${process.env.API_PUBLIC_URL}/api/auth/google/callback`;

@Injectable()
export class AuthService {
  constructor(
    @Inject('DB') private db: NeonHttpDatabase<typeof schema>,
    private jwtService: JwtService,
  ) {}

  async register(dto: RegisterDto) {
    const [existing] = await this.db
      .select()
      .from(schema.users)
      .where(eq(schema.users.email, dto.email));

    if (existing) throw new ConflictException('Email already in use');

    const hashedPassword = await bcrypt.hash(dto.password, 10);

    const [user] = await this.db
      .insert(schema.users)
      .values({
        firstName: dto.firstName,
        lastName: dto.lastName,
        email: dto.email,
        password: hashedPassword,
        role: dto.role,
      })
      .returning();

    return {
      user: this.sanitizeUser(user),
      token: this.generateToken(user),
    };
  }

  async login(dto: LoginDto) {
    const [user] = await this.db
      .select()
      .from(schema.users)
      .where(eq(schema.users.email, dto.email));

    // Tài khoản tạo bằng Google không có mật khẩu
    if (!user?.password) throw new UnauthorizedException('Invalid Credentials');

    const passwordMatch = await bcrypt.compare(dto.password, user.password);

    if (!passwordMatch) throw new UnauthorizedException('Invalid Credentials');
    this.assertNotBlocked(user);

    return {
      user: this.sanitizeUser(user),
      token: this.generateToken(user),
    };
  }

  async googleLogin(dto: GoogleLoginDto) {
    const profile = await this.verifyFirebaseIdToken(dto.idToken);

    const [existing] = await this.db
      .select()
      .from(schema.users)
      .where(
        or(
          eq(schema.users.googleId, profile.sub),
          eq(schema.users.email, profile.email),
        ),
      );

    if (existing) {
      this.assertNotBlocked(existing);
      let user = existing;

      // Liên kết tài khoản email/password có sẵn với Google
      if (!existing.googleId) {
        [user] = await this.db
          .update(schema.users)
          .set({ googleId: profile.sub, updatedAt: new Date() })
          .where(eq(schema.users.id, existing.id))
          .returning();
      }

      return {
        user: this.sanitizeUser(user),
        token: this.generateToken(user),
      };
    }

    // Tài khoản mới: app cần hỏi người dùng chọn role rồi gọi lại
    if (!dto.role) {
      throw new NotFoundException({
        code: 'ROLE_REQUIRED',
        message: 'Please choose a role to create your account',
      });
    }

    const [firstName, ...rest] = (profile.name ?? profile.email).split(' ');

    const [user] = await this.db
      .insert(schema.users)
      .values({
        firstName,
        lastName: rest.join(' '),
        email: profile.email,
        googleId: profile.sub,
        role: dto.role,
      })
      .returning();

    return {
      user: this.sanitizeUser(user),
      token: this.generateToken(user),
    };
  }

  getGoogleAuthUrl(appRedirect: string) {
    let protocol: string;
    try {
      protocol = new URL(appRedirect).protocol;
    } catch {
      throw new BadRequestException('Invalid redirect');
    }
    if (!APP_REDIRECT_PROTOCOLS.includes(protocol)) {
      throw new BadRequestException('Invalid redirect');
    }

    const state = this.jwtService.sign(
      { redirect: appRedirect },
      { secret: oauthStateSecret(), expiresIn: '10m' },
    );

    const params = new URLSearchParams({
      client_id: process.env.GOOGLE_WEB_CLIENT_ID!,
      redirect_uri: googleRedirectUri(),
      response_type: 'code',
      scope: 'openid email profile',
      prompt: 'select_account',
      state,
    });

    return `https://accounts.google.com/o/oauth2/v2/auth?${params}`;
  }

  async handleGoogleCallback(state: string, code?: string, error?: string) {
    let redirect: string;
    try {
      ({ redirect } = this.jwtService.verify<{ redirect: string }>(state, {
        secret: oauthStateSecret(),
      }));
    } catch {
      throw new BadRequestException('Invalid or expired sign-in session');
    }

    const backToApp = (params: Record<string, string>) =>
      `${redirect}${redirect.includes('?') ? '&' : '?'}${new URLSearchParams(params)}`;

    if (error || !code) return backToApp({ error: error ?? 'cancelled' });

    const res = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: process.env.GOOGLE_WEB_CLIENT_ID!,
        client_secret: process.env.GOOGLE_WEB_CLIENT_SECRET!,
        redirect_uri: googleRedirectUri(),
        grant_type: 'authorization_code',
      }),
    });
    const data = (await res.json()) as { id_token?: string };

    if (!res.ok || !data.id_token) {
      return backToApp({ error: 'token_exchange_failed' });
    }

    // App dùng token này để đăng nhập Firebase, rồi gửi Firebase ID token lên /auth/google
    return backToApp({ googleIdToken: data.id_token });
  }

  private async verifyFirebaseIdToken(idToken: string) {
    let decoded: DecodedIdToken;
    try {
      decoded = await firebaseAuth().verifyIdToken(idToken);
    } catch {
      throw new UnauthorizedException('Invalid Google token');
    }

    // Google account ID (sub) — giữ nguyên dù user Firebase bị xoá/tạo lại
    const googleSub = (
      decoded.firebase.identities['google.com'] as string[] | undefined
    )?.[0];

    if (
      decoded.firebase.sign_in_provider !== 'google.com' ||
      !googleSub ||
      !decoded.email ||
      !decoded.email_verified
    ) {
      throw new UnauthorizedException('Invalid Google token');
    }

    return {
      sub: googleSub,
      email: decoded.email,
      name: decoded.name as string | undefined,
    };
  }

  private assertNotBlocked(user: schema.User) {
    if (user.isBlocked) {
      throw new ForbiddenException({
        code: 'ACCOUNT_BLOCKED',
        message: 'Your account has been locked by an administrator',
      });
    }
  }

  private generateToken(user: schema.NewUser) {
    const payload: JwtPayload = {
      sub: user.id!,
      email: user.email,
      role: user.role!,
    };
    return this.jwtService.sign(payload);
  }

  private sanitizeUser(user: schema.User) {
    const { password, ...safeUser } = user;
    void password;
    return safeUser;
  }
}
