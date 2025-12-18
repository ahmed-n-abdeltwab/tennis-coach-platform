import { ControllerTest } from '@test-utils';

import { HealthController } from './health.controller';
import { HealthService } from './health.service';

describe('HealthController', () => {
  let test: ControllerTest<HealthController, HealthService, 'health'>;
  let mockService: jest.Mocked<HealthService>;

  beforeEach(async () => {
    mockService = {
      check: jest.fn(),
      liveness: jest.fn(),
      readiness: jest.fn(),
    } as any;

    test = new ControllerTest({
      controllerClass: HealthController,
      moduleName: 'health',
      providers: [{ provide: HealthService, useValue: mockService }],
    });

    await test.setup();
  });

  afterEach(async () => {
    await test.cleanup();
  });

  describe('GET /health', () => {
    it('should return health check with connected database', async () => {
      const mockHealthData = {
        status: 'ok',
        timestamp: new Date().toISOString(),
        uptime: 100,
        memory: process.memoryUsage(),
        version: '1.0.0',
        environment: 'test',
        database: 'connected',
      };

      mockService.check.mockResolvedValue(mockHealthData);

      const response = await test.http.get('/api/health');

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        status: 'ok',
        database: 'connected',
        version: '1.0.0',
        environment: 'test',
      });
      expect(mockService.check).toHaveBeenCalledTimes(1);
    });

    it('should return health check with disconnected database', async () => {
      const mockHealthData = {
        status: 'error',
        timestamp: new Date().toISOString(),
        uptime: 100,
        memory: process.memoryUsage(),
        version: '1.0.0',
        environment: 'test',
        database: 'disconnected',
      };

      mockService.check.mockResolvedValue(mockHealthData);

      const response = await test.http.get('/api/health');

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        status: 'error',
        database: 'disconnected',
      });
      expect(mockService.check).toHaveBeenCalledTimes(1);
    });
  });

  describe('GET /health/liveness', () => {
    it('should return liveness status', async () => {
      const mockLivenessData = {
        status: 'alive',
        timestamp: new Date().toISOString(),
      };

      mockService.liveness.mockReturnValue(mockLivenessData);

      const response = await test.http.get('/api/health/liveness');

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        status: 'alive',
      });
      expect(response.body.timestamp).toBeDefined();
      expect(mockService.liveness).toHaveBeenCalledTimes(1);
    });
  });

  describe('GET /health/readiness', () => {
    it('should return ready status when database is accessible', async () => {
      const mockReadinessData = {
        status: 'ready',
        timestamp: new Date().toISOString(),
      };

      mockService.readiness.mockResolvedValue(mockReadinessData);

      const response = await test.http.get('/api/health/readiness');

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        status: 'ready',
      });
      expect(response.body.timestamp).toBeDefined();
      expect(mockService.readiness).toHaveBeenCalledTimes(1);
    });

    it('should return not ready status when database is not accessible', async () => {
      const mockReadinessData = {
        status: 'not ready',
        timestamp: new Date().toISOString(),
      };

      mockService.readiness.mockResolvedValue(mockReadinessData);

      const response = await test.http.get('/api/health/readiness');

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        status: 'not ready',
      });
      expect(response.body.timestamp).toBeDefined();
      expect(mockService.readiness).toHaveBeenCalledTimes(1);
    });
  });
});
