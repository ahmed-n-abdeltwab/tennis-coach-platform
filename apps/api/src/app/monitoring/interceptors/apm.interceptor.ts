import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Request, Response } from 'express';
import { Observable } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';

import { APMService } from '../apm/apm.service';

/**
 * APM Interceptor for automatic request tracking
 *
 * This interceptor automatically tracks all HTTP requests with:
 * - Request duration
 * - Response status codes
 * - Route information
 * - Error tracking
 */

@Injectable()
export class APMInterceptor implements NestInterceptor {
  constructor(private readonly apmService: APMService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const startTime = Date.now();
    const request = context.switchToHttp().getRequest<Request>();
    const response = context.switchToHttp().getResponse<Response>();

    const method = request.method;
    const route = this.extractRoute(request);
    const userAgent = request.headers['user-agent'] ?? 'unknown';
    const userId = this.extractUserId(request);

    return next.handle().pipe(
      tap(() => {
        // Record successful request
        const duration = Date.now() - startTime;
        const statusCode = response.statusCode;

        this.apmService.recordAPIRequest(method, route, statusCode, duration);

        // Create custom span for the request
        this.apmService.traceOperation(
          `http.${method.toLowerCase()}`,
          async () => {
            // Operation already completed, just for tracing
            return Promise.resolve();
          },
          {
            'http.method': method,
            'http.route': route,
            'http.status_code': statusCode,
            'http.duration_ms': duration,
            'http.user_agent': userAgent,
            'user.id': userId ?? 'anonymous',
          }
        );
      }),
      catchError(error => {
        // Record failed request
        const duration = Date.now() - startTime;
        const statusCode = error.status ?? 500;

        this.apmService.recordAPIRequest(method, route, statusCode, duration);

        // Record error in APM
        this.apmService
          .traceOperation(
            `http.${method.toLowerCase()}.error`,
            async () => {
              throw error;
            },
            {
              'http.method': method,
              'http.route': route,
              'http.status_code': statusCode,
              'http.duration_ms': duration,
              'http.user_agent': userAgent,
              'user.id': userId ?? 'anonymous',
              'error.type': error.constructor.name,
              'error.message': error.message,
            }
          )
          .catch(() => {
            // Ignore APM errors to prevent interference with main request
          });

        throw error;
      })
    );
  }

  /**
   * Extract route pattern from request
   */
  private extractRoute(request: Request): string {
    // Try to get the route from NestJS context
    if (request.route?.path) {
      return request.route.path;
    }

    // Fallback to URL pathname with parameter normalization
    const pathname = request.url?.split('?')[0] ?? request.url ?? '/unknown';

    // Normalize common ID patterns (order matters - more specific patterns first)
    return pathname
      .replace(/\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/g, '/:id') // UUID pattern (exact format)
      .replace(/\/c[a-z0-9]{17,}/g, '/:id') // CUID pattern (starts with 'c' + 17+ chars)
      .replace(/\/[0-9]+/g, '/:id'); // Numeric IDs
  }

  /**
   * Extract user ID from request (if authenticated)
   */
  private extractUserId(request: Request): string | undefined {
    // Check for user in request (set by JWT guard)
    const user = (request as unknown as { user?: { sub?: string; id?: string } }).user;
    return user?.sub ?? user?.id;
  }
}
