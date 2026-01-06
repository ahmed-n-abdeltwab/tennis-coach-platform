import { Role } from '@prisma/client';

import { E2ETest } from '../utils';

describe('User Registration and Authentication Flow (E2E)', () => {
  let test: E2ETest;

  beforeAll(async () => {
    test = new E2ETest();
    await test.setup();
  });

  afterAll(async () => {
    await test.cleanup();
  });

  beforeEach(async () => {
    await test.db.cleanupDatabase();
  });

  describe('User Registration Flow', () => {
    it('should complete registration flow and return valid tokens', async () => {
      const signupData = {
        email: `test-user-${Date.now()}@example.com`,
        password: 'password123',
        name: 'Test User',
      };

      // Step 1: Register new user
      const signupResponse = await test.http.post('/api/authentication/signup', {
        body: signupData,
      });

      expect(signupResponse.ok).toBe(true);
      if (signupResponse.ok) {
        expect(signupResponse.status).toBe(201);
        expect(signupResponse.body).toHaveProperty('accessToken');
        expect(signupResponse.body).toHaveProperty('refreshToken');
        expect(signupResponse.body).toHaveProperty('account');
        expect(signupResponse.body.account.email).toBe(signupData.email);
        expect(signupResponse.body.account.role).toBe(Role.USER);

        // Step 2: Verify the access token works by accessing protected endpoint
        const meResponse = await test.http.authenticatedGet(
          '/api/accounts/me',
          signupResponse.body.accessToken
        );

        expect(meResponse.ok).toBe(true);
        if (meResponse.ok) {
          expect(meResponse.body.email).toBe(signupData.email);
          expect(meResponse.body.name).toBe(signupData.name);
        }
      }
    });

    it('should reject registration with existing email', async () => {
      const email = `existing-user-${Date.now()}@example.com`;

      // First registration should succeed
      const firstSignup = await test.http.post('/api/authentication/signup', {
        body: {
          email,
          password: 'password123',
          name: 'First User',
        },
      });
      expect(firstSignup.ok).toBe(true);

      // Second registration with same email should fail
      const secondSignup = await test.http.post('/api/authentication/signup', {
        body: {
          email,
          password: 'password456',
          name: 'Second User',
        },
      });

      expect(secondSignup.ok).toBe(false);
      if (!secondSignup.ok) {
        expect(secondSignup.status).toBe(401);
      }
    });

    it('should reject registration with invalid email format', async () => {
      const signupResponse = await test.http.post('/api/authentication/signup', {
        body: {
          email: 'invalid-email',
          password: 'password123',
          name: 'Test User',
        },
      });

      expect(signupResponse.ok).toBe(false);
      if (!signupResponse.ok) {
        expect(signupResponse.status).toBe(400);
      }
    });

    it('should reject registration with short password', async () => {
      const signupResponse = await test.http.post('/api/authentication/signup', {
        body: {
          email: `test-${Date.now()}@example.com`,
          password: '12345', // Less than 6 characters
          name: 'Test User',
        },
      });

      expect(signupResponse.ok).toBe(false);
      if (!signupResponse.ok) {
        expect(signupResponse.status).toBe(400);
      }
    });

    it('should allow first login after registration', async () => {
      const email = `new-user-${Date.now()}@example.com`;
      const password = 'password123';

      // Register
      const signupResponse = await test.http.post('/api/authentication/signup', {
        body: {
          email,
          password,
          name: 'New User',
        },
      });
      expect(signupResponse.ok).toBe(true);

      // Login with same credentials
      const loginResponse = await test.http.post('/api/authentication/login', {
        body: { email, password },
      });

      expect(loginResponse.ok).toBe(true);
      if (loginResponse.ok) {
        expect(loginResponse.body).toHaveProperty('accessToken');
        expect(loginResponse.body).toHaveProperty('refreshToken');
        expect(loginResponse.body.account.email).toBe(email);
      }
    });
  });

  describe('User Login Flow', () => {
    const testPassword = 'password123';
    let testEmail: string;

    beforeEach(async () => {
      // Create a user via signup for login tests
      testEmail = `login-test-${Date.now()}@example.com`;
      await test.http.post('/api/authentication/signup', {
        body: {
          email: testEmail,
          password: testPassword,
          name: 'Login Test User',
        },
      });
    });

    it('should return valid JWT tokens on successful login', async () => {
      const loginResponse = await test.http.post('/api/authentication/login', {
        body: {
          email: testEmail,
          password: testPassword,
        },
      });

      expect(loginResponse.ok).toBe(true);
      if (loginResponse.ok) {
        expect(loginResponse.status).toBe(201);
        expect(loginResponse.body).toHaveProperty('accessToken');
        expect(loginResponse.body).toHaveProperty('refreshToken');
        expect(loginResponse.body).toHaveProperty('account');
        expect(loginResponse.body.account.email).toBe(testEmail);

        // Verify access token is valid by making authenticated request
        const meResponse = await test.http.authenticatedGet(
          '/api/accounts/me',
          loginResponse.body.accessToken
        );
        expect(meResponse.ok).toBe(true);
      }
    });

    it('should return 401 for invalid password', async () => {
      const loginResponse = await test.http.post('/api/authentication/login', {
        body: {
          email: testEmail,
          password: 'wrongpassword',
        },
      });

      expect(loginResponse.ok).toBe(false);
      if (!loginResponse.ok) {
        expect(loginResponse.status).toBe(401);
        expect(loginResponse.body.message).toContain('Invalid credentials');
      }
    });

    it('should return 401 for non-existent email', async () => {
      const loginResponse = await test.http.post('/api/authentication/login', {
        body: {
          email: 'nonexistent@example.com',
          password: testPassword,
        },
      });

      expect(loginResponse.ok).toBe(false);
      if (!loginResponse.ok) {
        expect(loginResponse.status).toBe(401);
        expect(loginResponse.body.message).toContain('Invalid credentials');
      }
    });

    it('should return 400 for missing email', async () => {
      const loginResponse = await test.http.post('/api/authentication/login', {
        body: {
          password: testPassword,
        } as { email: string; password: string },
      });

      expect(loginResponse.ok).toBe(false);
      if (!loginResponse.ok) {
        expect(loginResponse.status).toBe(400);
      }
    });

    it('should return 400 for missing password', async () => {
      const loginResponse = await test.http.post('/api/authentication/login', {
        body: {
          email: testEmail,
        } as { email: string; password: string },
      });

      expect(loginResponse.ok).toBe(false);
      if (!loginResponse.ok) {
        expect(loginResponse.status).toBe(400);
      }
    });
  });

  describe('Token Refresh Flow', () => {
    it('should obtain new access token using refresh token', async () => {
      // Register and get tokens
      const email = `refresh-test-${Date.now()}@example.com`;
      const signupResponse = await test.http.post('/api/authentication/signup', {
        body: {
          email,
          password: 'password123',
          name: 'Refresh Test User',
        },
      });

      expect(signupResponse.ok).toBe(true);
      if (!signupResponse.ok) return;

      const { refreshToken, account } = signupResponse.body;

      // Use refresh token to get new access token
      const refreshResponse = await test.http.authenticatedPost(
        '/api/authentication/refresh',
        refreshToken
      );

      expect(refreshResponse.ok).toBe(true);
      if (refreshResponse.ok) {
        expect(refreshResponse.body).toHaveProperty('accessToken');
        expect(refreshResponse.body).toHaveProperty('refreshToken');
        expect(refreshResponse.body.account.id).toBe(account.id);

        // Verify new access token works
        const meResponse = await test.http.authenticatedGet(
          '/api/accounts/me',
          refreshResponse.body.accessToken
        );
        expect(meResponse.ok).toBe(true);
      }
    });

    it('should reject invalid refresh token', async () => {
      const refreshResponse = await test.http.authenticatedPost(
        '/api/authentication/refresh',
        'invalid-refresh-token'
      );

      expect(refreshResponse.ok).toBe(false);
      if (!refreshResponse.ok) {
        expect(refreshResponse.status).toBe(401);
      }
    });
  });

  describe('Coach Registration Flow', () => {
    it('should register coach and allow profile setup', async () => {
      const coachEmail = `coach-${Date.now()}@example.com`;

      // Step 1: Register as coach
      const signupResponse = await test.http.post('/api/authentication/signup', {
        body: {
          email: coachEmail,
          password: 'password123',
          name: 'Test Coach',
          role: Role.COACH,
        },
      });

      expect(signupResponse.ok).toBe(true);
      if (!signupResponse.ok) return;

      expect(signupResponse.body.account.role).toBe(Role.COACH);
      const { accessToken, account } = signupResponse.body;

      // Step 2: Update coach profile
      const updateResponse = await test.http.authenticatedPatch(
        `/api/accounts/${account.id}` as '/api/accounts/{id}',
        accessToken,
        {
          body: {
            bio: 'Experienced tennis coach with 10+ years of professional training.',
            credentials: 'USPTA Certified Professional',
            philosophy: 'Focus on fundamentals and consistent improvement.',
          },
        }
      );

      expect(updateResponse.ok).toBe(true);
      if (updateResponse.ok) {
        expect(updateResponse.body.bio).toBe(
          'Experienced tennis coach with 10+ years of professional training.'
        );
        expect(updateResponse.body.credentials).toBe('USPTA Certified Professional');
      }

      // Step 3: Verify coach can create booking types
      const bookingTypeResponse = await test.http.authenticatedPost(
        '/api/booking-types',
        accessToken,
        {
          body: {
            name: 'Private Lesson',
            description: 'One-on-one coaching session',
            basePrice: 75,
          },
        }
      );

      expect(bookingTypeResponse.ok).toBe(true);
      if (bookingTypeResponse.ok) {
        expect(bookingTypeResponse.body.name).toBe('Private Lesson');
        expect(bookingTypeResponse.body.coachId).toBe(account.id);
      }
    });
  });

  describe.skip('Password Reset Flow (Not Implemented)', () => {
    it('should request password reset', async () => {
      // TODO: Implement when password reset endpoint is available
    });

    it('should reset password with valid token', async () => {
      // TODO: Implement when password reset endpoint is available
    });

    it('should allow login with new password after reset', async () => {
      // TODO: Implement when password reset endpoint is available
    });
  });

  describe('Session Management', () => {
    it('should logout and invalidate session', async () => {
      // Register and get tokens
      const email = `logout-test-${Date.now()}@example.com`;
      const signupResponse = await test.http.post('/api/authentication/signup', {
        body: {
          email,
          password: 'password123',
          name: 'Logout Test User',
        },
      });

      expect(signupResponse.ok).toBe(true);
      if (!signupResponse.ok) return;

      const { accessToken } = signupResponse.body;

      // Verify token works before logout
      const beforeLogout = await test.http.authenticatedGet('/api/accounts/me', accessToken);
      expect(beforeLogout.ok).toBe(true);

      // Logout
      const logoutResponse = await test.http.authenticatedPost(
        '/api/authentication/logout',
        accessToken
      );

      expect(logoutResponse.ok).toBe(true);
      if (logoutResponse.ok) {
        expect(logoutResponse.body.message).toBe('Logged out successfully');
      }
    });

    it('should require authentication for logout', async () => {
      const logoutResponse = await test.http.post('/api/authentication/logout');

      expect(logoutResponse.ok).toBe(false);
      if (!logoutResponse.ok) {
        expect(logoutResponse.status).toBe(401);
      }
    });
  });

  describe('Authentication Security', () => {
    it('should reject requests to protected endpoints without token', async () => {
      const response = await test.http.get('/api/accounts/me');

      expect(response.ok).toBe(false);
      if (!response.ok) {
        expect(response.status).toBeGreaterThanOrEqual(401);
      }
    });

    it('should reject requests with malformed token', async () => {
      const response = await test.http.authenticatedGet('/api/accounts/me', 'malformed-token');

      expect(response.ok).toBe(false);
      if (!response.ok) {
        expect(response.status).toBe(401);
      }
    });

    it('should reject requests with empty authorization header', async () => {
      const response = await test.http.get('/api/accounts/me', undefined, {
        headers: { Authorization: '' },
      });

      expect(response.ok).toBe(false);
      if (!response.ok) {
        expect(response.status).toBeGreaterThanOrEqual(401);
      }
    });
  });
});
