/* eslint-disable @typescript-eslint/no-unused-vars */
/**
 * TypeScript utility types for working with the Endpoints interface
 * These types provide compile-time type safety for API route operations
 */

import { HttpMethod } from '../interfaces/IRoutes';

/**
 * Extract all valid API paths from Endpoints interface
 *
 * @example Basic Usage
 * ```typescript
 * import { ExtractPaths } from '@api-sdk';
 *
 * type AllPaths = ExtractPaths;
 * // Result: "/api/authentication/login" | "/api/sessions" | "/api/accounts/{id}" | ...
 * ```
 *
 * @example In Function Signature
 * ```typescript
 * function makeRequest<P extends ExtractPaths>(path: P) {
 *   // TypeScript ensures path is valid
 * }
 *
 * makeRequest('/api/sessions'); // ✅ Valid
 * makeRequest('/api/invalid');  // ❌ Compile error
 * ```
 *
 * @example With Custom Endpoints
 * ```typescript
 * type CustomPaths = ExtractPaths<CustomEndpoints>;
 * ```
 */
export type ExtractPaths<E extends Record<string, any> = Endpoints> = Extract<keyof E, string>;

/**
 * Extract all HTTP methods for a given path
 *
 * @example Basic Usage
 * ```typescript
 * import { ExtractMethods } from '@api-sdk';
 *
 * type LoginMethods = ExtractMethods<"/api/authentication/login">;
 * // Result: "POST"
 *
 * type SessionMethods = ExtractMethods<"/api/sessions">;
 * // Result: "GET" | "POST"
 * ```
 *
 * @example In Function Signature
 * ```typescript
 * function makeRequest<
 *   P extends ExtractPaths,
 *   M extends ExtractMethods<P>
 * >(path: P, method: M) {
 *   // TypeScript ensures method is valid for the path
 * }
 *
 * makeRequest('/api/sessions', 'GET');  // ✅ Valid
 * makeRequest('/api/sessions', 'PUT');  // ❌ Compile error - PUT not supported
 * ```
 *
 * @example With Custom Endpoints
 * ```typescript
 * type CustomMethods = ExtractMethods<"/api/custom", CustomEndpoints>;
 * ```
 */
export type ExtractMethods<
  P extends ExtractPaths<E>,
  E extends Record<string, any> = Endpoints,
> = keyof E[P] & HttpMethod;

/**
 * Extract request type for a specific path and method
 * Returns an object with params and body properties
 *
 * @example GET Request (Query Parameters)
 * ```typescript
 * import { ExtractRequestType } from '@api-sdk';
 *
 * type SessionRequest = ExtractRequestType<"/api/sessions", "GET">;
 * // Result: {
 * //    params: {
 * //        status?: string | undefined;
 * //        startDate?: string | undefined;
 * //        endDate?: string | undefined;
 * //    };
 * //    body: undefined;
 * //}
 * ```
 *
 * @example POST Request (Body only)
 * ```typescript
 * type LoginRequest = ExtractRequestType<"/api/authentication/login", "POST">;
 * // Result: {
 * //    params: undefined;
 * //    body: {
 * //        email: string;
 * //        password: string;
 * //    };
 * //}
 * ```
 *
 * @example PATCH with Path Parameters and Body
 * ```typescript
 * type UpdateBookingRequest = ExtractRequestType<"/api/booking-types/{id}", "PATCH">;
 * // Result: {
 * //    params: {
 * //        id: string;
 * //    };
 * //    body: {
 * //        name?: string | undefined;
 * //        description?: string | undefined;
 * //        basePrice?: number | undefined;
 * //        isActive?: boolean | undefined;
 * //    };
 * //}
 * ```
 *
 * @example In Function Signature
 * ```typescript
 * async function makeRequest<
 *   P extends ExtractPaths,
 *   M extends ExtractMethods<P>
 * >(
 *   path: P,
 *   method: M,
 *   request: ExtractRequestType<P, M>
 * ) {
 *   // TypeScript validates request structure matches endpoint requirements
 *   const {params, body} = request;
 * }
 * ```
 *
 * @example With Custom Endpoints
 * ```typescript
 * type CustomRequest = ExtractRequestType<"/api/custom", "POST", CustomEndpoints>;
 * ```
 */

export type ExtractRequestType<
  P extends keyof E,
  M extends HttpMethod,
  E extends Record<string, any> = Endpoints,
> =
  E[P] extends Record<string, any>
    ? M extends keyof E[P]
      ? E[P][M] extends (params: infer Params, body: infer Body) => any
        ? {
            readonly params: Params;
            readonly body: Body;
          }
        : never
      : never
    : never;

/**
 * Extract params type from request
 * Use this to get the params property from ExtractRequestType
 *
 * @example GET Request
 * ```typescript
 * import { ExtractRequestParams } from '@api-sdk';
 *
 * type SessionParams = ExtractRequestParams<"/api/sessions", "GET">;
 * // Result: { status?: string; startDate?: string; endDate?: string }
 * ```
 *
 * @example PATCH with Path Parameters
 * ```typescript
 * type UpdateParams = ExtractRequestParams<"/api/booking-types/{id}", "PATCH">;
 * // Result: { id: string }
 * ```
 *
 * @example With Custom Endpoints
 * ```typescript
 * type CustomParams = ExtractRequestParams<"/api/custom", "GET", CustomEndpoints>;
 * ```
 */
export type ExtractRequestParams<
  P extends keyof E,
  M extends HttpMethod,
  E extends Record<string, any> = Endpoints,
> = ExtractRequestType<P, M, E>['params'];

/**
 * Extract body type from request
 * Use this to get the body property from ExtractRequestType
 *
 * @example POST Request
 * ```typescript
 * import { ExtractRequestBody } from '@api-sdk';
 *
 * type LoginBody = ExtractRequestBody<"/api/authentication/login", "POST">;
 * // Result: { email: string; password: string }
 * ```
 *
 * @example GET Request (no body)
 * ```typescript
 * type SessionBody = ExtractRequestBody<"/api/sessions", "GET">;
 * // Result: undefined | never
 * ```
 *
 * @example With Custom Endpoints
 * ```typescript
 * type CustomBody = ExtractRequestBody<"/api/custom", "POST", CustomEndpoints>;
 * ```
 */
export type ExtractRequestBody<
  P extends keyof E,
  M extends HttpMethod,
  E extends Record<string, any> = Endpoints,
> = ExtractRequestType<P, M, E>['body'];

/**
 * Extract response type for a specific path and method
 *
 * @example Basic Usage
 * ```typescript
 * import { ExtractResponseType } from '@api-sdk';
 *
 * type LoginResponse = ExtractResponseType<"/api/authentication/login", "POST">;
 * // Result: { accessToken: string; refreshToken: string; account: {...} }
 *
 * type SessionsResponse = ExtractResponseType<"/api/sessions", "GET">;
 * // Result: Session[]
 * ```
 *
 * @example In Function Signature
 * ```typescript
 * async function makeRequest<
 *   P extends ExtractPaths,
 *   M extends ExtractMethods<P>
 * >(
 *   path: P,
 *   method: M
 * ): Promise<ExtractResponseType<P, M>> {
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
 * type SessionResponse = ExtractResponseType<'/api/sessions/{id}', 'GET'>;
 *
 * function processSession(session: SessionResponse) {
 *   console.log(session.coachId); // ✅ Type-safe access
 * }
 * ```
 *
 * @example With Custom Endpoints
 * ```typescript
 * type CustomResponse = ExtractResponseType<"/api/custom", "GET", CustomEndpoints>;
 * ```
 */
export type ExtractResponseType<
  P extends ExtractPaths<E>,
  M extends HttpMethod,
  E extends Record<string, any> = Endpoints,
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
 * import { PathsWithMethod } from '@api-sdk';
 *
 * type GetPaths = PathsWithMethod<"GET">;
 * // Result: "/api/sessions" | "/api/accounts" | "/api/sessions/{id}" | ...
 *
 * type PostPaths = PathsWithMethod<"POST">;
 * // Result: "/api/authentication/login" | "/api/sessions" | ...
 * ```
 *
 * @example In Function Signature
 * ```typescript
 * function createResource<P extends PathsWithMethod<'POST'>>(
 *   path: P,
 *   data: ExtractRequestType<P, 'POST'>
 * ): Promise<ExtractResponseType<P, 'POST'>> {
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
 * type DeletablePaths = PathsWithMethod<'DELETE'>;
 *
 * // Create a function that only works with deletable resources
 * function deleteResource<P extends DeletablePaths>(path: P) {
 *   // Implementation
 * }
 * ```
 *
 * @example With Custom Endpoints
 * ```typescript
 * type CustomGetPaths = PathsWithMethod<"GET", CustomEndpoints>;
 * ```
 */
export type PathsWithMethod<
  M extends HttpMethod,
  E extends Record<string, any> = Endpoints,
> = Extract<
  {
    [P in ExtractPaths<E>]: M extends keyof E[P] ? P : never;
  }[ExtractPaths<E>],
  string
>;

/**
 * Extract all paths for a specific route/module, optionally filtered by HTTP method
 *
 * @example Basic Usage (All Methods)
 * ```typescript
 * import { PathsForRoute } from '@api-sdk';
 *
 * type AccountPaths = PathsForRoute<"accounts">;
 * // Result: "/api/accounts" | "/api/accounts/me" | "/api/accounts/{id}"
 *
 * type SessionPaths = PathsForRoute<"sessions">;
 * // Result: "/api/sessions" | "/api/sessions/{id}"
 * ```
 *
 * @example With Method Filter
 * ```typescript
 * type AccountGetPaths = PathsForRoute<"accounts", "GET">;
 * // Result: Only GET paths for accounts
 *
 * type AccountPostPaths = PathsForRoute<"accounts", "POST">;
 * // Result: Only POST paths for accounts
 *
 * type AccountPatchPaths = PathsForRoute<"accounts", "PATCH">;
 * // Result: Only PATCH paths for accounts
 * ```
 *
 * @example In Test Helper
 * ```typescript
 * class AccountsControllerTest extends BaseControllerTest<AccountsController, AccountsService> {
 *   async testGet(path: PathsForRoute<'accounts', 'GET'>) {
 *     return this.get(path);
 *   }
 *
 *   async testPatch(path: PathsForRoute<'accounts', 'PATCH'>, body?: any) {
 *     return this.patch(path, { body });
 *   }
 * }
 * ```
 *
 * @example With Custom Endpoints
 * ```typescript
 * type CustomAccountPaths = PathsForRoute<"accounts", "GET", CustomEndpoints>;
 * // Use a different endpoints interface
 * ```
 */
export type PathsForRoute<
  Route extends string,
  Method extends HttpMethod | undefined = undefined,
  E extends Record<string, any> = Endpoints,
> = Method extends HttpMethod
  ? Extract<
      {
        [P in ExtractPaths<E>]: P extends `/api/${Route}${string}`
          ? Method extends keyof E[P]
            ? P
            : never
          : never;
      }[ExtractPaths<E>],
      string
    >
  : Extract<
      {
        [P in ExtractPaths<E>]: P extends `/api/${Route}${string}` ? P : never;
      }[ExtractPaths<E>],
      string
    >;

/**
 * Check if a path requires parameters (contains path parameters like {id})
 *
 * @example Basic Usage
 * ```typescript
 * import { RequiresParams } from '@api-sdk';
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
 * import { ExtractPathParams } from '@api-sdk';
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
type Segment = Exclude<string, `${string}/${string}`> & { __noSlash?: true };

export type PathPattern<P extends string> =
  P extends `${infer Before}{${infer _Param}}${infer After}`
    ? `${Before}${Segment}${PathPattern<After>}`
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
// Create a literal lock helper
type AsLiteral<T extends string> = T & { __locked?: true };

// Path builder
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
/**
 * Extract paths that can accept either template or actual values
 *
 * @example
 * type FlexiblePaths = FlexiblePath<Endpoints>
 * // Accepts both "/api/users/{id}" and "/api/users/123"
 */

export type FlexiblePath<E extends Record<string, unknown>> = {
  [P in ExtractPaths<E>]: UnwrappedPath<P>;
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
  [P in ExtractPaths<E>]: P extends `${infer _Before}{${infer _Param}}${infer _After}`
    ? RuntimePath extends PathPattern<P>
      ? P
      : never
    : RuntimePath extends P
      ? P
      : never;
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
 * @example No Parameters (undefined | never)
 * ```typescript
 * const path = buildPath("/api/sessions", undefined);
 * // Result: "/api/sessions"
 * ```
 *
 * @example In Type-Safe HTTP Client
 * ```typescript
 * import { buildPath } from '@api-sdk';
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
 * @param params - Object containing parameter values, or undefined/never if no params needed
 * @returns The path with parameters replaced
 */
export function buildPath(
  path: string,
  params?: Record<string, string | number> | undefined | never
): string {
  // Handle undefined, never, null, or non-object params
  if (!params || typeof params !== 'object' || Object.keys(params).length === 0) {
    return path;
  }

  let result = path;
  Object.entries(params).forEach(([key, value]) => {
    result = result.replace(`{${key}}`, String(value));
  });
  return result;
}
