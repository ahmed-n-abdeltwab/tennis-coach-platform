import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AuthHeaders, HttpTestOptions } from './auth-test-helper';

export class HttpTestHelper {
  constructor(private app: INestApplication) {}

  async get(endpoint: string, options: HttpTestOptions = {}): Promise<request.Response> {
    const req = request(this.app.getHttpServer())
      .get(endpoint)
      .expect(options.expectedStatus || 200);
    if (options.headers) {
      Object.entries(options.headers).forEach(([key, value]) => req.set(key, value));
    }
    if (options.timeout) req.timeout(options.timeout);
    return req;
  }

  async post(
    endpoint: string,
    data?: any,
    options: HttpTestOptions = {}
  ): Promise<request.Response> {
    const req = request(this.app.getHttpServer())
      .post(endpoint)
      .send(data)
      .expect(options.expectedStatus || 201);
    if (options.headers) {
      Object.entries(options.headers).forEach(([key, value]) => req.set(key, value));
    }
    if (options.timeout) req.timeout(options.timeout);
    return req;
  }

  async put(
    endpoint: string,
    data?: any,
    options: HttpTestOptions = {}
  ): Promise<request.Response> {
    const req = request(this.app.getHttpServer())
      .put(endpoint)
      .send(data)
      .expect(options.expectedStatus || 200);
    if (options.headers) {
      Object.entries(options.headers).forEach(([key, value]) => req.set(key, value));
    }
    if (options.timeout) req.timeout(options.timeout);
    return req;
  }

  async delete(endpoint: string, options: HttpTestOptions = {}): Promise<request.Response> {
    const req = request(this.app.getHttpServer())
      .delete(endpoint)
      .expect(options.expectedStatus || 200);
    if (options.headers) {
      Object.entries(options.headers).forEach(([key, value]) => req.set(key, value));
    }
    if (options.timeout) req.timeout(options.timeout);
    return req;
  }

  async authenticatedGet(
    endpoint: string,
    authHeaders: AuthHeaders,
    options: Omit<HttpTestOptions, 'headers'> = {}
  ): Promise<request.Response> {
    return this.get(endpoint, { ...options, headers: { ...authHeaders } });
  }
  async authenticatedPost(
    endpoint: string,
    data: any,
    authHeaders: AuthHeaders,
    options: Omit<HttpTestOptions, 'headers'> = {}
  ): Promise<request.Response> {
    return this.post(endpoint, data, { ...options, headers: { ...authHeaders } });
  }
  async authenticatedPut(
    endpoint: string,
    data: any,
    authHeaders: AuthHeaders,
    options: Omit<HttpTestOptions, 'headers'> = {}
  ): Promise<request.Response> {
    return this.put(endpoint, data, { ...options, headers: { ...authHeaders } });
  }
  async authenticatedDelete(
    endpoint: string,
    authHeaders: AuthHeaders,
    options: Omit<HttpTestOptions, 'headers'> = {}
  ): Promise<request.Response> {
    return this.delete(endpoint, { ...options, headers: { ...authHeaders } });
  }
}
