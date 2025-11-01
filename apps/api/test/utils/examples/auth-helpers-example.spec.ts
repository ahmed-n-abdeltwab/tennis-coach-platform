/**
 * Example test file demonstrating authentication and HTTP testing helpers
 * This file shows how to use all the authentication and HTTP testing utilities
 */
import { PrismaModule } from '@app/prisma/prisma.module';
import {
  AuthTestHelper,
  HttpTestHelper,
  ProtectedRouteTestHelper,
  UserRoleTestHelper,
} from '@auth-helpers';

import { AuthModule } from '@app/auth/auth.module';
import { Role } from '@auth-helpers/common';
import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { ApiContract, ApiContractTestHelper, EnhancedHttpTestHelper } from '../http-test-helpers';

describe('Authentication and HTTP Testing Helpers Examples', () => {
  let app: INestApplication;
  let authHelper: AuthTestHelper;
  let httpHelper: HttpTestHelper;
  let protectedRouteHelper: ProtectedRouteTestHelper;
  let userRoleHelper: UserRoleTestHelper;
  let enhancedHttpHelper: EnhancedHttpTestHelper;
  let apiContractHelper: ApiContractTestHelper;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AuthModule, PrismaModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api');
    await app.init();

    // Initialize all helpers
    authHelper = new AuthTestHelper();
    httpHelper = new HttpTestHelper(app);
    protectedRouteHelper = new ProtectedRouteTestHelper(app);
    userRoleHelper = new UserRoleTestHelper();
    enhancedHttpHelper = new EnhancedHttpTestHelper(app);
    apiContractHelper = new ApiContractTestHelper(app);
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

  describe('HttpTestHelper Examples', () => {
    it('should make HTTP requests with proper error handling', async () => {
      // Test GET request
      const getResponse = await httpHelper.get('/api/health', {
        expectedStatus: 200,
      });
      expect(getResponse.status).toBe(200);

      // Test authenticated requests
      const userHeaders = authHelper.createUserAuthHeaders();

      const authResponse = await httpHelper.authenticatedGet('/api/auth/profile', userHeaders, {
        expectedStatus: 200,
      });
      expect(authResponse.status).toBe(200);
    });

    it('should handle different HTTP methods', async () => {
      const userHeaders = authHelper.createUserAuthHeaders();

      // Test POST request
      const postData = { name: 'Test', email: 'test@example.com' };
      const postResponse = await httpHelper.authenticatedPost('/api/users', postData, userHeaders, {
        expectedStatus: 201,
      });
      expect(postResponse.status).toBe(201);

      // Test PUT request
      const putData = { name: 'Updated Test' };
      const putResponse = await httpHelper.authenticatedPut(
        '/api/users/123',
        putData,
        userHeaders,
        { expectedStatus: 200 }
      );
      expect(putResponse.status).toBe(200);

      // Test DELETE request
      const deleteResponse = await httpHelper.authenticatedDelete('/api/users/123', userHeaders, {
        expectedStatus: 200,
      });
      expect(deleteResponse.status).toBe(200);
    });
  });

  describe('ProtectedRouteTestHelper Examples', () => {
    it('should test route authentication requirements', async () => {
      // Test that route requires authentication
      await protectedRouteHelper.testRequiresAuth('/api/users/profile', 'GET');

      // Test that route rejects expired tokens
      await protectedRouteHelper.testRejectsExpiredToken('/api/users/profile', 'GET');

      // Test that route accepts valid user token
      const userResponse = await protectedRouteHelper.testAcceptsUserToken(
        '/api/users/profile',
        'GET'
      );
      expect(userResponse.status).toBe(200);

      // Test that route accepts valid coach token
      const coachResponse = await protectedRouteHelper.testAcceptsCoachToken(
        '/api/coach/profile',
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

  describe('EnhancedHttpTestHelper Examples', () => {
    it('should test error scenarios', async () => {
      const errorCases = [
        {
          name: 'Not Found',
          statusCode: 404,
          errorMessage: 'Not Found',
        },
        {
          name: 'Unauthorized',
          statusCode: 401,
          errorMessage: 'Unauthorized',
        },
      ];

      await enhancedHttpHelper.testErrorScenarios('/api/nonexistent', 'GET', errorCases);
    });

    it('should test response structure', async () => {
      const expectedStructure = {
        status: 'string',
        uptime: 'number',
        timestamp: 'string',
      };

      const response = await enhancedHttpHelper.testResponseStructure(
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

      await enhancedHttpHelper.testRequestValidation(
        '/api/auth/user/signup',
        'POST',
        validationCases
      );
    });
  });

  describe('ApiContractTestHelper Examples', () => {
    it('should test API contract compliance', async () => {
      const contract = {
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

      await apiContractHelper.testApiContract('/api/auth/user/signup', 'POST', contract);
    });

    it('should test multiple API contracts', async () => {
      const contracts = [
        {
          name: 'Health Check',
          endpoint: '/api/health',
          method: 'GET' as const,
          contract: {
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
          } as ApiContract,
        },
        {
          name: 'User Profile',
          endpoint: '/api/auth/refresh',
          method: 'GET' as const,
          contract: {
            request: {
              headers: authHelper.createUserAuthHeaders(),
            },
            response: {
              status: 200,
              body: {
                required: ['accessToken', 'refreshToken', 'user'],
                types: {
                  accessToken: 'string',
                  refreshToken: 'string',
                  user: {
                    id: 'string',
                    email: 'string',
                    role: 'string',
                  },
                },
              },
            },
          } as ApiContract,
        },
      ];

      await apiContractHelper.testMultipleContracts(contracts);
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

      const registerResponse = await httpHelper.post('/api/auth/user/signup', registerData, {
        expectedStatus: 201,
      });

      expect(registerResponse.body).toHaveProperty('accessToken');
      expect(registerResponse.body).toHaveProperty('user');

      // 2. Test login with registered user
      const loginData = {
        email: registerData.email,
        password: registerData.password,
      };

      const loginResponse = await httpHelper.post('/api/auth/user/login', loginData, {
        expectedStatus: 200,
      });

      expect(loginResponse.body).toHaveProperty('accessToken');

      // 3. Test accessing protected route with token
      const authHeaders = {
        Authorization: `Bearer ${loginResponse.body.accessToken}`,
      };

      const profileResponse = await httpHelper.authenticatedGet('/api/users/profile', authHeaders, {
        expectedStatus: 200,
      });

      expect(profileResponse.body.email).toBe(registerData.email);
      expect(profileResponse.body.name).toBe(registerData.name);
    });

    it('should demonstrate role-based testing workflow', async () => {
      // Create different role users
      const { users, coaches } = userRoleHelper.createMultipleRoleUsers(2);
      const { userHeaders, coachHeaders } = userRoleHelper.createMultipleRoleAuthHeaders(2);

      // Test that users can access user-specific endpoints
      for (const headers of userHeaders) {
        const response = await httpHelper.authenticatedGet('/api/users/profile', headers, {
          expectedStatus: 200,
        });
        expect(response.status).toBe(200);
      }

      // Test that coaches can access coach-specific endpoints
      for (const headers of coachHeaders) {
        const response = await httpHelper.authenticatedGet('/api/coaches/profile', headers, {
          expectedStatus: 200,
        });
        expect(response.status).toBe(200);
      }

      // Test cross-role access restrictions
      await protectedRouteHelper.testRoleBasedAccess(
        '/api/coaches/profile',
        [Role.COACH], // Only coaches allowed
        'GET'
      );
    });
  });
});
