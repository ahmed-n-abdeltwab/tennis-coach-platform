/**
 * Exampnstrating the discriminated union pattern in TypeSafeHttpClient
 *
 * The client returns a discriminated union type that distinguishes between
 * success (2xx) and error (4xx/5xx) responses using the `ok` property.
 */

import { INestApplication } from '@nestjs/common';
import { TypeSafeHttpClient } from '../http/type-safe-http-client';

describe('Discriminated Union Pattern Examples', () => {
  let app: INestApplication;
  let client: TypeSafeHttpClient;

  beforeAll(async () => {
    // Setup app (simplified for example)
    // app = await createTestApp();
    // client = new TypeSafeHttpClient(app);
  });

  /**
   * Example 1: Basic success/error handling
   */
  it('should handle success and error responses with type narrowing', async () => {
    const response = await client.post('/api/authentication/login', {
      email: 'user@example.com',
      password: 'password123',
    });

    // Use the discriminated union to narrow the type
    if (response.ok) {
      // ✅ TypeScript knows response.body is the success type
      console.log(response.body.accessToken); // string
      console.log(response.body.account.email); // string
      console.log(response.body.account.role); // Role enum

      // ❌ TypeScript error: 'message' doesn't exist on success type
      // console.log(response.body.message);
    } else {
      // ✅ TypeScript knows response.body is ErrorResponse | ValidationErrorResponse
      console.log(response.body.message); // string or string[]
      console.log(response.body.statusCode); // number

      // ❌ TypeScript error: 'accessToken' doesn't exist on error type
      // console.log(response.body.accessToken);
    }
  });

  /**
   * Example 2: Handling validation errors specifically
   */
  it('should distinguish between error types', async () => {
    const response = await client.post('/api/authentication/user/signup', {
      email: 'invalid-email',
      password: '123', // too short
      name: '',
    });

    if (!response.ok) {
      // Check if it's a validation error (message is array)
      if (Array.isArray(response.body.message)) {
        // ValidationErrorResponse
        response.body.message.forEach(error => {
          console.log(`Validation error: ${error}`);
        });
      } else {
        // ErrorResponse
        console.log(`Error: ${response.body.message}`);
      }
    }
  });

  /**
   * Example 3: Status code checking
   */
  it('should check specific status codes', async () => {
    const response = await client.get('/api/sessions/{id}', { id: 'non-existent' });

    if (response.ok) {
      // Success (2xx)
      console.log('Session found:', response.body);
    } else {
      // Error (4xx/5xx)
      if (response.status === 404) {
        console.log('Session not found');
      } else if (response.status === 403) {
        console.log('Access denied');
      } else {
        console.log('Other error:', response.body.message);
      }
    }
  });

  /**
   * Example 4: Early return pattern
   */
  it('should use early return for error handling', async () => {
    const response = await client.post('/api/sessions', {
      bookingTypeId: 'booking-123',
      timeSlotId: 'slot-456',
    });

    // Early return on error
    if (!response.ok) {
      console.error('Failed to create session:', response.body.message);
      return;
    }

    // TypeScript knows response.body is the success type here
    const session = response.body;
    console.log('Session created:', session.id);
    console.log('Status:', session.status);
  });

  /**
   * Example 5: Extracting data with type safety
   */
  it('should extract data with full type safety', async () => {
    const response = await client.get('/api/booking-types');

    if (response.ok) {
      // response.body is Array<BookingType>
      const bookingTypes = response.body;

      bookingTypes.forEach(type => {
        console.log(type.id); // string
        console.log(type.name); // string
        console.log(type.basePrice); // number
        console.log(type.isActive); // boolean
      });
    }
  });

  /**
   * Example 6: Authenticated requests with error handling
   */
  it('should handle authenticated requests', async () => {
    const token = 'jwt-token-here';

    const response = await client.authenticatedGet('/api/accounts/me', token);

    if (response.ok) {
      // Success - access account data
      console.log('User:', response.body.name);
      console.log('Email:', response.body.email);
      console.log('Role:', response.body.role);
    } else {
      // Error - handle authentication failures
      if (response.status === 401) {
        console.log('Token expired or invalid');
      } else {
        console.log('Error:', response.body.message);
      }
    }
  });

  /**
   * Example 7: Chaining operations with error handling
   */
  it('should chain operations with proper error handling', async () => {
    // Step 1: Login
    const loginResponse = await client.post('/api/authentication/user/login', {
      email: 'user@example.com',
      password: 'password123',
    });

    if (!loginResponse.ok) {
      console.error('Login failed:', loginResponse.body.message);
      return;
    }

    const { accessToken } = loginResponse.body;

    // Step 2: Fetch user data
    const profileResponse = await client.authenticatedGet('/api/accounts/me', accessToken);

    if (!profileResponse.ok) {
      console.error('Failed to fetch profile:', profileResponse.body.message);
      return;
    }

    console.log('Logged in as:', profileResponse.body.name);
  });

  /**
   * Example 8: Testing error scenarios
   */
  it('should test error scenarios explicitly', async () => {
    // Test 404 error
    const notFoundResponse = await client.get('/api/sessions/{id}', {
      id: 'non-existent-id',
    });

    expect(notFoundResponse.ok).toBe(false);
    if (!notFoundResponse.ok) {
      expect(notFoundResponse.status).toBe(404);
      expect(notFoundResponse.body.message).toContain('not found');
    }

    // Test validation error
    const validationResponse = await client.post('/api/authentication/user/signup', {
      email: 'invalid',
      password: '',
      name: '',
    });

    expect(validationResponse.ok).toBe(false);
    if (!validationResponse.ok) {
      expect(validationResponse.status).toBe(400);
      expect(Array.isArray(validationResponse.body.message)).toBe(true);
    }
  });
});
