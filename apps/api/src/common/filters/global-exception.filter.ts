import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

import { ErrorResponseDto } from '../dto/base-response.dto';

/**
 * Global exception filter that catches all exceptions and formats them
 * into a consistent ErrorResponseDto structure.
 *
 * Features:
 * - Consistent error response format across all endpoints
 * - Severity-based logging (ERROR for 5xx, WARN for 4xx)
 * - Preserves original error messages for HttpExceptions
 * - Hides internal details for unexpected errors
 *
 * @example
 * // Register globally in main.ts
 * app.useGlobalFilters(new GlobalExceptionFilter());
 */
@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const errorResponse = this.formatError(exception, request.url);

    this.logError(exception, errorResponse);

    response.status(errorResponse.statusCode).json(errorResponse);
  }

  /**
   * Format any exception into a consistent ErrorResponseDto.
   */
  private formatError(exception: unknown, path: string): ErrorResponseDto {
    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      let message: string;
      if (typeof exceptionResponse === 'string') {
        message = exceptionResponse;
      } else if (typeof exceptionResponse === 'object' && exceptionResponse !== null) {
        const responseObj = exceptionResponse as Record<string, unknown>;
        if (Array.isArray(responseObj['message'])) {
          message = responseObj['message'].join(', ');
        } else if (typeof responseObj['message'] === 'string') {
          message = responseObj['message'];
        } else {
          message = exception.message;
        }
      } else {
        message = exception.message;
      }

      return {
        statusCode: status,
        message,
        error: this.getErrorName(status),
        timestamp: new Date().toISOString(),
        path,
      };
    }

    // For non-HTTP exceptions, return a generic 500 error
    return {
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      message: 'Internal server error',
      error: 'Internal Server Error',
      timestamp: new Date().toISOString(),
      path,
    };
  }

  /**
   * Log errors based on severity.
   * - 5xx errors: ERROR level with stack trace
   * - 4xx errors: WARN level without stack trace
   */
  private logError(exception: unknown, errorResponse: ErrorResponseDto): void {
    const logMessage = `${errorResponse.statusCode} ${errorResponse.error}: ${errorResponse.message} [${errorResponse.path}]`;

    if (errorResponse.statusCode >= 500) {
      this.logger.error(logMessage, exception instanceof Error ? exception.stack : undefined);
    } else if (errorResponse.statusCode >= 400) {
      this.logger.warn(logMessage);
    }
  }

  /**
   * Get the standard HTTP error name for a status code.
   */
  private getErrorName(status: number): string {
    const errorNames: Record<number, string> = {
      400: 'Bad Request',
      401: 'Unauthorized',
      403: 'Forbidden',
      404: 'Not Found',
      405: 'Method Not Allowed',
      409: 'Conflict',
      422: 'Unprocessable Entity',
      429: 'Too Many Requests',
      500: 'Internal Server Error',
      502: 'Bad Gateway',
      503: 'Service Unavailable',
    };

    return errorNames[status] ?? HttpStatus[status] ?? 'Error';
  }
}
