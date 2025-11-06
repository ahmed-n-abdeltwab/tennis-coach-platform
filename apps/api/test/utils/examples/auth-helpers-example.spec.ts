/**
 * Example test file demonstrating authentication and HTTP testing helpers
 * This file shows how to use all the authentication and HTTP testing utilities
 *
 * MIGRATION NOTE: This file demonstrates the new import pattern.
 * Test helpers have been moved from old locations to organized folders.
 *
 * NOTE: This is an example/documentation file marked with .skip().
 * Some type assertions may be needed for demonstration purposes.
 * In real tests, always use proper endpoint types and check response.ok
 *to narrow the discriminated union type.
 *
 * Example of proper usage:
 * ```typescript
 * const response = await client.get('/api/accounts/me');
 * if (response.ok) {
 *   // response.body is properly typed as success type
 *   console.log(response.body.email);
 * } else {
 *   // response.body is properly typed as error type
 *   console.log(response.body.message);
 * }
 * ```
 */
import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';

import { Role } from '@prisma/client';
import { IamModule } from '../../../src/app/iam/iam.module';
import { PrismaModule } from '../../../src/app/prisma/prisma.module';
import { AuthTestHelper } from '../auth';
import { ApiContract, ApiContractTester, TypeSafeHttpClient } from '../http';
import { UserRoleHelper } from '../roles';
import { ProtectedRouteTester } from '../security';

describe.skip('Authentication and HTTP Testing Helpers Examples', () => {
  let app: INestApplication;
  let authHelper: AuthTestHelper;
  let httpClient: TypeSafeHttpClient;
  let protectedRouteHelper: ProtectedRouteTester;
  let userRoleHelper: UserRoleHelper;
  let contractTester: ApiContractTester;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [IamModule, PrismaModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api');
    await app.init();

    // Initialize all helpers
    authHelper = new AuthTestHelper();
    httpClient = new TypeSafeHttpClient(app);
    protectedRouteHelper = new ProtectedRouteTester(app);
    userRoleHelper = new UserRoleHelper();
    contractTester = new ApiContractTester(app);
  });

  afterAll(async () => {
    await app.close();
  });

  describe('AuthTestHelper Examples', () => {
    it('should create JWT tokens for different user types', () => {
      // Create basic token
      const basicToken = authHelper.createToken({
        sub: 'user-123',
        email: 'user@example.com',
        role: Role.USER,
      });
      expect(basicToken).toBeDefined();
      expect(typeof basicToken).toBe('string');

      // Create user token
      const userToken = authHelper.createUserToken({
        id: 'user-456',
        email: 'testuser@example.com',
        role: Role.USER,
      });
      expect(userToken).toBeDefined();

      // Create coach token
      const coachToken = authHelper.createCoachToken({
        id: 'coach-789',
        email: 'testcoach@example.com',
        role: Role.COACH,
      });
      expect(coachToken).toBeDefined();

      // Verify tokens have different payloads
      const userPayload = authHelper.decodeToken(userToken);
      const coachPayload = authHelper.decodeToken(coachToken);

      expect(userPayload?.role).toBe(Role.USER);
      expect(coachPayload?.role).toBe(Role.COACH);
    });

    it('should create expired tokens for testing', () => {
      const expiredToken = authHelper.createExpiredToken({
        sub: 'user-123',
        email: 'user@example.com',
        role: Role.USER,
      });

      expect(expiredToken).toBeDefined();

      // Token should be invalid when verified
      const payload = authHelper.verifyToken(expiredToken);
      expect(payload).toBeNull();
    });

    it('should create authorization headers', () => {
      const userHeaders = authHelper.createUserAuthHeaders();
      const coachHeaders = authHelper.createCoachAuthHeaders();
      const expiredHeaders = authHelper.createExpiredAuthHeaders();

      expect(userHeaders.Authorization).toMatch(/^Bearer /);
      expect(coachHeaders.Authorization).toMatch(/^Bearer /);
      expect(expiredHeaders.Authorization).toMatch(/^Bearer /);
    });
  });

  describe('TypeSafeHttpClient Examples', () => {
    it('should make HTTP requests with proper error handling', async () => {
      // Test GET request
      const getResponse = await httpClient.get('/api/health', undefined, {
        expectedStatus: 200,
      });
      expect(getResponse.status).toBe(200);

      // Test authenticated requests
      const userToken = authHelper.createUserToken();

      const authResponse = await httpClient.authenticatedGet(
        '/api/users/profile',
        userToken,
        undefined,
        {
          expectedStatus: 200,
        }
      );
      expect(authResponse.status).toBe(200);
    });

    it('should handle different HTTP methods', async () => {
      const userToken = authHelper.createUserToken();

      // Test POST request
      const postData = { name: 'Test', email: 'test@example.com' };
      const postResponse = await httpClient.authenticatedPost('/api/users', userToken, postData, {
        expectedStatus: 201,
      });
      expect(postResponse.status).toBe(201);

      // Test PUT request
      const putData = { name: 'Updated Test' };
      const putResponse = await httpClient.authenticatedPut('/api/users/123', userToken, putData, {
        expectedStatus: 200,
      });
      expect(putResponse.status).toBe(200);

      // Test DELETE request
      const deleteResponse = await httpClient.authenticatedDelete(
        '/api/users/123',
        userToken,
        undefined,
        {
          expectedStatus: 200,
        }
      );
      expect(deleteResponse.status).toBe(200);
    });
  });

  describe('ProtectedRouteTestHelper Examples', () => {
    it('should test route authentication requirements', async () => {
      // Test that route requires authentication
      await protectedRouteHelper.testRequiresAuth('/api/accounts/me', 'GET');

      // Test that route rejects expired tokens
      await protectedRouteHelper.testRejectsExpiredToken('/api/accounts/me', 'GET');

      // Test that route accepts valid user token
      const userResponse = await protectedRouteHelper.testAcceptsUserToken(
        '/api/accounts/me',
        'GET'
      );
      expect(userResponse.status).toBe(200);

      // Test that route accepts valid coach token
      const coachResponse = await protectedRouteHelper.testAcceptsCoachToken(
        '/api/accounts/me',
        'GET'
      );
      expect(coachResponse.status).toBe(200);
    });

    it('should test role-based access control', async () => {
      // Test endpoint that allows both users and coaches
      // TODO: Implement an endpoint that allows both users and coaches for this example
      await protectedRouteHelper.testRoleBasedAccess('/api/health', [Role.USER, Role.COACH], 'GET');

      // Test endpoint that only allows coaches
      // TODO: Implement an endpoint that only allows coaches for this example
      await protectedRouteHelper.testRoleBasedAccess('/api/health', [Role.COACH], 'GET');
    });
  });

  describe('UserRoleTestHelper Examples', () => {
    it('should create test data for different user roles', () => {
      // Create user test data
      const userData = userRoleHelper.createUserTestData(Role.USER, {
        email: 'customuser@example.com',
      });
      expect(userData.role).toBe(Role.USER);
      expect(userData.email).toBe('customuser@example.com');

      // Create coach test data
      const coachData = userRoleHelper.createUserTestData(Role.COACH, {
        email: 'coach@example.com',
      });
      expect(coachData.role).toBe(Role.COACH);
      expect(coachData.email).toBe('coach@example.com');
    });

    it('should create multiple users with different roles', () => {
      const { users, coaches } = userRoleHelper.createMultipleRoleUsers(3);

      expect(users).toHaveLength(3);
      expect(coaches).toHaveLength(3);

      users.forEach(user => expect(user.role).toBe(Role.USER));
      coaches.forEach(coach => expect(coach.role).toBe(Role.COACH));
    });

    it('should create auth headers for multiple users', () => {
      const { userHeaders, coachHeaders } = userRoleHelper.createMultipleRoleAuthHeaders(2);

      expect(userHeaders).toHaveLength(2);
      expect(coachHeaders).toHaveLength(2);

      userHeaders.forEach(header => {
        expect(header.Authorization).toMatch(/^Bearer /);
      });

      coachHeaders.forEach(header => {
        expect(header.Authorization).toMatch(/^Bearer /);
      });
    });
  });

  describe('ApiContractTester Examples', () => {
    it('should test error scenarios', async () => {
      const errorCases = [
        {
          name: 'Unauthorized',
          statusCode: 401,
          errorMessage: 'Unauthorized',
        },
      ];

      // Test unauthorized access to protected endpoint
      await contractTester.testErrorScenarios('/api/accounts/me', 'GET', errorCases);
    });

    it('should test response structure', async () => {
      const expectedStructure = {
        status: 'string',
        uptime: 'number',
        timestamp: 'string',
      };

      const response = await contractTester.testResponseStructure(
        '/api/health',
        'GET',
        expectedStructure
      );

      expect(response.body).toHaveProperty('status');
      expect(response.body).toHaveProperty('uptime');
      expect(response.body).toHaveProperty('timestamp');
    });

    it('should test request validation', async () => {
      const validationCases = [
        {
          name: 'Missing email',
          data: { password: 'test123' },
          expectedErrors: ['email'],
        },
        {
          name: 'Invalid email format',
          data: { email: 'invalid-email', password: 'test123' },
          expectedErrors: ['email'],
        },
        {
          name: 'Short password',
          data: { email: 'test@example.com', password: '123' },
          expectedErrors: ['password'],
        },
      ];

      await contractTester.testRequestValidation(
        '/api/authentication/signup',
        'POST',
        validationCases
      );
    });
  });

  describe('API Contract Testing Examples', () => {
    it('should test API contract compliance', async () => {
      const contract: ApiContract = {
        request: {
          headers: { 'Content-Type': 'application/json' },
          body: {
            email: 'test@example.com',
            password: 'password123',
            name: 'Test User',
          },
        },
        response: {
          status: 201,
          headers: {
            'content-type': /application\/json/,
          },
          body: {
            required: ['accessToken', 'user'],
            types: {
              accessToken: 'string',
            },
          },
        },
      };

      await contractTester.testApiContract('/api/authentication/signup', 'POST', contract);
    });

    it('should test API contract for health endpoint', async () => {
      const contract: ApiContract = {
        response: {
          status: 200,
          body: {
            required: ['status', 'uptime', 'timestamp'],
            types: {
              status: 'string',
              uptime: 'number',
              timestamp: 'string',
            },
          },
        },
      };

      await contractTester.testApiContract('/api/health', 'GET', contract);
    });
  });

  describe('Integration Examples', () => {
    it('should demonstrate complete authentication flow testing', async () => {
      // 1. Test user registration
      const registerData = {
        email: 'integration@example.com',
        password: 'password123',
        name: 'Integration Test User',
      };

      const registerResponse = await httpClient.post(
        '/api/authentication/user/signup',
        registerData,
        {
          expectedStatus: 201,
        }
      );

      expect(registerResponse.body).toHaveProperty('accessToken');
      expect(registerResponse.body).toHaveProperty('user');

      // 2. Test login with registered user
      const loginData = {
        email: registerData.email,
        password: registerData.password,
      };

      const loginResponse = await httpClient.post(
        '/api/authentication/user/login' as '/api/authentication/user/login',
        loginData,
        {
          expectedStatus: 200,
        }
      );

      if (loginResponse.ok) {
        expect(loginResponse.body).toHaveProperty('accessToken');

        // 3. Test accessing protected route with token
        const accessToken = loginResponse.body.accessToken;

        const profileResponse = await httpClient.authenticatedGet(
          '/api/accounts/me',
          accessToken,
          undefined,
          {
            expectedStatus: 200,
          }
        );

        if (profileResponse.ok) {
          expect(profileResponse.body.email).toBe(registerData.email);
          expect(profileResponse.body.name).toBe(registerData.name);
        }
      }
    });

    it('should demonstrate role-based testing workflow', async () => {
      // Create different role users
      const { users, coaches } = userRoleHelper.createMultipleRoleUsers(2);
      const { userHeaders, coachHeaders } = userRoleHelper.createMultipleRoleAuthHeaders(2);

      // Test that users can access user-specific endpoints
      for (let i = 0; i < users.length; i++) {
        const token = authHelper.createUserToken(users[i]);
        const response = await httpClient.authenticatedGet('/api/accounts/me', token, undefined, {
          expectedStatus: 200,
        });
        expect(response.status).toBe(200);
      }

      // Test that coaches can access coach-specific endpoints
      for (let i = 0; i < coaches.length; i++) {
        const token = authHelper.createCoachToken(coaches[i]);
        const response = await httpClient.authenticatedGet('/api/accounts/me', token, undefined, {
          expectedStatus: 200,
        });
        expect(response.status).toBe(200);
      }

      // Test cross-role access restrictions
      await protectedRouteHelper.testRoleBasedAccess(
        '/api/accounts/me',
        [Role.USER, Role.COACH, Role.ADMIN, Role.PREMIUM_USER], // All roles allowed
        'GET'
      );
    });
  });
});
