import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import jwt from 'jsonwebtoken';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private config: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers['authorization'];

    if (!authHeader) {
      throw new UnauthorizedException('Authorization token required');
    }

    const token = authHeader.replace(/^Bearer\s+/i, '');
    if (!token) {
      throw new UnauthorizedException('Invalid authorization token format');
    }

    try {
      const secret = this.config.get<string>('JWT_SECRET') || 'dev_secret_key_expert_2026';
      const payload = jwt.verify(token, secret) as any;
      request.user = payload;
      return true;
    } catch {
      throw new UnauthorizedException('Invalid or expired authentication token');
    }
  }
}
