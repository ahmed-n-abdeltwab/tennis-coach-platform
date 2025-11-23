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

describe.skip('BaseIntegrationTest Type-Safe Methods Examples', () => {
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
    const token = await test.createTestJwtToken({ role: Role.USER });

    // Type-safe GET - path is validated at compile-time
    const response = await test.authenticatedGet('/api/sessions', token);

    // Use discriminated union to handle success/error
    if (response.ok) {
      // TypeScript knows response.body is Session[]
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.status).toBe(200);
    } else {
      // TypeScript knows response.body is ErrorResponse
      expect(response.body.message).toBeDefined();
      expect(response.status).toBeGreaterThanOrEqual(400);
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
    const token = await test.createTestJwtToken({ role: Role.USER });
    const coach = await test.createTestCoach();
    const user = await test.createTestUser();
    const bookingType = await test.createTestBookingType({ coachId: coach.id });
    const timeSlot = await test.createTestTimeSlot({ coachId: coach.id });

    // Type-safe POST - request body is validated at compile-time
    const response = await test.authenticatedPost('/api/sessions', token, {
      body: {
        bookingTypeId: bookingType.id,
        timeSlotId: timeSlot.id,
        notes: 'Test session',
      },
    });

    if (response.ok) {
      // TypeScript knows response.body is Session
      expect(response.body.id).toBeDefined();
      expect(response.body.coachId).toBe(coach.id);
      expect(response.body.userId).toBe(user.id);
      expect(response.status).toBe(201);
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
    const token = await test.createTestJwtToken({ role: Role.USER });
    const session = await test.createTestSession();

    // Type-safe GET with path parameter
    // Use type assertion for template literal paths
    const response = await test.authenticatedGet(
      `/api/sessions/${session.id}` as '/api/sessions/{id}',
      token
    );

    if (response.ok) {
      // TypeScript knows response.body is Session
      expect(response.body.id).toBe(session.id);
      expect(response.body.coachId).toBeDefined();
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
    const token = await test.createTestJwtToken({ role: Role.USER });

    // Type-safe POST with invalid data (missing required fields)
    const response = await test.authenticatedPost('/api/sessions', token, {
      body: {
        // Missing required fields: userId, bookingTypeId, timeSlotId, dateTime
        coachId: 'invalid-id',
      },
    } as any);

    // Discriminated union makes error handling clear
    if (!response.ok) {
      expect(response.status).toBe(400);
      expect(response.body.message).toBeDefined();
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
    const token = await test.createTestJwtToken({ role: Role.COACH });
    const session = await test.createTestSession();

    // Type-safe PUT - only include fields to update
    const response = await test.authenticatedPut('/api/sessions/{id}', token, {
      body: {
        notes: 'Updated notes',
        status: 'COMPLETED',
      },
      params: {
        id: session.id,
      },
    });

    if (response.ok) {
      expect(response.body.notes).toBe('Updated notes');
      expect(response.body.status).toBe('COMPLETED');
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
    const token = await test.createTestJwtToken({ role: Role.ADMIN });
    const timeSlot = await test.createTestTimeSlot();
    // Type-safe DELETE
    // TODO: add Endpoint '/api/sessions/{id}' to delete Sessions
    const response = await test.authenticatedDelete('/api/time-slots/{id}', token, {
      params: { id: timeSlot.id },
    });
    if (response.ok) {
      expect([200, 204]).toContain(response.status);
      // Verify deletion
      const record = await test.findRecord('timeSlot', { id: timeSlot.id });
      expect(record).toBeNull();
    } else {
      fail(`Expected success but got error: ${response.body.message}`);
    }
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
    const token = await test.createTestJwtToken({ role: Role.USER });
    const coach = await test.createTestCoach();
    // const user = await test.createTestUser();

    // Step 1: Get available booking types
    const bookingTypesResponse = await test.authenticatedGet(
      `/api/booking-types/coach/${coach.id}` as '/api/booking-types/coach/{coachId}',
      token
    );

    if (!bookingTypesResponse.ok) {
      fail('Failed to get booking types');
    }

    // Step 2: Get available time slots
    const timeSlotsResponse = await test.authenticatedGet(
      `/api/time-slots/coach/${coach.id}` as '/api/time-slots/coach/{coachId}',
      token
    );

    if (!timeSlotsResponse.ok) {
      fail('Failed to get time slots');
    }

    // Step 3: Create a session
    const bookingType = bookingTypesResponse.body[0];
    const timeSlot = timeSlotsResponse.body[0];

    const sessionResponse = await test.authenticatedPost('/api/sessions', token, {
      body: { bookingTypeId: bookingType.id, timeSlotId: timeSlot.id },
    });

    if (sessionResponse.ok) {
      expect(sessionResponse.body.id).toBeDefined();
    } else {
      fail(`Workflow failed: ${sessionResponse.body.message}`);
    }
  });

  /**
   * Example 8: Error Handling Patterns
   *
   * Demonstrates:
   * - Different error status codes
   * - Error response structure
   * - Best practices for error handling
   */
  it('should demonstrate error handling patterns', async () => {
    // 401 Unauthorized - No token
    const unauthorizedResponse = await test.get('/api/sessions');
    if (!unauthorizedResponse.ok) {
      expect(unauthorizedResponse.status).toBe(401);
    }

    // 403 Forbidden - Wrong role
    const userToken = await test.createTestJwtToken({ role: Role.USER });
    const forbiddenResponse = await test.authenticatedGet('/api/booking-types', userToken);
    if (!forbiddenResponse.ok) {
      expect(forbiddenResponse.status).toBe(403);
    }

    // 404 Not Found - Invalid ID
    const adminToken = await test.createTestJwtToken({ role: Role.ADMIN });
    const notFoundResponse = await test.authenticatedGet(
      '/api/sessions/invalid-id' as '/api/sessions/{id}',
      adminToken
    );
    if (!notFoundResponse.ok) {
      expect(notFoundResponse.status).toBe(404);
    }
  });

  /**
   * Example 9: Best Practices Summary
   *
   * Demonstrates:
   * - Recommended patterns
   * - Common pitfalls to avoid
   * - Tips for effective testing
   */
  it('should demonstrate best practices', async () => {
    const token = await test.createTestJwtToken({ role: Role.USER });

    // ✅ DO: Use discriminated union for clear error handling
    const response = await test.authenticatedGet('/api/sessions', token);
    if (response.ok) {
      // Handle success
      expect(response.body).toBeDefined();
    } else {
      // Handle error
      fail(`Error: ${response.body.message}`);
    }

    // ✅ DO: Use type assertion for dynamic paths
    const sessionId = 'session-123';
    const _pathResponse = await test.authenticatedGet(
      `/api/sessions/${sessionId}` as '/api/sessions/{id}',
      token
    );
  });
});
