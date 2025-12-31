import { ServiceTest } from '@test-utils';

import { PrismaService } from '../prisma/prisma.service';

import healthConfig from './config/health.config';
import { HealthService } from './health.service';

/**
 * Typed mocks interface for HealthService tests.
 * Provides IntelliSense support for all mocked dependencies.
 */
interface HealthServiceMocks {
  PrismaService: {
    $queryRaw: jest.Mock;
  };
}

describe('HealthService', () => {
  let test: ServiceTest<HealthService, HealthServiceMocks>;

  const mockHealthConfigValue = {
    nodeEnv: 'test',
    database: 'test-db',
    npmPackageVersion: '1.0.0',
  };

  beforeEach(async () => {
    test = new ServiceTest({
      service: HealthService,
      providers: [
        {
          provide: PrismaService,
          useValue: {
            $queryRaw: jest.fn(),
          },
        },
        {
          provide: healthConfig.KEY,
          useValue: mockHealthConfigValue,
        },
      ],
    });

    await test.setup();
  });

  afterEach(async () => {
    await test.cleanup();
  });

  describe('constructor', () => {
    it('should be defined', () => {
      expect(test.service).toBeDefined();
    });
  });

  describe('check', () => {
    it('should return health check with connected database', async () => {
      test.mocks.PrismaService.$queryRaw.mockResolvedValue([{ result: 1 }]);

      const result = await test.service.check();

      expect(result.status).toBe('ok');
      expect(result.database).toBe('connected');
      expect(result.version).toBe('1.0.0');
      expect(result.environment).toBe('test');
      expect(result.timestamp).toBeDefined();
      expect(result.uptime).toBeGreaterThanOrEqual(0);
      expect(result.memory).toBeDefined();
      expect(test.mocks.PrismaService.$queryRaw).toHaveBeenCalled();
    });

    it('should return health check with disconnected database on error', async () => {
      test.mocks.PrismaService.$queryRaw.mockRejectedValue(new Error('Database connection failed'));

      const result = await test.service.check();

      expect(result.status).toBe('error');
      expect(result.database).toBe('disconnected');
      expect(result.version).toBe('1.0.0');
      expect(result.environment).toBe('test');
      expect(result.timestamp).toBeDefined();
      expect(result.uptime).toBeGreaterThanOrEqual(0);
      expect(result.memory).toBeDefined();
      expect(test.mocks.PrismaService.$queryRaw).toHaveBeenCalled();
    });
  });

  describe('liveness', () => {
    it('should return alive status', () => {
      const result = test.service.liveness();

      expect(result.status).toBe('alive');
      expect(result.timestamp).toBeDefined();
    });

    it('should return valid ISO timestamp', () => {
      const result = test.service.liveness();

      expect(new Date(result.timestamp).toISOString()).toBe(result.timestamp);
    });
  });

  describe('readiness', () => {
    it('should return ready status when database is accessible', async () => {
      test.mocks.PrismaService.$queryRaw.mockResolvedValue([{ result: 1 }]);

      const result = await test.service.readiness();

      expect(result.status).toBe('ready');
      expect(result.timestamp).toBeDefined();
      expect(test.mocks.PrismaService.$queryRaw).toHaveBeenCalled();
    });

    it('should return not ready status when database is not accessible', async () => {
      test.mocks.PrismaService.$queryRaw.mockRejectedValue(new Error('Database connection failed'));

      const result = await test.service.readiness();

      expect(result.status).toBe('not ready');
      expect(result.timestamp).toBeDefined();
      expect(test.mocks.PrismaService.$queryRaw).toHaveBeenCalled();
    });

    it('should return valid ISO timestamp', async () => {
      test.mocks.PrismaService.$queryRaw.mockResolvedValue([{ result: 1 }]);

      const result = await test.service.readiness();

      expect(new Date(result.timestamp).toISOString()).toBe(result.timestamp);
    });
  });
});
