/**
 * Test Performance Monitor
 *
 * Tracks and reports performance metrics for tests including:
 * - Test execution time
 * - Database operation timing
 * - Setup/cleanup tracking
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

export class TestPerformanceMonitor {
  private static instance: TestPerformanceMonitor;
  private metrics: Map<string, PerformanceMetric> = new Map();

  private constructor() {}

  public static getInstance(): TestPerformanceMonitor {
    if (!TestPerformanceMonitor.instance) {
      TestPerformanceMonitor.instance = new TestPerformanceMonitor();
    }
    return TestPerformanceMonitor.instance;
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

  private startMetric(
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

  private endMetric(name: string): PerformanceMetric | undefined {
    const metric = this.metrics.get(name);
    if (!metric) {
      return undefined;
    }

    metric.endTime = Date.now();
    metric.duration = metric.endTime - metric.startTime;
    this.metrics.delete(name);

    return metric;
  }
}

// Export singleton instance
export const performanceMonitor = TestPerformanceMonitor.getInstance();
