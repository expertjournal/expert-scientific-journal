import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { Request } from 'express';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger(LoggingInterceptor.name);

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest<Request>();
    const { method, url } = request;
    const now = Date.now();
    const correlationId =
      (request.headers['x-correlation-id'] as string) ||
      `req-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;

    request.headers['x-correlation-id'] = correlationId;

    return next.handle().pipe(
      tap(() => {
        const delay = Date.now() - now;
        this.logger.log(
          `[CorrelationID: ${correlationId}] ${method} ${url} - ${delay}ms`
        );
      })
    );
  }
}
