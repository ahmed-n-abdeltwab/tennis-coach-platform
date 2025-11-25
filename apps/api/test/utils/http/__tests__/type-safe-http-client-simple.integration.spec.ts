/**
 * Simple integration test for TypeSafeHttpClient
 * Tests basic functionality
 */

import { Controller, Get, INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';

import { TypeSafeHttpClient } from '../type-safe-http-client';

@Controller('test')
class SimpleTestController {
  @Get()
  getAll() {
    return { message: 'Hello' };
  }
}

interface SimpleEndpoints {
  '/test': {
    GET: (params?: undefined, body?: undefined) => { message: string };
  };
}

describe('TypeSafeHttpClient - Simple Test', () => {
  let app: INestApplication;
  let client: TypeSafeHttpClient<SimpleEndpoints>;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [SimpleTestController],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    client = new TypeSafeHttpClient<SimpleEndpoints>(app);
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });

  it('should perform a simple GET request', async () => {
    const response = await client.get('/test');

    expect(response.ok).toBe(true);
    if (response.ok) {
      expect(response.body.message).toBe('Hello');
    }
  });
});
