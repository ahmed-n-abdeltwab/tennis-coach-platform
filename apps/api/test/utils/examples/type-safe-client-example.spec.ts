import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { AppModule } from '../../../src/app/app.module';

import { Endpoints } from '@routes-helpers';
import { AuthTestHelper } from '../auth';
import { TypeSafeHttpClient } from '../http/type-safe-http-client';

/**
 * TypeSafeHttpClient Examples
 *
 * This demonstrates how to use the TypeSafeHttpClient for making
 * type-safe HTTP requests to your API endpoints.
 *
 * NOTE: This is an example/documentation file. Some endpoints or patterns
 * shown here may not match the actual API exactly - they're for demonstration.
 * Type assertions (as any) are used in some places to make examples work.
 *
 * MIGRATION NOTE: This file serves as an example of the new import pattern.
 * When migrating your tests:
 * 1. Import AuthTestHelper from '../auth' (or appropriate relative path)
 * 2. Import TypeSafeHttpClient from '@test-utils' or '../http'
 * 3. Import Endpoints from '@routes-helpers'
 * 4. Update any ProtectedRouteTestHelper to ProtectedRouteTester from '../security'
 * 5. Update any UserRoleTestHelper to UserRoleHelper from '../roles'
 */
// Skip this test suite - it's for documentation purposes only
// Some type assertions may be needed due to response types being 'any' in examples
describe.skip('TypeSafeHttpClient Examples', () => {
  let app: INestApplication;
  let client: TypeSafeHttpClient<Endpoints>;
  let authHelper: AuthTestHelper;
  let accessToken: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    client = new TypeSafeHttpClient<Endpoints>(app);
    authHelper = new AuthTestHelper();

    // Create a test user and get auth token
    const signupResponse = await client.post('/api/authentication/signup', {
      email: 'test@example.com',
      password: 'password123',
      name: 'Test User',
      role: 'USER',
    });

    if (signupResponse.ok) {
      accessToken = signupResponse.body.accessToken;
    }
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Basic Usage - Public Endpoints', () => {
    it('should make a type-safe POST request to login', async () => {
      // TypeScript ensures the request body matches the expected type
      const response = await client.post('/api/authentication/user/login', {
        email: 'test@example.com',
        password: 'password123',
      });

      // Use discriminated union to narrow the type
      expect(response.ok).toBe(true);
      if (response.ok) {
        // Response body is fully typed as success type
        expect(response.status).toBe(200);
        expect(response.body.accessToken).toBeDefined();
        expect(response.body.refreshToken).toBeDefined();
        expect(response.body.account.email).toBe('test@example.com');
      }
    });

    it('should make a type-safe GET request to health endpoint', async () => {
      const response = await client.get('/api/health', undefined);

      expect(response.status).toBe(200);
    });

    // Example of TypeScript catching errors at compile time:
    // This would cause a TypeScript error:
    // await client.post('/api/authentication/user/login', {
    //   email: 'test@example.com',
    //   // Missing required 'password' field - TypeScript error!
    // });
  });

  describe('Authenticated Requests', () => {
    it('should make authenticated GET request to /api/accounts/me', async () => {
      const authenticatedClient = authHelper.createAuthenticatedClient<Endpoints>(app, accessToken);

      // GET request with no parameters (undefined is optional)
      const response = await authenticatedClient.get('/api/accounts/me');

      // Use discriminated union to narrow the type
      expect(response.ok).toBe(true);
      if (response.ok) {
        // Response is fully typed with all account fields
        expect(response.status).toBe(200);
        expect(response.body.id).toBeDefined();
        expect(response.body.email).toBe('test@example.com');
        expect(response.body.name).toBe('Test User');
        expect(response.body.role).toBe('USER');
        expect(response.body.createdAt).toBeDefined(); // Now properly typed as string!
        expect(response.body.updatedAt).toBeDefined(); // Now properly typed as string!
      }
    });

    it('should make authenticated PATCH request to update account', async () => {
      const authenticatedClient = authHelper.createAuthenticatedClient<Endpoints>(app, accessToken);

      // Get current account
      const accountResponse = await authenticatedClient.get('/api/accounts/me');

      if (!accountResponse.ok) {
        throw new Error('Failed to get account');
      }

      const accountId = accountResponse.body.id;

      // Update account with type-safe request
      // For endpoints with path parameters, include the parameter in the body
      // The client will extract it and build the correct path
      const response = await authenticatedClient.patch(
        `/api/accounts/${accountId}` as '/api/accounts/{id}',
        {
          name: 'Updated Name',
          bio: 'This is my bio',
        }
      );

      expect(response.ok).toBe(true);
      if (response.ok) {
        expect(response.status).toBe(200);
        expect(response.body.name).toBe('Updated Name');
        expect(response.body.bio).toBe('This is my bio');
      }
    });

    // Example of TypeScript catching errors:
    // This would cause a TypeScript error:
    // await authenticatedClient.patch(`/api/accounts/${accountId}`, {
    //   invalidField: 'value', // TypeScript error - field doesn't exist!
    // });
  });

  describe('Type Safety Benefits', () => {
    it('demonstrates compile-time type checking for request bodies', async () => {
      // ✅ Valid request - TypeScript is happy
      const validRequest = await client.post('/api/authentication/signup', {
        email: 'newuser@example.com',
        password: 'securepass',
        name: 'New User',
        role: 'USER', // Only valid roles are allowed
      });

      expect(validRequest.ok).toBe(true);
      if (validRequest.ok) {
        expect(validRequest.status).toBe(201);
        expect(validRequest.body.accessToken).toBeDefined();
      }
    });

    it('demonstrates compile-time type checking for response types', async () => {
      const response = await client.post('/api/authentication/user/login', {
        email: 'test@example.com',
        password: 'password123',
      });
      if (response.ok) {
        const account = response.body.account;
        expect(response.body.accessToken).toBeDefined();
        expect(account.email).toBe('test@example.com');
        expect(account.role).toBe('USER');
      }
    });
  });

  describe('Best Practices', () => {
    it('shows how to handle GET requests with query parameters', async () => {
      const authenticatedClient = authHelper.createAuthenticatedClient<Endpoints>(app, accessToken);

      // GET requests with query parameters
      const response = await authenticatedClient.get('/api/time-slots', {
        startDate: '2024-01-01',
        endDate: '2024-12-31',
        coachId: 'some-coach-id',
      });

      if (response.ok) {
        expect(response.status).toBeDefined();
        // Response is typed as an array of time slots
        expect(Array.isArray(response.body)).toBe(true);
      }
    });

    it('shows how to handle GET requests with path parameters', async () => {
      const authenticatedClient = authHelper.createAuthenticatedClient<Endpoints>(app, accessToken);

      // Get current account to get the ID
      const accountResponse = await authenticatedClient.get('/api/accounts/me');

      if (!accountResponse.ok) {
        throw new Error('Failed to get account');
      }

      const accountId = accountResponse.body.id;

      // GET request with path parameter using template literal
      // The client supports template literals, but TypeScript can't infer the exact response type
      // For full type safety with template literals, use type assertion on the path
      const response = await authenticatedClient.get(
        `/api/accounts/${accountId}` as '/api/accounts/{id}'
      );

      if (response.ok) {
        expect(response.status).toBe(200);
        expect(response.body.id).toBe(accountId);
      }
    });

    it('shows how to handle POST requests with request bodies', async () => {
      const authenticatedClient = authHelper.createAuthenticatedClient<Endpoints>(app, accessToken);

      // POST request with typed body
      const response = await authenticatedClient.post('/api/time-slots', {
        dateTime: new Date().toISOString(),
        durationMin: 60,
        isAvailable: true,
      });

      // Use discriminated union to narrow the type
      if (response.ok) {
        expect(response.status).toBe(201);
        // Response is fully typed
        expect(response.body.id).toBeDefined();
        expect(response.body.durationMin).toBe(60);
        expect(response.body.createdAt).toBeDefined(); // Properly typed as string!
      }
    });
  });
});
