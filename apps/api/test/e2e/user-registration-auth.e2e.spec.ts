import { AuthTestHelper, HttpTestHelper } from '@auth-helpers';
import { Role } from '@prisma/client';
/**
 * E2E Tests: User Registration and Authentication Flow
 * Tests complete user registration, login, and profile management workflows
 */

import { coachFactory, userFactory } from '@test-utils/factories';
import { ApiContractTestHelper } from '@test-utils/http-test-helpers';

describe('User Registration and Authentication Flow (E2E)', () => {
  let authHelper: AuthTestHelper;
  let httpHelper: HttpTestHelper;
  let contractHelper: ApiContractTestHelper;

  beforeAll(() => {
    authHelper = new AuthTestHelper();
    httpHelper = new HttpTestHelper(global.testApp);
    contractHelper = new ApiContractTestHelper(global.testApp);
  });

  describe('User Registration Flow', () => {
    it('should compleer registration workflow', async () => {
      const userData = userFactory.createWithMinimalData({
        email: 'newuser@example.com',
        name: 'New Test User',
      });

      // Step 1: Register new user
      const registerResponse = await httpHelper.post('/api/authentication/user/signup', {
        email: userData.email,
        name: userData.name,
        password: 'TestPassword123!',
      });

      expect(registerResponse.status).toBe(201);
      expect(registerResponse.body).toHaveProperty('accessToken');
      expect(registerResponse.body).toHaveProperty('user');
      expect(registerResponse.body.user.email).toBe(userData.email);
      expect(registerResponse.body.user.name).toBe(userData.name);

      const { accessToken } = registerResponse.body;

      // Step 2: Verify user can access protected profile endpoint
      const profileResponse = await httpHelper.get('/api/users/profile', {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      expect(profileResponse.status).toBe(200);
      expect(profileResponse.body.email).toBe(userData.email);
      expect(profileResponse.body.name).toBe(userData.name);

      // Step 3: Update user profile
      const updateData = {
        name: 'Updated Test User',
        age: 25,
        country: 'USA',
      };

      const updateResponse = await httpHelper.put('/api/users/profile', updateData, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      expect(updateResponse.status).toBe(200);
      expect(updateResponse.body.name).toBe(updateData.name);
      expect(updateResponse.body.age).toBe(updateData.age);
      expect(updateResponse.body.country).toBe(updateData.country);

      // Step 4: Verify updated profile persists
      const updatedProfileResponse = await httpHelper.get('/api/users/profile', {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      expect(updatedProfileResponse.status).toBe(200);
      expect(updatedProfileResponse.body.name).toBe(updateData.name);
      expect(updatedProfileResponse.body.age).toBe(updateData.age);
    });

    it('should handle duplicate email registration', async () => {
      const userData = userFactory.createWithMinimalData({
        email: 'duplicate@example.com',
        name: 'First User',
      });

      // Register first user
      await httpHelper.post('/api/authentication/user/signup', {
        email: userData.email,
        name: userData.name,
        password: 'TestPassword123!',
      });

      // Attempt to register with same email
      const duplicateResponse = await httpHelper.post(
        '/api/authentication/user/signup',
        {
          email: userData.email,
          name: 'Second User',
          password: 'DifferentPassword123!',
        },
        { expectedStatus: 409 }
      );

      expect(duplicateResponse.status).toBe(409);
      expect(duplicateResponse.body.message).toContain('already exists');
    });

    it('should validate registration input', async () => {
      const invalidCases = [
        {
          name: 'missing email',
          data: { name: 'Test User', password: 'TestPassword123!' },
          expectedErrors: ['email'],
        },
        {
          name: 'invalid email format',
          data: { email: 'invalid-email', name: 'Test User', password: 'TestPassword123!' },
          expectedErrors: ['email'],
        },
        {
          name: 'missing name',
          data: { email: 'test@example.com', password: 'TestPassword123!' },
          expectedErrors: ['name'],
        },
        {
          name: 'weak password',
          data: { email: 'test@example.com', name: 'Test User', password: '123' },
          expectedErrors: ['password'],
        },
      ];

      for (const testCase of invalidCases) {
        const response = await httpHelper.post('/api/authentication/user/signup', testCase.data, {
          expectedStatus: 400,
        });

        expect(response.status).toBe(400);
        expect(response.body.message).toBeDefined();
      }
    });
  });

  describe('User Login Flow', () => {
    let registeredUser: any;

    beforeEach(async () => {
      // Register a user for login tests
      const userData = userFactory.createWithMinimalData({
        email: 'logintest@example.com',
        name: 'Login Test User',
      });

      const registerResponse = await httpHelper.post('/api/authentication/user/signup', {
        email: userData.email,
        name: userData.name,
        password: 'TestPassword123!',
      });

      registeredUser = {
        email: userData.email,
        password: 'TestPassword123!',
        ...registerResponse.body.user,
      };
    });

    it('should complete successful login workflow', async () => {
      // Step 1: Login with valid credentials
      const loginResponse = await httpHelper.post('/api/authentication/user/login', {
        email: registeredUser.email,
        password: registeredUser.password,
      });

      expect(loginResponse.status).toBe(201);
      expect(loginResponse.body).toHaveProperty('accessToken');
      expect(loginResponse.body).toHaveProperty('user');
      expect(loginResponse.body.user.email).toBe(registeredUser.email);

      // Step 2: Use token to access protected resources
      const { accessToken } = loginResponse.body;
      const profileResponse = await httpHelper.get('/api/users/profile', {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      expect(profileResponse.status).toBe(200);
      expect(profileResponse.body.email).toBe(registeredUser.email);
    });

    it('should reject invalid credentials', async () => {
      const invalidCases = [
        {
          name: 'wrong password',
          email: registeredUser.email,
          password: 'WrongPassword123!',
        },
        {
          name: 'non-existent email',
          email: 'nonexistent@example.com',
          password: 'TestPassword123!',
        },
        {
          name: 'empty password',
          email: registeredUser.email,
          password: '',
        },
      ];

      for (const testCase of invalidCases) {
        const response = await httpHelper.post(
          '/api/authentication/user/login',
          {
            email: testCase.email,
            password: testCase.password,
          },
          { expectedStatus: 401 }
        );

        expect(response.status).toBe(401);
      }
    });
  });

  describe('Coach Registration and Authentication Flow', () => {
    it('should complete full coach registration workflow', async () => {
      const coachData = coachFactory.create({
        email: 'newcoach@example.com',
        name: 'New Test Coach',
      });

      // Step 1: Register new coach
      const registerResponse = await httpHelper.post('/api/authentication/coach/signup', {
        email: coachData.email,
        name: coachData.name,
        password: 'CoachPassword123!',
      });

      expect(registerResponse.status).toBe(201);
      expect(registerResponse.body).toHaveProperty('accessToken');
      expect(registerResponse.body).toHaveProperty('user');
      expect(registerResponse.body.user.email).toBe(coachData.email);

      const { accessToken } = registerResponse.body;

      // Step 2: Verify coach can access profile
      const profileResponse = await httpHelper.get('/api/users/profile', {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      expect(profileResponse.status).toBe(200);
      expect(profileResponse.body.email).toBe(coachData.email);

      // Step 3: Update coach profile
      const updateData = {
        name: 'Updated Coach Name',
        bio: 'Professional tennis coach with 10 years experience',
        credentials: 'USPTA Certified',
      };

      const updateResponse = await httpHelper.put('/api/coaches/profile', updateData, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      expect(updateResponse.status).toBe(200);
      expect(updateResponse.body.name).toBe(updateData.name);
      expect(updateResponse.body.bio).toBe(updateData.bio);
    });

    it('should allow coach login and access coach-specific endpoints', async () => {
      // Register coach first
      const coachData = coachFactory.create({
        email: 'coachlogin@example.com',
        name: 'Coach Login Test',
      });

      await httpHelper.post('/api/authentication/coach/signup', {
        email: coachData.email,
        name: coachData.name,
        password: 'CoachPassword123!',
      });

      // Login as coach
      const loginResponse = await httpHelper.post('/api/authentication/coach/login', {
        email: coachData.email,
        password: 'CoachPassword123!',
      });

      expect(loginResponse.status).toBe(201);
      const { accessToken } = loginResponse.body;

      // Access coach profile
      const profileResponse = await httpHelper.get('/api/coaches/profile', {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      expect(profileResponse.status).toBe(200);
      expect(profileResponse.body.email).toBe(coachData.email);
    });
  });

  describe('Authentication Security', () => {
    it('should reject requests without authentication token', async () => {
      const protectedEndpoints = [
        { method: 'GET', path: '/api/coaches/profile' },
        { method: 'GET', path: '/api/users/profile' },
        { method: 'PUT', path: '/api/users/profile' },
        { method: 'PUT', path: '/api/coaches/profile' },
        { method: 'GET', path: '/api/sessions' },
      ];

      for (const endpoint of protectedEndpoints) {
        const response = await httpHelper[endpoint.method.toLowerCase()](
          endpoint.path,
          endpoint.method === 'PUT' ? {} : undefined,
          { expectedStatus: 401 }
        );
        expect(response.status).toBe(401);
      }
    });

    it('should reject requests with invalid tokens', async () => {
      const invalidTokens = [
        'invalid-token',
        'Bearer invalid-token',
        'Bearer ',
        authHelper.createExpiredToken(),
      ];

      for (const token of invalidTokens) {
        const response = await httpHelper.get('/api/users/profile', {
          headers: { Authorization: `Bearer ${token}` },
          expectedStatus: 401,
        });
        expect(response.status).toBe(401);
      }
    });

    it('should validate JWT token structure and claims', async () => {
      // Register user to get valid token
      const userData = userFactory.createWithMinimalData({
        email: 'tokentest@example.com',
        name: 'Token Test User',
      });

      const registerResponse = await httpHelper.post('/api/authentication/user/signup', {
        email: userData.email,
        name: userData.name,
        password: 'TestPassword123!',
      });

      const { accessToken } = registerResponse.body;

      // Decode and verify token structure
      const decodedToken = authHelper.decodeToken(accessToken);
      expect(decodedToken).toBeTruthy();
      expect(decodedToken?.sub).toBeDefined();
      expect(decodedToken?.email).toBe(userData.email);
      expect(decodedToken?.role).toBe(Role.USER);
      expect(decodedToken?.iat).toBeDefined();
      expect(decodedToken?.exp).toBeDefined();
    });
  });

  describe('API Contract Validation', () => {
    it('should validate registration API contract', async () => {
      await contractHelper.testApiContract('/api/authentication/user/signup', 'POST', {
        request: {
          body: {
            email: 'contract@example.com',
            name: 'Contract Test',
            password: 'TestPassword123!',
          },
        },
        response: {
          status: 201,
          body: {
            required: ['accessToken', 'user'],
            types: {
              accessToken: 'string',
            },
          },
        },
      });
    });

    it('should validate login API contract', async () => {
      // First register a user
      await httpHelper.post('/api/authentication/user/signup', {
        email: 'logincontract@example.com',
        name: 'Login Contract Test',
        password: 'TestPassword123!',
      });

      await contractHelper.testApiContract('/api/authentication/user/login', 'POST', {
        request: {
          body: {
            email: 'logincontract@example.com',
            password: 'TestPassword123!',
          },
        },
        response: {
          status: 201,
          body: {
            required: ['accessToken', 'user'],
            types: {
              accessToken: 'string',
            },
          },
        },
      });
    });

    it('should validate profile API contract', async () => {
      // Register and get token
      const registerResponse = await httpHelper.post('/api/authentication/user/signup', {
        email: 'profilecontract@example.com',
        name: 'Profile Contract Test',
        password: 'TestPassword123!',
      });

      const { accessToken } = registerResponse.body;

      await contractHelper.testApiContract('/api/users/profile', 'GET', {
        request: {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        },
        response: {
          status: 200,
          body: {
            required: ['id', 'email', 'name'],
            types: {
              id: 'string',
              email: 'string',
              name: 'string',
            },
          },
        },
      });
    });
  });
});
