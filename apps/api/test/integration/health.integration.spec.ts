import { ConfigModule } from '@nestjs/config';

import healthConfig from '../../src/app/health/config/health.config';
import { HealthModule } from '../../src/app/health/health.module';
import { PrismaModule } from '../../src/app/prisma/prisma.module';
import { IntegrationTest } from '../utils';

/**
 * Health Endpoints Integration Tests
 * Tests the health check endpoints for status, liveness, and readiness probes.
 * These endpoints are accessible without authentication (Requirement 5.5).
 */
describe('Health Endpoints Integration', () => {
  let test: IntegrationTest;

  beforeAll(async () => {
    test = new IntegrationTest({
      modules: [HealthModule, PrismaModule, ConfigModule.forFeature(healthConfig)],
    });

    await test.setup();
  });

  afterAll(async () => {
    await test.cleanup();
  });

  describe('GET /api/health', () => {
    it('should return health check with 200 status', async () => {
      const response = await test.http.get('/api/health');

      expect(response.ok).toBe(true);
      if (response.ok) {
        expect(response.status).toBe(200);
        expect(response.body).toBeDefined();
        expect(response.body).toHaveProperty('status');
        expect(response.body).toHaveProperty('timestamp');
      }
    });

    it('should return valid timestamp in ISO format', async () => {
      const response = await test.http.get('/api/health');

      expect(response.ok).toBe(true);
      if (response.ok) {
        expect(response.body.timestamp).toBeDefined();
        const parsedDate = new Date(response.body.timestamp);
        expect(parsedDate.toISOString()).toBe(response.body.timestamp);
      }
    });

    it('should return positive uptime', async () => {
      const response = await test.http.get('/api/health');

      expect(response.ok).toBe(true);
      if (response.ok) {
        expect(response.body.uptime).toBeDefined();
        expect(typeof response.body.uptime).toBe('number');
        expect(response.body.uptime).toBeGreaterThan(0);
      }
    });

    it('should return valid memory usage information', async () => {
      const response = await test.http.get('/api/health');

      expect(response.ok).toBe(true);
      if (response.ok) {
        expect(response.body.memory).toBeDefined();
        expect(response.body.memory).toHaveProperty('heapUsed');
        expect(response.body.memory).toHaveProperty('heapTotal');
        expect(response.body.memory).toHaveProperty('rss');
        expect(typeof response.body.memory.heapUsed).toBe('number');
        expect(typeof response.body.memory.heapTotal).toBe('number');
      }
    });

    it('should return configuration information', async () => {
      const response = await test.http.get('/api/health');

      expect(response.ok).toBe(true);
      if (response.ok) {
        expect(response.body.version).toBeDefined();
        expect(response.body.environment).toBeDefined();
        expect(typeof response.body.version).toBe('string');
        expect(typeof response.body.environment).toBe('string');
      }
    });

    it('should return database connection status', async () => {
      const response = await test.http.get('/api/health');

      expect(response.ok).toBe(true);
      if (response.ok) {
        expect(response.body.database).toBeDefined();
        expect(response.body.database).toBe('connected');
      }
    });

    it('should be accessible without authentication', async () => {
      // No token provided - should still work
      const response = await test.http.get('/api/health');

      expect(response.ok).toBe(true);
      if (response.ok) {
        expect(response.status).toBe(200);
      }
    });
  });

  describe('GET /api/health/liveness', () => {
    it('should return alive status with 200', async () => {
      const response = await test.http.get('/api/health/liveness');

      expect(response.ok).toBe(true);
      if (response.ok) {
        expect(response.status).toBe(200);
        expect(response.body).toBeDefined();
        expect(response.body).toHaveProperty('status');
        expect(response.body.status).toBe('alive');
      }
    });

    it('should return valid timestamp in ISO format', async () => {
      const response = await test.http.get('/api/health/liveness');

      expect(response.ok).toBe(true);
      if (response.ok) {
        expect(response.body.timestamp).toBeDefined();
        const parsedDate = new Date(response.body.timestamp);
        expect(parsedDate.toISOString()).toBe(response.body.timestamp);
      }
    });

    it('should be accessible without authentication', async () => {
      // No token provided - should still work
      const response = await test.http.get('/api/health/liveness');

      expect(response.ok).toBe(true);
      if (response.ok) {
        expect(response.status).toBe(200);
        expect(response.body.status).toBe('alive');
      }
    });
  });

  describe('GET /api/health/readiness', () => {
    it('should return ready status with 200 when database is available', async () => {
      const response = await test.http.get('/api/health/readiness');

      expect(response.ok).toBe(true);
      if (response.ok) {
        expect(response.status).toBe(200);
        expect(response.body).toBeDefined();
        expect(response.body).toHaveProperty('status');
        expect(response.body.status).toBe('ready');
      }
    });

    it('should return valid timestamp in ISO format', async () => {
      const response = await test.http.get('/api/health/readiness');

      expect(response.ok).toBe(true);
      if (response.ok) {
        expect(response.body.timestamp).toBeDefined();
        const parsedDate = new Date(response.body.timestamp);
        expect(parsedDate.toISOString()).toBe(response.body.timestamp);
      }
    });

    it('should be accessible without authentication', async () => {
      // No token provided - should still work
      const response = await test.http.get('/api/health/readiness');

      expect(response.ok).toBe(true);
      if (response.ok) {
        expect(response.status).toBe(200);
      }
    });
  });

  /**
   * Health Endpoint Accessibility Tests
   * Feature: integration-tests-refactoring, Property 12: Health Endpoint Accessibility
   * Validates: Requirements 5.1, 5.2, 5.3, 5.4, 5.5
   */
  describe('Health Endpoint Accessibility', () => {
    const healthEndpoints = [
      '/api/health',
      '/api/health/liveness',
      '/api/health/readiness',
    ] as const;

    it.each(healthEndpoints)(
      'should return valid response with status and ISO timestamp for %s',
      async endpoint => {
        const response = await test.http.get(endpoint);

        expect(response.ok).toBe(true);
        if (response.ok) {
          expect(response.status).toBe(200);
          expect(response.body).toHaveProperty('status');
          expect(response.body).toHaveProperty('timestamp');

          // Validate timestamp is valid ISO format
          const body = response.body;
          const parsedDate = new Date(body.timestamp);
          expect(parsedDate.toISOString()).toBe(body.timestamp);
        }
      }
    );
  });
});
