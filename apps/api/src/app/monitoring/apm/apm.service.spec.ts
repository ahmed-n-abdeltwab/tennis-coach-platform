import { ServiceTest } from '@test-utils';

import { APMService } from './apm.service';

/**
 * APMService Unit Tests
 *
 * Tests the APM service functionality including:
 * - Tracing operations
 * - Metrics recording
 * - Business metrics tracking
 * - Error handling
 */

// Mock OpenTelemetry
jest.mock('@opentelemetry/api', () => ({
  trace: {
    getTracer: jest.fn(() => ({
      startActiveSpan: jest.fn((name, fn) =>
        fn({
          setAttributes: jest.fn(),
          setStatus: jest.fn(),
          recordException: jest.fn(),
          end: jest.fn(),
        })
      ),
      startSpan: jest.fn(() => ({
        setAttributes: jest.fn(),
        end: jest.fn(),
      })),
    })),
  },
  metrics: {
    getMeter: jest.fn(() => ({
      createCounter: jest.fn(() => ({
        add: jest.fn(),
      })),
      createHistogram: jest.fn(() => ({
        record: jest.fn(),
      })),
      createUpDownCounter: jest.fn(() => ({
        add: jest.fn(),
      })),
    })),
  },
  SpanStatusCode: {
    OK: 1,
    ERROR: 2,
  },
  SpanKind: {
    INTERNAL: 3,
  },
}));

interface APMMocks extends Record<string, never> {
  // No external dependencies to mock for APMService
}

describe('APMService', () => {
  let test: ServiceTest<APMService, APMMocks>;

  beforeEach(async () => {
    test = new ServiceTest({
      service: APMService,
      providers: [],
    });

    await test.setup();
  });

  afterEach(async () => {
    await test.cleanup();
  });

  describe('traceOperation', () => {
    it('should trace successful operations', async () => {
      const mockOperation = jest.fn().mockResolvedValue('result');

      const result = await test.service.traceOperation('test-operation', mockOperation);

      expect(result).toBe('result');
      expect(mockOperation).toHaveBeenCalled();
    });

    it('should handle operation errors', async () => {
      const error = new Error('Test error');
      const mockOperation = jest.fn().mockRejectedValue(error);

      await expect(test.service.traceOperation('test-operation', mockOperation)).rejects.toThrow(
        'Test error'
      );
      expect(mockOperation).toHaveBeenCalled();
    });

    it('should trace operation with custom attributes', async () => {
      const mockOperation = jest.fn().mockResolvedValue('result');
      const attributes = { 'custom.attribute': 'value' };

      const result = await test.service.traceOperation('test-operation', mockOperation, attributes);

      expect(result).toBe('result');
      expect(mockOperation).toHaveBeenCalled();
    });
  });

  describe('recordAPIRequest', () => {
    it('should record API request metrics', () => {
      // This method doesn't return anything, just records metrics
      expect(() => {
        test.service.recordAPIRequest('GET', '/api/test', 200, 150);
      }).not.toThrow();
    });

    it('should record API request with error status', () => {
      expect(() => {
        test.service.recordAPIRequest('POST', '/api/test', 500, 250);
      }).not.toThrow();
    });
  });

  describe('recordBookingCreated', () => {
    it('should record booking creation metrics', () => {
      expect(() => {
        test.service.recordBookingCreated('cuser12345678901234567', 'ccoach1234567890123456', 100);
      }).not.toThrow();
    });
  });

  describe('recordPaymentProcessed', () => {
    it('should record payment processing metrics', () => {
      expect(() => {
        test.service.recordPaymentProcessed('cpayment12345678901234', 50, 'completed');
      }).not.toThrow();
    });

    it('should record failed payment metrics', () => {
      expect(() => {
        test.service.recordPaymentProcessed('cpayment12345678901234', 50, 'failed');
      }).not.toThrow();
    });
  });

  describe('recordMessageExchanged', () => {
    it('should record message exchange metrics', () => {
      expect(() => {
        test.service.recordMessageExchanged(
          'cuser12345678901234567',
          'ccoach1234567890123456',
          'TEXT'
        );
      }).not.toThrow();
    });

    it('should record custom service message metrics', () => {
      expect(() => {
        test.service.recordMessageExchanged(
          'ccoach1234567890123456',
          'cuser12345678901234567',
          'CUSTOM_SERVICE'
        );
      }).not.toThrow();
    });
  });

  describe('updateActiveUsers', () => {
    it('should update active user count', () => {
      expect(() => {
        test.service.updateActiveUsers(5);
      }).not.toThrow();
    });

    it('should handle negative count changes', () => {
      expect(() => {
        test.service.updateActiveUsers(-2);
      }).not.toThrow();
    });
  });

  describe('traceDatabaseOperation', () => {
    it('should trace database operations with correct attributes', async () => {
      const mockOperation = jest.fn().mockResolvedValue('db-result');

      const result = await test.service.traceDatabaseOperation('findMany', 'users', mockOperation);

      expect(result).toBe('db-result');
      expect(mockOperation).toHaveBeenCalled();
    });

    it('should handle database operation errors', async () => {
      const error = new Error('Database connection failed');
      const mockOperation = jest.fn().mockRejectedValue(error);

      await expect(
        test.service.traceDatabaseOperation('create', 'sessions', mockOperation)
      ).rejects.toThrow('Database connection failed');
      expect(mockOperation).toHaveBeenCalled();
    });
  });

  describe('traceExternalCall', () => {
    it('should trace external service calls', async () => {
      const mockCall = jest.fn().mockResolvedValue('external-result');

      const result = await test.service.traceExternalCall('paypal', 'process-payment', mockCall);

      expect(result).toBe('external-result');
      expect(mockCall).toHaveBeenCalled();
    });

    it('should handle external service errors', async () => {
      const error = new Error('PayPal API error');
      const mockCall = jest.fn().mockRejectedValue(error);

      await expect(
        test.service.traceExternalCall('paypal', 'process-payment', mockCall)
      ).rejects.toThrow('PayPal API error');
      expect(mockCall).toHaveBeenCalled();
    });
  });

  describe('recordCustomMetric', () => {
    it('should create and record custom metrics', () => {
      expect(() => {
        test.service.recordCustomMetric('test_metric', 5, { label: 'value' });
      }).not.toThrow();
    });

    it('should record custom metric without labels', () => {
      expect(() => {
        test.service.recordCustomMetric('simple_metric', 10);
      }).not.toThrow();
    });
  });

  describe('timeOperation', () => {
    beforeEach(() => {
      jest
        .spyOn(Date, 'now')
        .mockReturnValueOnce(1000) // Start time
        .mockReturnValueOnce(1150); // End time
    });

    afterEach(() => {
      jest.restoreAllMocks();
    });

    it('should time successful operations', async () => {
      const mockOperation = jest.fn().mockResolvedValue('timed-result');

      const result = await test.service.timeOperation('test-op', mockOperation);

      expect(result).toBe('timed-result');
      expect(mockOperation).toHaveBeenCalled();
    });

    it('should time failed operations', async () => {
      const error = new Error('Operation failed');
      const mockOperation = jest.fn().mockRejectedValue(error);

      await expect(test.service.timeOperation('test-op', mockOperation)).rejects.toThrow(
        'Operation failed'
      );
      expect(mockOperation).toHaveBeenCalled();
    });
  });
});
