import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { ApiErrorResponse } from '../interfaces/api-response.interface';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const correlationId =
      (request.headers['x-correlation-id'] as string) ||
      `req-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;

    let message: string | string[] = 'Internal server error';
    let errorCode = 'INTERNAL_SERVER_ERROR';
    let details: any = undefined;

    if (exception instanceof HttpException) {
      const res = exception.getResponse();
      errorCode = exception.constructor.name.replace(/Exception$/, '').toUpperCase();

      if (typeof res === 'string') {
        message = res;
      } else if (typeof res === 'object' && res !== null) {
        const obj = res as any;
        message = obj.message || exception.message;
        details = obj.error || undefined;
      }
    } else if (exception instanceof Error) {
      this.logger.error(
        `[CorrelationID: ${correlationId}] Unhandled Exception: ${exception.message}`,
        exception.stack
      );
      const isDevExplicit = process.env.NODE_ENV === 'development';
      message = isDevExplicit ? exception.message : 'Internal server error';
    }

    const errorPayload: ApiErrorResponse = {
      success: false,
      statusCode: status,
      error: {
        code: errorCode,
        message,
        details,
      },
      correlationId,
      timestamp: new Date().toISOString(),
      path: request.url,
    };

    response.status(status).json(errorPayload);
  }
}
