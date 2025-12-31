import { ConfigType } from '@nestjs/config';
import { ServiceTest } from '@test-utils';

import { PrismaService } from '../prisma/prisma.service';

import healthConfig from './config/health.config';
import { HealthService } from './health.service';

// TODO: Update to use new auto-mock pattern - test.mock.* methods have been removed
describe.skip('HealthService', () => {
  let test: ServiceTest<HealthService, PrismaService>;
  let mockHealthConfig: ConfigType<typeof healthConfig>;

  beforeEach(async () => {
    const mockPrisma = {
      $connect: jest.fn(),
      $disconnect: jest.fn(),
      $transaction: jest.fn(),
      $queryRaw: jest.fn(),
    };

    mockHealthConfig = {
      nodeEnv: 'test',
      database: 'test-db',
      npmPackageVersion: '1.0.0',
    };

    test = new ServiceTest({
      serviceClass: HealthService,
      mocks: [
        { provide: PrismaService, useValue: mockPrisma },
        { provide: healthConfig.KEY, useValue: mockHealthConfig },
      ],
    });

    await test.setup();
  });

  afterEach(async () => {
    await test.cleanup();
  });

  describe('check', () => {
    it('should return health check with connected database', async () => {
      test.mock.mockReturn(test.prisma.$queryRaw, [{ result: 1 }]);

      const result = await test.service.check();

      expect(result).toMatchObject({
        status: 'ok',
        database: 'connected',
        version: '1.0.0',
        environment: 'test',
      });
      expect(result.timestamp).toBeDefined();
      expect(result.uptime).toBeGreaterThanOrEqual(0);
      expect(result.memory).toBeDefined();
      expect(test.prisma.$queryRaw).toHaveBeenCalledTimes(1);
    });

    it('should return health check with disconnected database on error', async () => {
      test.mock.mockThrow(test.prisma.$queryRaw, 'Database connection failed');

      const result = await test.service.check();

      expect(result).toMatchObject({
        status: 'error',
        database: 'disconnected',
        version: '1.0.0',
        environment: 'test',
      });
      expect(result.timestamp).toBeDefined();
      expect(result.uptime).toBeGreaterThanOrEqual(0);
      expect(result.memory).toBeDefined();
      expect(test.prisma.$queryRaw).toHaveBeenCalledTimes(1);
    });
  });

  describe('liveness', () => {
    it('should return liveness status', () => {
      const result = test.service.liveness();

      expect(result).toMatchObject({
        status: 'alive',
      });
      expect(result.timestamp).toBeDefined();
    });
  });

  describe('readiness', () => {
    it('should return ready status when database is accessible', async () => {
      test.mock.mockReturn(test.prisma.$queryRaw, [{ result: 1 }]);

      const result = await test.service.readiness();

      expect(result).toMatchObject({
        status: 'ready',
      });
      expect(result.timestamp).toBeDefined();
      expect(test.prisma.$queryRaw).toHaveBeenCalledTimes(1);
    });

    it('should return not ready status when database is not accessible', async () => {
      test.mock.mockThrow(test.prisma.$queryRaw, 'Database connection failed');

      const result = await test.service.readiness();

      expect(result).toMatchObject({
        status: 'not ready',
      });
      expect(result.timestamp).toBeDefined();
      expect(test.prisma.$queryRaw).toHaveBeenCalledTimes(1);
    });
  });
});
