/**
 * Integration tests for authentication and HTTP testing helpers
 * Verifies that helpers work correctly with the actual authentication system
 */

import { ConfigModule } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { Role } from '@prisma/client';
import { parseJwtTime } from '@utils';

import { AuthTestHelper } from '../auth';
import { BaseIntegrationTest } from '../base/base-integration.test';
import { UserRoleHelper } from '../roles';

class AuthHelpersIntegrationTest extends BaseIntegrationTest {
  authHelper: AuthTestHelper;
  userRoleHelper: UserRoleHelper;

  async setupTestApp(): Promise<void> {
    this.authHelper = new AuthTestHelper();
    this.userRoleHelper = new UserRoleHelper();
  }

  getTestModules(): any[] {
    return [
      ConfigModule.forRoot({
        isGlobal: true,
      }),
      JwtModule.register({
        secret: process.env.JWT_SECRET ?? 'test-secret',
        signOptions: { expiresIn: parseJwtTime(process.env.JWT_EXPIRES_IN, '24h') },
      }),
    ];
  }

  override async seedTestData(): Promise<void> {
    // No database seeding needed for helper tests
  }
}

describe('Auth Helpers Integration Tests', () => {
  let testInstance: AuthHelpersIntegrationTest;

  beforeAll(async () => {
    testInstance = new AuthHelpersIntegrationTest();
    await testInstance.setup();
  });

  afterAll(async () => {
    await testInstance.cleanup();
  });

  describe('AuthTestHelper Integration', () => {
    it('should create valid JWT tokens', () => {
      const userToken = testInstance.authHelper.createUserToken();
      const coachToken = testInstance.authHelper.createCoachToken();

      expect(userToken).toBeDefined();
      expect(coachToken).toBeDefined();
      expect(typeof userToken).toBe('string');
      expect(typeof coachToken).toBe('string');

      // Tokens should have 3 parts (header.payload.signature)
      expect(userToken.split('.')).toHaveLength(3);
      expect(coachToken.split('.')).toHaveLength(3);
    });

    it('should create tokens with correct payload structure', () => {
      const customPayload = {
        sub: 'test-user-123',
        email: 'test@example.com',
        role: Role.USER,
      };

      const token = testInstance.authHelper.createToken(customPayload);
      const decodedPayload = testInstance.authHelper.decodeToken(token);

      expect(decodedPayload).toBeDefined();
      expect(decodedPayload?.sub).toBe(customPayload.sub);
      expect(decodedPayload?.email).toBe(customPayload.email);
      expect(decodedPayload?.role).toBe(customPayload.role);
    });

    it('should create expired tokens that fail verification', async () => {
      const expiredToken = testInstance.authHelper.createExpiredToken();
      const verificationResult = await testInstance.authHelper.verifyToken(expiredToken);

      expect(expiredToken).toBeDefined();
      expect(verificationResult).toBeNull(); // Should fail verification
    });

    it('should create proper Authorization headers', () => {
      const userHeaders = testInstance.authHelper.createUserAuthHeaders();
      const coachHeaders = testInstance.authHelper.createCoachAuthHeaders();

      expect(userHeaders.Authorization).toMatch(/^Bearer .+/);
      expect(coachHeaders.Authorization).toMatch(/^Bearer .+/);

      // Extract tokens from headers
      const userToken = userHeaders.Authorization.replace('Bearer ', '');
      const coachToken = coachHeaders.Authorization.replace('Bearer ', '');

      const userPayload = testInstance.authHelper.decodeToken(userToken);
      const coachPayload = testInstance.authHelper.decodeToken(coachToken);

      expect(userPayload?.role).toBe(Role.USER);
      expect(coachPayload?.role).toBe(Role.COACH);
    });
  });

  describe('UserRoleTestHelper Integration', () => {
    it('should create consistent test data for different roles', () => {
      const userData = testInstance.userRoleHelper.createUserTestData(Role.USER);
      const coachData = testInstance.userRoleHelper.createUserTestData(Role.COACH);

      expect(userData.role).toBe(Role.USER);
      expect(coachData.role).toBe(Role.COACH);
      expect(userData.id).toBeDefined();
      expect(coachData.id).toBeDefined();
      expect(userData.email).toContain('@');
      expect(coachData.email).toContain('@');
    });

    it('should create multiple users with unique data', () => {
      const { users, coaches } = testInstance.userRoleHelper.createMultipleRoleUsers(3);

      expect(users).toHaveLength(3);
      expect(coaches).toHaveLength(3);

      // Check that all users have unique IDs and emails
      const userIds = users.map(u => u.id);
      const userEmails = users.map(u => u.email);
      const coachIds = coaches.map(c => c.id);
      const coachEmails = coaches.map(c => c.email);

      expect(new Set(userIds).size).toBe(3); // All unique
      expect(new Set(userEmails).size).toBe(3); // All unique
      expect(new Set(coachIds).size).toBe(3); // All unique
      expect(new Set(coachEmails).size).toBe(3); // All unique
    });

    it('should create valid auth headers for multiple users', () => {
      const { userHeaders, coachHeaders } =
        testInstance.userRoleHelper.createMultipleRoleAuthHeaders(2);

      expect(userHeaders).toHaveLength(2);
      expect(coachHeaders).toHaveLength(2);

      // Verify all headers are valid
      userHeaders.forEach(header => {
        expect(header.Authorization).toMatch(/^Bearer .+/);
        const token = header.Authorization.replace('Bearer ', '');
        const payload = testInstance.authHelper.decodeToken(token);
        expect(payload?.role).toBe(Role.USER);
      });

      coachHeaders.forEach(header => {
        expect(header.Authorization).toMatch(/^Bearer .+/);
        const token = header.Authorization.replace('Bearer ', '');
        const payload = testInstance.authHelper.decodeToken(token);
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

      const token = testInstance.authHelper.createToken(testPayload);

      // Token should be decodable
      const decodedPayload = testInstance.authHelper.decodeToken(token);
      expect(decodedPayload).toBeDefined();
      expect(decodedPayload?.sub).toBe(testPayload.sub);
      expect(decodedPayload?.email).toBe(testPayload.email);
      expect(decodedPayload?.role).toBe(testPayload.role);

      // Token should be verifiable (not expired)
      const verifiedPayload = await testInstance.authHelper.verifyToken(token);
      expect(verifiedPayload).toBeDefined();
      expect(verifiedPayload?.sub).toBe(testPayload.sub);
    });

    it('should handle token expiration correctly', async () => {
      // Create a token that should be valid
      const validToken = testInstance.authHelper.createUserToken();
      const validPayload = await testInstance.authHelper.verifyToken(validToken);
      expect(validPayload).toBeDefined();

      // Create an expired token
      const expiredToken = testInstance.authHelper.createExpiredToken();
      const expiredPayload = await testInstance.authHelper.verifyToken(expiredToken);
      expect(expiredPayload).toBeNull();
    });
  });

  describe('Helper Consistency', () => {
    it('should maintain consistency between different helper methods', () => {
      // Create user data using UserRoleTestHelper
      const userData = testInstance.userRoleHelper.createUserTestData(Role.USER, {
        id: 'consistent-user-123',
        email: 'consistent@example.com',
      });

      // Create token using AuthTestHelper with same data
      const token = testInstance.authHelper.createUserToken(userData);
      const decodedPayload = testInstance.authHelper.decodeToken(token);

      // Verify consistency
      expect(decodedPayload?.sub).toBe(userData.id);
      expect(decodedPayload?.email).toBe(userData.email);
      expect(decodedPayload?.role).toBe(userData.role);
    });

    it('should create headers that work with HTTP helpers', () => {
      const userHeaders = testInstance.authHelper.createUserAuthHeaders();
      const coachHeaders = testInstance.authHelper.createCoachAuthHeaders();

      // Headers should have the correct format for HTTP requests
      expect(userHeaders).toHaveProperty('Authorization');
      expect(coachHeaders).toHaveProperty('Authorization');
      expect(userHeaders.Authorization).toMatch(/^Bearer .+/);
      expect(coachHeaders.Authorization).toMatch(/^Bearer .+/);

      // Extract and verify tokens
      const userToken = userHeaders.Authorization.replace('Bearer ', '');
      const coachToken = coachHeaders.Authorization.replace('Bearer ', '');

      const userPayload = testInstance.authHelper.decodeToken(userToken);
      const coachPayload = testInstance.authHelper.decodeToken(coachToken);

      expect(userPayload?.role).toBe(Role.USER);
      expect(coachPayload?.role).toBe(Role.COACH);
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid tokens gracefully', async () => {
      const invalidToken = 'invalid.token.here';

      const decodedPayload = testInstance.authHelper.decodeToken(invalidToken);
      const verifiedPayload = await testInstance.authHelper.verifyToken(invalidToken);

      expect(decodedPayload).toBeNull();
      expect(verifiedPayload).toBeNull();
    });

    it('should handle malformed tokens gracefully', async () => {
      const malformedToken = 'not-a-jwt-token';

      const decodedPayload = testInstance.authHelper.decodeToken(malformedToken);
      const verifiedPayload = await testInstance.authHelper.verifyToken(malformedToken);

      expect(decodedPayload).toBeNull();
      expect(verifiedPayload).toBeNull();
    });
  });
});
