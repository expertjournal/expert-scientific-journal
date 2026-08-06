import { Body, Controller, Get, Headers, Post, UseGuards } from '@nestjs/common';
import { IsEmail, IsEnum, IsNotEmpty, IsOptional, MinLength } from 'class-validator';
import { Role } from '@prisma/client';
import { AuthService } from './auth.service';
import { ThrottlerGuard } from '@nestjs/throttler';

class RegisterDto {
  @IsEmail() email!: string;
  @MinLength(8) password!: string;
  @IsNotEmpty() fullName!: string;
  @IsOptional() institution?: string;
  @IsOptional() @IsEnum(Role) role?: Role;
  @IsOptional() orcid?: string;
}

class LoginDto {
  @IsEmail() email!: string;
  @IsNotEmpty() password!: string;
}

class VerifyEmailDto {
  @IsEmail() email!: string;
  @IsNotEmpty() code!: string;
}

class ResendVerificationDto {
  @IsEmail() email!: string;
}

class ForgotPasswordDto {
  @IsEmail() email!: string;
}

class ResetPasswordDto {
  @IsEmail() email!: string;
  @IsNotEmpty() code!: string;
  @MinLength(8) newPassword!: string;
}

class GoogleAuthDto {
  @IsNotEmpty() googleId!: string;
  @IsEmail() email!: string;
  @IsNotEmpty() fullName!: string;
  @IsOptional() avatarUrl?: string;
}

@Controller('auth')
export class AuthController {
  constructor(private auth: AuthService) {}

  @Post('google')
  @UseGuards(ThrottlerGuard)
  googleAuth(@Body() body: GoogleAuthDto) {
    return this.auth.googleAuth(body);
  }

  @Post('register')
  @UseGuards(ThrottlerGuard)
  register(@Body() body: RegisterDto) {
    return this.auth.register(body);
  }

  @Post('verify-email')
  @UseGuards(ThrottlerGuard)
  verifyEmail(@Body() body: VerifyEmailDto) {
    return this.auth.verifyEmail(body.email, body.code);
  }

  @Post('resend-verification')
  @UseGuards(ThrottlerGuard)
  resendVerification(@Body() body: ResendVerificationDto) {
    return this.auth.resendVerification(body.email);
  }

  @Post('forgot-password')
  @UseGuards(ThrottlerGuard)
  forgotPassword(@Body() body: ForgotPasswordDto) {
    return this.auth.forgotPassword(body.email);
  }

  @Post('reset-password')
  @UseGuards(ThrottlerGuard)
  resetPassword(@Body() body: ResetPasswordDto) {
    return this.auth.resetPassword(body.email, body.code, body.newPassword);
  }

  @Post('login')
  @UseGuards(ThrottlerGuard)
  login(@Body() body: LoginDto) {
    return this.auth.login(body.email, body.password);
  }

  @Get('me')
  me(@Headers('authorization') authorization?: string) {
    return this.auth.me(authorization?.replace(/^Bearer\s+/i, '') ?? '');
  }
}
