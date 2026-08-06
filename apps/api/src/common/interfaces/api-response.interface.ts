export interface ApiResponse<T = any> {
  success: boolean;
  statusCode: number;
  data: T;
  meta?: {
    page?: number;
    limit?: number;
    total?: number;
    totalPages?: number;
    [key: string]: any;
  };
  correlationId?: string;
  timestamp: string;
}

export interface ApiErrorResponse {
  success: false;
  statusCode: number;
  error: {
    code: string;
    message: string | string[];
    details?: any;
  };
  correlationId: string;
  timestamp: string;
  path: string;
}
