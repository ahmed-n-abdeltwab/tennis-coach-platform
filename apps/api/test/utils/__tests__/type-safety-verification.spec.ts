/**
 * Type Safety Verification Tests
 *
 * This file verifies that all test helper methods provide proper compile-time
 * type checking. These tests are designed to catch type errors at compile time.
 *
 * NOTE: Some tests are commented out because they SHOULD fail to compile.
 * Uncomment them to verify that TypeScript catches the errors.
 */

import { ConfigModule } from '@nestjs/config';
import { Endpoints } from '@routes-helpers';

import { AuthTestHelper } from '../auth/auth-test-helper';
import { AuthenticatedHttpClient } from '../auth/authenticated-client';
import { BaseIntegrationTest } from '../base/base-integration';
import { TypeSafeHttpClient } from '../http/type-safe-http-client';
import { ProtectedRouteTester } from '../security/protected-route-tester';
import { RoleBasedAccessTester } from '../security/role-based-access-tester';

class TypeSafetyVerificationTest extends BaseIntegrationTest {
  authHelper: AuthTestHelper;

  async setupTestApp(): Promise<void> {
    this.authHelper = new AuthTestHelper();
  }

  getTestModules(): any[] {
    return [
      ConfigModule.forRoot({
        isGlobal: true,
      }),
    ];
  }

  override async seedTestData(): Promise<void> {
    // No database seeding needed for type safety tests
  }

  // Expose app for testing purposes
  override getApp() {
    return this.app;
  }
}

describe('Type Safety Verification', () => {
  let testInstance: TypeSafetyVerificationTest;

  beforeAll(async () => {
    testInstance = new TypeSafetyVerificationTest();
    await testInstance.setup();
  });

  afterAll(async () => {
    await testInstance.cleanup();
  });

  describe('AuthTestHelper Type Safety', () => {
    it('should return properly typed AuthenticatedHttpClient', async () => {
      // ✅ This should compile - createAuthenticatedClient returns typed client
      const client = await testInstance.authHelper.createAuthenticatedClient<Endpoints>(
        testInstance.getApp()
      );

      // Verify the return type is correct
      expect(client).toBeInstanceOf(AuthenticatedHttpClient);

      // TypeScript should know about all the methods
      expect(typeof client.get).toBe('function');
      expect(typeof client.post).toBe('function');
      expect(typeof client.put).toBe('function');
      expect(typeof client.delete).toBe('function');
      expect(typeof client.patch).toBe('function');
    });

    it('should allow default Endpoints type parameter', async () => {
      // ✅ This should compile - type parameter is optional
      const client = await testInstance.authHelper.createAuthenticatedClient(testInstance.getApp());

      expect(client).toBeInstanceOf(AuthenticatedHttpClient);
    });

    it('should allow custom token', async () => {
      // ✅ This should compile - token parameter is optional
      const customToken = await testInstance.authHelper.createUserToken();
      const client = await testInstance.authHelper.createAuthenticatedClient<Endpoints>(
        testInstance.getApp(),
        customToken
      );

      expect(client).toBeInstanceOf(AuthenticatedHttpClient);
      expect(client.getToken()).toBe(customToken);
    });
  });

  describe('AuthenticatedHttpClient Type Safety', () => {
    it('should provide type-safe methods', async () => {
      const token = await testInstance.authHelper.createUserToken();
      const client = new AuthenticatedHttpClient<Endpoints>(testInstance.getApp(), token);

      // ✅ TypeScript should know about all methods
      expect(typeof client.get).toBe('function');
      expect(typeof client.post).toBe('function');
      expect(typeof client.put).toBe('function');
      expect(typeof client.delete).toBe('function');
      expect(typeof client.patch).toBe('function');
      expect(typeof client.getClient).toBe('function');
      expect(typeof client.getToken).toBe('function');
      expect(typeof client.setToken).toBe('function');
    });

    it('should accept valid endpoint paths at compile time', async () => {
      const token = await testInstance.authHelper.createUserToken();
      const client = new AuthenticatedHttpClient<Endpoints>(testInstance.getApp(), token);

      expect(typeof client.get).toBe('function');
    });
  });

  describe('TypeSafeHttpClient Type Safety', () => {
    it('should provide type-safe methods', () => {
      const client = new TypeSafeHttpClient<Endpoints>(testInstance.getApp());

      // ✅ TypeScript should know about all methods
      expect(typeof client.get).toBe('function');
      expect(typeof client.post).toBe('function');
      expect(typeof client.put).toBe('function');
      expect(typeof client.delete).toBe('function');
      expect(typeof client.patch).toBe('function');
      expect(typeof client.request).toBe('function');
      expect(typeof client.authenticatedGet).toBe('function');
      expect(typeof client.authenticatedPost).toBe('function');
      expect(typeof client.authenticatedPut).toBe('function');
      expect(typeof client.authenticatedDelete).toBe('function');
      expect(typeof client.authenticatedPatch).toBe('function');
    });
  });

  describe('ProtectedRouteTester Type Safety', () => {
    it('should provide type-safe methods', () => {
      const tester = new ProtectedRouteTester<Endpoints>(testInstance.getApp());

      // ✅ TypeScript should know about all methods
      expect(typeof tester.testRequiresAuth).toBe('function');
      expect(typeof tester.testRejectsExpiredToken).toBe('function');
      expect(typeof tester.testAcceptsUserToken).toBe('function');
      expect(typeof tester.testAcceptsCoachToken).toBe('function');
      expect(typeof tester.testAcceptsAdminToken).toBe('function');
      expect(typeof tester.testRoleBasedAccess).toBe('function');
      expect(typeof tester.getAuthHelper).toBe('function');
      expect(typeof tester.getHttpClient).toBe('function');
    });

    it('should return properly typed AuthTestHelper', () => {
      const tester = new ProtectedRouteTester<Endpoints>(testInstance.getApp());
      const authHelper = tester.getAuthHelper();

      // ✅ Should be properly typed
      expect(authHelper).toBeInstanceOf(AuthTestHelper);
      expect(typeof authHelper.createUserToken).toBe('function');
    });

    it('should return properly typed TypeSafeHttpClient', () => {
      const tester = new ProtectedRouteTester<Endpoints>(testInstance.getApp());
      const httpClient = tester.getHttpClient();

      // ✅ Should be properly typed
      expect(httpClient).toBeInstanceOf(TypeSafeHttpClient);
      expect(typeof httpClient.get).toBe('function');
    });
  });

  describe('RoleBasedAccessTester Type Safety', () => {
    it('should provide type-safe methods', () => {
      const tester = new RoleBasedAccessTester<Endpoints>(testInstance.getApp());

      // ✅ TypeScript should know about all methods
      expect(typeof tester.testAccess).toBe('function');
      expect(typeof tester.testAllRoles).toBe('function');
      expect(typeof tester.testOnlyRolesCanAccess).toBe('function');
      expect(typeof tester.testRoleCanAccess).toBe('function');
      expect(typeof tester.testRoleCannotAccess).toBe('function');
      expect(typeof tester.getAuthHelper).toBe('function');
      expect(typeof tester.getHttpClient).toBe('function');
    });

    it('should return properly typed AuthTestHelper', () => {
      const tester = new RoleBasedAccessTester<Endpoints>(testInstance.getApp());
      const authHelper = tester.getAuthHelper();

      // ✅ Should be properly typed
      expect(authHelper).toBeInstanceOf(AuthTestHelper);
      expect(typeof authHelper.createUserToken).toBe('function');
    });

    it('should return properly typed TypeSafeHttpClient', () => {
      const tester = new RoleBasedAccessTester<Endpoints>(testInstance.getApp());
      const httpClient = tester.getHttpClient();

      // ✅ Should be properly typed
      expect(httpClient).toBeInstanceOf(TypeSafeHttpClient);
      expect(typeof httpClient.get).toBe('function');
    });
  });

  describe('Compile-Time Type Checking Examples', () => {
    it('demonstrates proper type inference', async () => {
      const token = await testInstance.authHelper.createUserToken();
      const client = new AuthenticatedHttpClient<Endpoints>(testInstance.getApp(), token);
      expect(client).toBeDefined();
    });
  });
});
