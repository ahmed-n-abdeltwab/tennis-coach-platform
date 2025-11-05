import { INestApplication } from '@nestjs/common';
import { Role } from '@prisma/client';

import { AuthTestHelper } from './auth-test-helper';
import { HttpTestHelper } from './http-test-helper';

export class ProtectedRouteTestHelper {
  private authHelper: AuthTestHelper;
  private httpHelper: HttpTestHelper;

  constructor(app: INestApplication, jwtSecret?: string) {
    this.authHelper = new AuthTestHelper(jwtSecret);
    this.httpHelper = new HttpTestHelper(app);
  }

  async testRequiresAuth(
    endpoint: string,
    method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'GET'
  ): Promise<void> {
    const methodMap = {
      GET: () => this.httpHelper.get(endpoint, { expectedStatus: 401 }),
      POST: () => this.httpHelper.post(endpoint, {}, { expectedStatus: 401 }),
      PUT: () => this.httpHelper.put(endpoint, {}, { expectedStatus: 401 }),
      DELETE: () => this.httpHelper.delete(endpoint, { expectedStatus: 401 }),
    };
    await methodMap[method]();
  }

  async testRejectsExpiredToken(
    endpoint: string,
    method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'GET'
  ): Promise<void> {
    const expiredHeaders = this.authHelper.createExpiredAuthHeaders();
    const methodMap = {
      GET: () =>
        this.httpHelper.authenticatedGet(endpoint, expiredHeaders, { expectedStatus: 401 }),
      POST: () =>
        this.httpHelper.authenticatedPost(endpoint, {}, expiredHeaders, { expectedStatus: 401 }),
      PUT: () =>
        this.httpHelper.authenticatedPut(endpoint, {}, expiredHeaders, { expectedStatus: 401 }),
      DELETE: () =>
        this.httpHelper.authenticatedDelete(endpoint, expiredHeaders, { expectedStatus: 401 }),
    };
    await methodMap[method]();
  }

  async testAcceptsUserToken(
    endpoint: string,
    method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'GET',
    data?: any
  ): Promise<import('supertest').Response> {
    const userHeaders = this.authHelper.createUserAuthHeaders();
    const methodMap = {
      GET: () => this.httpHelper.authenticatedGet(endpoint, userHeaders, { expectedStatus: 200 }),
      POST: () =>
        this.httpHelper.authenticatedPost(endpoint, data || {}, userHeaders, {
          expectedStatus: 201,
        }),
      PUT: () =>
        this.httpHelper.authenticatedPut(endpoint, data || {}, userHeaders, {
          expectedStatus: 200,
        }),
      DELETE: () =>
        this.httpHelper.authenticatedDelete(endpoint, userHeaders, { expectedStatus: 200 }),
    };
    return methodMap[method]();
  }

  async testAcceptsCoachToken(
    endpoint: string,
    method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'GET',
    data?: any
  ): Promise<import('supertest').Response> {
    const coachHeaders = this.authHelper.createCoachAuthHeaders();
    const methodMap = {
      GET: () => this.httpHelper.authenticatedGet(endpoint, coachHeaders, { expectedStatus: 200 }),
      POST: () =>
        this.httpHelper.authenticatedPost(endpoint, data || {}, coachHeaders, {
          expectedStatus: 201,
        }),
      PUT: () =>
        this.httpHelper.authenticatedPut(endpoint, data || {}, coachHeaders, {
          expectedStatus: 200,
        }),
      DELETE: () =>
        this.httpHelper.authenticatedDelete(endpoint, coachHeaders, { expectedStatus: 200 }),
    };
    return methodMap[method]();
  }

  async testRoleBasedAccess(
    endpoint: string,
    allowedRoles: Role[],
    method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'GET',
    data?: any
  ): Promise<void> {
    const roles = [Role.USER, Role.COACH] as const;
    for (const role of roles) {
      const headers =
        role in UserRole
          ? this.authHelper.createUserAuthHeaders()
          : this.authHelper.createCoachAuthHeaders();
      const expectedStatus = allowedRoles.includes(role) ? (method === 'POST' ? 201 : 200) : 403;
      const methodMap = {
        GET: () => this.httpHelper.authenticatedGet(endpoint, headers, { expectedStatus }),
        POST: () =>
          this.httpHelper.authenticatedPost(endpoint, data || {}, headers, { expectedStatus }),
        PUT: () =>
          this.httpHelper.authenticatedPut(endpoint, data || {}, headers, { expectedStatus }),
        DELETE: () => this.httpHelper.authenticatedDelete(endpoint, headers, { expectedStatus }),
      };
      await methodMap[method]();
    }
  }

  getAuthHelper(): AuthTestHelper {
    return this.authHelper;
  }

  getHttpHelper(): HttpTestHelper {
    return this.httpHelper;
  }
}
