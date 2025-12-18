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
}
