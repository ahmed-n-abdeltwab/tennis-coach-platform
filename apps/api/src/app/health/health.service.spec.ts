import { ConfigType } from '@nestjs/config';
import { BaseServiceTest } from '@test-utils';

import { PrismaService } from '../prisma/prisma.service';

import healthConfig from './config/health.config';
import { HealthService } from './health.service';

class HealthServiceTest extends BaseServiceTest<HealthService, PrismaService> {
  private mockHealthConfig: ConfigType<typeof healthConfig>;

  async setupService(): Promise<void> {
    this.service = this.module.get<HealthService>(HealthService);
    this.prisma = this.module.get<PrismaService>(PrismaService);
  }

  setupMocks() {
    const mockPrismaService = this.createMockPrismaService();

    this.mockHealthConfig = {
      nodeEnv: 'test',
      database: 'test-db',
      npmPackageVersion: '1.0.0',
    };

    return [
      {
        provide: PrismaService,
        useValue: mockPrismaService,
      },
      {
        provide: healthConfig.KEY,
        useValue: this.mockHealthConfig,
      },
    ];
  }

  getServiceClass(): new (...args: unknown[]) => HealthService {
    return HealthService as new (...args: unknown[]) => HealthService;
  }

  override getProviders(): unknown[] {
    return [];
  }

  // Public accessors for protected properties
  getService(): HealthService {
    return this.service;
  }

  getPrisma(): any {
    return this.prisma;
  }

  // Public accessors for protected helper methods
  mockReturn<T>(mockMethod: jest.Mock | jest.MockInstance<any, any[]>, returnValue: T): void {
    return this.mockMethodToReturn(mockMethod, returnValue);
  }

  mockThrow(mockMethod: jest.Mock | jest.MockInstance<any, any[]>, error: Error | string): void {
    return this.mockMethodToThrow(mockMethod, error);
  }
}

describe('HealthService', () => {
  let test: HealthServiceTest;

  beforeEach(async () => {
    test = new HealthServiceTest();
    await test.setup();
  });

  afterEach(async () => {
    await test.cleanup();
  });

  describe('check', () => {
    it('should return health check with connected database', async () => {
      const mockPrisma = test.getPrisma();
      test.mockReturn(mockPrisma.$queryRaw, [{ result: 1 }]);

      const result = await test.getService().check();

      expect(result).toMatchObject({
        status: 'ok',
        database: 'connected',
        version: '1.0.0',
        environment: 'test',
      });
      expect(result.timestamp).toBeDefined();
      expect(result.uptime).toBeGreaterThanOrEqual(0);
      expect(result.memory).toBeDefined();
      expect(mockPrisma.$queryRaw).toHaveBeenCalledTimes(1);
    });

    it('should return health check with disconnected database on error', async () => {
      const mockPrisma = test.getPrisma();
      test.mockThrow(mockPrisma.$queryRaw, 'Database connection failed');

      const result = await test.getService().check();

      expect(result).toMatchObject({
        status: 'error',
        database: 'disconnected',
        version: '1.0.0',
        environment: 'test',
      });
      expect(result.timestamp).toBeDefined();
      expect(result.uptime).toBeGreaterThanOrEqual(0);
      expect(result.memory).toBeDefined();
      expect(mockPrisma.$queryRaw).toHaveBeenCalledTimes(1);
    });
  });

  describe('liveness', () => {
    it('should return liveness status', () => {
      const result = test.getService().liveness();

      expect(result).toMatchObject({
        status: 'alive',
      });
      expect(result.timestamp).toBeDefined();
    });
  });

  describe('readiness', () => {
    it('should return ready status when database is accessible', async () => {
      const mockPrisma = test.getPrisma();
      test.mockReturn(mockPrisma.$queryRaw, [{ result: 1 }]);

      const result = await test.getService().readiness();

      expect(result).toMatchObject({
        status: 'ready',
      });
      expect(result.timestamp).toBeDefined();
      expect(mockPrisma.$queryRaw).toHaveBeenCalledTimes(1);
    });

    it('should return not ready status when database is not accessible', async () => {
      const mockPrisma = test.getPrisma();
      test.mockThrow(mockPrisma.$queryRaw, 'Database connection failed');

      const result = await test.getService().readiness();

      expect(result).toMatchObject({
        status: 'not ready',
      });
      expect(result.timestamp).toBeDefined();
      expect(mockPrisma.$queryRaw).toHaveBeenCalledTimes(1);
    });
  });
});
