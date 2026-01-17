/**
 * Monitoring Types and Interfaces
 *
 * This file contains type definitions for the monitoring system,
 * including APM metrics, database monitoring, and performance tracking.
 */

/**
 * Database query metrics interface
 */
export interface QueryMetrics {
  totalQueries: number;
  slowQueries: number;
  errorQueries: number;
  averageQueryTime: number;
  queryTimesByOperation: Map<string, number[]>;
}

/**
 * APM configuration interface
 */
export interface APMConfig {
  serviceName: string;
  serviceVersion: string;
  environment: string;
  jaegerEnabled: boolean;
  jaegerEndpoint: string;
  prometheusPort: number;
  slowQueryThreshold: number;
  enableQueryLogging: boolean;
}

/**
 * Performance metrics interface
 */
export interface PerformanceMetrics {
  database: DatabasePerformanceMetrics;
  system: SystemMetrics;
  timestamp: string;
}

/**
 * Database performance metrics
 */
export interface DatabasePerformanceMetrics {
  totalQueries: number;
  averageQueryTime: number;
  slowQueryPercentage: number;
  errorRate: number;
}

/**
 * System metrics interface
 */
export interface SystemMetrics {
  uptime: number;
  memoryUsage: NodeJS.MemoryUsage;
  nodeVersion: string;
  environment: string;
}

/**
 * Monitoring health status
 */
export interface MonitoringHealth {
  apm: boolean;
  database: boolean;
  metrics: boolean;
  timestamp: string;
}

/**
 * Trace attributes for custom spans
 */
export interface TraceAttributes {
  [key: string]: string | number | boolean;
}

/**
 * Business metrics labels
 */
export interface MetricLabels {
  [key: string]: string;
}

/**
 * Slow query information
 */
export interface SlowQueryInfo {
  operation: string;
  model: string;
  duration: number;
  threshold: number;
  params: unknown;
}

/**
 * Query error information
 */
export interface QueryErrorInfo {
  operation: string;
  model: string;
  error: {
    type: string;
    message: string;
  };
  params: unknown;
}

/**
 * HTTP request metrics
 */
export interface HTTPRequestMetrics {
  method: string;
  route: string;
  statusCode: number;
  duration: number;
  userAgent: string;
  userId?: string;
}

/**
 * Business event types for tracking
 */
export enum BusinessEventType {
  BOOKING_CREATED = 'booking.created',
  PAYMENT_PROCESSED = 'payment.processed',
  MESSAGE_EXCHANGED = 'message.exchanged',
  USER_REGISTERED = 'user.registered',
  SESSION_COMPLETED = 'session.completed',
}

/**
 * Business event data
 */
export interface BusinessEventData {
  type: BusinessEventType;
  userId?: string;
  coachId?: string;
  amount?: number;
  metadata?: Record<string, unknown>;
}

/**
 * APM service interface for dependency injection
 */
export interface IAPMService {
  traceOperation<T>(
    operationName: string,
    operation: () => Promise<T>,
    attributes?: TraceAttributes
  ): Promise<T>;

  recordAPIRequest(method: string, route: string, statusCode: number, duration: number): void;

  recordBookingCreated(userId: string, coachId: string, amount: number): void;
  recordPaymentProcessed(paymentId: string, amount: number, status: string): void;
  recordMessageExchanged(senderId: string, receiverId: string, messageType: string): void;
  updateActiveUsers(count: number): void;

  traceDatabaseOperation<T>(operation: string, table: string, query: () => Promise<T>): Promise<T>;

  traceExternalCall<T>(serviceName: string, operation: string, call: () => Promise<T>): Promise<T>;

  recordCustomMetric(name: string, value: number, labels?: MetricLabels): void;
  timeOperation<T>(operationName: string, operation: () => Promise<T>): Promise<T>;
}

/**
 * Database monitoring interface
 */
export interface IDatabaseMonitor {
  getMetrics(): QueryMetrics;
  getSlowQueriesByOperation(): Record<string, number[]>;
  resetMetrics(): void;
}

/**
 * Monitoring configuration constants
 */
export const MONITORING_CONSTANTS = {
  DEFAULT_SLOW_QUERY_THRESHOLD: 1000,
  DEFAULT_PROMETHEUS_PORT: 9090,
  DEFAULT_SERVICE_NAME: 'tennis-coach-api',
  DEFAULT_SERVICE_VERSION: '1.0.0',
  METRICS_COLLECTION_INTERVAL: 15000, // 15 seconds
  TRACE_SAMPLE_RATE: 1.0, // 100% sampling in development
} as const;

/**
 * Monitoring event names for consistency
 */
export const MONITORING_EVENTS = {
  SLOW_QUERY_DETECTED: 'monitoring.slow_query_detected',
  QUERY_ERROR: 'monitoring.query_error',
  HIGH_MEMORY_USAGE: 'monitoring.high_memory_usage',
  HIGH_ERROR_RATE: 'monitoring.high_error_rate',
} as const;
