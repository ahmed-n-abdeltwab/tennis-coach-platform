import { Role } from '@prisma/client';

import { AuthTestHelper } from '../auth-test-helper';

describe('AuthTestHelper', () => {
  let authHelper: AuthTestHelper;

  beforeEach(() => {
    authHelper = new AuthTestHelper();
  });

  describe('Token Creation', () => {
    it('should create a valid user token', async () => {
      const token = await authHelper.createUserToken();
      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      expect(token.length).toBeGreaterThan(0);
    });

    it('should create a valid coach token', async () => {
      const token = await authHelper.createCoachToken();
      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
    });

    it('should create a valid admin token', async () => {
      const token = await authHelper.createAdminToken();
      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
    });

    it('should create a valid premium user token', async () => {
      const token = await authHelper.createPremiumUserToken();
      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
    });

    it('should create token with custom data', async () => {
      const token = await authHelper.createUserToken({
        sub: 'custom-id',
        email: 'custom@example.com',
      });

      const decoded = await authHelper.decodeToken(token);
      expect(decoded).toBeDefined();
      expect(decoded?.sub).toBe('custom-id');
      expect(decoded?.email).toBe('custom@example.com');
      expect(decoded?.role).toBe(Role.USER);
    });
  });

  describe('Token Verification', () => {
    it('should decode a valid token', async () => {
      const token = await authHelper.createUserToken();
      const decoded = await authHelper.decodeToken(token);

      expect(decoded).toBeDefined();
      expect(decoded?.sub).toBe('test-user-id');
      expect(decoded?.email).toBe('user@example.com');
      expect(decoded?.role).toBe(Role.USER);
    });

    it('should verify a valid token', async () => {
      const token = await authHelper.createUserToken();
      const verified = await authHelper.verifyToken(token);

      expect(verified).toBeDefined();
      expect(verified?.sub).toBe('test-user-id');
    });

    it('should return null for invalid token', async () => {
      const decoded = await authHelper.decodeToken('invalid-token');
      expect(decoded).toBeNull();
    });

    it('should return null when verifying expired token', async () => {
      const expiredToken = await authHelper.createExpiredToken();
      const verified = await authHelper.verifyToken(expiredToken);

      expect(verified).toBeNull();
    });
  });

  describe('Auth Headers', () => {
    it('should create user auth headers', async () => {
      const headers = await authHelper.createUserAuthHeaders();

      expect(headers).toBeDefined();
      expect(headers.Authorization).toBeDefined();
      expect(headers.Authorization).toMatch(/^Bearer /);
    });

    it('should create coach auth headers', async () => {
      const headers = await authHelper.createCoachAuthHeaders();

      expect(headers).toBeDefined();
      expect(headers.Authorization).toBeDefined();
      expect(headers.Authorization).toMatch(/^Bearer /);
    });

    it('should create admin auth headers', async () => {
      const headers = await authHelper.createAdminAuthHeaders();

      expect(headers).toBeDefined();
      expect(headers.Authorization).toBeDefined();
      expect(headers.Authorization).toMatch(/^Bearer /);
    });

    it('should create expired auth headers', async () => {
      const headers = await authHelper.createExpiredAuthHeaders();

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
    it('should create tokens with correct roles', async () => {
      const userToken = await authHelper.createUserToken();
      const coachToken = await authHelper.createCoachToken();
      const adminToken = await authHelper.createAdminToken();
      const premiumToken = await authHelper.createPremiumUserToken();

      const userDecoded = await authHelper.decodeToken(userToken);
      const coachDecoded = await authHelper.decodeToken(coachToken);
      const adminDecoded = await authHelper.decodeToken(adminToken);
      const premiumDecoded = await authHelper.decodeToken(premiumToken);

      expect(userDecoded?.role).toBe(Role.USER);
      expect(coachDecoded?.role).toBe(Role.COACH);
      expect(adminDecoded?.role).toBe(Role.ADMIN);
      expect(premiumDecoded?.role).toBe(Role.PREMIUM_USER);
    });
  });
});
