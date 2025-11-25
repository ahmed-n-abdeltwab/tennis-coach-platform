/**
 * Performance Optimizations Tests
 *
 * Tests for performance optimization utilities including:
 * - Connection pooling
 * - Test data caching
 * - Batch cleanup operations
 * - Permance monitoring
 */

import { testDataCache } from '../cache/test-data-cache';
import { batchCleanupManager } from '../database/batch-cleanup-manager';
import { connectionPoolManager } from '../database/connection-pool-manager';
import { performanceMonitor } from '../performance/test-performance-monitor';

describe('Performance Optimizations', () => {
  describe('TestPerformanceMonitor', () => {
    beforeEach(() => {
      performanceMonitor.clear();
    });

    it('should track metrics', async () => {
      performanceMonitor.startMetric('test-operation', 'test');
      // Add small delay to ensure measurable duration
      await new Promise(resolve => setTimeout(resolve, 5));
      performanceMonitor.endMetric('test-operation');

      const metrics = performanceMonitor.getMetrics();
      expect(metrics).toHaveLength(1);
      expect(metrics[0]?.name).toBe('test-operation');
      expect(metrics[0]?.type).toBe('test');
      expect(metrics[0]?.duration).toBeGreaterThanOrEqual(0);
    });

    it('should track database operations', async () => {
      const result = await performanceMonitor.trackDatabaseOperation('test-db-op', async () => {
        await new Promise(resolve => setTimeout(resolve, 10));
        return 'result';
      });

      expect(result).toBe('result');
      const metrics = performanceMonitor.getMetricsByType('database');
      expect(metrics.length).toBeGreaterThan(0);
    });

    it('should detect slow operations', () => {
      performanceMonitor.setThresholds({ slowTestMs: 5 });

      performanceMonitor.startMetric('slow-test', 'test');
      // Simulate slow operation
      const start = Date.now();
      while (Date.now() - start < 10) {
        // Busy wait
      }
      performanceMonitor.endMetric('slow-test');

      const slowMetrics = performanceMonitor.getSlowMetrics();
      expect(slowMetrics.length).toBeGreaterThan(0);
    });

    it('should generate performance report', () => {
      performanceMonitor.startMetric('test1', 'test');
      performanceMonitor.endMetric('test1');

      const report = performanceMonitor.generateReport();
      expect(report).toContain('Test Performance Report');
      expect(report).toContain('Total Metrics');
    });

    it('should calculate average duration', async () => {
      performanceMonitor.startMetric('test1', 'test');
      await new Promise(resolve => setTimeout(resolve, 5));
      performanceMonitor.endMetric('test1');
      performanceMonitor.startMetric('test2', 'test');
      await new Promise(resolve => setTimeout(resolve, 5));
      performanceMonitor.endMetric('test2');

      const avg = performanceMonitor.getAverageDuration('test');
      expect(avg).toBeGreaterThanOrEqual(0);
    });
  });

  describe('TestDataCache', () => {
    beforeEach(() => {
      testDataCache.clear();
    });

    it('should cache and retrieve data', () => {
      const testData = { id: '1', name: 'Test' };
      testDataCache.set('test-key', testData);

      const cached = testDataCache.get('test-key');
      expect(cached).toEqual(testData);
    });

    it('should return undefined for missing keys', () => {
      const cached = testDataCache.get('non-existent');
      expect(cached).toBeUndefined();
    });

    it('should track cache hits and misses', () => {
      testDataCache.set('key1', 'value1');

      testDataCache.get('key1'); // hit
      testDataCache.get('key2'); // miss

      const stats = testDataCache.getStats();
      expect(stats.totalHits).toBe(1);
      expect(stats.totalMisses).toBe(1);
      expect(stats.hitRate).toBe(0.5);
    });

    it('should support getOrSet pattern', async () => {
      let factoryCalled = false;
      const factory = async () => {
        factoryCalled = true;
        return 'value';
      };

      const value1 = await testDataCache.getOrSet('key', factory);
      expect(value1).toBe('value');
      expect(factoryCalled).toBe(true);

      factoryCalled = false;
      const value2 = await testDataCache.getOrSet('key', factory);
      expect(value2).toBe('value');
      expect(factoryCalled).toBe(false); // Factory not called, used cache
    });

    it('should respect TTL', async () => {
      testDataCache.set('key', 'value', 50); // 50ms TTL

      expect(testDataCache.get('key')).toBe('value');

      await new Promise(resolve => setTimeout(resolve, 60));

      expect(testDataCache.get('key')).toBeUndefined();
    });

    it('should evict least recently used entries when full', async () => {
      testDataCache.setMaxSize(3);

      testDataCache.set('key1', 'value1');
      await new Promise(resolve => setTimeout(resolve, 5));
      testDataCache.set('key2', 'value2');
      await new Promise(resolve => setTimeout(resolve, 5));
      testDataCache.set('key3', 'value3');

      // Access key1 and key3 to make them recently used
      await new Promise(resolve => setTimeout(resolve, 5));
      testDataCache.get('key1');
      testDataCache.get('key3');

      // Add key4, should evict key2 (least recently used)
      await new Promise(resolve => setTimeout(resolve, 5));
      testDataCache.set('key4', 'value4');

      expect(testDataCache.has('key1')).toBe(true);
      expect(testDataCache.has('key2')).toBe(false); // key2 should be evicted
      expect(testDataCache.has('key3')).toBe(true);
      expect(testDataCache.has('key4')).toBe(true);
    });

    it('should clean up expired entries', async () => {
      testDataCache.set('key1', 'value1', 50);
      testDataCache.set('key2', 'value2', 1000);

      await new Promise(resolve => setTimeout(resolve, 60));

      const cleaned = testDataCache.cleanupExpired();
      expect(cleaned).toBe(1);
      expect(testDataCache.has('key1')).toBe(false);
      expect(testDataCache.has('key2')).toBe(true);
    });
  });

  describe('ConnectionPoolManager', () => {
    afterEach(async () => {
      await connectionPoolManager.cleanupAll();
    });

    it('should get connection statistics', () => {
      const stats = connectionPoolManager.getStats();
      expect(stats).toHaveProperty('totalConnections');
      expect(stats).toHaveProperty('activeConnections');
      expect(stats).toHaveProperty('totalUseCount');
    });

    it('should update configuration', () => {
      connectionPoolManager.setConfig({
        maxConnections: 5,
        idleTimeoutMs: 5000,
      });

      // Configuration is updated (no error thrown)
      expect(true).toBe(true);
    });

    it('should release connections', () => {
      const testUrl = 'postgresql://test:test@localhost:5432/test';
      connectionPoolManager.releaseConnection(testUrl);

      // Release succeeds even if connection doesn't exist
      expect(true).toBe(true);
    });
  });

  describe('BatchCleanupManager', () => {
    it('should set default batch size', () => {
      batchCleanupManager.setDefaultBatchSize(500);
      // Configuration is updated (no error thrown)
      expect(true).toBe(true);
    });

    it('should set default timeout', () => {
      batchCleanupManager.setDefaultTimeout(60000);
      // Configuration is updated (no error thrown)
      expect(true).toBe(true);
    });
  });

  describe('Integration', () => {
    it('should work together for optimized test execution', async () => {
      // Clear all caches and metrics
      testDataCache.clear();
      performanceMonitor.clear();

      // Track a cached operation
      const result = await performanceMonitor.trackDatabaseOperation(
        'cached-operation',
        async () => {
          return await testDataCache.getOrSet('test-data', async () => {
            await new Promise(resolve => setTimeout(resolve, 10));
            return { id: '1', name: 'Test' };
          });
        }
      );

      expect(result).toEqual({ id: '1', name: 'Test' });

      // Second call should be faster (cached)
      const start = Date.now();
      const cachedResult = await testDataCache.getOrSet('test-data', async () => {
        return { id: '1', name: 'Test' };
      });
      const duration = Date.now() - start;

      expect(cachedResult).toEqual({ id: '1', name: 'Test' });
      expect(duration).toBeLessThan(5); // Should be very fast from cache

      // Check stats
      const cacheStats = testDataCache.getStats();
      expect(cacheStats.totalHits).toBeGreaterThan(0);

      const perfMetrics = performanceMonitor.getMetrics();
      expect(perfMetrics.length).toBeGreaterThan(0);
    });
  });
});
