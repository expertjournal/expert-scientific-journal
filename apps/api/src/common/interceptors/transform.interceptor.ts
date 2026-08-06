import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { ApiResponse } from '../interfaces/api-response.interface';

@Injectable()
export class TransformInterceptor<T>
  implements NestInterceptor<T, ApiResponse<T>>
{
  intercept(
    context: ExecutionContext,
    next: CallHandler
  ): Observable<ApiResponse<T>> {
    const request = context.switchToHttp().getRequest();
    const response = context.switchToHttp().getResponse();
    const correlationId =
      (request.headers['x-correlation-id'] as string) || undefined;

    return next.handle().pipe(
      map((resData) => {
        // If response is already wrapped or null/undefined
        if (resData && typeof resData === 'object' && 'success' in resData) {
          return resData;
        }

        let meta: any = undefined;
        let data = resData;

        if (resData && typeof resData === 'object' && 'data' in resData && 'meta' in resData) {
          data = resData.data;
          meta = resData.meta;
        }

        return {
          success: true,
          statusCode: response.statusCode,
          data,
          meta,
          correlationId,
          timestamp: new Date().toISOString(),
        };
      })
    );
  }
}
