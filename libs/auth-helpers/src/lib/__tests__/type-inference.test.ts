/**
 * Type Inference Tests
 *
 * This file tests that TypeSafeHttpClient properly infers response types.
 * These are compile-time tests - if they compile, the types are working correctly.
 */

import { INestApplication } from '@nestjs/common';
import { Endpoints } from '@routes-helpers';
import { TypeSafeHttpClient } from '../type-safe-http-client';

// Mock app for type testing
declare const app: INestApplication;
const client = new TypeSafeHttpClient<Endpoints>(app);

/**
 * Test 1: POST without expectedStatus should return success type
 */
async function testPostWithoutExpectedStatus() {
  const response = await client.post('/api/authentication/user/login', {
    email: 'test@example.com',
    password: 'password123',
  });

  // These should all compile without errors because response.body is properly typed
  const accessToken: string = response.body.accessToken;
  const refreshToken: string = response.body.refreshToken;
  const account = response.body.account;
  const email: string = account.email;
  const role: 'USER' | 'PREMIUM_USER' | 'ADMIN' | 'COACH' = account.role;

  // This should cause a compile error (uncomment to test):
  // const invalid = response.body.nonExistentField;
}

/**
 * Test 2: GET without expectedStatus should return success type
 */
async function testGetWithoutExpectedStatus() {
  const response = await client.get('/api/accounts/me');

  // These should all compile without errors
  const id: string = response.body.id;
  const email: string = response.body.email;
  const name: string = response.body.name;
  const role: 'USER' | 'PREMIUM_USER' | 'ADMIN' | 'COACH' = response.body.role;
  const createdAt: string = response.body.createdAt;
  const updatedAt: string = response.body.updatedAt;

  // Optional fields should be typed correctly
  const bio: string | undefined = response.body.bio;
  const age: number | undefined = response.body.age;
}

/**
 * Test 3: POST with expectedStatus should return union type
 */
async function testPostWithExpectedStatus() {
  const response = await client.post(
    '/api/authentication/user/login',
    {
      email: 'test@example.com',
      password: 'password123',
    },
    { expectedStatus: 200 }
  );

  // Response body should be a union type that includes both success and error types
  // We need to check the status to narrow the type
  if (response.status === 200) {
    const accessToken: string = response.body.accessToken;
  } else {
    // Error case - body might be ErrorResponse or ValidationErrorResponse
    const message = response.body.message;
  }
}

/**
 * Test 4: Authenticated requests should also have proper type inference
 */
async function testAuthenticatedRequests() {
  const token = 'test-token';

  const response = await client.authenticatedGet('/api/accounts/me', token);

  // Should be properly typed
  const id: string = response.body.id;
  const email: string = response.body.email;
  const name: string = response.body.name;
}

/**
 * Test 5: PATCH request should have proper type inference
 */
async function testPatchRequest() {
  const response = await client.authenticatedPatch('/api/accounts/123', 'test-token', {
    name: 'Updated Name',
    bio: 'Updated bio',
  });

  // Response should be properly typed
  const id: string = response.body.id;
  const name: string = response.body.name;
  const bio: string | undefined = response.body.bio;
}

// Export to prevent "unused" warnings
export {
  testAuthenticatedRequests,
  testGetWithoutExpectedStatus,
  testPatchRequest,
  testPostWithExpectedStatus,
  testPostWithoutExpectedStatus,
};
