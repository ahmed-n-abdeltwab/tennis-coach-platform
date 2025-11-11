/**
 * TypeScript utility types for working with the Endpoints interface
 * These types provide compile-time type safety for API route operations
 */

import { Endpoints } from '../constants/api-routes.registry';
import { HttpMethod } from '../interfaces/IRoutes';

/**
 * Extract all valid API paths from Endpoints interface
 *
 * @example Basic Usage
 * ```typescript
 * import { ExtractPaths, Endpoints } from '@routes-helpers';
 *
 * type AllPaths = ExtractPaths<Endpoints>;
 * // Result: "/api/authentication/login" | "/api/sessions" | "/api/accounts/{id}" | ...
 * ```
 *
 * @example In Function Signature
 * ```typescript
 * function makeRequest<P extends ExtractPaths<Endpoints>>(path: P) {
 *   // TypeScript ensures path is valid
 * }
 *
 * makeRequest('/api/sessions'); // ✅ Valid
 * makeRequest('/api/invalid');  // ❌ Compile error
 * ```
 */
export type ExtractPaths<E extends Record<string, any>> = Extract<keyof E, string>;

/**
 * Extract all HTTP methods for a given path
 *
 * @example Basic Usage
 * ```typescript
 * import { ExtractMethods, Endpoints } from '@routes-helpers';
 *
 * type LoginMethods = ExtractMethods<Endpoints, "/api/authentication/login">;
 * // Result: "POST"
 *
 * type SessionMethods = ExtractMethods<Endpoints, "/api/sessions">;
 * // Result: "GET" | "POST"
 * ```
 *
 * @example In Function Signature
 * ```typescript
 * function makeRequest<
 *   P extends ExtractPaths<Endpoints>,
 *   M extends ExtractMethods<Endpoints, P>
 * >(path: P, method: M) {
 *   // TypeScript ensures method is valid for the path
 * }
 *
 * makeRequest('/api/sessions', 'GET');  // ✅ Valid
 * makeRequest('/api/sessions', 'PUT');  // ❌ Compile error - PUT not supported
 * ```
 */
export type ExtractMethods<E extends Record<string, any>, P extends ExtractPaths<E>> = keyof E[P] &
  HttpMethod;

/**
 * Extract request type for a specific path and method
 *
 * @example GET Request (Query Parameters)
 * ```typescript
 * import { ExtractRequestType, Endpoints } from '@routes-helpers';
 *
 * type SessionParams = ExtractRequestType<Endpoints, "/api/sessions", "GET">;
 * // Result: { status?: string; startDate?: string; endDate?: string }
 * ```
 *
 * @example POST Request (Body)
 * ```typescript
 * type LoginRequest = ExtractRequestType<Endpoints, "/api/authentication/login", "POST">;
 * // Result: { email: string; password: string }
 * ```
 *
 * @example Path Parameters
 * ```typescript
 * type AccountParams = ExtractRequestType<Endpoints, "/api/accounts/{id}", "GET">;
 * // Result: { id: string }
 * ```
 *
 * @example In Function Signature
 * ```typescript
 * async function makeRequest<
 *   P extends ExtractPaths<Endpoints>,
 *   M extends ExtractMethods<Endpoints, P>
 * >(
 *   path: P,
 *   method: M,
 *   data: ExtractRequestType<Endpoints, P, M>
 * ) {
 *   // TypeScript validates data structure matches endpoint requirements
 * }
 * ```
 */
export type ExtractRequestType<
  E extends Record<string, any>,
  P extends keyof E,
  M extends HttpMethod,
> =
  E[P] extends Record<string, any>
    ? M extends keyof E[P]
      ? E[P][M] extends (...args: infer A) => any
        ? A extends [infer First]
          ? First extends Record<string, any>
            ? First
            : never
          : never
        : never
      : never
    : never;
type AccountParams = ExtractRequestType<Endpoints, "/api/sessions", "POST">;
/**
 * Extract response type for a specific path and method
 *
 * @example Basic Usage
 * ```typescript
 * import { ExtractResponseType, Endpoints } from '@routes-helpers';
 *
 * type LoginResponse = ExtractResponseType<Endpoints, "/api/authentication/login", "POST">;
 * // Result: { accessToken: string; refreshToken: string; account: {...} }
 *
 * type SessionsResponse = ExtractResponseType<Endpoints, "/api/sessions", "GET">;
 * // Result: Session[]
 * ```
 *
 * @example In Function Signature
 * ```typescript
 * async function makeRequest<
 *   P extends ExtractPaths<Endpoints>,
 *   M extends ExtractMethods<Endpoints, P>
 * >(
 *   path: P,
 *   method: M
 * ): Promise<ExtractResponseType<Endpoints, P, M>> {
 *   // Return type is automatically inferred from endpoint
 *   const response = await fetch(path, { method });
 *   return response.json();
 * }
 *
 * // TypeScript knows the return type
 * const sessions = await makeRequest('/api/sessions', 'GET');
 * // sessions is typed as Session[]
 * ```
 *
 * @example With Type Assertion
 * ```typescript
 * type SessionResponse = ExtractResponseType<Endpoints, '/api/sessions/{id}', 'GET'>;
 *
 * function processSession(session: SessionResponse) {
 *   console.log(session.coachId); // ✅ Type-safe access
 * }
 * ```
 */
export type ExtractResponseType<
  E extends Record<string, any>,
  P extends ExtractPaths<E>,
  M extends HttpMethod,
> =
  E[P] extends Record<string, any>
    ? M extends keyof E[P]
      ? E[P][M] extends (...args: any) => infer R
        ? R
        : never
      : never
    : never;

/**
 * Extract all paths that support a specific HTTP method
 *
 * @example Basic Usage
 * ```typescript
 * import { PathsWithMethod, Endpoints } from '@routes-helpers';
 *
 * type GetPaths = PathsWithMethod<Endpoints, "GET">;
 * // Result: "/api/sessions" | "/api/accounts" | "/api/sessions/{id}" | ...
 *
 * type PostPaths = PathsWithMethod<Endpoints, "POST">;
 * // Result: "/api/authentication/login" | "/api/sessions" | ...
 * ```
 *
 * @example In Function Signature
 * ```typescript
 * function createResource<P extends PathsWithMethod<Endpoints, 'POST'>>(
 *   path: P,
 *   data: ExtractRequestType<Endpoints, P, 'POST'>
 * ): Promise<ExtractResponseType<Endpoints, P, 'POST'>> {
 *   // Function only accepts paths that support POST
 * }
 *
 * createResource('/api/sessions', { ... }); // ✅ Valid
 * createResource('/api/health', { ... });   // ❌ Compile error - GET only
 * ```
 *
 * @example Filtering Paths
 * ```typescript
 * // Get all paths that support DELETE
 * type DeletablePaths = PathsWithMethod<Endpoints, 'DELETE'>;
 *
 * // Create a function that only works with deletable resources
 * function deleteResource<P extends DeletablePaths>(path: P) {
 *   // Implementation
 * }
 * ```
 */
export type PathsWithMethod<E extends Record<string, any>, M extends HttpMethod> = Extract<
  {
    [P in ExtractPaths<E>]: M extends keyof E[P] ? P : never;
  }[ExtractPaths<E>],
  string
>;

/**
 * Check if a path requires parameters (contains path parameters like {id})
 *
 * @example Basic Usage
 * ```typescript
 * import { RequiresParams } from '@routes-helpers';
 *
 * type NeedsParams = RequiresParams<"/api/users/{id}">;
 * // Result: true
 *
 * type NoParams = RequiresParams<"/api/users">;
 * // Result: false
 * ```
 *
 * @example Conditional Logic
 * ```typescript
 * function makeRequest<P extends string>(
 *   path: P,
 *   params?: RequiresParams<P> extends true ? Record<string, string> : never
 * ) {
 *   // If path requires params, params argument is required
 *   // If path doesn't require params, params argument is not allowed
 * }
 *
 * makeRequest('/api/users/{id}', { id: '123' }); // ✅ Valid
 * makeRequest('/api/users/{id}');                // ❌ Compile error - params required
 * makeRequest('/api/users', { id: '123' });      // ❌ Compile error - params not allowed
 * makeRequest('/api/users');                     // ✅ Valid
 * ```
 */
export type RequiresParams<P extends string> = P extends `${string}{${string}}${string}`
  ? true
  : false;

/**
 * Extract parameter names from a path string
 *
 * @example Single Parameter
 * ```typescript
 * import { ExtractPathParams } from '@routes-helpers';
 *
 * type Params = ExtractPathParams<"/api/users/{id}">;
 * // Result: "id"
 * ```
 *
 * @example Multiple Parameters
 * ```typescript
 * type Params = ExtractPathParams<"/api/accounts/{id}/sessions/{sessionId}">;
 * // Result: "id" | "sessionId"
 * ```
 *
 * @example In Function Signature
 * ```typescript
 * function buildPath<P extends string>(
 *   path: P,
 *   params: Record<ExtractPathParams<P>, string>
 * ): string {
 *   // TypeScript ensures all required parameters are provided
 * }
 *
 * buildPath('/api/users/{id}', { id: '123' }); // ✅ Valid
 * buildPath('/api/users/{id}', { name: 'John' }); // ❌ Compile error - missing 'id'
 * ```
 *
 * @example Validating Parameters
 * ```typescript
 * type Path = "/api/accounts/{accountId}/sessions/{sessionId}";
 * type Params = ExtractPathParams<Path>;
 * // Result: "accountId" | "sessionId"
 *
 * const params: Record<Params, string> = {
 *   accountId: 'acc-123',
 *   sessionId: 'sess-456'
 * }; // ✅ Valid
 *
 * const invalidParams: Record<Params, string> = {
 *   accountId: 'acc-123'
 *   // ❌ Compile error - missing sessionId
 * };
 * ```
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
type ExtractParams<P extends string> = P extends `${infer _Before}{${infer Param}}${infer After}`
  ? Param | ExtractParams<After>
  : never;

type PathBuilder<P extends string> = <
  Params extends Record<string, string> &
    Record<ExtractParams<P>, string> & {
      // ✅ all required params
      [K in keyof Params]: K extends ExtractParams<P> ? string : never;
    }, // ❌ forbid extras
>(
  params: Params
) => PathPattern<P>;

type Segment = Exclude<string, `${string}/${string}`> & { __noSlash?: true };

export type PathPattern<P extends string> =
  P extends `${infer Before}{${infer _Param}}${infer After}`
    ? `${Before}${Segment}${PathPattern<After>}`
    : P;

type Pattern = PathPattern<'/api/users/{id}/posts/{postId}'>;
/**
 * Convert a path template to accept both template and actual values
 *
 * This allows paths like "/api/users/{id}" to also accept "/api/users/123"
 *
 * @example
 * type UserPath = PathWithValues<"/api/users/{id}">
 * // Result: "/api/users/{id}" | `/api/users/${string}`
 */
// 1. Create a literal lock helper
type AsLiteral<T extends string> = T & { __locked?: true };
type Literal<T extends string> = T extends `${infer P}` ? P : never;
// 2. Path builder
export type PathWithValues<P extends string> =
  P extends `${infer Before}{${infer _Param}}${infer After}`
    ? {
        readonly template: AsLiteral<P>;
        readonly runtime: AsLiteral<PathPattern<P>>;
      }
    : {
        readonly static: AsLiteral<P>;
      };

// 3. Extract both literals safely
export type UnwrappedPath<P extends string> = PathWithValues<P>[keyof PathWithValues<P>];
type t = UnwrappedPath<'/api/users/{id}/posts/{postId}'>;
/**
 * Extract paths that can accept either template or actual values
 *
 * @example
 * type FlexiblePaths = FlexiblePath<Endpoints>
 * // Accepts both "/api/users/{id}" and "/api/users/123"
 */

export type FlexiblePath<E extends Record<string, any>> = {
  [P in ExtractPaths<E>]: UnwrappedPath<P>;
}[ExtractPaths<E>];
type FlexiblePaths = FlexiblePath<Endpoints>;
/**
 * Match a runtime path string to its template path
 *
 * This type takes a string like `/api/users/${string}` and matches it to `/api/users/{id}`
 *
 * @example
 * type Matched = MatchPathTemplate<Endpoints, `/api/users/${string}`>
 * // Result: "/api/users/{id}"
 */
export type MatchPathTemplate<E extends Record<string, any>, RuntimePath extends string> = {
  [P in ExtractPaths<E>]: P extends `${infer _Before}{${infer _Param}}${infer _After}`
    ? RuntimePath extends PathPattern<P>
      ? P
      : never
    : RuntimePath extends P
      ? P
      : never;
}[ExtractPaths<E>];

type Matched = MatchPathTemplate<Endpoints, `/api/users/${string}`>;
type MatchPost = MatchPathTemplate<Endpoints, `/api/accounts/${string}`>;
/**
 * Accept either a template path or a runtime path with values
 *
 * This is the main type to use in function signatures to accept both forms
 */
export type AcceptPath<E extends Record<string, any>> = ExtractPaths<E> | FlexiblePath<E>;

/**
 * Build a path with parameters replaced
 * Runtime helper function for replacing path parameters with actual values
 *
 * @example Simple Path Parameter
 * ```typescript
 * const path = buildPath("/api/users/{id}", { id: "123" });
 * // Result: "/api/users/123"
 * ```
 *
 * @example Multiple Path Parameters
 * ```typescript
 * const path = buildPath("/api/accounts/{id}/sessions/{sessionId}", {
 *   id: "user-123",
 *   sessionId: "session-456"
 * });
 * // Result: "/api/accounts/user-123/sessions/session-456"
 * ```
 *
 * @example With Numeric Parameters
 * ```typescript
 * const path = buildPath("/api/posts/{id}", { id: 42 });
 * // Result: "/api/posts/42"
 * ```
 *
 * @example No Parameters
 * ```typescript
 * const path = buildPath("/api/sessions");
 * // Result: "/api/sessions"
 * ```
 *
 * @example In Type-Safe HTTP Client
 * ```typescript
 * import { buildPath } from '@routes-helpers';
 * import { TypeSafeHttpClient } from '@test-utils';
 *
 * const client = new TypeSafeHttpClient(app);
 * const userId = 'user-123';
 *
 * const path = buildPath('/api/accounts/{id}', { id: userId });
 * const response = await client.get(path as '/api/accounts/{id}');
 * ```
 *
 * @param path - The path template with parameters in {braces}
 * @param params - Object containing parameter values
 * @returns The path with parameters replaced
 */
export function buildPath(path: string, params?: Record<string, string | number>): string {
  if (!params || typeof params !== 'object') return path;

  let result = path;
  Object.entries(params).forEach(([key, value]) => {
    result = result.replace(`{${key}}`, String(value));
  });
  return result;
}
