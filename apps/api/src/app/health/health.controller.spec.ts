import { Provider } from '@nestjs/common';
import { BaseControllerTest, PathsForRoute } from '@test-utils';

import { HealthController } from './health.controller';
import { HealthService } from './health.service';

class HealthControllerTest extends BaseControllerTest<HealthController, HealthService> {
  private mockHealthService: jest.Mocked<HealthService>;

  async setupController(): Promise<void> {
    this.controller = this.module.get<HealthController>(HealthController);
    this.service = this.module.get<HealthService>(HealthService);
  }

  setupMocks() {
    this.mockHealthService = {
      check: jest.fn(),
      liveness: jest.fn(),
      readiness: jest.fn(),
    } as unknown as jest.Mocked<HealthService>;

    return [];
  }

  getControllerClass() {
    return HealthController;
  }

  override getTestProviders(): Provider[] {
    return [
      {
        provide: HealthService,
        useValue: this.mockHealthService,
      },
    ];
  }

  getMockService(): jest.Mocked<HealthService> {
    return this.mockHealthService;
  }

  // HealthController only uses GET, so we only create testGet helper
  async testGet(path: PathsForRoute<'health', 'GET'>) {
    return this.get(path);
  }
}

describe('HealthController', () => {
  let test: HealthControllerTest;

  beforeEach(async () => {
    test = new HealthControllerTest();
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

      test.getMockService().check.mockResolvedValue(mockHealthData);

      const response = await test.testGet('/api/health');

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        status: 'ok',
        database: 'connected',
        version: '1.0.0',
        environment: 'test',
      });
      expect(test.getMockService().check).toHaveBeenCalledTimes(1);
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

      test.getMockService().check.mockResolvedValue(mockHealthData);

      const response = await test.testGet('/api/health');

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        status: 'error',
        database: 'disconnected',
      });
      expect(test.getMockService().check).toHaveBeenCalledTimes(1);
    });
  });

  describe('GET /health/liveness', () => {
    it('should return liveness status', async () => {
      const mockLivenessData = {
        status: 'alive',
        timestamp: new Date().toISOString(),
      };

      test.getMockService().liveness.mockReturnValue(mockLivenessData);

      const response = await test.testGet('/api/health/liveness');

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        status: 'alive',
      });
      expect(response.body.timestamp).toBeDefined();
      expect(test.getMockService().liveness).toHaveBeenCalledTimes(1);
    });
  });

  describe('GET /health/readiness', () => {
    it('should return ready status when database is accessible', async () => {
      const mockReadinessData = {
        status: 'ready',
        timestamp: new Date().toISOString(),
      };

      test.getMockService().readiness.mockResolvedValue(mockReadinessData);

      const response = await test.testGet('/api/health/readiness');

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        status: 'ready',
      });
      expect(response.body.timestamp).toBeDefined();
      expect(test.getMockService().readiness).toHaveBeenCalledTimes(1);
    });

    it('should return not ready status when database is not accessible', async () => {
      const mockReadinessData = {
        status: 'not ready',
        timestamp: new Date().toISOString(),
      };

      test.getMockService().readiness.mockResolvedValue(mockReadinessData);

      const response = await test.testGet('/api/health/readiness');

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        status: 'not ready',
      });
      expect(response.body.timestamp).toBeDefined();
      expect(test.getMockService().readiness).toHaveBeenCalledTimes(1);
    });
  });
});
