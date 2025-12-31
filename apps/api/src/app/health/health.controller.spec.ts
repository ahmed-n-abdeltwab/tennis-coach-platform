import { ControllerTest, DeepMocked } from '@test-utils';

import { HealthController } from './health.controller';
import { HealthService } from './health.service';

/**
 * Typed mocks interface for HealthController tests.
 * Provides IntelliSense support for all mocked dependencies.
 */
interface HealthControllerMocks {
  HealthService: DeepMocked<HealthService>;
}

describe('HealthController', () => {
  let test: ControllerTest<HealthController, HealthControllerMocks, 'health'>;

  beforeEach(async () => {
    test = new ControllerTest({
      controller: HealthController,
      moduleName: 'health',
      providers: [HealthService],
      enableRolesGuard: false,
    });

    await test.setup();
  });

  afterEach(async () => {
    await test.cleanup();
  });

  describe('constructor', () => {
    it('should be defined', () => {
      expect(test.controller).toBeDefined();
    });
  });

  describe('GET /api/health', () => {
    it('should return health check with ok status when database is connected', async () => {
      const mockHealthResponse = {
        status: 'ok',
        timestamp: '2025-12-31T12:00:00.000Z',
        uptime: 12345.67,
        memory: {
          rss: 50000000,
          heapTotal: 30000000,
          heapUsed: 20000000,
          external: 1000000,
          arrayBuffers: 500000,
        },
        version: '1.0.0',
        environment: 'test',
        database: 'connected',
      };

      test.mocks.HealthService.check.mockResolvedValue(mockHealthResponse);

      const response = await test.http.get('/api/health');

      expect(response.ok).toBe(true);
      expect(response.status).toBe(200);
      if (response.ok) {
        expect(response.body.status).toBe('ok');
        expect(response.body.database).toBe('connected');
      }
      expect(test.mocks.HealthService.check).toHaveBeenCalled();
    });

    it('should return health check with error status when database is disconnected', async () => {
      const mockHealthResponse = {
        status: 'error',
        timestamp: '2025-12-31T12:00:00.000Z',
        uptime: 12345.67,
        memory: {
          rss: 50000000,
          heapTotal: 30000000,
          heapUsed: 20000000,
          external: 1000000,
          arrayBuffers: 500000,
        },
        version: '1.0.0',
        environment: 'test',
        database: 'disconnected',
      };

      test.mocks.HealthService.check.mockResolvedValue(mockHealthResponse);

      const response = await test.http.get('/api/health');

      expect(response.ok).toBe(true);
      if (response.ok) {
        expect(response.body.status).toBe('error');
        expect(response.body.database).toBe('disconnected');
      }
      expect(test.mocks.HealthService.check).toHaveBeenCalled();
    });

    it('should not require authentication', async () => {
      const mockHealthResponse = {
        status: 'ok',
        timestamp: '2025-12-31T12:00:00.000Z',
        uptime: 100,
        memory: {
          rss: 50000000,
          heapTotal: 30000000,
          heapUsed: 20000000,
          external: 1000000,
          arrayBuffers: 500000,
        },
        version: '1.0.0',
        environment: 'test',
        database: 'connected',
      };

      test.mocks.HealthService.check.mockResolvedValue(mockHealthResponse);

      const response = await test.http.get('/api/health');

      expect(response.ok).toBe(true);
      expect(response.status).toBe(200);
    });
  });

  describe('GET /api/health/liveness', () => {
    it('should return alive status', async () => {
      const mockLivenessResponse = {
        status: 'alive',
        timestamp: '2025-12-31T12:00:00.000Z',
      };

      test.mocks.HealthService.liveness.mockReturnValue(mockLivenessResponse);

      const response = await test.http.get('/api/health/liveness');

      expect(response.ok).toBe(true);
      expect(response.status).toBe(200);
      if (response.ok) {
        expect(response.body.status).toBe('alive');
        expect(response.body.timestamp).toBeDefined();
      }
      expect(test.mocks.HealthService.liveness).toHaveBeenCalled();
    });

    it('should not require authentication', async () => {
      test.mocks.HealthService.liveness.mockReturnValue({
        status: 'alive',
        timestamp: '2025-12-31T12:00:00.000Z',
      });

      const response = await test.http.get('/api/health/liveness');

      expect(response.ok).toBe(true);
      expect(response.status).toBe(200);
    });
  });

  describe('GET /api/health/readiness', () => {
    it('should return ready status when database is available', async () => {
      const mockReadinessResponse = {
        status: 'ready',
        timestamp: '2025-12-31T12:00:00.000Z',
      };

      test.mocks.HealthService.readiness.mockResolvedValue(mockReadinessResponse);

      const response = await test.http.get('/api/health/readiness');

      expect(response.ok).toBe(true);
      expect(response.status).toBe(200);
      if (response.ok) {
        expect(response.body.status).toBe('ready');
        expect(response.body.timestamp).toBeDefined();
      }
      expect(test.mocks.HealthService.readiness).toHaveBeenCalled();
    });

    it('should return not ready status when database is unavailable', async () => {
      const mockReadinessResponse = {
        status: 'not ready',
        timestamp: '2025-12-31T12:00:00.000Z',
      };

      test.mocks.HealthService.readiness.mockResolvedValue(mockReadinessResponse);

      const response = await test.http.get('/api/health/readiness');

      expect(response.ok).toBe(true);
      if (response.ok) {
        expect(response.body.status).toBe('not ready');
      }
      expect(test.mocks.HealthService.readiness).toHaveBeenCalled();
    });

    it('should not require authentication', async () => {
      test.mocks.HealthService.readiness.mockResolvedValue({
        status: 'ready',
        timestamp: '2025-12-31T12:00:00.000Z',
      });

      const response = await test.http.get('/api/health/readiness');

      expect(response.ok).toBe(true);
      expect(response.status).toBe(200);
    });
  });
});
