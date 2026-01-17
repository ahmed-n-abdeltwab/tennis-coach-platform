import { ServiceTest } from '@test-utils';

import {
  getDatabaseMetrics,
  getSlowQueriesByOperation,
} from './database/prisma-monitoring.extension';
import { MonitoringController } from './monitoring.controller';

/**
 * MonitoringController Unit Tests
 *
 * Tests the monitoring controller endpoints including:
 * - Database metrics retrieval
 * - Health status checks
 * - Performance summaries
 * - Access control (admin only)
 */

// Mock the database monitoring functions
jest.mock('./database/prisma-monitoring.extension', () => ({
  getDatabaseMetrics: jest.fn(),
  getSlowQueriesByOperation: jest.fn(),
}));

const mockGetDatabaseMetrics = getDatabaseMetrics as jest.MockedFunction<typeof getDatabaseMetrics>;
const mockGetSlowQueriesByOperation = getSlowQueriesByOperation as jest.MockedFunction<
  typeof getSlowQueriesByOperation
>;

type MonitoringMocks = Record<string, never>;

describe('MonitoringController', () => {
  let test: ServiceTest<MonitoringController, MonitoringMocks>;

  beforeEach(async () => {
    test = new ServiceTest({
      service: MonitoringController,
      providers: [],
    });

    await test.setup();

    // Reset mocks before each test
    jest.clearAllMocks();
  });

  afterEach(async () => {
    await test.cleanup();
  });

  describe('getDatabaseMetrics', () => {
    it('should return database metrics with slow queries', () => {
      // Setup mocks
      mockGetDatabaseMetrics.mockReturnValue({
        totalQueries: 100,
        slowQueries: 5,
        errorQueries: 2,
        averageQueryTime: 45.5,
        queryTimesByOperation: new Map([
          ['findMany.account', [10, 20, 30]],
          ['create.session', [50, 60]],
        ]),
      });

      mockGetSlowQueriesByOperation.mockReturnValue({
        'findMany.account': [1200, 1500],
        'create.session': [1100],
      });

      const result = test.service.getDatabaseMetrics();

      expect(result).toEqual({
        totalQueries: 100,
        slowQueries: 5,
        errorQueries: 2,
        averageQueryTime: 45.5,
        queryTimesByOperation: {
          'findMany.account': [10, 20, 30],
          'create.session': [50, 60],
        },
        slowQueriesByOperation: {
          'findMany.account': [1200, 1500],
          'create.session': [1100],
        },
      });

      expect(mockGetDatabaseMetrics).toHaveBeenCalledTimes(1);
      expect(mockGetSlowQueriesByOperation).toHaveBeenCalledTimes(1);
    });
  });

  describe('getMonitoringHealth', () => {
    beforeEach(() => {
      // Mock Date constructor to return a fixed date
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2024-01-01T00:00:00.000Z'));
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should return monitoring health status', () => {
      const result = test.service.getMonitoringHealth();

      expect(result).toEqual({
        apm: true,
        database: true,
        metrics: true,
        timestamp: new Date('2024-01-01T00:00:00.000Z'),
      });
    });
  });

  describe('getPerformanceSummary', () => {
    beforeEach(() => {
      // Mock Date constructor and system time
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2024-01-01T00:00:00.000Z'));

      jest.spyOn(process, 'uptime').mockReturnValue(3600); // 1 hour
      jest.spyOn(process, 'memoryUsage').mockReturnValue({
        rss: 100 * 1024 * 1024, // 100MB
        heapTotal: 80 * 1024 * 1024, // 80MB
        heapUsed: 60 * 1024 * 1024, // 60MB
        external: 10 * 1024 * 1024, // 10MB
        arrayBuffers: 5 * 1024 * 1024, // 5MB
      });
    });

    afterEach(() => {
      jest.useRealTimers();
      jest.restoreAllMocks();
    });

    it('should return performance summary with calculated percentages', async () => {
      // Setup mock for this test
      mockGetDatabaseMetrics.mockReturnValue({
        totalQueries: 100,
        slowQueries: 5,
        errorQueries: 2,
        averageQueryTime: 45.5,
        queryTimesByOperation: new Map([
          ['findMany.account', [10, 20, 30]],
          ['create.session', [50, 60]],
        ]),
      });

      const result = await test.service.getPerformanceSummary();

      expect(result).toEqual({
        database: {
          totalQueries: 100,
          averageQueryTime: 45.5,
          slowQueryPercentage: 5, // 5 slow queries out of 100 total = 5%
          errorRate: 2, // 2 error queries out of 100 total = 2%
        },
        system: {
          uptime: 3600,
          memoryUsage: {
            rss: 100 * 1024 * 1024,
            heapTotal: 80 * 1024 * 1024,
            heapUsed: 60 * 1024 * 1024,
            external: 10 * 1024 * 1024,
            arrayBuffers: 5 * 1024 * 1024,
          },
          nodeVersion: process.version,
          environment: process.env.NODE_ENV ?? 'development',
        },
        timestamp: new Date('2024-01-01T00:00:00.000Z'),
      });
    });

    it('should handle zero queries gracefully', async () => {
      // Mock getDatabaseMetrics to return zero queries
      mockGetDatabaseMetrics.mockReturnValue({
        totalQueries: 0,
        slowQueries: 0,
        errorQueries: 0,
        averageQueryTime: 0,
        queryTimesByOperation: new Map(),
      });

      const result = await test.service.getPerformanceSummary();

      expect(result.database).toEqual({
        totalQueries: 0,
        averageQueryTime: 0,
        slowQueryPercentage: 0,
        errorRate: 0,
      });
    });

    it('should round average query time to 2 decimal places', async () => {
      // Mock getDatabaseMetrics to return a precise average
      mockGetDatabaseMetrics.mockReturnValue({
        totalQueries: 100,
        slowQueries: 5,
        errorQueries: 2,
        averageQueryTime: 45.56789,
        queryTimesByOperation: new Map(),
      });

      const result = await test.service.getPerformanceSummary();

      expect(result.database.averageQueryTime).toBe(45.57);
    });

    it('should calculate percentages correctly with precision', async () => {
      // Mock getDatabaseMetrics with specific values for percentage calculation
      mockGetDatabaseMetrics.mockReturnValue({
        totalQueries: 300,
        slowQueries: 7, // 7/300 = 2.33%
        errorQueries: 1, // 1/300 = 0.33%
        averageQueryTime: 25.0,
        queryTimesByOperation: new Map(),
      });

      const result = await test.service.getPerformanceSummary();

      expect(result.database.slowQueryPercentage).toBe(2.33);
      expect(result.database.errorRate).toBe(0.33);
    });
  });
});
