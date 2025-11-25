/**
 * HTTP-specific generators for property-based testing
 *
 * These generators create random HTTP request data, paths, and configurations
 * for testing the type-safe HTTP client.
 */

import * as fc from 'fast-check';

/**
 * HTTP methods
 */
export const HTTP_METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'] as const;
export type HttpMethod = (typeof HTTP_METHODS)[number];

/**
 * Generate a valid HTTP method
 */
export function httpMethodArbitrary(): fc.Arbitrary<HttpMethod> {
  return fc.constantFrom(...HTTP_METHODS);
}

/**
 * Generate a valid HTTP status code
 */
export function httpStatusCodeArbitrary(): fc.Arbitrary<number> {
  return fc.constantFrom(
    200,
    201,
    204, // Success
    400,
    401,
    403,
    404,
    422, // Client errors
    500,
    502,
    503 // Server errors
  );
}

/**
 * Generate a success HTTP status code
 */
export function successStatusCodeArbitrary(): fc.Arbitrary<number> {
  return fc.constantFrom(200, 201, 204);
}

/**
 * Generate an error HTTP status code
 */
export function errorStatusCodeArbitrary(): fc.Arbitrary<number> {
  return fc.constantFrom(400, 401, 403, 404, 422, 500, 502, 503);
}

/**
 * Generate HTTP headers
 */
export function httpHeadersArbitrary(): fc.Arbitrary<Record<string, string>> {
  return fc.dictionary(
    fc.constantFrom('Content-Type', 'Accept', 'User-Agent', 'X-Custom-Header'),
    fc.constantFrom('application/json', 'text/plain', 'application/xml', 'custom-value')
  );
}

/**
 * Generate a path template with parameters
 * Examples: "/users/:id", "/coaches/:coachId/sessions/:sessionId"
 */
export function pathTemplateArbitrary(): fc.Arbitrary<string> {
  return fc.oneof(
    fc.constant('/users/:id'),
    fc.constant('/coaches/:coachId'),
    fc.constant('/sessions/:sessionId'),
    fc.constant('/bookings/:bookingId'),
    fc.constant('/coaches/:coachId/sessions/:sessionId'),
    fc.constant('/users/:userId/bookings/:bookingId')
  );
}

/**
 * Generate path parameters that match a template
 */
export function pathParametersArbitrary(): fc.Arbitrary<Record<string, string>> {
  return fc.dictionary(
    fc.constantFrom('id', 'userId', 'coachId', 'sessionId', 'bookingId'),
    fc.uuid()
  );
}

/**
 * Generate a complete path with parameters substituted
 */
export function substitutedPathArbitrary(): fc.Arbitrary<string> {
  return fc.oneof(
    fc.uuid().map(id => `/users/${id}`),
    fc.uuid().map(id => `/coaches/${id}`),
    fc.uuid().map(id => `/sessions/${id}`),
    fc.uuid().map(id => `/bookings/${id}`),
    fc
      .tuple(fc.uuid(), fc.uuid())
      .map(([coachId, sessionId]) => `/coaches/${coachId}/sessions/${sessionId}`),
    fc
      .tuple(fc.uuid(), fc.uuid())
      .map(([userId, bookingId]) => `/users/${userId}/bookings/${bookingId}`)
  );
}

/**
 * Generate request options
 */
export function requestOptionsArbitrary(): fc.Arbitrary<{
  headers?: Record<string, string>;
  timeout?: number;
  expectedStatus?: number;
}> {
  return fc.record({
    headers: fc.option(httpHeadersArbitrary()),
    timeout: fc.option(fc.integer({ min: 1000, max: 30000 })),
    expectedStatus: fc.option(httpStatusCodeArbitrary()),
  });
}

/**
 * Generate a request body (JSON object)
 */
export function requestBodyArbitrary(): fc.Arbitrary<Record<string, unknown>> {
  return fc.dictionary(
    fc.string({ minLength: 1, maxLength: 20 }),
    fc.oneof(fc.string(), fc.integer(), fc.boolean(), fc.constant(null), fc.array(fc.string()))
  );
}

/**
 * Generate query parameters
 */
export function queryParametersArbitrary(): fc.Arbitrary<Record<string, string>> {
  return fc.dictionary(
    fc.constantFrom('page', 'limit', 'sort', 'filter', 'search'),
    fc.oneof(
      fc.integer({ min: 1, max: 100 }).map(String),
      fc.constantFrom('asc', 'desc', 'name', 'date', 'active')
    )
  );
}
