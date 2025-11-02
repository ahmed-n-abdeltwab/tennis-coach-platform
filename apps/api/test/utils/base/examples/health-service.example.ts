/**
 * Example implementation of BaseServiceTest
 * Demonstrates how to use the base class for testing services
 */

import { HealthService } from '@app/health/health.service';
import { PrismaService } from '../prisma/prisma.service';

import { BaseServiceTest } from '../base-service.test';

export class HealthServiceTest extends BaseServiceTest<HealthService, PrismaService> {
  async setupService(): Promise<void> {
    this.service = this.module.get<HealthService>(HealthService);
    this.prisma = this.module.get<PrismaService>(PrismaService);
  }

  setupMocks() {
    const mockPrismaService = this.createMockPrismaService();

    return [
      {
        provide: PrismaService,
        useValue: mockPrismaService,
      },
    ];
  }

  getServiceClass() {
    return HealthService;
  }

  override getProviders(): any[] {
    return [HealthService];
  }

  // Example test methods that would use the base class functionality
  async testCheckHealth(): Promise<void> {
    // Use base class methods to set up mocks
    const mockPrisma = this.prisma as jest.Mocked<PrismaService>;
    this.mockMethodToReturn(mockPrisma.$queryRaw, [{ result: 1 }]);

    // Call the service method
    const result = await this.service.check();

    // Use base class assertion methods
    expect(result).toMatchObject({ status: 'ok', database: 'connected' });
    expect(mockPrisma.$queryRaw).toHaveBeenCalledTimes(1);
  }

  async testCheckHealthWithDatabaseError(): Promise<void> {
    // Use base class methods to set up error mocks
    const mockPrisma = this.prisma as jest.Mocked<PrismaService>;
    this.mockMethodToThrow(mockPrisma.$queryRaw, 'Database connection failed');

    const result = await this.service.check();

    expect(result).toMatchObject({
      status: 'error',
      database: 'disconnected',
    });
  }
}
