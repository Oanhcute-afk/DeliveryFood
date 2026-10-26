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
import { getApps, initializeApp } from 'firebase-admin/app';
import { DecodedIdToken, getAuth } from 'firebase-admin/auth';

// Chỉ cần projectId để xác thực Firebase ID token (không cần service account)
function firebaseAuth() {
  const app =
    getApps()[0] ??
    initializeApp({ projectId: process.env.FIREBASE_PROJECT_ID });
  return getAuth(app);
}

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
