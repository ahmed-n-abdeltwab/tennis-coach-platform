import { Test, TestingModule } from '@nestjs/testing';

import { APMService } from './apm.service';
import {
  ITelemetryMeter,
  ITelemetryProvider,
  ITelemetrySpan,
  ITelemetryTracer,
} from './interfaces/telemetry.interface';

/**
 * APMService Unit Tests
 *
 * Tests the APM service functionality including:
 * - Tracing operations
 * - Metrics recording
 * - Business metrics tracking
 * - Error handling
 */

describe('APMService', () => {
  let service: APMService;
  let mockTelemetryProvider: jest.Mocked<ITelemetryProvider>;
  let mockTracer: jest.Mocked<ITelemetryTracer>;
  let mockMeter: jest.Mocked<ITelemetryMeter>;
  let mockSpan: jest.Mocked<ITelemetrySpan>;

  beforeEach(async () => {
    // Create mock span
    mockSpan = {
      setAttributes: jest.fn(),
      setStatus: jest.fn(),
      recordException: jest.fn(),
      end: jest.fn(),
    };

    // Create mock tracer
    mockTracer = {
      startActiveSpan: jest.fn(),
      startSpan: jest.fn().mockReturnValue(mockSpan),
    };

    // Create mock meter
    mockMeter = {
      createCounter: jest.fn().mockReturnValue({
        add: jest.fn(),
      }),
      createHistogram: jest.fn().mockReturnValue({
        record: jest.fn(),
      }),
      createUpDownCounter: jest.fn().mockReturnValue({
        add: jest.fn(),
      }),
    };

    // Create mock telemetry provider
    mockTelemetryProvider = {
      getTracer: jest.fn().mockReturnValue(mockTracer),
      getMeter: jest.fn().mockReturnValue(mockMeter),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        APMService,
        {
          provide: 'ITelemetryProvider',
          useValue: mockTelemetryProvider,
        },
      ],
    }).compile();

    service = module.get<APMService>(APMService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('constructor', () => {
    it('should initialize telemetry components', () => {
      expect(mockTelemetryProvider.getTracer).toHaveBeenCalledWith('tennis-coach-api');
      expect(mockTelemetryProvider.getMeter).toHaveBeenCalledWith('tennis-coach-api');
      expect(mockMeter.createCounter).toHaveBeenCalledWith('api_requests_total', {
        description: 'Total number of API requests',
      });
      expect(mockMeter.createHistogram).toHaveBeenCalledWith('api_request_duration_ms', {
        description: 'API request duration in milliseconds',
      });
    });
  });

  describe('traceOperation', () => {
    it('should trace successful operations', async () => {
      const mockOperation = jest.fn().mockResolvedValue('result');
      mockTracer.startActiveSpan.mockImplementation(async (name, fn, _attributes) => {
        return await fn(mockSpan);
      });

      const result = await service.traceOperation('test-operation', mockOperation);

      expect(result).toBe('result');
      expect(mockOperation).toHaveBeenCalled();
      expect(mockTracer.startActiveSpan).toHaveBeenCalledWith(
        'test-operation',
        mockOperation,
        undefined
      );
    });

    it('should handle operation errors', async () => {
      const error = new Error('Test error');
      const mockOperation = jest.fn().mockRejectedValue(error);
      mockTracer.startActiveSpan.mockImplementation(async (name, fn, _attributes) => {
        return await fn(mockSpan);
      });

      await expect(service.traceOperation('test-operation', mockOperation)).rejects.toThrow(
        'Test error'
      );
      expect(mockOperation).toHaveBeenCalled();
    });

    it('should trace operation with custom attributes', async () => {
      const mockOperation = jest.fn().mockResolvedValue('result');
      const attributes = { 'custom.attribute': 'value' };
      mockTracer.startActiveSpan.mockImplementation(async (name, fn, _attributes) => {
        return await fn(mockSpan);
      });

      const result = await service.traceOperation('test-operation', mockOperation, attributes);

      expect(result).toBe('result');
      expect(mockOperation).toHaveBeenCalled();
      expect(mockTracer.startActiveSpan).toHaveBeenCalledWith(
        'test-operation',
        mockOperation,
        attributes
      );
    });
  });

  describe('recordAPIRequest', () => {
    it('should record API request metrics', () => {
      // This method doesn't return anything, just records metrics
      expect(() => {
        service.recordAPIRequest('GET', '/api/test', 200, 150);
      }).not.toThrow();
    });

    it('should record API request with error status', () => {
      expect(() => {
        service.recordAPIRequest('POST', '/api/test', 500, 250);
      }).not.toThrow();
    });
  });

  describe('recordBookingCreated', () => {
    it('should record booking creation metrics', () => {
      expect(() => {
        service.recordBookingCreated('cuser12345678901234567', 'ccoach1234567890123456', 100);
      }).not.toThrow();
      expect(mockTracer.startSpan).toHaveBeenCalledWith('booking.created', {
        kind: 0, // SpanKind.INTERNAL (default)
        attributes: {
          'booking.user_id': 'cuser12345678901234567',
          'booking.coach_id': 'ccoach1234567890123456',
          'booking.amount': 100,
        },
      });
      expect(mockSpan.end).toHaveBeenCalled();
    });
  });

  describe('recordPaymentProcessed', () => {
    it('should record payment processing metrics', () => {
      expect(() => {
        service.recordPaymentProcessed('cpayment12345678901234', 50, 'completed');
      }).not.toThrow();
      expect(mockTracer.startSpan).toHaveBeenCalledWith('payment.processed', {
        kind: 0, // SpanKind.INTERNAL (default)
        attributes: {
          'payment.id': 'cpayment12345678901234',
          'payment.amount': 50,
          'payment.status': 'completed',
        },
      });
      expect(mockSpan.end).toHaveBeenCalled();
    });

    it('should record failed payment metrics', () => {
      expect(() => {
        service.recordPaymentProcessed('cpayment12345678901234', 50, 'failed');
      }).not.toThrow();
    });
  });

  describe('recordMessageExchanged', () => {
    it('should record message exchange metrics', () => {
      expect(() => {
        service.recordMessageExchanged('cuser12345678901234567', 'ccoach1234567890123456', 'TEXT');
      }).not.toThrow();
    });

    it('should record custom service message metrics', () => {
      expect(() => {
        service.recordMessageExchanged(
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
        service.updateActiveUsers(5);
      }).not.toThrow();
    });

    it('should handle negative count changes', () => {
      expect(() => {
        service.updateActiveUsers(-2);
      }).not.toThrow();
    });
  });

  describe('traceDatabaseOperation', () => {
    it('should trace database operations with correct attributes', async () => {
      const mockOperation = jest.fn().mockResolvedValue('db-result');
      mockTracer.startActiveSpan.mockImplementation(async (name, fn, _attributes) => {
        return await fn(mockSpan);
      });

      const result = await service.traceDatabaseOperation('findMany', 'users', mockOperation);

      expect(result).toBe('db-result');
      expect(mockOperation).toHaveBeenCalled();
      expect(mockTracer.startActiveSpan).toHaveBeenCalledWith('db.findMany', mockOperation, {
        'db.operation': 'findMany',
        'db.table': 'users',
        'db.system': 'postgresql',
      });
    });

    it('should handle database operation errors', async () => {
      const error = new Error('Database connection failed');
      const mockOperation = jest.fn().mockRejectedValue(error);
      mockTracer.startActiveSpan.mockImplementation(async (name, fn, _attributes) => {
        return await fn(mockSpan);
      });

      await expect(
        service.traceDatabaseOperation('create', 'sessions', mockOperation)
      ).rejects.toThrow('Database connection failed');
      expect(mockOperation).toHaveBeenCalled();
    });
  });

  describe('traceExternalCall', () => {
    it('should trace external service calls', async () => {
      const mockCall = jest.fn().mockResolvedValue('external-result');
      mockTracer.startActiveSpan.mockImplementation(async (name, fn, _attributes) => {
        return await fn(mockSpan);
      });

      const result = await service.traceExternalCall('paypal', 'process-payment', mockCall);

      expect(result).toBe('external-result');
      expect(mockCall).toHaveBeenCalled();
      expect(mockTracer.startActiveSpan).toHaveBeenCalledWith('external.paypal', mockCall, {
        'external.service': 'paypal',
        'external.operation': 'process-payment',
      });
    });

    it('should handle external service errors', async () => {
      const error = new Error('PayPal API error');
      const mockCall = jest.fn().mockRejectedValue(error);
      mockTracer.startActiveSpan.mockImplementation(async (name, fn, _attributes) => {
        return await fn(mockSpan);
      });

      await expect(
        service.traceExternalCall('paypal', 'process-payment', mockCall)
      ).rejects.toThrow('PayPal API error');
      expect(mockCall).toHaveBeenCalled();
    });
  });

  describe('recordCustomMetric', () => {
    it('should create and record custom metrics', () => {
      expect(() => {
        service.recordCustomMetric('test_metric', 5, { label: 'value' });
      }).not.toThrow();
    });

    it('should record custom metric without labels', () => {
      expect(() => {
        service.recordCustomMetric('simple_metric', 10);
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

      const result = await service.timeOperation('test-op', mockOperation);

      expect(result).toBe('timed-result');
      expect(mockOperation).toHaveBeenCalled();
    });

    it('should time failed operations', async () => {
      const error = new Error('Operation failed');
      const mockOperation = jest.fn().mockRejectedValue(error);

      await expect(service.timeOperation('test-op', mockOperation)).rejects.toThrow(
        'Operation failed'
      );
      expect(mockOperation).toHaveBeenCalled();
    });
  });
});
