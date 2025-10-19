/**
 * Common test helper functions
 */

import { INestApplication } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';

/**
 * Creates a test JWT token for authentication testing
 */
export function createTestJwtToken(
  payload: any = { sub: 'test-user-id', email: 'test@example.com' }
): string {
  const jwtService = new JwtService({
    secret: process.env.JWT_SECRET || 'test-secret',
    signOptions: { expiresIn: '1h' },
  });

  return jwtService.sign(payload);
}

/**
 * Creates authorization headers for HTTP requests
 */
export function createAuthHeaders(token?: string): { Authorization: string } {
  const authToken = token || createTestJwtToken();
  return {
    Authorization: `Bearer ${authToken}`,
  };
}

/**
 * Waits for a specified amount of time (useful for async operations)
 */
export function wait(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Creates a test module with common providers
 */
export async function createTestModule(providers: any[] = []): Promise<TestingModule> {
  return Test.createTestingModule({
    providers,
  }).compile();
}

/**
 * Creates a test application instance
 */
export async function createTestApp(module: TestingModule): Promise<INestApplication> {
  const app = module.createNestApplication();
  app.setGlobalPrefix('api');
  await app.init();
  return app;
}
