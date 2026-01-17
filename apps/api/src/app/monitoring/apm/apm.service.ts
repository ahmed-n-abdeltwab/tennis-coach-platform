import { Inject, Injectable } from '@nestjs/common';
import { Counter, Histogram, SpanKind, UpDownCounter } from '@opentelemetry/api';

import {
  ITelemetryMeter,
  ITelemetryProvider,
  ITelemetryTracer,
} from './interfaces/telemetry.interface';

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
  private readonly tracer: ITelemetryTracer;
  private readonly meter: ITelemetryMeter;

  // Custom metrics - initialized in constructor
  private readonly requestCounter: Counter;
  private readonly requestDuration: Histogram;
  private readonly businessMetrics: {
    bookingsCreated: Counter;
    paymentsProcessed: Counter;
    messagesExchanged: Counter;
    activeUsers: UpDownCounter;
  };

  constructor(
    @Inject('ITelemetryProvider') private readonly telemetryProvider: ITelemetryProvider
  ) {
    // Initialize telemetry components
    this.tracer = this.telemetryProvider.getTracer('tennis-coach-api');
    this.meter = this.telemetryProvider.getMeter('tennis-coach-api');

    // Initialize metrics
    this.requestCounter = this.meter.createCounter('api_requests_total', {
      description: 'Total number of API requests',
    });

    this.requestDuration = this.meter.createHistogram('api_request_duration_ms', {
      description: 'API request duration in milliseconds',
    });

    this.businessMetrics = {
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
  }

  /**
   * Create a custom span for tracing operations
   */
  async traceOperation<T>(
    operationName: string,
    operation: () => Promise<T>,
    attributes?: Record<string, string | number | boolean>
  ): Promise<T> {
    return this.tracer.startActiveSpan(operationName, operation, attributes);
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
    const span = this.tracer.startSpan('booking.created', {
      kind: SpanKind.INTERNAL,
      attributes: {
        'booking.user_id': userId,
        'booking.coach_id': coachId,
        'booking.amount': amount,
      },
    });
    span.end();
  }

  /**
   * Record payment processing metrics
   */
  recordPaymentProcessed(paymentId: string, amount: number, status: string): void {
    this.businessMetrics.paymentsProcessed.add(1, {
      payment_id: paymentId,
      status,
    });

    const span = this.tracer.startSpan('payment.processed', {
      kind: SpanKind.INTERNAL,
      attributes: {
        'payment.id': paymentId,
        'payment.amount': amount,
        'payment.status': status,
      },
    });
    span.end();
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
