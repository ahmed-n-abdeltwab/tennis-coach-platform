import { Injectable } from '@nestjs/common';
import { metrics, SpanKind, SpanStatusCode, trace } from '@opentelemetry/api';

/**
 * APM Service for Application Performance Monitoring
 *
 * This service provides utilities for custom tracing, metrics collection,
 * and performance monitoring within the Tennis Coach Platform.
 *
 * Features:
 * - Custom span creation and management
 * - Business metrics collection
 * - Performance timing utilities
 * - Error tracking and reporting
 */

@Injectable()
export class APMService {
  private readonly tracer = trace.getTracer('tennis-coach-api');
  private readonly meter = metrics.getMeter('tennis-coach-api');

  // Custom metrics
  private readonly requestCounter = this.meter.createCounter('api_requests_total', {
    description: 'Total number of API requests',
  });

  private readonly requestDuration = this.meter.createHistogram('api_request_duration_ms', {
    description: 'API request duration in milliseconds',
  });

  private readonly businessMetrics = {
    bookingsCreated: this.meter.createCounter('bookings_created_total', {
      description: 'Total number of bookings created',
    }),
    paymentsProcessed: this.meter.createCounter('payments_processed_total', {
      description: 'Total number of payments processed',
    }),
    messagesExchanged: this.meter.createCounter('messages_exchanged_total', {
      description: 'Total number of messages exchanged',
    }),
    activeUsers: this.meter.createUpDownCounter('active_users_current', {
      description: 'Current number of active users',
    }),
  };

  /**
   * Create a custom span for tracing operations
   */
  async traceOperation<T>(
    operationName: string,
    operation: () => Promise<T>,
    attributes?: Record<string, string | number | boolean>
  ): Promise<T> {
    return this.tracer.startActiveSpan(operationName, async span => {
      try {
        // Add custom attributes
        if (attributes) {
          span.setAttributes(attributes);
        }

        const startTime = Date.now();
        const result = await operation();
        const duration = Date.now() - startTime;

        // Record success metrics
        span.setStatus({ code: SpanStatusCode.OK });
        span.setAttributes({
          'operation.duration_ms': duration,
          'operation.success': true,
        });

        return result;
      } catch (error) {
        // Record error information
        span.recordException(error as Error);
        span.setStatus({
          code: SpanStatusCode.ERROR,
          message: (error as Error).message,
        });
        span.setAttributes({
          'operation.success': false,
          'error.type': (error as Error).constructor.name,
        });

        throw error;
      } finally {
        span.end();
      }
    });
  }

  /**
   * Record API request metrics
   */
  recordAPIRequest(method: string, route: string, statusCode: number, duration: number): void {
    const labels = {
      method,
      route,
      status_code: statusCode.toString(),
    };

    this.requestCounter.add(1, labels);
    this.requestDuration.record(duration, labels);
  }

  /**
   * Record business metrics for booking operations
   */
  recordBookingCreated(userId: string, coachId: string, amount: number): void {
    this.businessMetrics.bookingsCreated.add(1, {
      user_id: userId,
      coach_id: coachId,
    });

    // Also create a custom span for the booking event
    this.tracer
      .startSpan('booking.created', {
        kind: SpanKind.INTERNAL,
        attributes: {
          'booking.user_id': userId,
          'booking.coach_id': coachId,
          'booking.amount': amount,
        },
      })
      .end();
  }

  /**
   * Record payment processing metrics
   */
  recordPaymentProcessed(paymentId: string, amount: number, status: string): void {
    this.businessMetrics.paymentsProcessed.add(1, {
      payment_id: paymentId,
      status,
    });

    this.tracer
      .startSpan('payment.processed', {
        kind: SpanKind.INTERNAL,
        attributes: {
          'payment.id': paymentId,
          'payment.amount': amount,
          'payment.status': status,
        },
      })
      .end();
  }

  /**
   * Record message exchange metrics
   */
  recordMessageExchanged(senderId: string, receiverId: string, messageType: string): void {
    this.businessMetrics.messagesExchanged.add(1, {
      sender_id: senderId,
      receiver_id: receiverId,
      message_type: messageType,
    });
  }

  /**
   * Update active user count
   */
  updateActiveUsers(count: number): void {
    this.businessMetrics.activeUsers.add(count);
  }

  /**
   * Create a database operation span
   */
  async traceDatabaseOperation<T>(
    operation: string,
    table: string,
    query: () => Promise<T>
  ): Promise<T> {
    return this.traceOperation(`db.${operation}`, query, {
      'db.operation': operation,
      'db.table': table,
      'db.system': 'postgresql',
    });
  }

  /**
   * Create an external service call span
   */
  async traceExternalCall<T>(
    serviceName: string,
    operation: string,
    call: () => Promise<T>
  ): Promise<T> {
    return this.traceOperation(`external.${serviceName}`, call, {
      'external.service': serviceName,
      'external.operation': operation,
    });
  }

  /**
   * Record custom metric
   */
  recordCustomMetric(name: string, value: number, labels?: Record<string, string>): void {
    const counter = this.meter.createCounter(`custom_${name}`, {
      description: `Custom metric: ${name}`,
    });
    counter.add(value, labels);
  }

  /**
   * Time an operation and record the duration
   */
  async timeOperation<T>(operationName: string, operation: () => Promise<T>): Promise<T> {
    const startTime = Date.now();
    try {
      const result = await operation();
      const duration = Date.now() - startTime;

      this.recordCustomMetric(`${operationName}_duration_ms`, duration);
      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      this.recordCustomMetric(`${operationName}_error_duration_ms`, duration);
      throw error;
    }
  }
}
