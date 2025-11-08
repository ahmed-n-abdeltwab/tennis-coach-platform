/**
 * TypeScript utility types for working with the Endpoints interface
 * These types provide compile-time type safety for API route operations
 */

import { Endpoints } from '../constants/api-routes.registry';
import { HttpMethod } from '../interfaces/IRoutes';

/**
 * Extract all valid API paths from Endpoints interface
 *
 * @example
 * type AllPaths = ExtractPaths<Endpoints>
 * // Result: "/api/auth/login" | "/api/booking-types" | ...
 */
export type ExtractPaths<E extends Record<string, any>> = Extract<keyof E, string>;
/**
 * Extract all HTTP methods for a given path
 *
 * @example
 * type LoginMethods = ExtractMethods<Endpoints, "/api/authentication/login">
 * // Result: "POST"
 */
export type ExtractMethods<E extends Record<string, any>, P extends ExtractPaths<E>> = keyof E[P] &
  HttpMethod;
/**
 * Extract request type for a specific path and method
 *
 * @example
 * type LoginRequest = ExtractRequestType<Endpoints, "/api/authentication/login", "POST">
 * // Result: { email: string; password: string }
 */
export type ExtractRequestType<
  E extends Record<string, any>,
  P extends keyof E,
  M extends HttpMethod,
> =
  E[P] extends Record<string, any>
    ? M extends keyof E[P]
      ? E[P][M] extends (...args: infer A) => any
        ? A[0]
        : never
      : never
    : never;

/**
 * Extract response type for a specific path and method
 *
 * @example
 * type LoginResponse = ExtractResponseType<Endpoints, "/api/authentication/login", "POST">
 * // Result: { accessToken: string; refreshToken: string; user: {...} }
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
 * @example
 * type PostPaths = PathsWithMethod<Endpoints, "POST">
 * // Result: "/api/auth/login" | "/api/booking-types" | ...
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
