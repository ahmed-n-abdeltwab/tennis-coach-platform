import { metrics, trace } from '@opentelemetry/api';
import { Prisma } from '@prisma/client';

/**
 * Prisma Client Extension for Database Query Monitoring
 *
 * This extension provides comprehensive monitoring for database operations using
 * Prisma 7's Client Extensions (replacement for deprecated middleware):
 * - Query execution time tracking
 * - Slow query detection and logging
 * - Query count metrics by operation type
 * - Error tracking for failed queries
 * - OpenTelemetry tracing integration
 */

interface QueryMetrics {
  totalQueries: number;
  slowQueries: number;
  errorQueries: number;
  averageQueryTime: number;
  queryTimesByOperation: Map<string, number[]>;
}

class DatabaseMonitor {
  private static instance: DatabaseMonitor;
  readonly tracer = trace.getTracer('tennis-coach-db');
  private readonly meter = metrics.getMeter('tennis-coach-db');

  // Metrics collectors
  private readonly queryCounter = this.meter.createCounter('db_queries_total', {
    description: 'Total number of database queries executed',
  });

  private readonly queryDuration = this.meter.createHistogram('db_query_duration_ms', {
    description: 'Database query execution time in milliseconds',
  });

  private readonly slowQueryCounter = this.meter.createCounter('db_slow_queries_total', {
    description: 'Total number of slow database queries',
  });

  private readonly errorCounter = this.meter.createCounter('db_query_errors_total', {
    description: 'Total number of failed database queries',
  });

  // Configuration
  private readonly slowQueryThreshold = parseInt(process.env.SLOW_QUERY_THRESHOLD_MS ?? '1000', 10);
  private readonly enableQueryLogging = process.env.DB_QUERY_LOGGING === 'true';

  // Runtime metrics
  private metrics: QueryMetrics = {
    totalQueries: 0,
    slowQueries: 0,
    errorQueries: 0,
    averageQueryTime: 0,
    queryTimesByOperation: new Map(),
  };

  static getInstance(): DatabaseMonitor {
    if (!DatabaseMonitor.instance) {
      DatabaseMonitor.instance = new DatabaseMonitor();
    }
    return DatabaseMonitor.instance;
  }

  /**
   * Record query metrics
   */
  recordQueryMetrics(operation: string, model: string, duration: number, success: boolean): void {
    this.metrics.totalQueries++;

    const labels = {
      operation,
      model,
      success: success.toString(),
    };

    // Record OpenTelemetry metrics
    this.queryCounter.add(1, labels);
    this.queryDuration.record(duration, labels);

    if (!success) {
      this.metrics.errorQueries++;
      this.errorCounter.add(1, labels);
    }

    // Track query times by operation
    const operationKey = `${operation}.${model}`;
    if (!this.metrics.queryTimesByOperation.has(operationKey)) {
      this.metrics.queryTimesByOperation.set(operationKey, []);
    }
    this.metrics.queryTimesByOperation.get(operationKey)?.push(duration);

    // Update average query time
    this.updateAverageQueryTime(duration);
  }

  /**
   * Handle slow query detection
   */
  handleSlowQuery(operation: string, model: string, duration: number, args: unknown): void {
    this.metrics.slowQueries++;

    const labels = {
      operation,
      model,
    };

    this.slowQueryCounter.add(1, labels);

    console.warn(`🐌 Slow Query Detected: ${operation} ${model} (${duration}ms)`);

    // Create a specific span for slow queries
    this.tracer
      .startSpan('db.slow_query', {
        attributes: {
          'db.operation': operation,
          'db.table': model,
          'db.duration_ms': duration,
          'db.threshold_ms': this.slowQueryThreshold,
          'db.args': JSON.stringify(args),
        },
      })
      .end();
  }

  /**
   * Handle query errors
   */
  handleQueryError(operation: string, model: string, error: Error, args: unknown): void {
    console.error(`❌ Database Query Error: ${operation} ${model}`);
    console.error('Error:', error.message);
    console.error('Query args:', JSON.stringify(args, null, 2));

    // Create error span
    this.tracer
      .startSpan('db.query_error', {
        attributes: {
          'db.operation': operation,
          'db.table': model,
          'db.error.type': error.constructor.name,
          'db.error.message': error.message,
          'db.args': JSON.stringify(args),
        },
      })
      .end();
  }

  /**
   * Update running average query time
   */
  private updateAverageQueryTime(duration: number): void {
    const currentAverage = this.metrics.averageQueryTime;
    const totalQueries = this.metrics.totalQueries;

    this.metrics.averageQueryTime = (currentAverage * (totalQueries - 1) + duration) / totalQueries;
  }

  /**
   * Get current database metrics
   */
  getMetrics(): QueryMetrics {
    return { ...this.metrics };
  }

  /**
   * Get slow queries by operation
   */
  getSlowQueriesByOperation(): Record<string, number[]> {
    const slowQueries: Record<string, number[]> = {};

    for (const [operation, times] of this.metrics.queryTimesByOperation.entries()) {
      const slowTimes = times.filter(time => time > this.slowQueryThreshold);
      if (slowTimes.length > 0) {
        slowQueries[operation] = slowTimes;
      }
    }

    return slowQueries;
  }

  /**
   * Reset metrics (useful for testing)
   */
  resetMetrics(): void {
    this.metrics = {
      totalQueries: 0,
      slowQueries: 0,
      errorQueries: 0,
      averageQueryTime: 0,
      queryTimesByOperation: new Map(),
    };
  }
}

/**
 * Prisma Client Extension for Database Monitoring
 *
 * This replaces the deprecated Prisma middleware with the new Client Extensions API
 */
export const databaseMonitoringExtension = Prisma.defineExtension({
  name: 'database-monitoring',
  query: {
    async $allOperations({ operation, model, args, query }) {
      const monitor = DatabaseMonitor.getInstance();
      const startTime = Date.now();
      const modelName = model ?? 'unknown';
      const spanName = `db.${operation}.${modelName}`;

      return monitor.tracer.startActiveSpan(spanName, async span => {
        try {
          // Set span attributes
          span.setAttributes({
            'db.system': 'postgresql',
            'db.operation': operation,
            'db.table': modelName,
            'db.prisma.action': operation,
          });

          // Add query details if available
          if (args && typeof args === 'object' && args !== null) {
            const queryArgs = args as Record<string, unknown>;
            if ('where' in queryArgs && queryArgs.where) {
              span.setAttribute('db.where_conditions', JSON.stringify(queryArgs.where));
            }
            if ('select' in queryArgs && queryArgs.select) {
              span.setAttribute('db.select_fields', JSON.stringify(queryArgs.select));
            }
            if ('include' in queryArgs && queryArgs.include) {
              span.setAttribute('db.include_relations', JSON.stringify(queryArgs.include));
            }
          }

          // Execute the query
          const result = await query(args);
          const duration = Date.now() - startTime;

          // Record successful query metrics
          monitor.recordQueryMetrics(operation, modelName, duration, true);

          // Log slow queries
          if (duration > monitor['slowQueryThreshold']) {
            monitor.handleSlowQuery(operation, modelName, duration, args);
          }

          // Update span with success information
          span.setAttributes({
            'db.duration_ms': duration,
            'db.success': true,
          });

          // Log query if enabled
          if (monitor['enableQueryLogging']) {
            console.log(`🔍 DB Query: ${operation} ${modelName} (${duration}ms)`);
          }

          return result;
        } catch (error) {
          const duration = Date.now() - startTime;

          // Record error metrics
          monitor.recordQueryMetrics(operation, modelName, duration, false);
          monitor.handleQueryError(operation, modelName, error as Error, args);

          // Update span with error information
          span.recordException(error as Error);
          span.setAttributes({
            'db.duration_ms': duration,
            'db.success': false,
            'db.error.type': (error as Error).constructor.name,
            'db.error.message': (error as Error).message,
          });

          throw error;
        } finally {
          span.end();
        }
      });
    },
  },
});

/**
 * Get database monitoring metrics
 */
export function getDatabaseMetrics(): QueryMetrics {
  const monitor = DatabaseMonitor.getInstance();
  return monitor.getMetrics();
}

/**
 * Get slow queries by operation
 */
export function getSlowQueriesByOperation(): Record<string, number[]> {
  const monitor = DatabaseMonitor.getInstance();
  return monitor.getSlowQueriesByOperation();
}
