/**
 * Test Performance Monitor
 *
 * Tracks and reports performance metrics for tests including:
 * - Test execution time
 * - Database operation timing
 * - Slow test detection and performance warnings
 *
 * @module infrastructure/performance
 */

export interface PerformanceMetric {
  name: string;
  startTime: number;
  endTime?: number;
  duration?: number;
  type: 'test' | 'database' | 'http' | 'setup' | 'cleanup';
  metadata?: Record<string, unknown>;
}

export interface PerformanceThresholds {
  slowTestMs: number;
  slowDatabaseOpMs: number;
  slowHttpRequestMs: number;
  slowSetupMs: number;
}

export class TestPerformanceMonitor {
  private static instance: TestPerformanceMonitor;
  private metrics: Map<string, PerformanceMetric> = new Map();
  private completedMetrics: PerformanceMetric[] = [];
  private thresholds: PerformanceThresholds = {
    slowTestMs: 1000,
    slowDatabaseOpMs: 500,
    slowHttpRequestMs: 2000,
    slowSetupMs: 3000,
  };

  private constructor() {}

  public static getInstance(): TestPerformanceMonitor {
    if (!TestPerformanceMonitor.instance) {
      TestPerformanceMonitor.instance = new TestPerformanceMonitor();
    }
    return TestPerformanceMonitor.instance;
  }

  /**
   * Start tracking a performance metric
   */
  public startMetric(
    name: string,
    type: PerformanceMetric['type'],
    metadata?: Record<string, unknown>
  ): void {
    const metric: PerformanceMetric = {
      name,
      startTime: Date.now(),
      type,
      metadata,
    };
    this.metrics.set(name, metric);
  }

  /**
   * End tracking a performance metric
   */
  public endMetric(name: string): PerformanceMetric | undefined {
    const metric = this.metrics.get(name);
    if (!metric) {
      return undefined;
    }

    metric.endTime = Date.now();
    metric.duration = metric.endTime - metric.startTime;

    this.metrics.delete(name);
    this.completedMetrics.push(metric);

    // Check if metric exceeds threshold
    this.checkThreshold(metric);

    return metric;
  }

  /**
   * Track a database operation
   */
  public async trackDatabaseOperation<T>(
    operationName: string,
    operation: () => Promise<T>,
    metadata?: Record<string, unknown>
  ): Promise<T> {
    const metricName = `db:${operationName}:${Date.now()}`;
    this.startMetric(metricName, 'database', metadata);

    try {
      const result = await operation();
      this.endMetric(metricName);
      return result;
    } catch (error) {
      this.endMetric(metricName);
      throw error;
    }
  }

  /**
   * Track an HTTP request
   */
  public async trackHttpRequest<T>(
    requestName: string,
    request: () => Promise<T>,
    metadata?: Record<string, unknown>
  ): Promise<T> {
    const metricName = `http:${requestName}:${Date.now()}`;
    this.startMetric(metricName, 'http', metadata);

    try {
      const result = await request();
      this.endMetric(metricName);
      return result;
    } catch (error) {
      this.endMetric(metricName);
      throw error;
    }
  }

  /**
   * Track test setup
   */
  public async trackSetup<T>(setupFn: () => Promise<T>): Promise<T> {
    const metricName = `setup:${Date.now()}`;
    this.startMetric(metricName, 'setup');

    try {
      const result = await setupFn();
      this.endMetric(metricName);
      return result;
    } catch (error) {
      this.endMetric(metricName);
      throw error;
    }
  }

  /**
   * Track test cleanup
   */
  public async trackCleanup<T>(cleanupFn: () => Promise<T>): Promise<T> {
    const metricName = `cleanup:${Date.now()}`;
    this.startMetric(metricName, 'cleanup');

    try {
      const result = await cleanupFn();
      this.endMetric(metricName);
      return result;
    } catch (error) {
      this.endMetric(metricName);
      throw error;
    }
  }

  /**
   * Get all completed metrics
   */
  public getMetrics(): PerformanceMetric[] {
    return [...this.completedMetrics];
  }

  /**
   * Get metrics by type
   */
  public getMetricsByType(type: PerformanceMetric['type']): PerformanceMetric[] {
    return this.completedMetrics.filter(m => m.type === type);
  }

  /**
   * Get slow metrics (exceeding thresholds)
   */
  public getSlowMetrics(): PerformanceMetric[] {
    return this.completedMetrics.filter(metric => {
      if (!metric.duration) return false;

      switch (metric.type) {
        case 'test':
          return metric.duration > this.thresholds.slowTestMs;
        case 'database':
          return metric.duration > this.thresholds.slowDatabaseOpMs;
        case 'http':
          return metric.duration > this.thresholds.slowHttpRequestMs;
        case 'setup':
        case 'cleanup':
          return metric.duration > this.thresholds.slowSetupMs;
        default:
          return false;
      }
    });
  }

  /**
   * Get average duration for a metric type
   */
  public getAverageDuration(type: PerformanceMetric['type']): number {
    const metrics = this.getMetricsByType(type);
    if (metrics.length === 0) return 0;

    const total = metrics.reduce((sum, m) => sum + (m.duration ?? 0), 0);
    return total / metrics.length;
  }

  /**
   * Generate performance report
   */
  public generateReport(): string {
    const slowMetrics = this.getSlowMetrics();
    const report: string[] = [];

    report.push('=== Test Performance Report ===\n');

    // Summary
    report.push(`Total Metrics: ${this.completedMetrics.length}`);
    report.push(`Slow Operations: ${slowMetrics.length}\n`);

    // Average durations by type
    const types: PerformanceMetric['type'][] = ['test', 'database', 'http', 'setup', 'cleanup'];
    report.push('Average Durations:');
    types.forEach(type => {
      const avg = this.getAverageDuration(type);
      if (avg > 0) {
        report.push(`  ${type}: ${avg.toFixed(2)}ms`);
      }
    });

    // Slow operations
    if (slowMetrics.length > 0) {
      report.push('\nSlow Operations:');
      slowMetrics.forEach(metric => {
        report.push(
          `  [${metric.type}] ${metric.name}: ${metric.duration}ms ${metric.metadata ? JSON.stringify(metric.metadata) : ''}`
        );
      });
    }

    return report.join('\n');
  }

  /**
   * Clear all metrics
   */
  public clear(): void {
    this.metrics.clear();
    this.completedMetrics = [];
  }

  /**
   * Update performance thresholds
   */
  public setThresholds(thresholds: Partial<PerformanceThresholds>): void {
    this.thresholds = { ...this.thresholds, ...thresholds };
  }

  /**
   * Check if a metric exceeds threshold and log warning
   */
  private checkThreshold(metric: PerformanceMetric): void {
    if (!metric.duration) return;

    let threshold: number | undefined;
    switch (metric.type) {
      case 'test':
        threshold = this.thresholds.slowTestMs;
        break;
      case 'database':
        threshold = this.thresholds.slowDatabaseOpMs;
        break;
      case 'http':
        threshold = this.thresholds.slowHttpRequestMs;
        break;
      case 'setup':
      case 'cleanup':
        threshold = this.thresholds.slowSetupMs;
        break;
    }

    if (threshold && metric.duration > threshold) {
      console.warn(
        `[Performance Warning] Slow ${metric.type} operation: ${metric.name} took ${metric.duration}ms (threshold: ${threshold}ms)`
      );
    }
  }
}

// Export singleton instance
export const performanceMonitor = TestPerformanceMonitor.getInstance();
