import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Request, Response } from 'express';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

import { AppLoggerService } from './app-logger.service';

/**
 * HTTP logging interceptor that logs request and response details
 * Captures method, URL, timestamp, IP, user agent, status code, and duration
 */
@Injectable()
export class HttpLoggingInterceptor implements NestInterceptor {
  private readonly logger: AppLoggerService;

  constructor(loggerService: AppLoggerService) {
    // Create logger instance with HTTP context
    this.logger = loggerService ?? new AppLoggerService('HTTP');
  }

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const httpContext = context.switchToHttp();
    const request = httpContext.getRequest<Request>();
    const response = httpContext.getResponse<Response>();

    const { method, url, ip, headers } = request;
    const userAgent = headers['user-agent'] ?? 'Unknown';
    const startTime = Date.now();
    const timestamp = new Date().toISOString();

    // Log incoming request
    this.logger.log(
      `Incoming Request: ${method} ${url} - IP: ${ip} - User-Agent: ${userAgent} - Timestamp: ${timestamp}`
    );

    return next.handle().pipe(
      tap({
        next: () => {
          const duration = Date.now() - startTime;
          const { statusCode } = response;

          // Log response details
          this.logger.log(
            `Response: ${method} ${url} - Status: ${statusCode} - Duration: ${duration}ms`
          );
        },
        error: (error: Error) => {
          const duration = Date.now() - startTime;
          const statusCode = response.statusCode ?? 500;

          // Log error response
          this.logger.error(
            `Error Response: ${method} ${url} - Status: ${statusCode} - Duration: ${duration}ms - Error: ${error.message}`,
            error.stack
          );
        },
      })
    );
  }
}
