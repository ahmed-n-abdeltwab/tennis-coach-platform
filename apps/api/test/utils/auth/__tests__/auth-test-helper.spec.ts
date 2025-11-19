import { Role } from '@prisma/client';

import { AuthTestHelper } from '../auth-test-helper';

describe('AuthTestHelper', () => {
  let authHelper: AuthTestHelper;

  beforeEach(() => {
    authHelper = new AuthTestHelper();
  });

  describe('Token Creation', () => {
    it('should create a valid user token', () => {
      const token = authHelper.createUserToken();
      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      expect(token.length).toBeGreaterThan(0);
    });

    it('should create a valid coach token', () => {
      const token = authHelper.createCoachToken();
      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
    });

    it('should create a valid admin token', () => {
      const token = authHelper.createAdminToken();
      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
    });

    it('should create a valid premium user token', () => {
      const token = authHelper.createPremiumUserToken();
      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
    });

    it('should create token with custom data', () => {
      const token = authHelper.createUserToken({
        id: 'custom-id',
        email: 'custom@example.com',
      });

      const decoded = authHelper.decodeToken(token);
      expect(decoded).toBeDefined();
      expect(decoded?.sub).toBe('custom-id');
      expect(decoded?.email).toBe('custom@example.com');
      expect(decoded?.role).toBe(Role.USER);
    });
  });

  describe('Token Verification', () => {
    it('should decode a valid token', () => {
      const token = authHelper.createUserToken();
      const decoded = authHelper.decodeToken(token);

      expect(decoded).toBeDefined();
      expect(decoded?.sub).toBe('test-user-id');
      expect(decoded?.email).toBe('user@example.com');
      expect(decoded?.role).toBe(Role.USER);
    });

    it('should verify a valid token', async () => {
      const token = authHelper.createUserToken();
      const verified = await authHelper.verifyToken(token);

      expect(verified).toBeDefined();
      expect(verified?.sub).toBe('test-user-id');
    });

    it('should return null for invalid token', () => {
      const decoded = authHelper.decodeToken('invalid-token');
      expect(decoded).toBeNull();
    });

    it('should return null when verifying expired token', async () => {
      const expiredToken = authHelper.createExpiredToken();
      const verified = await authHelper.verifyToken(expiredToken);

      expect(verified).toBeNull();
    });
  });

  describe('Auth Headers', () => {
    it('should create user auth headers', () => {
      const headers = authHelper.createUserAuthHeaders();

      expect(headers).toBeDefined();
      expect(headers.Authorization).toBeDefined();
      expect(headers.Authorization).toMatch(/^Bearer /);
    });

    it('should create coach auth headers', () => {
      const headers = authHelper.createCoachAuthHeaders();

      expect(headers).toBeDefined();
      expect(headers.Authorization).toBeDefined();
      expect(headers.Authorization).toMatch(/^Bearer /);
    });

    it('should create admin auth headers', () => {
      const headers = authHelper.createAdminAuthHeaders();

      expect(headers).toBeDefined();
      expect(headers.Authorization).toBeDefined();
      expect(headers.Authorization).toMatch(/^Bearer /);
    });

    it('should create expired auth headers', async () => {
      const headers = authHelper.createExpiredAuthHeaders();

      expect(headers).toBeDefined();
      expect(headers.Authorization).toBeDefined();
      expect(headers.Authorization).toMatch(/^Bearer /);

      // Extract token and verify it's expired
      const token = headers.Authorization.replace('Bearer ', '');
      const verified = await authHelper.verifyToken(token);
      expect(verified).toBeNull();
    });
  });

  describe('Role-Specific Tokens', () => {
    it('should create tokens with correct roles', () => {
      const userToken = authHelper.createUserToken();
      const coachToken = authHelper.createCoachToken();
      const adminToken = authHelper.createAdminToken();
      const premiumToken = authHelper.createPremiumUserToken();

      const userDecoded = authHelper.decodeToken(userToken);
      const coachDecoded = authHelper.decodeToken(coachToken);
      const adminDecoded = authHelper.decodeToken(adminToken);
      const premiumDecoded = authHelper.decodeToken(premiumToken);

      expect(userDecoded?.role).toBe(Role.USER);
      expect(coachDecoded?.role).toBe(Role.COACH);
      expect(adminDecoded?.role).toBe(Role.ADMIN);
      expect(premiumDecoded?.role).toBe(Role.PREMIUM_USER);
    });
  });
});
