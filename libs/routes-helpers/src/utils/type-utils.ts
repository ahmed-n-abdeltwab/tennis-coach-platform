/**
 * TypeScript utility types for working with the Endpoints interface
 * These types provide compile-time type safety for API route operations
 */

/**
 * Extract all valid API paths from Endpoints interface
 *
 * @example
 * type AllPaths = ExtractPaths<Endpoints>
 * // Result: "/api/auth/login" | "/api/booking-types" | ...
 */
export type ExtractPaths<E extends Record<string, unknown>> = keyof E & string;

/**
 * Extract all HTTP methods for a given path
 *
 * @example
 * type LoginMethods = ExtractMethods<Endpoints, "/api/auth/login">
 * // Result: "POST"
 */
export type ExtractMethods<
  E extends Record<string, unknown>,
  P extends ExtractPaths<E>,
> = keyof E[P] & string;

/**
 * Extract request type for a specific path and method
 *
 * @example
 * type LoginRequest = ExtractRequestType<Endpoints, "/api/auth/login", "POST">
 * // Result: { email: string; password: string }
 */
export type ExtractRequestType<
  E extends Record<string, unknown>,
  P extends ExtractPaths<E>,
  M extends string,
> =
  E[P] extends Record<string, unknown>
    ? M extends keyof E[P]
      ? E[P][M] extends (arg: infer R) => unknown
        ? R
        : never
      : never
    : never;

/**
 * Extract response type for a specific path and method
 *
 * @example
 * type LoginResponse = ExtractResponseType<Endpoints, "/api/auth/login", "POST">
 * // Result: { accessToken: string; refreshToken: string; user: {...} }
 */
export type ExtractResponseType<
  E extends Record<string, any>,
  P extends ExtractPaths<E>,
  M extends string,
> =
  E[P] extends Record<string, unknown>
    ? M extends keyof E[P]
      ? E[P][M] extends (arg: any) => infer R
        ? R
        : never
      : never
    : never;

/**
 * Extract all paths that support a specific HTTP method
 *
 * @example
 * type PostPaths = PathsWithMethod<Endpoints, "POST">
 * // Result: "/api/auth/login" | "/api/booking-types" | ...
 */
export type PathsWithMethod<E extends Record<string, unknown>, M extends string> = Extract<
  {
    [P in ExtractPaths<E>]: M extends keyof E[P] ? P : never;
  }[ExtractPaths<E>],
  string
>;

/**
 * Check if a path requires parameters (contains path parameters like {id})
 *
 * @example
 * type NeedsParams = RequiresParams<"/api/users/{id}">
 * // Result: true
 */
export type RequiresParams<P extends string> = P extends `${string}{${string}}${string}`
  ? true
  : false;

/**
 * Extract parameter names from a path string
 *
 * @example
 * type Params = ExtractPathParams<"/api/users/{id}/posts/{postId}">
 * // Result: "id" | "postId"
 */
export type ExtractPathParams<P extends string> =
  P extends `${infer _Start}{${infer Param}}${infer Rest}`
    ? Param | ExtractPathParams<Rest>
    : never;

/**
 * Convert a path template to a pattern that matches template literals
 *
 * This recursively converts {param} to ${string} to match TypeScript template literals
 *
 * @example
 * type Pattern = PathPattern<"/api/users/{id}/posts/{postId}">
 * // Result: `/api/users/${string}/posts/${string}`
 */
export type PathPattern<P extends string> =
  P extends `${infer Before}{${infer _Param}}${infer After}`
    ? `${Before}${string}${PathPattern<After>}`
    : P;

/**
 * Convert a path template to accept both template and actual values
 *
 * This allows paths like "/api/users/{id}" to also accept "/api/users/123"
 *
 * @example
 * type UserPath = PathWithValues<"/api/users/{id}">
 * // Result: "/api/users/{id}" | `/api/users/${string}`
 */
export type PathWithValues<P extends string> =
  P extends `${infer Before}{${infer _Param}}${infer After}` ? P | PathPattern<P> : P;

/**
 * Extract paths that can accept either template or actual values
 *
 * @example
 * type FlexiblePaths = FlexiblePath<Endpoints>
 * // Accepts both "/api/users/{id}" and "/api/users/123"
 */
export type FlexiblePath<E extends Record<string, unknown>> = {
  [P in ExtractPaths<E>]: PathWithValues<P>;
}[ExtractPaths<E>];

/**
 * Match a runtime path string to its template path
 *
 * This type takes a string like `/api/users/${string}` and matches it to `/api/users/{id}`
 *
 * @example
 * type Matched = MatchPathTemplate<Endpoints, `/api/users/${string}`>
 * // Result: "/api/users/{id}"
 */
export type MatchPathTemplate<E extends Record<string, unknown>, RuntimePath extends string> = {
  [P in ExtractPaths<E>]: RuntimePath extends PathWithValues<P> ? P : never;
}[ExtractPaths<E>];

/**
 * Accept either a template path or a runtime path with values
 *
 * This is the main type to use in function signatures to accept both forms
 */
export type AcceptPath<E extends Record<string, unknown>> = ExtractPaths<E> | FlexiblePath<E>;

/**
 * Build a path with parameters replaced
 * Runtime helper function for replacing path parameters with actual values
 *
 * @example
 * const path = buildPath("/api/users/{id}", { id: "123" })
 * // Result: "/api/users/123"
 *
 * @param path - The path template with parameters in {braces}
 * @param params - Object containing parameter values
 * @returns The path with parameters replaced
 */
export function buildPath<P extends string>(
  path: P,
  params?: Record<string, string | number>
): string {
  if (!params) return path;

  let result = path as string;
  Object.entries(params).forEach(([key, value]) => {
    result = result.replace(`{${key}}`, String(value));
  });
  return result;
}
