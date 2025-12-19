/**
 * Assertions Mixin
 * Provides reusable test assertion helpers
 * Eliminates duplication of common test assertions
 */

/**
 * Assertions Mixin
 * Common assertion helpers for HTTP responses and test validation
 */
export class AssertionsMixin {
  /**
   * Assert response has expected structure
   */
  assertResponseStructure(response: any, expectedKeys: string[]): void {
    expect(response.body).toBeDefined();
    expectedKeys.forEach(key => expect(response.body).toHaveProperty(key));
  }

  /**
   * Assert successful response
   */
  assertSuccessResponse(response: any, expectedStatus = 200): void {
    expect(response.status).toBe(expectedStatus);
    expect(response.body).toBeDefined();
  }

  /**
   * Assert error response
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
   */
  assertNotFound(response: any): void {
    expect(response.status).toBe(404);
    expect(response.body).toBeDefined();
  }

  /**
   * Assert 401 Unauthorized response
   */
  assertUnauthorized(response: any): void {
    expect(response.status).toBe(401);
    expect(response.body).toBeDefined();
  }

  /**
   * Assert 403 Forbidden response
   */
  assertForbidden(response: any): void {
    expect(response.status).toBe(403);
    expect(response.body).toBeDefined();
  }

  /**
   * Assert 400 Bad Request response
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
   */
  assertCreated(response: any): void {
    expect(response.status).toBe(201);
    expect(response.body).toBeDefined();
  }

  /**
   * Assert 204 No Content response
   */
  assertNoContent(response: any): void {
    expect(response.status).toBe(204);
  }

  /**
   * Assert array response
   */
  assertArrayResponse<T>(result: T[], minLength = 0): void {
    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBeGreaterThanOrEqual(minLength);
  }

  /**
   * Assert that a mock was not called
   */
  assertNotCalled(mockMethod: jest.Mock | jest.MockInstance<any, any[]>): void {
    expect(mockMethod).not.toHaveBeenCalled();
  }

  /**
   * Assert that a mock was called with specific arguments
   */
  assertCalledWith(mockMethod: jest.Mock | jest.MockInstance<any, any[]>, ...args: any[]): void {
    expect(mockMethod).toHaveBeenCalledWith(...args);
  }

  /**
   * Assert that a mock was called n times
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
   */
  assertArrayContains<T>(array: T[], item: T): void {
    expect(Array.isArray(array)).toBe(true);
    expect(array).toContain(item);
  }

  /**
   * Assert that an array has an exact length
   */
  assertArrayLength<T>(array: T[], length: number): void {
    expect(Array.isArray(array)).toBe(true);
    expect(array.length).toBe(length);
  }

  /**
   * Assert that a value is a valid ISO 8601 date string
   */
  assertDateString(value: any): void {
    expect(typeof value).toBe('string');
    const date = new Date(value);
    expect(date.toISOString()).toBe(value);
  }

  /**
   * Assert that a value is a valid UUID (v4)
   */
  assertUUID(value: any): void {
    expect(typeof value).toBe('string');
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    expect(value).toMatch(uuidRegex);
  }

  /**
   * Assert that a value is a string
   */
  assertIsString(value: any): void {
    expect(typeof value).toBe('string');
  }

  /**
   * Assert that a value is a number
   */
  assertIsNumber(value: any): void {
    expect(typeof value).toBe('number');
    expect(Number.isNaN(value)).toBe(false);
  }

  /**
   * Assert that a value is a boolean
   */
  assertIsBoolean(value: any): void {
    expect(typeof value).toBe('boolean');
  }

  /**
   * Assert that a value is an object (not null, not array)
   */
  assertIsObject(value: any): void {
    expect(typeof value).toBe('object');
    expect(value).not.toBeNull();
    expect(Array.isArray(value)).toBe(false);
  }

  /**
   * Assert that a response is a 4xx client error
   */
  assert4xxError(response: any): void {
    expect(response.status).toBeGreaterThanOrEqual(400);
    expect(response.status).toBeLessThan(500);
  }

  /**
   * Assert that a response is a 5xx server error
   */
  assert5xxError(response: any): void {
    expect(response.status).toBeGreaterThanOrEqual(500);
    expect(response.status).toBeLessThan(600);
  }

  /**
   * Assert 409 Conflict response
   */
  assertConflict(response: any): void {
    expect(response.status).toBe(409);
    expect(response.body).toBeDefined();
  }
}
