/**
 * Integration tests for authentication and HTTP testing helpers
 * Verifies that helpers work correctly with the actual authentication system
 */

import { ConfigModule } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { Role } from '@prisma/client';
import { parseJwtTime } from '@utils';

import { AuthTestHelper } from '../auth';
import { BaseIntegrationTest } from '../base/base-integration';
import { UserRoleHelper } from '../roles';

describe('Auth Helpers Integration Tests', () => {
  let test: BaseIntegrationTest;
  let authHelper: AuthTestHelper;
  let userRoleHelper: UserRoleHelper;

  beforeAll(async () => {
    test = new BaseIntegrationTest({
      modules: [
        ConfigModule.forRoot({
          isGlobal: true,
        }),
        JwtModule.register({
          secret: process.env.JWT_SECRET ?? 'test-secret',
          signOptions: { expiresIn: parseJwtTime(process.env.JWT_EXPIRES_IN, '24h') },
        }),
      ],
    });

    await test.setup();
    authHelper = new AuthTestHelper();
    userRoleHelper = new UserRoleHelper();
  });

  afterAll(async () => {
    await test.cleanup();
  });

  describe('AuthTestHelper Integration', () => {
    it('should create valid JWT tokens', async () => {
      const userToken = await authHelper.createUserToken();
      const coachToken = await authHelper.createCoachToken();

      expect(userToken).toBeDefined();
      expect(coachToken).toBeDefined();
      expect(typeof userToken).toBe('string');
      expect(typeof coachToken).toBe('string');

      // Tokens should have 3 parts (header.payload.signature)
      expect(userToken.split('.')).toHaveLength(3);
      expect(coachToken.split('.')).toHaveLength(3);
    });

    it('should create tokens with correct payload structure', async () => {
      const customPayload = {
        sub: 'test-user-123',
        email: 'test@example.com',
        role: Role.USER,
      };

      const token = await authHelper.createToken(customPayload);
      const decodedPayload = await authHelper.decodeToken(token);

      expect(decodedPayload).toBeDefined();
      expect(decodedPayload?.sub).toBe(customPayload.sub);
      expect(decodedPayload?.email).toBe(customPayload.email);
      expect(decodedPayload?.role).toBe(customPayload.role);
    });

    it('should create expired tokens that fail verification', async () => {
      const expiredToken = await authHelper.createExpiredToken();
      const verificationResult = await authHelper.verifyToken(expiredToken);

      expect(expiredToken).toBeDefined();
      expect(verificationResult).toBeNull(); // Should fail verification
    });

    it('should create proper Authorization headers', async () => {
      const userHeaders = await authHelper.createUserAuthHeaders();
      const coachHeaders = await authHelper.createCoachAuthHeaders();

      expect(userHeaders.Authorization).toMatch(/^Bearer .+/);
      expect(coachHeaders.Authorization).toMatch(/^Bearer .+/);

      // Extract tokens from headers
      const userToken = userHeaders.Authorization.replace('Bearer ', '');
      const coachToken = coachHeaders.Authorization.replace('Bearer ', '');

      const userPayload = await authHelper.decodeToken(userToken);
      const coachPayload = await authHelper.decodeToken(coachToken);

      expect(userPayload?.role).toBe(Role.USER);
      expect(coachPayload?.role).toBe(Role.COACH);
    });
  });

  describe('UserRoleTestHelper Integration', () => {
    it('should create consistent test data for different roles', () => {
      const userData = userRoleHelper.createUserTestData(Role.USER);
      const coachData = userRoleHelper.createUserTestData(Role.COACH);

      expect(userData.role).toBe(Role.USER);
      expect(coachData.role).toBe(Role.COACH);
      expect(userData.sub).toBeDefined();
      expect(coachData.sub).toBeDefined();
      expect(userData.email).toContain('@');
      expect(coachData.email).toContain('@');
    });

    it('should create multiple users with unique data', async () => {
      const { users, coaches } = await userRoleHelper.createMultipleRoleUsers(3);

      expect(users).toHaveLength(3);
      expect(coaches).toHaveLength(3);

      // Check that all users have unique IDs and emails
      const userIds = users.map(u => u.sub);
      const userEmails = users.map(u => u.email);
      const coachIds = coaches.map(c => c.sub);
      const coachEmails = coaches.map(c => c.email);

      expect(new Set(userIds).size).toBe(3); // All unique
      expect(new Set(userEmails).size).toBe(3); // All unique
      expect(new Set(coachIds).size).toBe(3); // All unique
      expect(new Set(coachEmails).size).toBe(3); // All unique
    });

    it('should create valid auth headers for multiple users', async () => {
      const { userHeaders, coachHeaders } = await userRoleHelper.createMultipleRoleAuthHeaders(2);

      expect(userHeaders).toHaveLength(2);
      expect(coachHeaders).toHaveLength(2);

      // Verify all headers are valid
      userHeaders.forEach(async header => {
        expect(header.Authorization).toMatch(/^Bearer .+/);
        const token = header.Authorization.replace('Bearer ', '');
        const payload = await authHelper.decodeToken(token);
        expect(payload?.role).toBe(Role.USER);
      });

      coachHeaders.forEach(async header => {
        expect(header.Authorization).toMatch(/^Bearer .+/);
        const token = header.Authorization.replace('Bearer ', '');
        const payload = await authHelper.decodeToken(token);
        expect(payload?.role).toBe(Role.COACH);
      });
    });
  });

  describe('Token Compatibility', () => {
    it('should create tokens compatible with NestJS JWT service', async () => {
      const testPayload = {
        sub: 'test-user-456',
        email: 'compatibility@example.com',
        role: Role.USER,
      };

      const token = await authHelper.createToken(testPayload);

      // Token should be decodable
      const decodedPayload = await authHelper.decodeToken(token);
      expect(decodedPayload).toBeDefined();
      expect(decodedPayload?.sub).toBe(testPayload.sub);
      expect(decodedPayload?.email).toBe(testPayload.email);
      expect(decodedPayload?.role).toBe(testPayload.role);

      // Token should be verifiable (not expired)
      const verifiedPayload = await authHelper.verifyToken(token);
      expect(verifiedPayload).toBeDefined();
      expect(verifiedPayload?.sub).toBe(testPayload.sub);
    });

    it('should handle token expiration correctly', async () => {
      // Create a token that should be valid
      const validToken = await authHelper.createUserToken();
      const validPayload = await authHelper.verifyToken(validToken);
      expect(validPayload).toBeDefined();

      // Create an expired token
      const expiredToken = await authHelper.createExpiredToken();
      const expiredPayload = await authHelper.verifyToken(expiredToken);
      expect(expiredPayload).toBeNull();
    });
  });

  describe('Helper Consistency', () => {
    it('should maintain consistency between different helper methods', async () => {
      // Create user data using UserRoleTestHelper
      const userData = userRoleHelper.createUserTestData(Role.USER, {
        sub: 'consistent-user-123',
        email: 'consistent@example.com',
      });

      // Create token using AuthTestHelper with same data
      const token = await authHelper.createUserToken(userData);
      const decodedPayload = await authHelper.decodeToken(token);

      // Verify consistency
      expect(decodedPayload?.sub).toBe(userData.sub);
      expect(decodedPayload?.email).toBe(userData.email);
      expect(decodedPayload?.role).toBe(userData.role);
    });

    it('should create headers that work with HTTP helpers', async () => {
      const userHeaders = await authHelper.createUserAuthHeaders();
      const coachHeaders = await authHelper.createCoachAuthHeaders();

      // Headers should have the correct format for HTTP requests
      expect(userHeaders).toHaveProperty('Authorization');
      expect(coachHeaders).toHaveProperty('Authorization');
      expect(userHeaders.Authorization).toMatch(/^Bearer .+/);
      expect(coachHeaders.Authorization).toMatch(/^Bearer .+/);

      // Extract and verify tokens
      const userToken = userHeaders.Authorization.replace('Bearer ', '');
      const coachToken = coachHeaders.Authorization.replace('Bearer ', '');

      const userPayload = await authHelper.decodeToken(userToken);
      const coachPayload = await authHelper.decodeToken(coachToken);

      expect(userPayload?.role).toBe(Role.USER);
      expect(coachPayload?.role).toBe(Role.COACH);
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid tokens gracefully', async () => {
      const invalidToken = 'invalid.token.here';

      const decodedPayload = await authHelper.decodeToken(invalidToken);
      const verifiedPayload = await authHelper.verifyToken(invalidToken);

      expect(decodedPayload).toBeNull();
      expect(verifiedPayload).toBeNull();
    });

    it('should handle malformed tokens gracefully', async () => {
      const malformedToken = 'not-a-jwt-token';

      const decodedPayload = await authHelper.decodeToken(malformedToken);
      const verifiedPayload = await authHelper.verifyToken(malformedToken);

      expect(decodedPayload).toBeNull();
      expect(verifiedPayload).toBeNull();
    });
  });
});
