import {
  ConflictException,
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

interface GoogleTokenInfo {
  aud: string;
  iss: string;
  sub: string;
  email?: string;
  email_verified?: string | boolean;
  given_name?: string;
  family_name?: string;
  name?: string;
}

const GOOGLE_ISSUERS = ['accounts.google.com', 'https://accounts.google.com'];

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

    return {
      user: this.sanitizeUser(user),
      token: this.generateToken(user),
    };
  }

  async googleLogin(dto: GoogleLoginDto) {
    const profile = await this.verifyGoogleIdToken(dto.idToken);

    const [existing] = await this.db
      .select()
      .from(schema.users)
      .where(
        or(
          eq(schema.users.googleId, profile.sub),
          eq(schema.users.email, profile.email!),
        ),
      );

    if (existing) {
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

    const [firstName, ...rest] = (profile.name ?? profile.email!).split(' ');

    const [user] = await this.db
      .insert(schema.users)
      .values({
        firstName: profile.given_name ?? firstName,
        lastName: profile.family_name ?? rest.join(' '),
        email: profile.email!,
        googleId: profile.sub,
        role: dto.role,
      })
      .returning();

    return {
      user: this.sanitizeUser(user),
      token: this.generateToken(user),
    };
  }

  private async verifyGoogleIdToken(idToken: string) {
    const allowedClientIds = (process.env.GOOGLE_CLIENT_IDS ?? '')
      .split(',')
      .map((id) => id.trim())
      .filter(Boolean);

    // tokeninfo kiểm tra chữ ký và thời hạn của token
    const res = await fetch(
      `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(idToken)}`,
    );
    if (!res.ok) throw new UnauthorizedException('Invalid Google token');

    const info = (await res.json()) as GoogleTokenInfo;

    const emailVerified =
      info.email_verified === true || info.email_verified === 'true';

    if (
      !allowedClientIds.includes(info.aud) ||
      !GOOGLE_ISSUERS.includes(info.iss) ||
      !info.email ||
      !emailVerified
    ) {
      throw new UnauthorizedException('Invalid Google token');
    }

    return info;
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
