/**
 * Type Inference Tests
 *
 * This file tests that TypeSafeHttpClient properly infers response types using discriminated unions.
 * These are compile-time tests - if they compile, the types are working correctly.
 */

import { INestApplication } from '@nestjs/common';
import { Endpoints } from '@routes-helpers';
import { TypeSafeHttpClient } from '../type-safe-http-client';

// Mock app for type testing
declare const app: INestApplication;
const client = new TypeSafeHttpClient<Endpoints>(app);

/**
 * Test 1: POST request with discriminated union
 */
async function testPostWithDiscriminatedUnion() {
  const response = await client.post('/api/authentication/user/login', {
    email: 'test@example.com',
    password: 'password123',
  });

  // Use discriminated union to narrow the type
  if (response.ok) {
    // ✅ TypeScript knows response.body is the success type
    const accessToken: string = response.body.accessToken;
    const refreshToken: string = response.body.refreshToken;
    const account = response.body.account;
    const email: string = account.email;
    const role: 'USER' | 'PREMIUM_USER' | 'ADMIN' | 'COACH' = account.role;

    // Use the variables to avoid unused warnings
    console.log(accessToken, refreshToken, email, role);
  } else {
    // ✅ TypeScript knows response.body is ErrorResponse | ValidationErrorResponse
    const message = response.body.message;
    const statusCode: number = response.body.statusCode;

    console.log(message, statusCode);
  }

  // This should cause a compile error (uncomment to test):
  // const invalid = response.body.nonExistentField;
}

/**
 * Test 2: GET request with discriminated union
 */
async function testGetWithDiscriminatedUnion() {
  const response = await client.get('/api/accounts/me');

  if (response.ok) {
    // ✅ These should all compile without errors
    const id: string = response.body.id;
    const email: string = response.body.email;
    const name: string = response.body.name;
    const role: 'USER' | 'PREMIUM_USER' | 'ADMIN' | 'COACH' = response.body.role;
    const createdAt: string = response.body.createdAt;
    const updatedAt: string = response.body.updatedAt;

    // Optional fields should be typed correctly
    const bio: string | undefined = response.body.bio;
    const age: number | undefined = response.body.age;

    console.log(id, email, name, role, createdAt, updatedAt, bio, age);
  } else {
    // Error case
    console.log(response.body.message);
  }
}

/**
 * Test 3: Status code checking with discriminated union
 */
async function testStatusCodeChecking() {
  const response = await client.post(
    '/api/authentication/user/login',
    {
      email: 'test@example.com',
      password: 'password123',
    },
    { expectedStatus: 200 }
  );

  // Use discriminated union
  if (response.ok) {
    // Success case (2xx)
    const accessToken: string = response.body.accessToken;
    console.log(accessToken);
  } else {
    // Error case (4xx/5xx)
    if (response.status === 401) {
      console.log('Unauthorized:', response.body.message);
    } else if (response.status === 400) {
      console.log('Bad request:', response.body.message);
    }
  }
}

/**
 * Test 4: Authenticated requests with discriminated union
 */
async function testAuthenticatedRequests() {
  const token = 'test-token';

  const response = await client.authenticatedGet('/api/accounts/me', token);

  if (response.ok) {
    // Should be properly typed
    const id: string = response.body.id;
    const email: string = response.body.email;
    const name: string = response.body.name;

    console.log(id, email, name);
  } else {
    console.log('Error:', response.body.message);
  }
}

/**
 * Test 5: PATCH request with discriminated union
 */
async function testPatchRequest() {
  const response = await client.authenticatedPatch(
    '/api/accounts/123' as '/api/accounts/{id}',
    'test-token',
    {
      name: 'Updated Name',
      bio: 'Updated bio',
    }
  );

  if (response.ok) {
    // Response should be properly typed
    const id: string = response.body.id;
    const name: string = response.body.name;
    const bio: string | undefined = response.body.bio;

    console.log(id, name, bio);
  } else {
    console.log('Error:', response.body.message);
  }
}

/**
 * Test 6: Early return pattern
 */
async function testEarlyReturnPattern() {
  const response = await client.post('/api/authentication/user/login', {
    email: 'test@example.com',
    password: 'password123',
  });

  // Early return on error
  if (!response.ok) {
    console.error('Login failed:', response.body.message);
    return;
  }

  // TypeScript knows response.body is the success type here
  const accessToken: string = response.body.accessToken;
  const account = response.body.account;

  console.log('Logged in:', accessToken, account.email);
}

/**
 * Test 7: Validation error handling
 */
async function testValidationErrorHandling() {
  const response = await client.post('/api/authentication/signup', {
    email: 'invalid-email',
    password: '123',
    name: '',
    role: 'USER',
  });

  if (!response.ok) {
    // Check if it's a validation error (message is array)
    if (Array.isArray(response.body.message)) {
      // ValidationErrorResponse
      response.body.message.forEach((error: string) => {
        console.log(`Validation error: ${error}`);
      });
    } else {
      // ErrorResponse
      console.log(`Error: ${response.body.message}`);
    }
  }
}

// Export to prevent "unused" warnings
export {
  testAuthenticatedRequests,
  testEarlyReturnPattern,
  testGetWithDiscriminatedUnion,
  testPatchRequest,
  testPostWithDiscriminatedUnion,
  testStatusCodeChecking,
  testValidationErrorHandling,
};
