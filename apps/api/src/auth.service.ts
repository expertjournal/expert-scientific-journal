import { ConflictException, Injectable, UnauthorizedException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from './prisma.service';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { Role, TokenPurpose, AuthProvider } from '@prisma/client';
import * as crypto from 'crypto';

import { MailService } from './mail/mail.service';

type TokenPayload = { sub: string; email: string; role: Role };

const WEAK_PASSWORDS = new Set([
  '123456',
  '12345678',
  'password',
  'qwerty',
  '123456789',
  '12345',
  '1234567',
  'password123',
  'admin123',
]);

@Injectable()
export class AuthService {
  constructor(
    private db: PrismaService,
    private config: ConfigService,
    private mailService: MailService,
  ) {}

  private secret() {
    const secret = this.config.get<string>('JWT_SECRET');
    if (!secret) {
      throw new Error('JWT_SECRET is not set — refusing to start with an insecure default');
    }
    return secret;
  }

  private token(user: { id: string; email: string; role: Role }) {
    return jwt.sign(
      { sub: user.id, email: user.email, role: user.role } satisfies TokenPayload,
      this.secret(),
      { expiresIn: '8h' }
    );
  }

  private validatePasswordPolicy(password: string) {
    if (password.length < 8) {
      throw new BadRequestException('Пароль должен содержать не менее 8 символов');
    }
    if (WEAK_PASSWORDS.has(password.toLowerCase())) {
      throw new BadRequestException('Этот пароль слишком простой. Выберите более надежный пароль.');
    }
  }

  async register(input: {
    email: string;
    password: string;
    fullName: string;
    institution?: string;
    role?: Role;
    orcid?: string;
  }) {
    this.validatePasswordPolicy(input.password);

    const email = input.email.toLowerCase().trim();
    const existing = await this.db.user.findUnique({ where: { email } });
    if (existing) {
      throw new ConflictException('Пользователь с таким email уже зарегистрирован');
    }

    // Role Escalation Protection: Public registration can NEVER issue EDITOR or ADMIN roles
    const assignedRole =
      input.role === Role.READER ? Role.READER : Role.AUTHOR;

    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    const verificationToken = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

    const user = await this.db.$transaction(async (tx) => {
      const newUser = await tx.user.create({
        data: {
          email,
          passwordHash: await bcrypt.hash(input.password, 12),
          role: assignedRole,
          isEmailVerified: false,
          profile: {
            create: {
              fullName: input.fullName,
              institution: input.institution,
              orcid: input.orcid || null,
            },
          },
        },
        include: { profile: true },
      });

      await tx.emailVerificationToken.create({
        data: {
          userId: newUser.id,
          token: verificationToken,
          code: otpCode,
          purpose: TokenPurpose.EMAIL_VERIFICATION,
          expiresAt,
        },
      });

      await tx.notification.create({
        data: {
          userId: newUser.id,
          type: 'SYSTEM',
          title: 'Подтверждение Email',
          body: `Ваш код подтверждения регистрации: ${otpCode}`,
        },
      });

      return newUser;
    });

    await this.mailService.sendVerificationCode(user.email, otpCode);

    return {
      requiresVerification: true,
      email: user.email,
      message: 'Регистрация успешна. Введите 6-значный код подтверждения, отправленный на ваш email.',
    };
  }

  async verifyEmail(email: string, code: string) {
    const normalizedEmail = email.toLowerCase().trim();
    const user = await this.db.user.findUnique({
      where: { email: normalizedEmail },
      include: { profile: true },
    });

    if (!user) {
      throw new BadRequestException('Пользователь не найден');
    }

    if (user.isEmailVerified) {
      return {
        success: true,
        accessToken: this.token(user),
        user: this.publicUser(user),
      };
    }

    const verificationRecord = await this.db.emailVerificationToken.findFirst({
      where: {
        userId: user.id,
        code: code.trim(),
        purpose: TokenPurpose.EMAIL_VERIFICATION,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!verificationRecord) {
      throw new BadRequestException('Неверный или просроченный код подтверждения');
    }

    await this.db.$transaction([
      this.db.user.update({
        where: { id: user.id },
        data: {
          isEmailVerified: true,
          emailVerifiedAt: new Date(),
        },
      }),
      this.db.emailVerificationToken.deleteMany({
        where: { userId: user.id, purpose: TokenPurpose.EMAIL_VERIFICATION },
      }),
    ]);

    const updatedUser = { ...user, isEmailVerified: true };

    return {
      success: true,
      accessToken: this.token(updatedUser),
      user: this.publicUser(updatedUser),
    };
  }

  async resendVerification(email: string) {
    const normalizedEmail = email.toLowerCase().trim();
    const user = await this.db.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (!user) {
      throw new BadRequestException('Пользователь с таким email не найден');
    }

    if (user.isEmailVerified) {
      throw new BadRequestException('Email уже подтвержден');
    }

    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    const verificationToken = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

    await this.db.$transaction([
      this.db.emailVerificationToken.deleteMany({
        where: { userId: user.id, purpose: TokenPurpose.EMAIL_VERIFICATION },
      }),
      this.db.emailVerificationToken.create({
        data: {
          userId: user.id,
          token: verificationToken,
          code: otpCode,
          purpose: TokenPurpose.EMAIL_VERIFICATION,
          expiresAt,
        },
      }),
      this.db.notification.create({
        data: {
          userId: user.id,
          type: 'SYSTEM',
          title: 'Повторный код подтверждения',
          body: `Ваш новый код подтверждения: ${otpCode}`,
        },
      }),
    ]);

    await this.mailService.sendVerificationCode(user.email, otpCode);

    return {
      success: true,
      email: user.email,
      message: 'Новый код подтверждения отправлен',
    };
  }

  async forgotPassword(email: string) {
    const normalizedEmail = email.toLowerCase().trim();
    const user = await this.db.user.findUnique({ where: { email: normalizedEmail } });
    if (!user) {
      // Return success to prevent email enumeration attack
      return { success: true, message: 'Инструкции по сбросу пароля отправлены на ваш email' };
    }

    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetCode = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await this.db.emailVerificationToken.create({
      data: {
        userId: user.id,
        token: resetToken,
        code: resetCode,
        purpose: TokenPurpose.PASSWORD_RESET,
        expiresAt,
      },
    });

    await this.db.notification.create({
      data: {
        userId: user.id,
        type: 'SYSTEM',
        title: 'Сброс пароля',
        body: `Код для сброса пароля: ${resetCode}`,
      },
    });

    await this.mailService.sendPasswordReset(user.email, resetCode);

    return {
      success: true,
      message: 'Инструкции по сбросу пароля отправлены на ваш email',
    };
  }

  async resetPassword(email: string, code: string, newPassword: string) {
    this.validatePasswordPolicy(newPassword);

    const normalizedEmail = email.toLowerCase().trim();
    const user = await this.db.user.findUnique({ where: { email: normalizedEmail } });
    if (!user) {
      throw new BadRequestException('Недействительный запрос');
    }

    const resetRecord = await this.db.emailVerificationToken.findFirst({
      where: {
        userId: user.id,
        code: code.trim(),
        purpose: TokenPurpose.PASSWORD_RESET,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!resetRecord) {
      throw new BadRequestException('Неверный или просроченный код сброса пароля');
    }

    const passwordHash = await bcrypt.hash(newPassword, 12);

    await this.db.$transaction([
      this.db.user.update({
        where: { id: user.id },
        data: { passwordHash },
      }),
      this.db.emailVerificationToken.deleteMany({
        where: { userId: user.id, purpose: TokenPurpose.PASSWORD_RESET },
      }),
      this.db.activityLog.create({
        data: {
          actorId: user.id,
          action: 'USER_PASSWORD_RESET',
        },
      }),
    ]);

    return { success: true, message: 'Пароль успешно изменен. Теперь вы можете войти.' };
  }

  async login(email: string, password: string) {
    const normalizedEmail = email.toLowerCase().trim();
    const user = await this.db.user.findUnique({
      where: { email: normalizedEmail },
      include: { profile: true },
    });

    if (!user || !user.isActive || !user.passwordHash || !(await bcrypt.compare(password, user.passwordHash))) {
      // Audit log failed login attempt if user exists
      if (user) {
        await this.db.activityLog.create({
          data: {
            actorId: user.id,
            action: 'LOGIN_FAILED_ATTEMPT',
            metadata: { email: normalizedEmail },
          },
        }).catch(() => null);
      }
      throw new UnauthorizedException('Неверный email или пароль');
    }

    if (!user.isEmailVerified) {
      throw new ForbiddenException('Пожалуйста, подтвердите ваш email перед входом');
    }

    // Log successful login
    await this.db.activityLog.create({
      data: {
        actorId: user.id,
        action: 'USER_LOGIN_SUCCESS',
      },
    }).catch(() => null);

    return { accessToken: this.token(user), user: this.publicUser(user) };
  }

  async me(token: string) {
    const payload = this.verify(token);
    const user = await this.db.user.findUnique({
      where: { id: payload.sub },
      include: { profile: true },
    });
    if (!user || !user.isActive) throw new UnauthorizedException();
    return this.publicUser(user);
  }

  private verify(token: string): TokenPayload {
    try {
      return jwt.verify(token, this.secret()) as TokenPayload;
    } catch {
      throw new UnauthorizedException('Недействительный или просроченный токен');
    }
  }

  async googleAuth(dto: { googleId: string; email: string; fullName: string; avatarUrl?: string }) {
    const normalizedEmail = dto.email.trim().toLowerCase();

    let user = await this.db.user.findFirst({
      where: {
        OR: [{ googleId: dto.googleId }, { email: normalizedEmail }],
      },
      include: { profile: true },
    });

    if (user) {
      user = await this.db.user.update({
        where: { id: user.id },
        data: {
          googleId: dto.googleId,
          authProvider: user.authProvider === AuthProvider.LOCAL && !user.googleId ? AuthProvider.GOOGLE : user.authProvider,
          isEmailVerified: true,
          lastLoginAt: new Date(),
        },
        include: { profile: true },
      });

      if (dto.avatarUrl && user.profile && !user.profile.avatarUrl) {
        await this.db.profile.update({
          where: { userId: user.id },
          data: { avatarUrl: dto.avatarUrl },
        });
      }

      await this.db.activityLog.create({
        data: {
          actorId: user.id,
          action: 'GOOGLE_LOGIN',
          metadata: { email: normalizedEmail, googleId: dto.googleId },
        },
      }).catch(() => null);

      return { accessToken: this.token(user), user: this.publicUser(user) };
    }

    return this.db.$transaction(async (tx) => {
      const createdUser = await tx.user.create({
        data: {
          email: normalizedEmail,
          authProvider: AuthProvider.GOOGLE,
          googleId: dto.googleId,
          isEmailVerified: true,
          emailVerifiedAt: new Date(),
          lastLoginAt: new Date(),
          role: Role.READER,
          profile: {
            create: {
              fullName: dto.fullName,
              avatarUrl: dto.avatarUrl,
            },
          },
        },
        include: { profile: true },
      });

      await tx.activityLog.create({
        data: {
          actorId: createdUser.id,
          action: 'GOOGLE_REGISTER',
          metadata: { email: normalizedEmail, googleId: dto.googleId },
        },
      });

      return { accessToken: this.token(createdUser), user: this.publicUser(createdUser) };
    });
  }

  private publicUser(user: {
    id: string;
    email: string;
    role: Role;
    isEmailVerified?: boolean;
    profile?: { fullName: string; institution: string | null; orcid?: string | null } | null;
  }) {
    return {
      id: user.id,
      email: user.email,
      role: user.role,
      isEmailVerified: user.isEmailVerified ?? false,
      profile: user.profile,
    };
  }
}
