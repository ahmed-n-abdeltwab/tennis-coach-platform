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
  E extends Record<string, unknown>,
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
