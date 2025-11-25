/**
 * Example implementation of BaseControllerTest
 * Demonstrates how to use the base class for testing controllers
 */

import { HealthController } from '../../../../src/app/health/health.controller';
import { HealthService } from '../../../../src/app/health/health.service';
import { BaseControllerTest } from '../base-controller';

export class HealthControllerTest extends BaseControllerTest<HealthController, HealthService> {
  async setupController(): Promise<void> {
    this.controller = this.module.get<HealthController>(HealthController);
    this.service = this.module.get<HealthService>(HealthService);
  }

  setupMocks(): any {
    const mockHealthService = {
      checkHealth: jest.fn(),
      checkDatabase: jest.fn(),
      getUptime: jest.fn(),
      getMemoryUsage: jest.fn(),
    };

    return [
      {
        provide: HealthService,
        useValue: mockHealthService,
      },
    ];
  }

  getControllerClass(): any {
    return HealthController;
  }

  getProviders(): any[] {
    return [];
  }

  // Example test methods that would use the base class functionality
  async testHealthEndpoint(): Promise<void> {
    // Mock the service method
    const mockService = this.service as jest.Mocked<HealthService>;
    mockService.check.mockResolvedValue({
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      version: '1.0.0',
      environment: 'test',
      database: 'connected',
    });

    // Use the base class HTTP methods
    const response = await this.get('/api/health');

    // Use the base class assertion methods
    this.assertSuccessResponse(response, 200);
    this.assertResponseStructure(response, ['status']);
  }
}
