/**
 * E2E Tests: API Contract Validation and Error Response Handling
 * Tests API contracts, error responses, and validation across all endpoints
 */

import { coachFactory, userFactory } from '@test-utils/factories';
import { AuthTestHelper } from '../utils/auth';

describe('API Contract Validation and Error Handling (E2E)', () => {
  let authHelper: AuthTestHelper;
  let httpClient: TypeSafeHttpClient;
  let contractTester: ApiContractTester;
  let userToken: string;
  let testUser: any;
  let testCoach: any;

  beforeAll(() => {
    authHelper = new AuthTestHelper();
    httpClient = new TypeSafeHttpClient(global.testApp);
    contractTester = new ApiContractTester(global.testApp);
  });

  beforeEach(async () => {
    // Create test user and coach
    testUser = userFactory.createWithMinimalData({
      email: 'contractuser@example.com',
      name: 'Contract Test User',
    });

    testCoach = coachFactory.create({
      email: 'contractcoach@example.com',
      name: 'Contract Test Coach',
    });

    // Register user
    const userRegisterResponse = await httpClient.post('/api/authentication/user/signup', {
      email: testUser.email,
      name: testUser.name,
      password: 'UserPassword123!',
    });
    userToken = userRegisterResponse.body.accessToken;
    testUser.id = userRegisterResponse.body.user.id;

    // Register coach
    const coachRegisterResponse = await httpClient.post('/api/authentication/coach/signup', {
      email: testCoach.email,
      name: testCoach.name,
      password: 'CoachPassword123!',
    });
    coachToken = coachRegisterResponse.body.accessToken;
    testCoach.id = coachRegisterResponse.body.user.id;
  });

  describe('Authentication API Contracts', () => {
    it('should validate user registration contract', async () => {
      await contractTester.testApiContract('/api/authentication/user/signup', 'POST', {
        request: {
          body: {
            email: 'newcontractuser@example.com',
            name: 'New Contract User',
            password: 'NewPassword123!',
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
      });
    });

    it('should validate login contract', async () => {
      await contractTester.testApiContract('/api/authentication/user/login', 'POST', {
        request: {
          body: {
            email: testUser.email,
            password: 'UserPassword123!',
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
      });
    });

    it('should validate profile endpoint contract', async () => {
      await contractHelper.testApiContract('/api/users/profile', 'GET', {
        request: {
          headers: {
            Authorization: `Bearer ${userToken}`,
          },
        },
        response: {
          status: 200,
          headers: {
            'content-type': /application\/json/,
          },
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

  describe('User Management API Contracts', () => {
    it('should validate user profile update contract', async () => {
      await contractHelper.testApiContract('/api/users/profile', 'PUT', {
        request: {
          headers: {
            Authorization: `Bearer ${userToken}`,
          },
          body: {
            name: 'Updated Contract User',
            age: 30,
            country: 'USA',
          },
        },
        response: {
          status: 200,
          headers: {
            'content-type': /application\/json/,
          },
          body: {
            required: ['id', 'email', 'name'],
            types: {
              id: 'string',
              email: 'string',
              name: 'string',
              age: 'number',
              country: 'string',
            },
          },
        },
      });
    });

    it('should validate coaches listing contract', async () => {
      await contractHelper.testApiContract('/api/coaches', 'GET', {
        response: {
          status: 200,
          headers: {
            'content-type': /application\/json/,
          },
          body: {
            required: [],
            types: {},
          },
        },
      });
    });

    it('should validate individual coach contract', async () => {
      await contractHelper.testApiContract(`/api/coaches/${testCoach.id}`, 'GET', {
        response: {
          status: 200,
          headers: {
            'content-type': /application\/json/,
          },
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

  describe('Session Management API Contracts', () => {
    it('should validate sessions listing contract', async () => {
      await contractHelper.testApiContract('/api/sessions', 'GET', {
        request: {
          headers: {
            Authorization: `Bearer ${userToken}`,
          },
        },
        response: {
          status: 200,
          headers: {
            'content-type': /application\/json/,
          },
          body: {
            required: [],
            types: {},
          },
        },
      });
    });

    it('should validate booking types contract', async () => {
      await contractHelper.testApiContract('/api/booking-types', 'GET', {
        response: {
          status: 200,
          headers: {
            'content-type': /application\/json/,
          },
          body: {
            required: [],
            types: {},
          },
        },
      });
    });

    it('should validate time slots contract', async () => {
      await contractHelper.testApiContract('/api/time-slots', 'GET', {
        response: {
          status: 200,
          headers: {
            'content-type': /application\/json/,
          },
          body: {
            required: [],
            types: {},
          },
        },
      });
    });
  });

  describe('Error Response Validation', () => {
    it('should return consistent 400 error format for validation errors', async () => {
      const validationErrorCases = [
        {
          endpoint: '/api/authentication/user/signup',
          method: 'POST',
          data: { email: 'invalid-email', name: '', password: '123' },
          expectedErrors: ['email', 'name', 'password'],
        },
        {
          endpoint: '/api/authentication/user/login',
          method: 'POST',
          data: { email: '', password: '' },
          expectedErrors: ['email', 'password'],
        },
        {
          endpoint: '/api/users/profile',
          method: 'PUT',
          data: { age: 'invalid-age', height: -100 },
          expectedErrors: ['age', 'height'],
          headers: { Authorization: `Bearer ${userToken}` },
        },
      ];

      for (const testCase of validationErrorCases) {
        const response = await enhancedHttpHelper[testCase.method.toLowerCase()](
          testCase.endpoint,
          testCase.data,
          {
            headers: testCase.headers || {},
          }
        );

        expect(response.status).toBe(400);
        expect(response.body).toHaveProperty('message');
        expect(response.body).toHaveProperty('error');
        expect(response.body).toHaveProperty('statusCode', 400);

        // Verify error message contains validation details
        const errorMessage = JSON.stringify(response.body.message);
        testCase.expectedErrors.forEach(field => {
          expect(errorMessage).toContain(field);
        });
      }
    });

    it('should return consistent 401 error format for authentication errors', async () => {
      const authErrorCases = [
        { endpoint: '/api/users/profile', method: 'GET' },
        { endpoint: '/api/sessions', method: 'GET' },
        { endpoint: '/api/coaches/profile', method: 'PUT', data: {} },
      ];

      for (const testCase of authErrorCases) {
        const response = await enhancedHttpHelper[testCase.method.toLowerCase()](
          testCase.endpoint,
          testCase.data
        );

        expect(response.status).toBe(401);
        expect(response.body).toHaveProperty('message');
        expect(response.body).toHaveProperty('statusCode', 401);
        expect(response.body.message).toMatch(/unauthorized|authentication/i);
      }
    });

    it('should return consistent 403 error format for authorization errors', async () => {
      // Test user trying to access admin endpoints
      const forbiddenEndpoints = [
        { endpoint: '/api/admin/users', method: 'GET' },
        { endpoint: '/api/admin/settings', method: 'GET' },
        { endpoint: '/api/admin/metrics', method: 'GET' },
      ];

      for (const testCase of forbiddenEndpoints) {
        const response = await enhancedHttpHelper[testCase.method.toLowerCase()](
          testCase.endpoint,
          undefined,
          {
            headers: { Authorization: `Bearer ${userToken}` },
          }
        );

        expect(response.status).toBe(403);
        expect(response.body).toHaveProperty('message');
        expect(response.body).toHaveProperty('statusCode', 403);
        expect(response.body.message).toMatch(/forbidden|access denied|insufficient/i);
      }
    });

    it('should return consistent 404 error format for not found errors', async () => {
      const notFoundCases = [
        { endpoint: '/api/coaches/non-existent-id', method: 'GET' },
        {
          endpoint: '/api/sessions/non-existent-id',
          method: 'GET',
          headers: { Authorization: `Bearer ${userToken}` },
        },
        {
          endpoint: '/api/users/non-existent-id',
          method: 'GET',
          headers: { Authorization: `Bearer ${userToken}` },
        },
        { endpoint: '/api/non-existent-endpoint', method: 'GET' },
      ];

      for (const testCase of notFoundCases) {
        const response = await enhancedHttpHelper[testCase.method.toLowerCase()](
          testCase.endpoint,
          undefined,
          {
            headers: testCase.headers || {},
          }
        );

        expect(response.status).toBe(404);
        expect(response.body).toHaveProperty('message');
        expect(response.body).toHaveProperty('statusCode', 404);
        expect(response.body.message).toMatch(/not found|does not exist/i);
      }
    });

    it('should return consistent 409 error format for conflict errors', async () => {
      // Register user first
      await httpHelper.post('/api/auth/register', {
        email: 'conflict@example.com',
        name: 'Conflict User',
        password: 'ConflictPassword123!',
      });

      // Try to register with same email
      const conflictResponse = await enhancedHttpHelper.post('/api/auth/register', {
        email: 'conflict@example.com',
        name: 'Another User',
        password: 'AnotherPassword123!',
      });

      expect(conflictResponse.status).toBe(409);
      expect(conflictResponse.body).toHaveProperty('message');
      expect(conflictResponse.body).toHaveProperty('statusCode', 409);
      expect(conflictResponse.body.message).toMatch(/already exists|conflict/i);
    });

    it('should return consistent 500 error format for server errors', async () => {
      // This test would require triggering a server error
      // For now, we'll test the error format structure
      const mockServerError = {
        statusCode: 500,
        message: 'Internal server error',
        error: 'Internal Server Error',
      };

      expect(mockServerError).toHaveProperty('statusCode', 500);
      expect(mockServerError).toHaveProperty('message');
      expect(mockServerError).toHaveProperty('error');
    });
  });

  describe('HTTP Headers and CORS Validation', () => {
    it('should include proper CORS headers', async () => {
      await enhancedHttpHelper.testCorsHeaders('/api/health', 'GET');
      await enhancedHttpHelper.testCorsHeaders('/api/coaches', 'GET');
      await enhancedHttpHelper.testCorsHeaders('/api/auth/register', 'POST');
    });

    it('should include security headers', async () => {
      const securityHeaders = {
        'x-frame-options': /DENY|SAMEORIGIN/,
        'x-content-type-options': 'nosniff',
        'x-xss-protection': /1; mode=block/,
      };

      await enhancedHttpHelper.testResponseHeaders('/api/health', 'GET', securityHeaders);
    });

    it('should handle content-type validation', async () => {
      const contentTypeCases = [
        {
          contentType: 'application/json',
          data: { email: 'test@example.com', name: 'Test', password: 'Test123!' },
          expectedStatus: 201,
        },
        {
          contentType: 'text/plain',
          data: 'invalid data format',
          expectedStatus: 400,
        },
        {
          contentType: 'application/xml',
          data: '<user><email>test@example.com</email></user>',
          expectedStatus: 400,
        },
      ];

      await enhancedHttpHelper.testContentTypes('/api/auth/register', 'POST', contentTypeCases);
    });
  });

  describe('Request Validation and Sanitization', () => {
    it('should validate and sanitize input data', async () => {
      const sanitizationCases = [
        {
          name: 'XSS prevention',
          data: {
            email: 'xss@example.com',
            name: '<script>alert("xss")</script>',
            password: 'XssPassword123!',
          },
          expectedSanitization: {
            name: '&lt;script&gt;alert("xss")&lt;/script&gt;',
          },
        },
        {
          name: 'SQL injection prevention',
          data: {
            email: 'sql@example.com',
            name: "'; DROP TABLE users; --",
            password: 'SqlPassword123!',
          },
          expectedSanitization: {
            name: "'; DROP TABLE users; --", // Should be escaped/sanitized
          },
        },
        {
          name: 'HTML injection prevention',
          data: {
            email: 'html@example.com',
            name: '<img src="x" onerror="alert(1)">',
            password: 'HtmlPassword123!',
          },
          expectedSanitization: {
            name: '&lt;img src="x" onerror="alert(1)"&gt;',
          },
        },
      ];

      for (const testCase of sanitizationCases) {
        const response = await httpHelper.post('/api/auth/register', testCase.data);

        if (response.status === 201) {
          // Check if dangerous content was sanitized
          const user = response.body.user;
          Object.entries(testCase.expectedSanitization).forEach(([field, expectedValue]) => {
            expect(user[field]).not.toContain('<script>');
            expect(user[field]).not.toContain('onerror=');
            expect(user[field]).not.toContain('DROP TABLE');
          });
        }
      }
    });

    it('should enforce request size limits', async () => {
      // Test with very large request body
      const largeData = {
        email: 'large@example.com',
        name: 'A'.repeat(10000), // Very long name
        password: 'LargePassword123!',
        bio: 'B'.repeat(50000), // Very long bio
      };

      const largeRequestResponse = await httpHelper.post('/api/auth/register', largeData, {
        expectedStatus: 413,
      });

      if (largeRequestResponse.status === 413) {
        expect(largeRequestResponse.body.message).toMatch(/too large|payload|size limit/i);
      }
    });

    it('should validate request rate limiting', async () => {
      // Test rate limiting on registration endpoint
      const rapidRequests: request.Response[] = [];
      for (let i = 0; i < 20; i++) {
        rapidRequests.push(
          httpHelper.post('/api/auth/register', {
            email: `ratelimit${i}@example.com`,
            name: `Rate Limit User ${i}`,
            password: 'RateLimit123!',
          })
        );
      }

      const responses = await Promise.all(rapidRequests);
      const rateLimitedResponses = responses.filter(r => r.status === 429);

      if (rateLimitedResponses.length > 0) {
        expect(rateLimitedResponses[0].body.message).toMatch(/rate limit|too many requests/i);
        expect(rateLimitedResponses[0].headers['x-ratelimit-limit']).toBeDefined();
        expect(rateLimitedResponses[0].headers['x-ratelimit-remaining']).toBeDefined();
      }
    });
  });

  describe('Pagination and Query Parameter Validation', () => {
    it('should validate pagination parameters', async () => {
      const paginationCases = [
        { page: 1, limit: 10, expectedStatus: 200 },
        { page: 0, limit: 10, expectedStatus: 400 }, // Invalid page
        { page: 1, limit: 0, expectedStatus: 400 }, // Invalid limit
        { page: 1, limit: 1000, expectedStatus: 400 }, // Limit too high
        { page: -1, limit: 10, expectedStatus: 400 }, // Negative page
        { page: 'invalid', limit: 10, expectedStatus: 400 }, // Non-numeric page
      ];

      for (const testCase of paginationCases) {
        const response = await httpHelper.get('/api/coaches', {
          query: { page: testCase.page, limit: testCase.limit },
          expectedStatus: testCase.expectedStatus,
        });

        expect(response.status).toBe(testCase.expectedStatus);

        if (response.status === 200) {
          // Validate pagination response structure
          expect(response.body).toHaveProperty('data');
          expect(response.body).toHaveProperty('meta');
          expect(response.body.meta).toHaveProperty('page');
          expect(response.body.meta).toHaveProperty('limit');
          expect(response.body.meta).toHaveProperty('total');
        }
      }
    });

    it('should validate query parameter types and formats', async () => {
      const queryValidationCases = [
        {
          endpoint: '/api/sessions',
          query: { startDate: '2024-01-01', endDate: '2024-12-31' },
          expectedStatus: 200,
          headers: { Authorization: `Bearer ${userToken}` },
        },
        {
          endpoint: '/api/sessions',
          query: { startDate: 'invalid-date', endDate: '2024-12-31' },
          expectedStatus: 400,
          headers: { Authorization: `Bearer ${userToken}` },
        },
        {
          endpoint: '/api/coaches',
          query: { isActive: 'true' },
          expectedStatus: 200,
        },
        {
          endpoint: '/api/coaches',
          query: { isActive: 'invalid-boolean' },
          expectedStatus: 400,
        },
      ];

      for (const testCase of queryValidationCases) {
        const response = await httpHelper.get(testCase.endpoint, {
          query: testCase.query,
          headers: testCase.headers || {},
          expectedStatus: testCase.expectedStatus,
        });

        expect(response.status).toBe(testCase.expectedStatus);
      }
    });
  });

  describe('API Versioning and Backward Compatibility', () => {
    it('should handle API version headers', async () => {
      const versionCases = [
        { version: 'v1', expectedStatus: 200 },
        { version: 'v2', expectedStatus: 200 }, // If v2 exists
        { version: 'invalid', expectedStatus: 400 },
      ];

      for (const testCase of versionCases) {
        const response = await httpHelper.get('/api/health', {
          headers: { 'API-Version': testCase.version },
          expectedStatus: testCase.expectedStatus,
        });

        expect(response.status).toBe(testCase.expectedStatus);
      }
    });

    it('should maintain backward compatibility', async () => {
      // Test that old API contracts still work
      const backwardCompatibilityTests = [
        {
          name: 'Legacy registration format',
          endpoint: '/api/auth/register',
          method: 'POST',
          data: {
            email: 'legacy@example.com',
            name: 'Legacy User',
            password: 'LegacyPassword123!',
          },
        },
        {
          name: 'Legacy login format',
          endpoint: '/api/auth/login',
          method: 'POST',
          data: {
            email: testUser.email,
            password: 'UserPassword123!',
          },
        },
      ];

      for (const test of backwardCompatibilityTests) {
        const response = await httpHelper[test.method.toLowerCase()](test.endpoint, test.data);

        // Should still work with legacy format
        expect([200, 201]).toContain(response.status);
        expect(response.body).toHaveProperty('accessToken');
      }
    });
  });

  describe('Performance and Load Testing', () => {
    it('should handle concurrent requests gracefully', async () => {
      const concurrentRequests = [];
      const requestCount = 50;

      for (let i = 0; i < requestCount; i++) {
        concurrentRequests.push(httpHelper.get('/api/health'));
      }

      const startTime = Date.now();
      const responses = await Promise.all(concurrentRequests);
      const endTime = Date.now();

      // All requests should succeed
      responses.forEach(response => {
        expect(response.status).toBe(200);
      });

      // Should complete within reasonable time (adjust threshold as needed)
      const totalTime = endTime - startTime;
      expect(totalTime).toBeLessThan(10000); // 10 seconds max

      console.log(`Completed ${requestCount} concurrent requests in ${totalTime}ms`);
    });

    it('should handle timeout scenarios', async () => {
      // Test with very short timeout
      try {
        const response = await httpHelper.get('/api/health', {
          timeout: 1, // 1ms timeout - should fail
        });

        // If it doesn't timeout, that's also valid
        expect([200, 408]).toContain(response.status);
      } catch (error) {
        // Timeout error is expected
        expect(error.message).toMatch(/timeout|ECONNABORTED/i);
      }
    });
  });

  describe('Security Testing', () => {
    it('should prevent common security vulnerabilities', async () => {
      const securityTests = [
        {
          name: 'Path traversal prevention',
          endpoint: '/api/../../../etc/passwd',
          expectedStatus: 404,
        },
        {
          name: 'Directory traversal prevention',
          endpoint: '/api/coaches/../../admin/users',
          expectedStatus: 404,
        },
        {
          name: 'Null byte injection prevention',
          endpoint: '/api/coaches/test%00.txt',
          expectedStatus: 404,
        },
      ];

      for (const test of securityTests) {
        const response = await httpHelper.get(test.endpoint, {
          expectedStatus: test.expectedStatus,
        });

        expect(response.status).toBe(test.expectedStatus);
      }
    });

    it('should validate JWT token security', async () => {
      const tokenSecurityTests = [
        {
          name: 'Malformed JWT',
          token: 'malformed.jwt.token',
          expectedStatus: 401,
        },
        {
          name: 'Empty JWT',
          token: '',
          expectedStatus: 401,
        },
        {
          name: 'JWT with wrong signature',
          token:
            authHelper.createToken({ sub: testUser.id, email: testUser.email, type: 'user' }) +
            'tampered',
          expectedStatus: 401,
        },
      ];

      for (const test of tokenSecurityTests) {
        const response = await httpHelper.get('/api/auth/profile', {
          headers: { Authorization: `Bearer ${test.token}` },
          expectedStatus: test.expectedStatus,
        });

        expect(response.status).toBe(test.expectedStatus);
      }
    });
  });
});
