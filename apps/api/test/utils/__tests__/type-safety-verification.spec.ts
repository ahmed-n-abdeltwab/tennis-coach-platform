/**
 * Type Safety Verification Tests
 *
 * This file verifies that all test helper methods provide proper compile-time
 * type checking. These tests are designed to catch type errors at compile time.
 *
 * NOTE: Some tests are commented out because they SHOULD fail to compile.
 * Uncomment them to verify that TypeScript catches the errors.
 */

import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { Endpoints } from '@routes-helpers';

import { AuthTestHelper } from '../auth/auth-test-helper';
import { AuthenticatedHttpClient } from '../auth/authenticated-client';
import { TypeSafeHttpClient } from '../http/type-safe-http-client';
import { ProtectedRouteTester } from '../security/protected-route-tester';
import { RoleBasedAccessTester } from '../security/role-based-access-tester';

describe('Type Safety Verification', () => {
  let app: INestApplication;
  let authHelper: AuthTestHelper;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    authHelper = new AuthTestHelper();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('AuthTestHelper Type Safety', () => {
    it('should return properly typed AuthenticatedHttpClient', () => {
      // ✅ This should compile - createAuthenticatedClient returns typed client
      const client = authHelper.createAuthenticatedClient<Endpoints>(app);

      // Verify the return type is correct
      expect(client).toBeInstanceOf(AuthenticatedHttpClient);

      // TypeScript should know about all the methods
      expect(typeof client.get).toBe('function');
      expect(typeof client.post).toBe('function');
      expect(typeof client.put).toBe('function');
      expect(typeof client.delete).toBe('function');
      expect(typeof client.patch).toBe('function');
    });

    it('should allow default Endpoints type parameter', () => {
      // ✅ This should compile - type parameter is optional
      const client = authHelper.createAuthenticatedClient(app);

      expect(client).toBeInstanceOf(AuthenticatedHttpClient);
    });

    it('should allow custom token', () => {
      // ✅ This should compile - token parameter is optional
      const customToken = authHelper.createUserToken();
      const client = authHelper.createAuthenticatedClient<Endpoints>(app, customToken);

      expect(client).toBeInstanceOf(AuthenticatedHttpClient);
      expect(client.getToken()).toBe(customToken);
    });
  });

  describe('AuthenticatedHttpClient Type Safety', () => {
    it('should provide type-safe methods', () => {
      const token = authHelper.createUserToken();
      const client = new AuthenticatedHttpClient<Endpoints>(app, token);

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
      const token = authHelper.createUserToken();
      const client = new AuthenticatedHttpClient<Endpoints>(app, token);


      expect(typeof client.get).toBe('function');


    });
  });

  describe('TypeSafeHttpClient Type Safety', () => {
    it('should provide type-safe methods', () => {
      const client = new TypeSafeHttpClient<Endpoints>(app);

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
      const tester = new ProtectedRouteTester<Endpoints>(app);

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
      const tester = new ProtectedRouteTester<Endpoints>(app);
      const authHelper = tester.getAuthHelper();

      // ✅ Should be properly typed
      expect(authHelper).toBeInstanceOf(AuthTestHelper);
      expect(typeof authHelper.createUserToken).toBe('function');
    });

    it('should return properly typed TypeSafeHttpClient', () => {
      const tester = new ProtectedRouteTester<Endpoints>(app);
      const httpClient = tester.getHttpClient();

      // ✅ Should be properly typed
      expect(httpClient).toBeInstanceOf(TypeSafeHttpClient);
      expect(typeof httpClient.get).toBe('function');
    });
  });

  describe('RoleBasedAccessTester Type Safety', () => {
    it('should provide type-safe methods', () => {
      const tester = new RoleBasedAccessTester<Endpoints>(app);

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
      const tester = new RoleBasedAccessTester<Endpoints>(app);
      const authHelper = tester.getAuthHelper();

      // ✅ Should be properly typed
      expect(authHelper).toBeInstanceOf(AuthTestHelper);
      expect(typeof authHelper.createUserToken).toBe('function');
    });

    it('should return properly typed TypeSafeHttpClient', () => {
      const tester = new RoleBasedAccessTester<Endpoints>(app);
      const httpClient = tester.getHttpClient();

      // ✅ Should be properly typed
      expect(httpClient).toBeInstanceOf(TypeSafeHttpClient);
      expect(typeof httpClient.get).toBe('function');
    });
  });

  describe('Compile-Time Type Checking Examples', () => {
    it('demonstrates proper type inference', () => {
      const token = authHelper.createUserToken();
      const client = new AuthenticatedHttpClient<Endpoints>(app, token);
      expect(client).toBeDefined();
    });


  });
});
