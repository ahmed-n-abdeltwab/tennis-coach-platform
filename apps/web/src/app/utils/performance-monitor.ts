/**
 * Performance monitoring utilities for frontend optimization
 * Tracks component render times, bundle loading, and user interactions
 */

import React from 'react';

interface PerformanceMetric {
  name: string;
  value: number;
  timestamp: number;
  metadata?: Record<string, unknown>;
}

interface ComponentRenderMetric {
  componentName: string;
  renderTime: number;
  propsSize: number;
  timestamp: number;
}

interface BundleLoadMetric {
  bundleName: string;
  loadTime: number;
  size: number;
  timestamp: number;
}

class PerformanceMonitor {
  private metrics: PerformanceMetric[] = [];
  private componentMetrics: ComponentRenderMetric[] = [];
  private bundleMetrics: BundleLoadMetric[] = [];
  private observers: PerformanceObserver[] = [];

  constructor() {
    this.initializeObservers();
  }

  /**
   * Initialize performance observers
   */
  private initializeObservers(): void {
    if (typeof window === 'undefined') return;

    // Observe navigation timing
    if ('PerformanceObserver' in window) {
      const navObserver = new PerformanceObserver(list => {
        for (const entry of list.getEntries()) {
          if (entry.entryType === 'navigation') {
            this.recordNavigationMetrics(entry as PerformanceNavigationTiming);
          }
        }
      });

      try {
        navObserver.observe({ entryTypes: ['navigation'] });
        this.observers.push(navObserver);
      } catch (error) {
        console.warn('Navigation timing observer not supported:', error);
      }

      // Observe resource loading
      const resourceObserver = new PerformanceObserver(list => {
        for (const entry of list.getEntries()) {
          if (entry.entryType === 'resource') {
            this.recordResourceMetrics(entry as PerformanceResourceTiming);
          }
        }
      });

      try {
        resourceObserver.observe({ entryTypes: ['resource'] });
        this.observers.push(resourceObserver);
      } catch (error) {
        console.warn('Resource timing observer not supported:', error);
      }

      // Observe largest contentful paint
      const lcpObserver = new PerformanceObserver(list => {
        for (const entry of list.getEntries()) {
          this.recordMetric('largest-contentful-paint', entry.startTime);
        }
      });

      try {
        lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });
        this.observers.push(lcpObserver);
      } catch (error) {
        console.warn('LCP observer not supported:', error);
      }

      // Observe first input delay
      const fidObserver = new PerformanceObserver(list => {
        for (const entry of list.getEntries()) {
          const fidEntry = entry as PerformanceEventTiming;
          this.recordMetric('first-input-delay', fidEntry.processingStart - fidEntry.startTime);
        }
      });

      try {
        fidObserver.observe({ entryTypes: ['first-input'] });
        this.observers.push(fidObserver);
      } catch (error) {
        console.warn('FID observer not supported:', error);
      }
    }
  }

  /**
   * Record a generic performance metric
   */
  recordMetric(name: string, value: number, metadata?: Record<string, unknown>): void {
    const metric: PerformanceMetric = {
      name,
      value,
      timestamp: Date.now(),
      metadata,
    };

    this.metrics.push(metric);

    // Keep only last 1000 metrics to prevent memory leaks
    if (this.metrics.length > 1000) {
      this.metrics = this.metrics.slice(-1000);
    }

    // Log slow operations
    if (value > 1000) {
      console.warn(`Slow operation detected: ${name} took ${value}ms`, metadata);
    }
  }

  /**
   * Record component render performance
   */
  recordComponentRender(componentName: string, renderTime: number, propsSize = 0): void {
    const metric: ComponentRenderMetric = {
      componentName,
      renderTime,
      propsSize,
      timestamp: Date.now(),
    };

    this.componentMetrics.push(metric);

    // Keep only last 500 component metrics
    if (this.componentMetrics.length > 500) {
      this.componentMetrics = this.componentMetrics.slice(-500);
    }

    // Log slow renders
    if (renderTime > 16) {
      // 16ms = 60fps threshold
      console.warn(`Slow component render: ${componentName} took ${renderTime}ms`);
    }
  }

  /**
   * Record bundle loading performance
   */
  recordBundleLoad(bundleName: string, loadTime: number, size: number): void {
    const metric: BundleLoadMetric = {
      bundleName,
      loadTime,
      size,
      timestamp: Date.now(),
    };

    this.bundleMetrics.push(metric);

    // Keep only last 100 bundle metrics
    if (this.bundleMetrics.length > 100) {
      this.bundleMetrics = this.bundleMetrics.slice(-100);
    }
  }

  /**
   * Record navigation timing metrics
   */
  private recordNavigationMetrics(entry: PerformanceNavigationTiming): void {
    const metrics = {
      'dns-lookup': entry.domainLookupEnd - entry.domainLookupStart,
      'tcp-connection': entry.connectEnd - entry.connectStart,
      'tls-negotiation':
        entry.secureConnectionStart > 0 ? entry.connectEnd - entry.secureConnectionStart : 0,
      'request-response': entry.responseEnd - entry.requestStart,
      'dom-processing': entry.domContentLoadedEventEnd - entry.responseEnd,
      'resource-loading': entry.loadEventEnd - entry.domContentLoadedEventEnd,
      'total-page-load': entry.loadEventEnd - entry.startTime,
    };

    for (const [name, value] of Object.entries(metrics)) {
      if (value > 0) {
        this.recordMetric(name, value);
      }
    }
  }

  /**
   * Record resource loading metrics
   */
  private recordResourceMetrics(entry: PerformanceResourceTiming): void {
    const loadTime = entry.responseEnd - entry.startTime;
    const resourceType = this.getResourceType(entry.name);

    this.recordMetric(`resource-load-${resourceType}`, loadTime, {
      url: entry.name,
      size: entry.transferSize || 0,
    });

    // Track bundle loads specifically
    if (entry.name.includes('.js') && entry.name.includes('chunk')) {
      const bundleName = this.extractBundleName(entry.name);
      this.recordBundleLoad(bundleName, loadTime, entry.transferSize || 0);
    }
  }

  /**
   * Get resource type from URL
   */
  private getResourceType(url: string): string {
    if (url.includes('.js')) return 'javascript';
    if (url.includes('.css')) return 'stylesheet';
    if (url.includes('.png') || url.includes('.jpg') || url.includes('.svg')) return 'image';
    if (url.includes('.woff') || url.includes('.ttf')) return 'font';
    return 'other';
  }

  /**
   * Extract bundle name from URL
   */
  private extractBundleName(url: string): string {
    const match = url.match(/([^\/]+)\.chunk\./);
    return match?.[1] ?? 'unknown';
  }

  /**
   * Get performance statistics
   */
  getStats(): {
    metrics: PerformanceMetric[];
    componentStats: Record<
      string,
      {
        count: number;
        averageRenderTime: number;
        maxRenderTime: number;
      }
    >;
    bundleStats: Record<
      string,
      {
        count: number;
        averageLoadTime: number;
        totalSize: number;
      }
    >;
    webVitals: {
      lcp?: number;
      fid?: number;
      cls?: number;
    };
  } {
    // Internal interface for component stats calculation
    interface ComponentStatsInternal {
      count: number;
      totalRenderTime: number;
      maxRenderTime: number;
      averageRenderTime?: number;
    }

    // Internal interface for bundle stats calculation
    interface BundleStatsInternal {
      count: number;
      totalLoadTime: number;
      totalSize: number;
      averageLoadTime?: number;
    }

    // Calculate component statistics
    const componentStats: Record<string, ComponentStatsInternal> = {};
    for (const metric of this.componentMetrics) {
      if (!componentStats[metric.componentName]) {
        componentStats[metric.componentName] = {
          count: 0,
          totalRenderTime: 0,
          maxRenderTime: 0,
        };
      }

      const stats = componentStats[metric.componentName];
      if (stats) {
        stats.count++;
        stats.totalRenderTime += metric.renderTime;
        stats.maxRenderTime = Math.max(stats.maxRenderTime, metric.renderTime);
      }
    }

    // Calculate averages
    for (const stats of Object.values(componentStats)) {
      stats.averageRenderTime = stats.totalRenderTime / stats.count;
      delete (stats as { totalRenderTime?: number }).totalRenderTime;
    }

    // Calculate bundle statistics
    const bundleStats: Record<string, BundleStatsInternal> = {};
    for (const metric of this.bundleMetrics) {
      if (!bundleStats[metric.bundleName]) {
        bundleStats[metric.bundleName] = {
          count: 0,
          totalLoadTime: 0,
          totalSize: 0,
        };
      }

      const stats = bundleStats[metric.bundleName];
      if (stats) {
        stats.count++;
        stats.totalLoadTime += metric.loadTime;
        stats.totalSize += metric.size;
      }
    }

    // Calculate averages
    for (const stats of Object.values(bundleStats)) {
      stats.averageLoadTime = stats.totalLoadTime / stats.count;
      delete (stats as { totalLoadTime?: number }).totalLoadTime;
    }

    // Get Web Vitals
    const webVitals = {
      lcp: this.metrics.find(m => m.name === 'largest-contentful-paint')?.value,
      fid: this.metrics.find(m => m.name === 'first-input-delay')?.value,
      cls: this.getCumulativeLayoutShift(),
    };

    return {
      metrics: this.metrics,
      componentStats: componentStats as Record<
        string,
        { count: number; averageRenderTime: number; maxRenderTime: number }
      >,
      bundleStats: bundleStats as Record<
        string,
        { count: number; averageLoadTime: number; totalSize: number }
      >,
      webVitals,
    };
  }

  /**
   * Calculate Cumulative Layout Shift
   */
  private getCumulativeLayoutShift(): number {
    if (typeof window === 'undefined') return 0;

    // Interface for Layout Shift entries (not in standard PerformanceEntry)
    interface LayoutShiftEntry extends PerformanceEntry {
      hadRecentInput: boolean;
      value: number;
    }

    let cls = 0;
    try {
      const observer = new PerformanceObserver(list => {
        for (const entry of list.getEntries()) {
          const layoutShiftEntry = entry as LayoutShiftEntry;
          if (!layoutShiftEntry.hadRecentInput) {
            cls += layoutShiftEntry.value;
          }
        }
      });

      observer.observe({ entryTypes: ['layout-shift'] });
    } catch {
      // CLS not supported
    }

    return cls;
  }

  /**
   * Export performance data for analysis
   */
  exportData(): string {
    return JSON.stringify(this.getStats(), null, 2);
  }

  /**
   * Clear all metrics
   */
  clear(): void {
    this.metrics = [];
    this.componentMetrics = [];
    this.bundleMetrics = [];
  }

  /**
   * Cleanup observers
   */
  cleanup(): void {
    for (const observer of this.observers) {
      observer.disconnect();
    }
    this.observers = [];
  }
}

// Create singleton instance
export const performanceMonitor = new PerformanceMonitor();

/**
 * React hook for component performance monitoring
 */
export function usePerformanceMonitor(componentName: string) {
  const startTime = performance.now();

  return {
    recordRender: (propsSize?: number) => {
      const renderTime = performance.now() - startTime;
      performanceMonitor.recordComponentRender(componentName, renderTime, propsSize);
    },
  };
}

/**
 * Higher-order component for automatic performance monitoring
 */
export function withPerformanceMonitoring<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  componentName?: string
) {
  const displayName = componentName || WrappedComponent.displayName || WrappedComponent.name;

  return function PerformanceMonitoredComponent(props: P) {
    const { recordRender } = usePerformanceMonitor(displayName);

    React.useEffect(() => {
      recordRender(JSON.stringify(props).length);
    });

    return React.createElement(WrappedComponent, props);
  };
}

// Extend Window interface for global access
declare global {
  interface Window {
    performanceMonitor?: PerformanceMonitor;
  }
}

// Export for global access
if (typeof window !== 'undefined') {
  window.performanceMonitor = performanceMonitor;
}
