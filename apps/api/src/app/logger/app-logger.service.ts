import { Injectable, Logger, LogLevel } from '@nestjs/common';

/**
 * Custom logger service that extends NestJS Logger
 * Provides application-wide logging with environment-based configuration
 */
@Injectable()
export class AppLoggerService extends Logger {
  constructor(context?: string) {
    super(context ?? 'AppLogger');
  }

  /**
   * Get log levels based on environment
   */
  static getLogLevels(): LogLevel[] {
    const logLevel = process.env.LOG_LEVEL;
    const nodeEnv = process.env.NODE_ENV;

    // If LOG_LEVEL is explicitly set, use it
    if (logLevel) {
      return this.mapLogLevelToArray(logLevel);
    }

    // Default based on environment
    if (nodeEnv === 'production') {
      return ['error', 'warn', 'log'];
    }

    // Development default: all levels
    return ['error', 'warn', 'log', 'debug', 'verbose'];
  }

  /**
   * Map log level string to array of enabled levels
   */
  private static mapLogLevelToArray(level: string): LogLevel[] {
    const levels: LogLevel[] = ['error', 'warn', 'log', 'debug', 'verbose'];
    const levelIndex = levels.indexOf(level as LogLevel);

    if (levelIndex === -1) {
      // Invalid level, return default
      return ['error', 'warn', 'log'];
    }

    // Return all levels up to and including the specified level
    return levels.slice(0, levelIndex + 1);
  }

  /**
   * Override error method to ensure stack traces are included
   */
  override error(message: unknown, trace?: string, context?: string): void {
    if (message instanceof Error) {
      super.error(message.message, message.stack, context ?? this.context);
    } else {
      super.error(message, trace, context ?? this.context);
    }
  }

  /**
   * Override warn method
   */
  override warn(message: unknown, context?: string): void {
    super.warn(message, context ?? this.context);
  }

  /**
   * Override log method
   */
  override log(message: unknown, context?: string): void {
    super.log(message, context ?? this.context);
  }

  /**
   * Override debug method
   */
  override debug(message: unknown, context?: string): void {
    super.debug(message, context ?? this.context);
  }

  /**
   * Override verbose method
   */
  override verbose(message: unknown, context?: string): void {
    super.verbose(message, context ?? this.context);
  }
}
