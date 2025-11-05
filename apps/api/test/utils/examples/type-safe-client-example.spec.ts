import { AuthTestHelper, TypeSafeHttpClient } from '@auth-helpers';
import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { Endpoints } from '@routes-helpers';
import { AppModule } from '../../../src/app/app.module';

/**
 * TypeSafeHttpClient Examples
 *
 * This demonstrates how to use the TypeSafeHttpClient for making
 * type-safe HTTP requests to your API endpoints.
 */
describe('TypeSafeHttpClient Examples', () => {
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
    accessToken = signupResponse.body.accessToken;
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

      // Response is fully typed
      expect(response.status).toBe(200);
      expect(response.body.accessToken).toBeDefined();
      expect(response.body.refreshToken).toBeDefined();
      expect(response.body.account.email).toBe('test@example.com');
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

      // Response is fully typed with all account fields
      expect(response.status).toBe(200);
      expect(response.body.id).toBeDefined();
      expect(response.body.email).toBe('test@example.com');
      expect(response.body.name).toBe('Test User');
      expect(response.body.role).toBe('USER');
      expect(response.body.createdAt).toBeDefined(); // Now properly typed as string!
      expect(response.body.updatedAt).toBeDefined(); // Now properly typed as string!
    });

    it('should make authenticated PATCH request to update account', async () => {
      const authenticatedClient = authHelper.createAuthenticatedClient<Endpoints>(app, accessToken);

      // Get current account
      const accountResponse = await authenticatedClient.get('/api/accounts/me');
      const accountId = accountResponse.body.id;

      // Update account with type-safe request
      // Path parameters are included in the path string itself
      const response = await authenticatedClient.patch(`/api/accounts/${accountId}`, {
        name: 'Updated Name',
        bio: 'This is my bio',
      });

      expect(response.status).toBe(200);
      expect(response.body.name).toBe('Updated Name');
      expect(response.body.bio).toBe('This is my bio');
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

      expect(validRequest.status).toBe(201);
      expect(validRequest.body.accessToken).toBeDefined();

      // ❌ These would cause TypeScript errors at compile time:

      // Missing required fields:
      // await client.post('/api/authentication/signup', {
      //   email: 'test@example.com',
      //   // Missing password, name, role - TypeScript error!
      // });

      // Invalid role value:
      // await client.post('/api/authentication/signup', {
      //   email: 'test@example.com',
      //   password: 'pass',
      //   name: 'Test',
      //   role: 'INVALID_ROLE', // TypeScript error - not a valid role!
      // });

      // Wrong endpoint path:
      // await client.post('/api/invalid/endpoint', {}); // TypeScript error!
    });

    it('demonstrates compile-time type checking for response types', async () => {
      const response = await client.post('/api/authentication/user/login', {
        email: 'test@example.com',
        password: 'password123',
      });

      // TypeScript knows the exact shape of the response
      const token: string = response.body.accessToken; // ✅ Typed as string
      const account = response.body.account; // ✅ Typed with all account fields

      expect(token).toBeDefined();
      expect(account.email).toBe('test@example.com');
      expect(account.role).toBe('USER');

      // ❌ This would cause a TypeScript error:
      // const invalid = response.body.nonExistentField; // TypeScript error!
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

      expect(response.status).toBeDefined();
      // Response is typed as an array of time slots
      expect(Array.isArray(response.body)).toBe(true);
    });

    it('shows how to handle GET requests with path parameters', async () => {
      const authenticatedClient = authHelper.createAuthenticatedClient<Endpoints>(app, accessToken);

      // Get current account to get the ID
      const accountResponse = await authenticatedClient.get('/api/accounts/me');
      const accountId = accountResponse.body.id;

      // GET request with path parameter
      // Path parameters are included in the path string itself, not as data
      const response = await authenticatedClient.get(`/api/accounts/${accountId}`);

      expect(response.status).toBe(200);
      expect(response.body.id).toBe(accountId);
    });

    it('shows how to handle POST requests with request bodies', async () => {
      const authenticatedClient = authHelper.createAuthenticatedClient<Endpoints>(app, accessToken);

      // POST request with typed body
      const response = await authenticatedClient.post('/api/time-slots', {
        dateTime: new Date().toISOString(),
        durationMin: 60,
        isAvailable: true,
      });

      expect(response.status).toBeDefined();
      // Response is fully typed
      if (response.status === 201) {
        expect(response.body.id).toBeDefined();
        expect(response.body.durationMin).toBe(60);
        expect(response.body.createdAt).toBeDefined(); // Properly typed as string!
      }
    });
  });
});
