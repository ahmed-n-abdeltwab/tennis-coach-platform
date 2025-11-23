/**
 * Example implementation of BaseIntegrationTest
 * Demonstrates how to use the base class for integration testing
 */

import { Provider } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import healthConfig from '../../../../src/app/health/config/health.config';
import { HealthModule } from '../../../../src/app/health/health.module';
import { HealthService } from '../../../../src/app/health/health.service';
import { PrismaModule } from '../../../../src/app/prisma/prisma.module';
import { BaseIntegrationTest } from '../base-integration.test';

export class HealthIntegrationTest extends BaseIntegrationTest {
  async setupTestApp(): Promise<void> {
    // Any additional setup specific to health module testing
  }

  getTestModules(): any[] {
    return [HealthModule, PrismaModule, ConfigModule.forFeature(healthConfig)];
  }

  override getTestProviders(): Provider[] {
    return [HealthService];
  }

  // Example test methods that would use the base class functionality
  async testHealthEndpointIntegration(): Promise<void> {
    // Use base class HTTP methods for integration testing
    const response = await this.get('/api/health');

    // Use base class assertion methods
    this.assertSuccessResponse(response, 200);
    this.assertResponseStructure(response, ['status', 'timestamp', 'uptime']);
  }

  async testDatabaseHealthCheck(): Promise<void> {
    // Use base class database methods
    const userCount = await this.countRecords('user');
    expect(userCount).toBeGreaterThanOrEqual(0);

    // Test the health endpoint with real database
    const response = await this.get('/api/health/liveness');
    this.assertSuccessResponse(response, 200);
    this.assertResponseStructure(response, ['database', 'status']);
  }

  async testHealthWithAuthenticatedUser(): Promise<void> {
    // Create test data using base class methods
    const testUser = await this.createTestUser({
      email: 'health-test@example.com',
      name: 'Health Test User',
    });

    // Create JWT token for the test user
    const token = await this.createTestJwtToken({ sub: testUser.id, email: testUser.email });

    // Use authenticated request methods from base class
    const response = await this.authenticatedGet('/api/health', token);

    this.assertSuccessResponse(response, 200);
    this.assertResponseStructure(response, ['status']);
  }
}
