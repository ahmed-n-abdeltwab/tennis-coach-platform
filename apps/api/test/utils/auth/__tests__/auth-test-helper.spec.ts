import { Role } from '@prisma/client';

import { AuthTestHelper } from '../auth-test-helper';

describe('AuthTestHelper', () => {
  let authHelper: AuthTestHelper;

  beforeEach(() => {
    authHelper = new AuthTestHelper();
  });

  describe('createToken() - Token Creation with Various Payloads', () => {
    it('should create a token with default payload', async () => {
      const token = await authHelper.createToken({});
      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      expect(token.length).toBeGreaterThan(0);

      const decoded = await authHelper.decodeToken(token);
      expect(decoded).toBeDefined();
      expect(decoded?.sub).toBe('test-user-id');
      expect(decoded?.email).toBe('test@example.com');
      expect(decoded?.role).toBe(Role.USER);
    });

    it('should create a token with custom sub', async () => {
      const token = await authHelper.createToken({ sub: 'custom-user-123' });
      const decoded = await authHelper.decodeToken(token);

      expect(decoded).toBeDefined();
      expect(decoded?.sub).toBe('custom-user-123');
      expect(decoded?.email).toBe('test@example.com');
      expect(decoded?.role).toBe(Role.USER);
    });

    it('should create a token with custom email', async () => {
      const token = await authHelper.createToken({ email: 'custom@test.com' });
      const decoded = await authHelper.decodeToken(token);

      expect(decoded).toBeDefined();
      expect(decoded?.sub).toBe('test-user-id');
      expect(decoded?.email).toBe('custom@test.com');
      expect(decoded?.role).toBe(Role.USER);
    });

    it('should create a token with custom role', async () => {
      const token = await authHelper.createToken({ role: Role.ADMIN });
      const decoded = await authHelper.decodeToken(token);

      expect(decoded).toBeDefined();
      expect(decoded?.sub).toBe('test-user-id');
      expect(decoded?.email).toBe('test@example.com');
      expect(decoded?.role).toBe(Role.ADMIN);
    });

    it('should create a token with all custom fields', async () => {
      const customPayload = {
        sub: 'user-456',
        email: 'user456@example.com',
        role: Role.COACH,
      };
      const token = await authHelper.createToken(customPayload);
      const decoded = await authHelper.decodeToken(token);

      expect(decoded).toBeDefined();
      expect(decoded?.sub).toBe('user-456');
      expect(decoded?.email).toBe('user456@example.com');
      expect(decoded?.role).toBe(Role.COACH);
    });

    it('should create a token with partial payload', async () => {
      const token = await authHelper.createToken({
        sub: 'partial-user',
        role: Role.PREMIUM_USER,
      });
      const decoded = await authHelper.decodeToken(token);

      expect(decoded).toBeDefined();
      expect(decoded?.sub).toBe('partial-user');
      expect(decoded?.email).toBe('test@example.com'); // default
      expect(decoded?.role).toBe(Role.PREMIUM_USER);
    });

    it('should create a token with special characters in payload', async () => {
      const token = await authHelper.createToken({
        sub: 'user-with-special-chars-!@#$%',
        email: 'test+special@example.com',
      });
      const decoded = await authHelper.decodeToken(token);

      expect(decoded).toBeDefined();
      expect(decoded?.sub).toBe('user-with-special-chars-!@#$%');
      expect(decoded?.email).toBe('test+special@example.com');
    });
  });

  describe('Role-Specific Token Creation Methods', () => {
    it('should create a valid user token with defaults', async () => {
      const token = await authHelper.createUserToken();
      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      expect(token.length).toBeGreaterThan(0);

      const decoded = await authHelper.decodeToken(token);
      expect(decoded?.role).toBe(Role.USER);
      expect(decoded?.sub).toBe('test-user-id');
      expect(decoded?.email).toBe('user@example.com');
    });

    it('should create a user token with custom payload', async () => {
      const token = await authHelper.createUserToken({
        sub: 'custom-user-id',
        email: 'custom-user@example.com',
      });
      const decoded = await authHelper.decodeToken(token);

      expect(decoded?.role).toBe(Role.USER);
      expect(decoded?.sub).toBe('custom-user-id');
      expect(decoded?.email).toBe('custom-user@example.com');
    });

    it('should create a valid coach token with defaults', async () => {
      const token = await authHelper.createCoachToken();
      expect(token).toBeDefined();
      expect(typeof token).toBe('string');

      const decoded = await authHelper.decodeToken(token);
      expect(decoded?.role).toBe(Role.COACH);
      expect(decoded?.sub).toBe('test-coach-id');
      expect(decoded?.email).toBe('coach@example.com');
    });

    it('should create a coach token with custom payload', async () => {
      const token = await authHelper.createCoachToken({
        sub: 'coach-123',
        email: 'coach@example.com',
      });
      const decoded = await authHelper.decodeToken(token);

      expect(decoded?.role).toBe(Role.COACH);
      expect(decoded?.sub).toBe('coach-123');
      expect(decoded?.email).toBe('coach@example.com');
    });

    it('should create a valid admin token with defaults', async () => {
      const token = await authHelper.createAdminToken();
      expect(token).toBeDefined();
      expect(typeof token).toBe('string');

      const decoded = await authHelper.decodeToken(token);
      expect(decoded?.role).toBe(Role.ADMIN);
      expect(decoded?.sub).toBe('test-admin-id');
      expect(decoded?.email).toBe('admin@example.com');
    });

    it('should create an admin token with custom payload', async () => {
      const token = await authHelper.createAdminToken({
        sub: 'admin-456',
        email: 'admin@example.com',
      });
      const decoded = await authHelper.decodeToken(token);

      expect(decoded?.role).toBe(Role.ADMIN);
      expect(decoded?.sub).toBe('admin-456');
      expect(decoded?.email).toBe('admin@example.com');
    });

    it('should create a valid premium user token with defaults', async () => {
      const token = await authHelper.createPremiumUserToken();
      expect(token).toBeDefined();
      expect(typeof token).toBe('string');

      const decoded = await authHelper.decodeToken(token);
      expect(decoded?.role).toBe(Role.PREMIUM_USER);
      expect(decoded?.sub).toBe('test-premium_user-id');
      expect(decoded?.email).toBe('premium_user@example.com');
    });

    it('should create a premium user token with custom payload', async () => {
      const token = await authHelper.createPremiumUserToken({
        sub: 'premium-789',
        email: 'premium@example.com',
      });
      const decoded = await authHelper.decodeToken(token);

      expect(decoded?.role).toBe(Role.PREMIUM_USER);
      expect(decoded?.sub).toBe('premium-789');
      expect(decoded?.email).toBe('premium@example.com');
    });

    it('should create tokens with correct roles for all role types', async () => {
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

    it('should create role token using createRoleToken method', async () => {
      const roles = [Role.USER, Role.COACH, Role.ADMIN, Role.PREMIUM_USER];

      for (const role of roles) {
        const token = await authHelper.createRoleToken(role);
        const decoded = await authHelper.decodeToken(token);

        expect(decoded?.role).toBe(role);
        expect(decoded?.sub).toBe(`test-${role.toLowerCase()}-id`);
        expect(decoded?.email).toBe(`${role.toLowerCase()}@example.com`);
      }
    });

    it('should create role token with custom payload', async () => {
      const token = await authHelper.createRoleToken(Role.COACH, {
        sub: 'custom-coach',
        email: 'custom@coach.com',
      });
      const decoded = await authHelper.decodeToken(token);

      expect(decoded?.role).toBe(Role.COACH);
      expect(decoded?.sub).toBe('custom-coach');
      expect(decoded?.email).toBe('custom@coach.com');
    });
  });

  describe('createExpiredToken() - Expired Token Creation', () => {
    it('should create an expired token', async () => {
      const expiredToken = await authHelper.createExpiredToken();

      expect(expiredToken).toBeDefined();
      expect(typeof expiredToken).toBe('string');
      expect(expiredToken.length).toBeGreaterThan(0);
    });

    it('should create an expired token that can be decoded', async () => {
      const expiredToken = await authHelper.createExpiredToken();
      const decoded = await authHelper.decodeToken(expiredToken);

      expect(decoded).toBeDefined();
      expect(decoded?.sub).toBe('test-user-id');
      expect(decoded?.email).toBe('test@example.com');
      expect(decoded?.role).toBe(Role.USER);
    });

    it('should create an expired token that fails verification', async () => {
      const expiredToken = await authHelper.createExpiredToken();
      const verified = await authHelper.verifyToken(expiredToken);

      expect(verified).toBeNull();
    });

    it('should create an expired token with custom payload', async () => {
      const expiredToken = await authHelper.createExpiredToken({
        sub: 'expired-user',
        email: 'expired@example.com',
        role: Role.COACH,
      });
      const decoded = await authHelper.decodeToken(expiredToken);

      expect(decoded).toBeDefined();
      expect(decoded?.sub).toBe('expired-user');
      expect(decoded?.email).toBe('expired@example.com');
      expect(decoded?.role).toBe(Role.COACH);

      const verified = await authHelper.verifyToken(expiredToken);
      expect(verified).toBeNull();
    });

    it('should create multiple expired tokens with different payloads', async () => {
      const expiredToken1 = await authHelper.createExpiredToken({ sub: 'user-1' });
      const expiredToken2 = await authHelper.createExpiredToken({ sub: 'user-2' });

      const decoded1 = await authHelper.decodeToken(expiredToken1);
      const decoded2 = await authHelper.decodeToken(expiredToken2);

      expect(decoded1?.sub).toBe('user-1');
      expect(decoded2?.sub).toBe('user-2');

      expect(await authHelper.verifyToken(expiredToken1)).toBeNull();
      expect(await authHelper.verifyToken(expiredToken2)).toBeNull();
    });
  });

  describe('createAuthHeaders() - Auth Headers Formatting', () => {
    it('should create auth headers with default token', async () => {
      const headers = await authHelper.createAuthHeaders();

      expect(headers).toBeDefined();
      expect(headers.Authorization).toBeDefined();
      expect(headers.Authorization).toMatch(/^Bearer /);
    });

    it('should create auth headers with provided token', async () => {
      const token = await authHelper.createUserToken();
      const headers = await authHelper.createAuthHeaders(token);

      expect(headers).toBeDefined();
      expect(headers.Authorization).toBe(`Bearer ${token}`);
    });

    it('should format auth headers correctly', async () => {
      const token = 'test-token-123';
      const headers = await authHelper.createAuthHeaders(token);

      expect(headers.Authorization).toBe('Bearer test-token-123');
    });

    it('should create user auth headers', async () => {
      const headers = await authHelper.createUserAuthHeaders();

      expect(headers).toBeDefined();
      expect(headers.Authorization).toBeDefined();
      expect(headers.Authorization).toMatch(/^Bearer /);

      const token = headers.Authorization.replace('Bearer ', '');
      const decoded = await authHelper.decodeToken(token);
      expect(decoded?.role).toBe(Role.USER);
    });

    it('should create coach auth headers', async () => {
      const headers = await authHelper.createCoachAuthHeaders();

      expect(headers).toBeDefined();
      expect(headers.Authorization).toBeDefined();
      expect(headers.Authorization).toMatch(/^Bearer /);

      const token = headers.Authorization.replace('Bearer ', '');
      const decoded = await authHelper.decodeToken(token);
      expect(decoded?.role).toBe(Role.COACH);
    });

    it('should create admin auth headers', async () => {
      const headers = await authHelper.createAdminAuthHeaders();

      expect(headers).toBeDefined();
      expect(headers.Authorization).toBeDefined();
      expect(headers.Authorization).toMatch(/^Bearer /);

      const token = headers.Authorization.replace('Bearer ', '');
      const decoded = await authHelper.decodeToken(token);
      expect(decoded?.role).toBe(Role.ADMIN);
    });

    it('should create premium user auth headers', async () => {
      const headers = await authHelper.createPremiumUserAuthHeaders();

      expect(headers).toBeDefined();
      expect(headers.Authorization).toBeDefined();
      expect(headers.Authorization).toMatch(/^Bearer /);

      const token = headers.Authorization.replace('Bearer ', '');
      const decoded = await authHelper.decodeToken(token);
      expect(decoded?.role).toBe(Role.PREMIUM_USER);
    });

    it('should create expired auth headers', async () => {
      const headers = await authHelper.createExpiredAuthHeaders();

      expect(headers).toBeDefined();
      expect(headers.Authorization).toBeDefined();
      expect(headers.Authorization).toMatch(/^Bearer /);

      const token = headers.Authorization.replace('Bearer ', '');
      const verified = await authHelper.verifyToken(token);
      expect(verified).toBeNull();
    });

    it('should create role auth headers for all roles', async () => {
      const roles = [Role.USER, Role.COACH, Role.ADMIN, Role.PREMIUM_USER];

      for (const role of roles) {
        const headers = await authHelper.createRoleAuthHeaders(role);

        expect(headers).toBeDefined();
        expect(headers.Authorization).toMatch(/^Bearer /);

        const token = headers.Authorization.replace('Bearer ', '');
        const decoded = await authHelper.decodeToken(token);
        expect(decoded?.role).toBe(role);
      }
    });

    it('should create auth headers with custom payload', async () => {
      const headers = await authHelper.createUserAuthHeaders({
        sub: 'custom-user',
        email: 'custom@example.com',
      });

      const token = headers.Authorization.replace('Bearer ', '');
      const decoded = await authHelper.decodeToken(token);

      expect(decoded?.sub).toBe('custom-user');
      expect(decoded?.email).toBe('custom@example.com');
      expect(decoded?.role).toBe(Role.USER);
    });
  });

  describe('decodeToken() - Token Decoding', () => {
    it('should decode a valid token', async () => {
      const token = await authHelper.createUserToken();
      const decoded = await authHelper.decodeToken(token);

      expect(decoded).toBeDefined();
      expect(decoded?.sub).toBe('test-user-id');
      expect(decoded?.email).toBe('user@example.com');
      expect(decoded?.role).toBe(Role.USER);
    });

    it('should decode a token with custom payload', async () => {
      const token = await authHelper.createToken({
        sub: 'decode-test',
        email: 'decode@test.com',
        role: Role.COACH,
      });
      const decoded = await authHelper.decodeToken(token);

      expect(decoded).toBeDefined();
      expect(decoded?.sub).toBe('decode-test');
      expect(decoded?.email).toBe('decode@test.com');
      expect(decoded?.role).toBe(Role.COACH);
    });

    it('should decode an expired token', async () => {
      const expiredToken = await authHelper.createExpiredToken();
      const decoded = await authHelper.decodeToken(expiredToken);

      expect(decoded).toBeDefined();
      expect(decoded?.sub).toBe('test-user-id');
    });

    it('should return null for invalid token', async () => {
      const decoded = await authHelper.decodeToken('invalid-token');
      expect(decoded).toBeNull();
    });

    it('should return null for malformed token', async () => {
      const decoded = await authHelper.decodeToken('not.a.valid.jwt.token');
      expect(decoded).toBeNull();
    });

    it('should return null for empty string', async () => {
      const decoded = await authHelper.decodeToken('');
      expect(decoded).toBeNull();
    });

    it('should decode tokens for all role types', async () => {
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

  describe('verifyToken() - Token Verification', () => {
    it('should verify a valid token', async () => {
      const token = await authHelper.createUserToken();
      const verified = await authHelper.verifyToken(token);

      expect(verified).toBeDefined();
      expect(verified?.sub).toBe('test-user-id');
      expect(verified?.email).toBe('user@example.com');
      expect(verified?.role).toBe(Role.USER);
    });

    it('should verify a token with custom payload', async () => {
      const token = await authHelper.createToken({
        sub: 'verify-test',
        email: 'verify@test.com',
        role: Role.ADMIN,
      });
      const verified = await authHelper.verifyToken(token);

      expect(verified).toBeDefined();
      expect(verified?.sub).toBe('verify-test');
      expect(verified?.email).toBe('verify@test.com');
      expect(verified?.role).toBe(Role.ADMIN);
    });

    it('should return null for expired token', async () => {
      const expiredToken = await authHelper.createExpiredToken();
      const verified = await authHelper.verifyToken(expiredToken);

      expect(verified).toBeNull();
    });

    it('should return null for invalid token', async () => {
      const verified = await authHelper.verifyToken('invalid-token');
      expect(verified).toBeNull();
    });

    it('should return null for malformed token', async () => {
      const verified = await authHelper.verifyToken('not.a.valid.jwt.token');
      expect(verified).toBeNull();
    });

    it('should return null for empty string', async () => {
      const verified = await authHelper.verifyToken('');
      expect(verified).toBeNull();
    });

    it('should verify tokens for all role types', async () => {
      const userToken = await authHelper.createUserToken();
      const coachToken = await authHelper.createCoachToken();
      const adminToken = await authHelper.createAdminToken();
      const premiumToken = await authHelper.createPremiumUserToken();

      const userVerified = await authHelper.verifyToken(userToken);
      const coachVerified = await authHelper.verifyToken(coachToken);
      const adminVerified = await authHelper.verifyToken(adminToken);
      const premiumVerified = await authHelper.verifyToken(premiumToken);

      expect(userVerified?.role).toBe(Role.USER);
      expect(coachVerified?.role).toBe(Role.COACH);
      expect(adminVerified?.role).toBe(Role.ADMIN);
      expect(premiumVerified?.role).toBe(Role.PREMIUM_USER);
    });

    it('should verify multiple tokens independently', async () => {
      const token1 = await authHelper.createUserToken({ sub: 'user-1' });
      const token2 = await authHelper.createUserToken({ sub: 'user-2' });

      const verified1 = await authHelper.verifyToken(token1);
      const verified2 = await authHelper.verifyToken(token2);

      expect(verified1?.sub).toBe('user-1');
      expect(verified2?.sub).toBe('user-2');
    });
  });

  describe('Additional Helper Methods', () => {
    it('should extract token from Authorization header', async () => {
      const token = await authHelper.createUserToken();
      const authHeader = `Bearer ${token}`;

      const extracted = await authHelper.extractTokenFromHeader(authHeader);
      expect(extracted).toBe(token);
    });

    it('should return null for invalid Authorization header format', async () => {
      const extracted = await authHelper.extractTokenFromHeader('InvalidFormat token');
      expect(extracted).toBeNull();
    });

    it('should return null for empty Authorization header', async () => {
      const extracted = await authHelper.extractTokenFromHeader('');
      expect(extracted).toBeNull();
    });

    it('should create token with custom expiry', async () => {
      const token = await authHelper.createTokenWithExpiry({ sub: 'custom-expiry-user' }, '2h');

      expect(token).toBeDefined();
      const decoded = await authHelper.decodeToken(token);
      expect(decoded?.sub).toBe('custom-expiry-user');

      const verified = await authHelper.verifyToken(token);
      expect(verified).toBeDefined();
    });

    it('should create soon-to-expire token', async () => {
      const token = await authHelper.createSoonToExpireToken({ sub: 'soon-expire' }, 10);

      expect(token).toBeDefined();
      const decoded = await authHelper.decodeToken(token);
      expect(decoded?.sub).toBe('soon-expire');

      // Token should still be valid immediately after creation
      const verified = await authHelper.verifyToken(token);
      expect(verified).toBeDefined();
    });
  });
});
