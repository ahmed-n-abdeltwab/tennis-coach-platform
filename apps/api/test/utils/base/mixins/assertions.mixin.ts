/**
 * Assertions Mixin
 * Provides reusable test assertion helpers
 * Eliminates duplication of common test assertions
 */

/**
 * Assertions Mixin
 * Common assertion helpers for HTTP responses and test validation
 *
 * @example
 * ```typescript
 * const assert = new AssertionsMixin();
 * assert.assertSuccessResponse(response);
 * assert.assertArrayResponse(data, 5);
 * ```
 */
export class AssertionsMixin {
  /**
   * Assert response has expected structure with specific keys
   *
   * @param response - HTTP response object to validate
   * @param expectedKeys - Array of keys that should exist in response.body
   *
   * @example
   * ```typescript
   * assert.assertResponseStructure(response, ['id', 'name', 'email']);
   * ```
   */
  assertResponseStructure(response: any, expectedKeys: string[]): void {
    expect(response.body).toBeDefined();
    expectedKeys.forEach(key => expect(response.body).toHaveProperty(key));
  }

  /**
   * Assert successful HTTP response with expected status code
   *
   * @param response - HTTP response object to validate
   * @param expectedStatus - Expected HTTP status code (default: 200)
   *
   * @example
   * ```typescript
   * assert.assertSuccessResponse(response); // Expects 200
   * assert.assertSuccessResponse(response, 201); // Expects 201
   * ```
   */
  assertSuccessResponse(response: any, expectedStatus = 200): void {
    expect(response.status).toBe(expectedStatus);
    expect(response.body).toBeDefined();
  }

  /**
   * Assert error response with expected status code and optional message
   *
   * @param response - HTTP response object to validate
   * @param expectedStatus - Expected HTTP error status code
   * @param expectedMessage - Optional substring to match in error message
   *
   * @example
   * ```typescript
   * assert.assertErrorResponse(response, 400);
   * assert.assertErrorResponse(response, 400, 'validation failed');
   * ```
   */
  assertErrorResponse(response: any, expectedStatus: number, expectedMessage?: string): void {
    expect(response.status).toBe(expectedStatus);
    expect(response.body).toBeDefined();
    if (expectedMessage && !response.ok) {
      expect(response.body.message).toContain(expectedMessage);
    }
  }

  /**
   * Assert 404 Not Found response
   *
   * @param response - HTTP response object to validate
   *
   * @example
   * ```typescript
   * assert.assertNotFound(response);
   * ```
   */
  assertNotFound(response: any): void {
    expect(response.status).toBe(404);
    expect(response.body).toBeDefined();
  }

  /**
   * Assert 401 Unauthorized response
   *
   * @param response - HTTP response object to validate
   *
   * @example
   * ```typescript
   * assert.assertUnauthorized(response);
   * ```
   */
  assertUnauthorized(response: any): void {
    expect(response.status).toBe(401);
    expect(response.body).toBeDefined();
  }

  /**
   * Assert 403 Forbidden response
   *
   * @param response - HTTP response object to validate
   *
   * @example
   * ```typescript
   * assert.assertForbidden(response);
   * ```
   */
  assertForbidden(response: any): void {
    expect(response.status).toBe(403);
    expect(response.body).toBeDefined();
  }

  /**
   * Assert 400 Bad Request response with optional message validation
   *
   * @param response - HTTP response object to validate
   * @param expectedMessage - Optional substring to match in error message
   *
   * @example
   * ```typescript
   * assert.assertBadRequest(response);
   * assert.assertBadRequest(response, 'Invalid input');
   * ```
   */
  assertBadRequest(response: any, expectedMessage?: string): void {
    expect(response.status).toBe(400);
    expect(response.body).toBeDefined();
    if (expectedMessage) {
      expect(response.body.message).toContain(expectedMessage);
    }
  }

  /**
   * Assert 201 Created response
   *
   * @param response - HTTP response object to validate
   *
   * @example
   * ```typescript
   * assert.assertCreated(response);
   * ```
   */
  assertCreated(response: any): void {
    expect(response.status).toBe(201);
    expect(response.body).toBeDefined();
  }

  /**
   * Assert 204 No Content response
   *
   * @param response - HTTP response object to validate
   *
   * @example
   * ```typescript
   * assert.assertNoContent(response);
   * ```
   */
  assertNoContent(response: any): void {
    expect(response.status).toBe(204);
  }

  /**
   * Assert result is an array with optional minimum length validation
   *
   * @template T - Type of array elements
   * @param result - Array to validate
   * @param minLength - Minimum expected length (default: 0)
   *
   * @example
   * ```typescript
   * assert.assertArrayResponse(sessions); // Just checks it's an array
   * assert.assertArrayResponse(sessions, 5); // Checks length >= 5
   * ```
   */
  assertArrayResponse<T>(result: T[], minLength = 0): void {
    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBeGreaterThanOrEqual(minLength);
  }

  /**
   * Assert that a Jest mock function was not called
   *
   * @param mockMethod - Jest mock function to check
   *
   * @example
   * ```typescript
   * assert.assertNotCalled(mockService.delete);
   * ```
   */
  assertNotCalled(mockMethod: jest.Mock | jest.MockInstance<any, any[]>): void {
    expect(mockMethod).not.toHaveBeenCalled();
  }

  /**
   * Assert that a Jest mock function was called with specific arguments
   *
   * @param mockMethod - Jest mock function to check
   * @param args - Expected arguments
   *
   * @example
   * ```typescript
   * assert.assertCalledWith(mockService.create, { name: 'Test' });
   * ```
   */
  assertCalledWith(mockMethod: jest.Mock | jest.MockInstance<any, any[]>, ...args: any[]): void {
    expect(mockMethod).toHaveBeenCalledWith(...args);
  }

  /**
   * Assert that a Jest mock function was called exactly n times
   *
   * @param mockMethod - Jest mock function to check
   * @param times - Expected number of calls
   *
   * @example
   * ```typescript
   * assert.assertCalledTimes(mockService.findAll, 2);
   * ```
   */
  assertCalledTimes(mockMethod: jest.Mock | jest.MockInstance<any, any[]>, times: number): void {
    expect(mockMethod).toHaveBeenCalledTimes(times);
  }

  /**
   * Assert that a mock was called exactly once
   * Convenience method for assertCalledTimes(mockMethod, 1)
   */
  assertCalledOnce(mockMethod: jest.Mock | jest.MockInstance<any, any[]>): void {
    expect(mockMethod).toHaveBeenCalledTimes(1);
  }

  /**
   * Assert that a mock was never called with specific arguments
   */
  assertNeverCalledWith(
    mockMethod: jest.Mock | jest.MockInstance<any, any[]>,
    ...args: any[]
  ): void {
    expect(mockMethod).not.toHaveBeenCalledWith(...args);
  }

  /**
   * Assert that an object has a specific property
   * Optionally validates the property value
   */
  assertHasProperty(obj: any, property: string, value?: any): void {
    expect(obj).toHaveProperty(property);
    if (value !== undefined) {
      expect(obj[property]).toEqual(value);
    }
  }

  /**
   * Assert that an object has multiple properties
   */
  assertHasProperties(obj: any, properties: string[]): void {
    properties.forEach(property => {
      expect(obj).toHaveProperty(property);
    });
  }

  /**
   * Assert that an array is empty
   */
  assertEmptyArray<T>(result: T[]): void {
    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBe(0);
  }

  /**
   * Assert that an array is not empty
   */
  assertNonEmptyArray<T>(result: T[]): void {
    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBeGreaterThan(0);
  }

  /**
   * Assert that an array contains a specific item
   *
   * @template T - Type of array elements
   * @param array - Array to search
   * @param item - Item to find
   *
   * @example
   * ```typescript
   * assert.assertArrayContains(userIds, 'user-123');
   * ```
   */
  assertArrayContains<T>(array: T[], item: T): void {
    expect(Array.isArray(array)).toBe(true);
    expect(array).toContain(item);
  }

  /**
   * Assert that an array has an exact length
   *
   * @template T - Type of array elements
   * @param array - Array to validate
   * @param length - Expected exact length
   *
   * @example
   * ```typescript
   * assert.assertArrayLength(sessions, 10);
   * ```
   */
  assertArrayLength<T>(array: T[], length: number): void {
    expect(Array.isArray(array)).toBe(true);
    expect(array.length).toBe(length);
  }

  /**
   * Assert that a value is a valid ISO 8601 date string
   *
   * @param value - Value to validate
   *
   * @example
   * ```typescript
   * assert.assertDateString(session.createdAt);
   * ```
   */
  assertDateString(value: any): void {
    expect(typeof value).toBe('string');
    const date = new Date(value);
    expect(date.toISOString()).toBe(value);
  }

  /**
   * Assert that a value is a valid UUID (v4)
   *
   * @param value - Value to validate
   *
   * @example
   * ```typescript
   * assert.assertUUID(session.id);
   * ```
   */
  assertUUID(value: any): void {
    expect(typeof value).toBe('string');
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    expect(value).toMatch(uuidRegex);
  }

  /**
   * Assert that a value is a string
   *
   * @param value - Value to validate
   *
   * @example
   * ```typescript
   * assert.assertIsString(user.name);
   * ```
   */
  assertIsString(value: any): void {
    expect(typeof value).toBe('string');
  }

  /**
   * Assert that a value is a number (not NaN)
   *
   * @param value - Value to validate
   *
   * @example
   * ```typescript
   * assert.assertIsNumber(user.age);
   * ```
   */
  assertIsNumber(value: any): void {
    expect(typeof value).toBe('number');
    expect(Number.isNaN(value)).toBe(false);
  }

  /**
   * Assert that a value is a boolean
   *
   * @param value - Value to validate
   *
   * @example
   * ```typescript
   * assert.assertIsBoolean(user.isActive);
   * ```
   */
  assertIsBoolean(value: any): void {
    expect(typeof value).toBe('boolean');
  }

  /**
   * Assert that a value is an object (not null, not array)
   *
   * @param value - Value to validate
   *
   * @example
   * ```typescript
   * assert.assertIsObject(user);
   * ```
   */
  assertIsObject(value: any): void {
    expect(typeof value).toBe('object');
    expect(value).not.toBeNull();
    expect(Array.isArray(value)).toBe(false);
  }

  /**
   * Assert that a response is a 4xx client error
   *
   * @param response - HTTP response object to validate
   *
   * @example
   * ```typescript
   * assert.assert4xxError(response);
   * ```
   */
  assert4xxError(response: any): void {
    expect(response.status).toBeGreaterThanOrEqual(400);
    expect(response.status).toBeLessThan(500);
  }

  /**
   * Assert that a response is a 5xx server error
   *
   * @param response - HTTP response object to validate
   *
   * @example
   * ```typescript
   * assert.assert5xxError(response);
   * ```
   */
  assert5xxError(response: any): void {
    expect(response.status).toBeGreaterThanOrEqual(500);
    expect(response.status).toBeLessThan(600);
  }

  /**
   * Assert 409 Conflict response
   *
   * @param response - HTTP response object to validate
   *
   * @example
   * ```typescript
   * assert.assertConflict(response);
   * ```
   */
  assertConflict(response: any): void {
    expect(response.status).toBe(409);
    expect(response.body).toBeDefined();
  }
}
