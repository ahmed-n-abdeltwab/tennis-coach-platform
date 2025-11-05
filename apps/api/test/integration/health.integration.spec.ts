 import { PrismaModule } from '../prisma/prisma.module';
import { PrismaService } from '../prisma/prisma.service';
import { INestApplication } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import * as request from 'supertest';
import healthConfig from '../../src/app/health/config/health.config';
import { HealthModule } from '../../src/app/health/health.module';

describe('Health Endpoints Integration', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let module: TestingModule;

  beforeAll(async () => {
= await Test.createTestingModule({
      imports: [
        HealthModule,
        PrismaModule,
        ConfigModule.forFeature(healthConfig),
      ],
    }).compile();

    app = module.createNestApplication();
    app.setGlobalPrefix('api');
    await app.init();

    prisma = module.get<PrismaService>(PrismaService);
  });

  afterAll(async () => {
    if (prisma) {
      await prisma.$disconnect();
    }
    if (app) {
      await app.close();
    }
    if (module) {
      await module.close();
    }
  });

  describe('GET /api/health', () => {
    it('should return health check with 200 status', async () => {
      // Act
      const response = await request(app.getHttpServer())
        .get('/api/health')
        .expect(200);

      // Assert
      expect(response.body).toEqual({
        status: 'ok',
        timestamp: expect.any(String),
        uptime: expect.any(Number),
        memory: expect.objectContaining({
          rss: expect.any(Number),
          heapTotal: expect.any(Number),
          heapUsed: expect.any(Number),
          external: expect.any(Number),
          arrayBuffers: expect.any(Number),
        }),
        version: expect.any(String),
        environment: expect.any(String),
        database: 'connected',
      });
    });

    it('should return valid timestamp in ISO format', async () => {
      // Act
      const response = await request(app.getHttpServer())
        .get('/api/health')
        .expect(200);

      // Assert
      const timestamp = response.body.timestamp;
      expect(timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);

      const parsedTimestamp = new Date(timestamp);
      expect(parsedTimestamp).toBeInstanceOf(Date);
      expect(parsedTimestamp.getTime()).not.toBeNaN();
    });

    it('should return positive uptime', async () => {
      // Act
      const response = await request(app.getHttpServer())
        .get('/api/health')
        .expect(200);

      // Assert
      expect(response.body.uptime).toBeGreaterThan(0);
      expect(typeof response.body.uptime).toBe('number');
    });

    it('should return valid memory usage information', async () => {
      // Act
      const response = await request(app.getHttpServer())
        .get('/api/health')
        .expect(200);

      // Assert
      const memory = response.body.memory;
      expect(memory.rss).toBeGreaterThan(0);
      expect(memory.heapTotal).toBeGreaterThan(0);
      expect(memory.heapUsed).toBeGreaterThan(0);
      expect(memory.heapUsed).toBeLessThanOrEqual(memory.heapTotal);
      expect(memory.external).toBeGreaterThanOrEqual(0);
      expect(memory.arrayBuffers).toBeGreaterThanOrEqual(0);
    });

    it('should return configuration information', async () => {
      // Act
      const response = await request(app.getHttpServer())
        .get('/api/health')
        .expect(200);

      // Assert
      expect(response.body.version).toBeDefined();
      expect(response.body.environment).toBeDefined();
      expect(typeof response.body.version).toBe('string');
      expect(typeof response.body.environment).toBe('string');
    });

    it('should return database connection status', async () => {
      // Act
      const response = await request(app.getHttpServer())
        .get('/api/health')
        .expect(200);

      // Assert
      expect(response.body.database).toBe('connected');
    });

    it('should handle multiple concurrent requests', async () => {
      // Arrange
      const concurrentRequests = 5;
      const promises = Array.from({ length: concurrentRequests }, () =>
        request(app.getHttpServer()).get('/api/health')
      );

      // Act
      const responses = await Promise.all(promises);

      // Assert
      responses.forEach(response => {
        expect(response.status).toBe(200);
        expect(response.body.status).toBe('ok');
        expect(response.body.database).toBe('connected');
      });
    });

    it('should return consistent structure across multiple calls', async () => {
      // Act
      const response1 = await request(app.getHttpServer())
        .get('/api/health')
        .expect(200);

      const response2 = await request(app.getHttpServer())
        .get('/api/health')
        .expect(200);

      // Assert
      const expectedKeys = ['status', 'timestamp', 'uptime', 'memory', 'version', 'environment', 'database'];
      expectedKeys.forEach(key => {
        expect(response1.body).toHaveProperty(key);
        expect(response2.body).toHaveProperty(key);
      });

      // Verify memory object structure
      const memoryKeys = ['rss', 'heapTotal', 'heapUsed', 'external', 'arrayBuffers'];
      memoryKeys.forEach(key => {
        expect(response1.body.memory).toHaveProperty(key);
        expect(response2.body.memory).toHaveProperty(key);
      });
    });

    it('should have reasonable response time', async () => {
      // Arrange
      const startTime = Date.now();

      // Act
      await request(app.getHttpServer())
        .get('/api/health')
        .expect(200);

      // Assert
      const endTime = Date.now();
      const responseTime = endTime - startTime;
      expect(responseTime).toBeLessThan(2000); // Should respond within 2 seconds
    });
  });

  describe('GET /api/health/liveness', () => {
    it('should return alive status with 200', async () => {
      // Act
      const response = await request(app.getHttpServer())
        .get('/api/health/liveness')
        .expect(200);

      // Assert
      expect(response.body).toEqual({
        status: 'alive',
        timestamp: expect.any(String),
      });
    });

    it('should return valid timestamp', async () => {
      // Act
      const response = await request(app.getHttpServer())
        .get('/api/health/liveness')
        .expect(200);

      // Assert
      const timestamp = response.body.timestamp;
      expect(timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);

      const parsedTimestamp = new Date(timestamp);
      expect(parsedTimestamp).toBeInstanceOf(Date);
      expect(parsedTimestamp.getTime()).not.toBeNaN();
    });

    it('should always return alive status', async () => {
      // Act
      const responses = await Promise.all([
        request(app.getHttpServer()).get('/api/health/liveness'),
        request(app.getHttpServer()).get('/api/health/liveness'),
        request(app.getHttpServer()).get('/api/health/liveness'),
      ]);

      // Assert
      responses.forEach(response => {
        expect(response.status).toBe(200);
        expect(response.body.status).toBe('alive');
        expect(response.body.timestamp).toBeDefined();
      });
    });

    it('should be very fast', async () => {
      // Arrange
      const startTime = Date.now();

      // Act
      await request(app.getHttpServer())
        .get('/api/health/liveness')
        .expect(200);

      // Assert
      const endTime = Date.now();
      const responseTime = endTime - startTime;
      expect(responseTime).toBeLessThan(500); // Should be very fast
    });

    it('should handle high frequency requests', async () => {
      // Arrange
      const requests = Array.from({ length: 20 }, () =>
        request(app.getHttpServer()).get('/api/health/liveness')
      );

      // Act
      const responses = await Promise.all(requests);

      // Assert
      responses.forEach(response => {
        expect(response.status).toBe(200);
        expect(response.body.status).toBe('alive');
      });
    });

    it('should return different timestamps for consecutive calls', async () => {
      // Act
      const response1 = await request(app.getHttpServer())
        .get('/api/health/liveness')
        .expect(200);

      // Small delay to ensure different timestamps
      await new Promise(resolve => setTimeout(resolve, 10));

      const response2 = await request(app.getHttpServer())
        .get('/api/health/liveness')
        .expect(200);

      // Assert
      expect(response1.body.timestamp).not.toBe(response2.body.timestamp);
    });
  });

  describe('GET /api/health/readiness', () => {
    it('should return ready status with 200 when database is available', async () => {
      // Act
      const response = await request(app.getHttpServer())
        .get('/api/health/readiness')
        .expect(200);

      // Assert
      expect(response.body).toEqual({
        status: 'ready',
        timestamp: expect.any(String),
      });
    });

    it('should return valid timestamp', async () => {
      // Act
      const response = await request(app.getHttpServer())
        .get('/api/health/readiness')
        .expect(200);

      // Assert
      const timestamp = response.body.timestamp;
      expect(timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);

      const parsedTimestamp = new Date(timestamp);
      expect(parsedTimestamp).toBeInstanceOf(Date);
      expect(parsedTimestamp.getTime()).not.toBeNaN();
    });

    it('should verify database connectivity', async () => {
      // Act
      const response = await request(app.getHttpServer())
        .get('/api/health/readiness')
        .expect(200);

      // Assert
      expect(response.body.status).toBe('ready');

      // Verify that database is actually accessible
      await expect(prisma.$queryRaw`SELECT 1`).resolves.toBeDefined();
    });

    it('should handle multiple readiness checks', async () => {
      // Act
      const responses = await Promise.all([
        request(app.getHttpServer()).get('/api/health/readiness'),
        request(app.getHttpServer()).get('/api/health/readiness'),
        request(app.getHttpServer()).get('/api/health/readiness'),
      ]);

      // Assert
      responses.forEach(response => {
        expect(response.status).toBe(200);
        expect(response.body.status).toBe('ready');
        expect(response.body.timestamp).toBeDefined();
      });
    });

    it('should have reasonable response time', async () => {
      // Arrange
      const startTime = Date.now();

      // Act
      await request(app.getHttpServer())
        .get('/api/health/readiness')
        .expect(200);

      // Assert
      const endTime = Date.now();
      const responseTime = endTime - startTime;
      expect(responseTime).toBeLessThan(3000); // Should respond within 3 seconds (includes DB query)
    });

    it('should return consistent results', async () => {
      // Act
      const response1 = await request(app.getHttpServer())
        .get('/api/health/readiness')
        .expect(200);

      const response2 = await request(app.getHttpServer())
        .get('/api/health/readiness')
        .expect(200);

      // Assert
      expect(response1.body.status).toBe(response2.body.status);
      expect(response1.body.status).toBe('ready');
    });
  });

  describe('Error handling scenarios', () => {
    it('should handle invalid endpoints gracefully', async () => {
      // Act & Assert
      await request(app.getHttpServer())
        .get('/api/health/invalid')
        .expect(404);
    });

    it('should handle malformed requests', async () => {
      // Act & Assert
      await request(app.getHttpServer())
        .post('/api/health')
        .expect(405); // Method not allowed
    });

    it('should return proper content-type headers', async () => {
      // Act
      const response = await request(app.getHttpServer())
        .get('/api/health')
        .expect(200);

      // Assert
      expect(response.headers['content-type']).toMatch(/application\/json/);
    });

    it('should handle concurrent requests without errors', async () => {
      // Arrange
      const endpoints = ['/api/health', '/api/health/liveness', '/api/health/readiness'];
      const requests = endpoints.flatMap(endpoint =>
        Array.from({ length: 3 }, () => request(app.getHttpServer()).get(endpoint))
      );

      // Act
      const responses = await Promise.all(requests);

      // Assert
      responses.forEach(response => {
        expect(response.status).toBe(200);
        expect(response.body).toBeDefined();
        expect(response.body.timestamp).toBeDefined();
      });
    });
  });

  describe('Performance and reliability', () => {
    it('should maintain performance under load', async () => {
      // Arrange
      const iterations = 10;
      const times: number[] = [];

      // Act
      for (let i = 0; i < iterations; i++) {
        const startTime = Date.now();
        await request(app.getHttpServer())
          .get('/api/health')
          .expect(200);
        const endTime = Date.now();
        times.push(endTime - startTime);
      }

      // Assert
      const averageTime = times.reduce((sum, time) => sum + time, 0) / times.length;
      const maxTime = Math.max(...times);

      expect(averageTime).toBeLessThan(1000); // Average should be under 1 second
      expect(maxTime).toBeLessThan(3000); // Max should be under 3 seconds
    });

    it('should handle stress testing of liveness endpoint', async () => {
      // Arrange
      const concurrentRequests = 50;
      const promises = Array.from({ length: concurrentRequests }, () =>
        request(app.getHttpServer()).get('/api/health/liveness')
      );

      // Act
      const responses = await Promise.all(promises);

      // Assert
      responses.forEach(response => {
        expect(response.status).toBe(200);
        expect(response.body.status).toBe('alive');
      });
    });

    it('should maintain database connectivity during multiple readiness checks', async () => {
      // Arrange
      const concurrentRequests = 20;
      const promises = Array.from({ length: concurrentRequests }, () =>
        request(app.getHttpServer()).get('/api/health/readiness')
      );

      // Act
      const responses = await Promise.all(promises);

      // Assert
      responses.forEach(response => {
        expect(response.status).toBe(200);
        expect(response.body.status).toBe('ready');
      });
    });
  });
});

