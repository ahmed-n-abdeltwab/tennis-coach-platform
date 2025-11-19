/**
 * Example: Type-Safe Integration Testing with BaseIntegrationTest
 *
 * This example demonstrates how to use the type-safe HTTP methods
 * in BaseIntegrationTest for integration testing with compile-time
 * type validation and discriminated union responses.
 */

import { todo } from 'node:test';

import { Role } from '@prisma/client';

import { AppModule } from '../../../src/app/app.module';
import { BaseIntegrationTest } from '../base/base-integration.test';

/**
 * Example integration test class extending BaseIntegrationTest
 */
class TypeSafeIntegrationExample extends BaseIntegrationTest {
  getTestModules() {
    return [AppModule];
  }

  async setupTestApp() {
    // Additional setup if needed
  }
}

describe('BaseIntegrationTest Type-Safe Methods Examples', () => {
  let test: TypeSafeIntegrationExample;

  beforeEach(async () => {
    test = new TypeSafeIntegrationExample();
    await test.setup();
  });

  afterEach(async () => {
    await test.cleanup();
  });

  /**
   * Example 1: Type-Safe GET Request with Discriminated Union
   *
   * Demonstrates:
   * - Type-safe GET request
   * - Discriminated union response handling
   * - Compile-time path validation
   */
  it('should use type-safe GET with discriminated union', async () => {
    const token = test.createTestJwtToken({ role: Role.USER });

    // Type-safe GET - path is validated at compile-time
    const response = await test.typeSafeAuthenticatedGet('/api/sessions', token);

    // Use discriminated union to handle success/error
    if (response.ok) {
      // TypeScript knows response.body is Session[]
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.status).toBe(200);
      console.log('✅ Success: Got sessions array');
    } else {
      // TypeScript knows response.body is ErrorResponse
      expect(response.body.message).toBeDefined();
      expect(response.status).toBeGreaterThanOrEqual(400);
      console.log('❌ Error:', response.body.message);
    }
  });

  /**
   * Example 2: Type-Safe POST Request with Request Validation
   *
   * Demonstrates:
   * - Type-safe POST request
   * - Compile-time request body validation
   * - Entity creation helpers
   */
  it('should use type-safe POST with request validation', async () => {
    const token = test.createTestJwtToken({ role: Role.USER });
    const coach = await test.createTestCoach();
    const user = await test.createTestUser();
    const bookingType = await test.createTestBookingType({ coachId: coach.id });
    const timeSlot = await test.createTestTimeSlot({ coachId: coach.id });

    // Type-safe POST - request body is validated at compile-time
    const response = await test.typeSafeAuthenticatedPost('/api/sessions', token, {
      bookingTypeId: bookingType.id,
      timeSlotId: timeSlot.id,
      notes: 'Test session',
    });

    if (response.ok) {
      // TypeScript knows response.body is Session
      expect(response.body.id).toBeDefined();
      expect(response.body.coachId).toBe(coach.id);
      expect(response.body.userId).toBe(user.id);
      expect(response.status).toBe(201);
      console.log('✅ Created session:', response.body.id);
    } else {
      fail(`Expected success but got error: ${response.body.message}`);
    }
  });

  /**
   * Example 3: Path Parameters with Type Safety
   *
   * Demonstrates:
   * - Type-safe GET with path parameters
   * - Template literal path handling
   * - Type assertion for dynamic paths
   */
  it('should handle path parameters with type safety', async () => {
    const token = test.createTestJwtToken({ role: Role.USER });
    const session = await test.createTestSession();

    // Type-safe GET with path parameter
    // Use type assertion for template literal paths
    const response = await test.typeSafeAuthenticatedGet(
      `/api/sessions/${session.id}` as '/api/sessions/{id}',
      token
    );

    if (response.ok) {
      // TypeScript knows response.body is Session
      expect(response.body.id).toBe(session.id);
      expect(response.body.coachId).toBeDefined();
      console.log('✅ Got session by ID:', response.body.id);
    } else {
      fail(`Expected success but got error: ${response.body.message}`);
    }
  });

  /**
   * Example 4: Validation Error Handling
   *
   * Demonstrates:
   * - Type-safe error handling
   * - Validation error responses
   * - Discriminated union for error cases
   */
  it('should handle validation errors with type safety', async () => {
    const token = test.createTestJwtToken({ role: Role.USER });

    // Type-safe POST with invalid data (missing required fields)
    const response = await test.typeSafeAuthenticatedPost('/api/sessions', token, {
      // Missing required fields: userId, bookingTypeId, timeSlotId, dateTime
      coachId: 'invalid-id',
    } as any);

    // Discriminated union makes error handling clear
    if (!response.ok) {
      expect(response.status).toBe(400);
      expect(response.body.message).toBeDefined();
      console.log('✅ Validation error caught:', response.body.message);
    } else {
      fail('Expected validation error');
    }
  });

  /**
   * Example 5: Type-Safe PUT Request
   *
   * Demonstrates:
   * - Type-safe PUT request
   * - Partial updates with DeepPartial
   * - Update operations
   */
  it('should use type-safe PUT for updates', async () => {
    const token = test.createTestJwtToken({ role: Role.COACH });
    const session = await test.createTestSession();

    // Type-safe PUT - only include fields to update
    const response = await test.typeSafeAuthenticatedPut(
      `/api/sessions/${session.id}` as '/api/sessions/{id}',
      token,
      {
        notes: 'Updated notes',
        status: 'COMPLETED',
      }
    );

    if (response.ok) {
      expect(response.body.notes).toBe('Updated notes');
      expect(response.body.status).toBe('COMPLETED');
      console.log('✅ Updated session:', response.body.id);
    } else {
      fail(`Expected success but got error: ${response.body.message}`);
    }
  });

  /**
   * Example 6: Type-Safe DELETE Request
   *
   * Demonstrates:
   * - Type-safe DELETE request
   * - Resource deletion
   * - 204 No Content responses
   */
  todo('should use type-safe DELETE', async () => {
    // const token = test.createTestJwtToken({ role: Role.ADMIN });
    // const session = await test.createTestSession();
    // Type-safe DELETE
    // TODO: add Endpoint '/api/sessions/{id}' to delete Sessions
    // const response = await test.typeSafeAuthenticatedDelete(
    //   `/api/sessions/${session.id}` as '/api/sessions/{id}',
    //   token
    // );
    // if (response.ok) {
    //   expect([200, 204]).toContain(response.status);
    //   console.log('✅ Deleted session:', session.id);
    //   // Verify deletion
    //   const record = await test.findRecord('session', { id: session.id });
    //   expect(record).toBeNull();
    // } else {
    //   fail(`Expected success but got error: ${response.body.message}`);
    // }
  });

  /**
   * Example 7: Multiple Requests with Type Safety
   *
   * Demonstrates:
   * - Chaining multiple type-safe requests
   * - Complex workflows
   * - Error handling in workflows
   */
  it('should chain multiple type-safe requests', async () => {
    const token = test.createTestJwtToken({ role: Role.USER });
    const coach = await test.createTestCoach();
    // const user = await test.createTestUser();

    // Step 1: Get available booking types
    const bookingTypesResponse = await test.typeSafeAuthenticatedGet(
      `/api/booking-types/coach/${coach.id}` as '/api/booking-types/coach/{coachId}',
      token
    );

    if (!bookingTypesResponse.ok) {
      fail('Failed to get booking types');
    }

    // Step 2: Get available time slots
    const timeSlotsResponse = await test.typeSafeAuthenticatedGet(
      `/api/time-slots/coach/${coach.id}` as '/api/time-slots/coach/{coachId}',
      token
    );

    if (!timeSlotsResponse.ok) {
      fail('Failed to get time slots');
    }

    // Step 3: Create a session
    const bookingType = bookingTypesResponse.body[0]!;
    const timeSlot = timeSlotsResponse.body[0]!;

    const sessionResponse = await test.typeSafeAuthenticatedPost('/api/sessions', token, {
      bookingTypeId: bookingType.id,
      timeSlotId: timeSlot.id,
    });

    if (sessionResponse.ok) {
      console.log('✅ Workflow completed successfully');
      expect(sessionResponse.body.id).toBeDefined();
    } else {
      fail(`Workflow failed: ${sessionResponse.body.message}`);
    }
  });

  /**
   * Example 8: Comparing Legacy vs Type-Safe Methods
   *
   * Demonstrates:
   * - Differences between legacy and type-safe methods
   * - Migration path
   * - Benefits of type-safe approach
   */
  it('should compare legacy vs type-safe methods', async () => {
    const token = test.createTestJwtToken({ role: Role.USER });

    // Legacy method (still supported)
    const legacyResponse = await test.authenticatedGet('/sessions', token);
    expect(legacyResponse.status).toBe(200);
    // legacyResponse.body is 'any' type - no type safety

    // Type-safe method (recommended)
    const typeSafeResponse = await test.typeSafeAuthenticatedGet('/api/sessions', token);
    if (typeSafeResponse.ok) {
      // typeSafeResponse.body is typed as Session[]
      expect(Array.isArray(typeSafeResponse.body)).toBe(true);
      console.log('✅ Type-safe method provides better type inference');
    }

    // Both work, but type-safe method provides:
    // 1. Compile-time path validation
    // 2. Compile-time request/response type checking
    // 3. Discriminated union responses
    // 4. IntelliSense support
  });

  /**
   * Example 9: Error Handling Patterns
   *
   * Demonstrates:
   * - Different error status codes
   * - Error response structure
   * - Best practices for error handling
   */
  it('should demonstrate error handling patterns', async () => {
    // 401 Unauthorized - No token
    const unauthorizedResponse = await test.typeSafeGet('/api/sessions');
    if (!unauthorizedResponse.ok) {
      expect(unauthorizedResponse.status).toBe(401);
      console.log('✅ 401 Unauthorized:', unauthorizedResponse.body.message);
    }

    // 403 Forbidden - Wrong role
    const userToken = test.createTestJwtToken({ role: Role.USER });
    const forbiddenResponse = await test.typeSafeAuthenticatedGet(
      '/api/booking-types',
      userToken
    );
    if (!forbiddenResponse.ok) {
      expect(forbiddenResponse.status).toBe(403);
      console.log('✅ 403 Forbidden:', forbiddenResponse.body.message);
    }

    // 404 Not Found - Invalid ID
    const adminToken = test.createTestJwtToken({ role: Role.ADMIN });
    const notFoundResponse = await test.typeSafeAuthenticatedGet(
      '/api/sessions/invalid-id' as '/api/sessions/{id}',
      adminToken
    );
    if (!notFoundResponse.ok) {
      expect(notFoundResponse.status).toBe(404);
      console.log('✅ 404 Not Found:', notFoundResponse.body.message);
    }
  });

  /**
   * Example 10: Best Practices Summary
   *
   * Demonstrates:
   * - Recommended patterns
   * - Common pitfalls to avoid
   * - Tips for effective testing
   */
  it('should demonstrate best practices', async () => {
    const token = test.createTestJwtToken({ role: Role.USER });

    // ✅ DO: Use discriminated union for clear error handling
    const response = await test.typeSafeAuthenticatedGet('/api/sessions', token);
    if (response.ok) {
      // Handle success
      expect(response.body).toBeDefined();
    } else {
      // Handle error
      console.error('Error:', response.body.message);
    }

    // ✅ DO: Use type assertion for dynamic paths
    const sessionId = 'session-123';
    // const pathResponse = await test.typeSafeAuthenticatedGet(
    (`/api/sessions/${sessionId}` as '/api/sessions/{id}', token);
  });

  // ✅ DO: Create test data before making requests
  // const coach = await test.createTestCoach();
  // const bookingType = await test.createTestBookingType({ coachId: coach.id });

  // ✅ DO: Use assertion helpers for cleaner tests
  // if (response.ok) {
  //   test.assertArrayLength(response, 0); // Cast for legacy assertion
  // }

  // ❌ DON'T: Ignore the discriminated union
  // const body = response.body; // TypeScript error: body could be Session[] or ErrorResponse

  // ❌ DON'T: Use 'as any' unless necessary
  // const badResponse = await test.typeSafeGet('/invalid' as any);
});
