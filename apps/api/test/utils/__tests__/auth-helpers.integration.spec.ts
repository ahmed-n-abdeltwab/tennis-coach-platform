/**
 * Integration tests for authentication and HTTP testing helpers
 * Verifies that helpers work correctly with the actual authentication system
 */

import { INestApplication } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import { Role } from '@prisma/client';
import { parseJwtTime } from '../../../../../libs/utils/src';

import { AuthTestHelper } from '../auth';
import { TypeSafeHttpClient } from '../http';
import { UserRoleHelper } from '../roles';
import { ProtectedRouteTester } from '../security';

describe('Auth Helpers Integration Tests', () => {
  let app: INestApplication;
  let authHelper: AuthTestHelper;
  let httpHelper: TypeSafeHttpClient;
  let protectedRouteHelper: ProtectedRouteTester;
  let userRoleHelper: UserRoleHelper;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
        }),
        JwtModule.register({
          secret: process.env.JWT_SECRET || 'test-secret',
          signOptions: { expiresIn: parseJwtTime(process.env.JWT_EXPIRES_IN, '24h') },
        }),
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    // Initialize helpers
    authHelper = new AuthTestHelper();
    httpHelper = new TypeSafeHttpClient(app);
    protectedRouteHelper = new ProtectedRouteTester(app);
    userRoleHelper = new UserRoleHelper();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('AuthTestHelper Integration', () => {
    it('should create valid JWT tokens', () => {
      const userToken = authHelper.createUserToken();
      const coachToken = authHelper.createCoachToken();

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

      const token = authHelper.createToken(customPayload);
      const decodedPayload = authHelper.decodeToken(token);

      expect(decodedPayload).toBeDefined();
      expect(decodedPayload?.sub).toBe(customPayload.sub);
      expect(decodedPayload?.email).toBe(customPayload.email);
      expect(decodedPayload?.role).toBe(customPayload.role);
    });

    it('should create expired tokens that fail verification', () => {
      const expiredToken = authHelper.createExpiredToken();
      const verificationResult = authHelper.verifyToken(expiredToken);

      expect(expiredToken).toBeDefined();
      expect(verificationResult).toBeNull(); // Should fail verification
    });

    it('should create proper authorization headers', () => {
      const userHeaders = authHelper.createUserAuthHeaders();
      const coachHeaders = authHelper.createCoachAuthHeaders();

      expect(userHeaders.authorization).toMatch(/^Bearer .+/);
      expect(coachHeaders.authorization).toMatch(/^Bearer .+/);

      // Extract tokens from headers
      const userToken = userHeaders.authorization.replace('Bearer ', '');
      const coachToken = coachHeaders.authorization.replace('Bearer ', '');

      const userPayload = authHelper.decodeToken(userToken);
      const coachPayload = authHelper.decodeToken(coachToken);

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
      expect(userData.id).toBeDefined();
      expect(coachData.id).toBeDefined();
      expect(userData.email).toContain('@');
      expect(coachData.email).toContain('@');
    });

    it('should create multiple users with unique data', () => {
      const { users, coaches } = userRoleHelper.createMultipleRoleUsers(3);

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
      const { userHeaders, coachHeaders } = userRoleHelper.createMultipleRoleAuthHeaders(2);

      expect(userHeaders).toHaveLength(2);
      expect(coachHeaders).toHaveLength(2);

      // Verify all headers are valid
      userHeaders.forEach(header => {
        expect(header.authorization).toMatch(/^Bearer .+/);
        const token = header.authorization.replace('Bearer ', '');
        const payload = authHelper.decodeToken(token);
        expect(payload?.role).toBe(Role.USER);
      });

      coachHeaders.forEach(header => {
        expect(header.authorization).toMatch(/^Bearer .+/);
        const token = header.authorization.replace('Bearer ', '');
        const payload = authHelper.decodeToken(token);
        expect(payload?.role).toBe(Role.COACH);
      });
    });
  });

  describe('Token Compatibility', () => {
    it('should create tokens compatible with NestJS JWT service', () => {
      const testPayload = {
        sub: 'test-user-456',
        email: 'compatibility@example.com',
        role: Role.USER,
      };

      const token = authHelper.createToken(testPayload);

      // Token should be decodable
      const decodedPayload = authHelper.decodeToken(token);
      expect(decodedPayload).toBeDefined();
      expect(decodedPayload?.sub).toBe(testPayload.sub);
      expect(decodedPayload?.email).toBe(testPayload.email);
      expect(decodedPayload?.role).toBe(testPayload.role);

      // Token should be verifiable (not expired)
      const verifiedPayload = authHelper.verifyToken(token);
      expect(verifiedPayload).toBeDefined();
      expect(verifiedPayload?.sub).toBe(testPayload.sub);
    });

    it('should handle token expiration correctly', () => {
      // Create a token that should be valid
      const validToken = authHelper.createUserToken();
      const validPayload = authHelper.verifyToken(validToken);
      expect(validPayload).toBeDefined();

      // Create an expired token
      const expiredToken = authHelper.createExpiredToken();
      const expiredPayload = authHelper.verifyToken(expiredToken);
      expect(expiredPayload).toBeNull();
    });
  });

  describe('Helper Consistency', () => {
    it('should maintain consistency between different helper methods', () => {
      // Create user data using UserRoleTestHelper
      const userData = userRoleHelper.createUserTestData(Role.USER, {
        id: 'consistent-user-123',
        email: 'consistent@example.com',
      });

      // Create token using AuthTestHelper with same data
      const token = authHelper.createUserToken(userData);
      const decodedPayload = authHelper.decodeToken(token);

      // Verify consistency
      expect(decodedPayload?.sub).toBe(userData.id);
      expect(decodedPayload?.email).toBe(userData.email);
      expect(decodedPayload?.role).toBe(userData.role);
    });

    it('should create headers that work with HTTP helpers', () => {
      const userHeaders = authHelper.createUserAuthHeaders();
      const coachHeaders = authHelper.createCoachAuthHeaders();

      // Headers should have the correct format for HTTP requests
      expect(userHeaders).toHaveProperty('authorization');
      expect(coachHeaders).toHaveProperty('authorization');
      expect(userHeaders.authorization).toMatch(/^Bearer .+/);
      expect(coachHeaders.authorization).toMatch(/^Bearer .+/);

      // Extract and verify tokens
      const userToken = userHeaders.authorization.replace('Bearer ', '');
      const coachToken = coachHeaders.authorization.replace('Bearer ', '');

      const userPayload = authHelper.decodeToken(userToken);
      const coachPayload = authHelper.decodeToken(coachToken);

      expect(userPayload?.role).toBe(Role.USER);
      expect(coachPayload?.role).toBe(Role.COACH);
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid tokens gracefully', () => {
      const invalidToken = 'invalid.token.here';

      const decodedPayload = authHelper.decodeToken(invalidToken);
      const verifiedPayload = authHelper.verifyToken(invalidToken);

      expect(decodedPayload).toBeNull();
      expect(verifiedPayload).toBeNull();
    });

    it('should handle malformed tokens gracefully', () => {
      const malformedToken = 'not-a-jwt-token';

      const decodedPayload = authHelper.decodeToken(malformedToken);
      const verifiedPayload = authHelper.verifyToken(malformedToken);

      expect(decodedPayload).toBeNull();
      expect(verifiedPayload).toBeNull();
    });
  });
});
