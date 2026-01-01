/* eslint-disable @typescript-eslint/no-unused-vars */
/**
 * TypeScript utility types for type-safe API route operations
 */

import { HttpMethod } from '../interfaces/IRoutes';

/**
 * Extract all valid API paths from Endpoints interface
 * @example type AllPaths = ExtractPaths; // "/api/sessions" | "/api/accounts/{id}" | ...
 */
export type ExtractPaths<E extends Record<string, any> = Endpoints> = Extract<keyof E, string>;

/** Default API prefix used in path normalization */
export type DefaultApiPrefix = '/api/';

/**
 * Strip the API prefix from a full path
 * @example type Short = StripApiPrefix<"/api/users/{id}">; // "users/{id}"
 */
export type StripApiPrefix<
  P extends string,
  Prefix extends string = DefaultApiPrefix,
> = P extends `${Prefix}${infer Rest}` ? Rest : P;

/**
 * Add the API prefix to a short path
 * @example type Full = AddApiPrefix<"users/{id}">; // "/api/users/{id}"
 */
export type AddApiPrefix<
  P extends string,
  Prefix extends string = DefaultApiPrefix,
> = `${Prefix}${P}`;

/**
 * Extract all short paths (without prefix) from Endpoints interface
 * @example type AllShortPaths = ShortPaths; // "sessions" | "accounts/{id}" | ...
 */
export type ShortPaths<
  E extends Record<string, any> = Endpoints,
  Prefix extends string = DefaultApiPrefix,
> = StripApiPrefix<ExtractPaths<E>, Prefix>;

/**
 * Normalize a path to its full form (with prefix)
 * @example type Full = NormalizePath<"users/{id}">; // "/api/users/{id}"
 */
export type NormalizePath<
  P extends string,
  E extends Record<string, any> = Endpoints,
  Prefix extends string = DefaultApiPrefix,
> =
  P extends ExtractPaths<E>
    ? P
    : AddApiPrefix<P, Prefix> extends ExtractPaths<E>
      ? AddApiPrefix<P, Prefix>
      : never;

/** Check if a path is valid (either full or short form). Returns the path if valid, never if invalid */
export type ValidatePath<
  P extends string,
  E extends Record<string, any> = Endpoints,
  Prefix extends string = DefaultApiPrefix,
> = P extends ExtractPaths<E> ? P : P extends ShortPaths<E, Prefix> ? P : never;

/**
 * Accept either a full path ("/api/users") or short path ("users")
 * @example function get<P extends FlexibleApiPath>(path: P) { ... }
 */
export type FlexibleApiPath<
  E extends Record<string, any> = Endpoints,
  Prefix extends string = DefaultApiPrefix,
> = ExtractPaths<E> | ShortPaths<E, Prefix>;

/**
 * Extract HTTP methods for a given path. Accepts full or short paths.
 * @example type Methods = ExtractMethods<"sessions">; // "GET" | "POST"
 */
export type ExtractMethods<
  P extends FlexibleApiPath<E, Prefix>,
  E extends Record<string, any> = Endpoints,
  Prefix extends string = DefaultApiPrefix,
> =
  NormalizePath<P, E, Prefix> extends keyof E
    ? keyof E[NormalizePath<P, E, Prefix>] & HttpMethod
    : never;

/**
 * Extract request type (params and body) for a path and method
 * @example type Req = ExtractRequestType<"sessions", "GET">; // { params: {...}, body: undefined }
 */
export type ExtractRequestType<
  P extends FlexibleApiPath<E, Prefix>,
  M extends HttpMethod,
  E extends Record<string, any> = Endpoints,
  Prefix extends string = DefaultApiPrefix,
> =
  NormalizePath<P, E, Prefix> extends keyof E
    ? E[NormalizePath<P, E, Prefix>] extends Record<string, any>
      ? M extends keyof E[NormalizePath<P, E, Prefix>]
        ? E[NormalizePath<P, E, Prefix>][M] extends (params: infer Params, body: infer Body) => any
          ? {
              readonly params: Params;
              readonly body: Body;
            }
          : never
        : never
      : never
    : never;

/**
 * Extract params type from request
 * @example type Params = ExtractRequestParams<"sessions", "GET">; // { status?: string; ... }
 */
export type ExtractRequestParams<
  P extends FlexibleApiPath<E, Prefix>,
  M extends HttpMethod,
  E extends Record<string, any> = Endpoints,
  Prefix extends string = DefaultApiPrefix,
> = ExtractRequestType<P, M, E, Prefix>['params'];

/**
 * Extract body type from request
 * @example type Body = ExtractRequestBody<"authentication/login", "POST">; // { email: string; password: string }
 */
export type ExtractRequestBody<
  P extends FlexibleApiPath<E, Prefix>,
  M extends HttpMethod,
  E extends Record<string, any> = Endpoints,
  Prefix extends string = DefaultApiPrefix,
> = ExtractRequestType<P, M, E, Prefix>['body'];

/**
 * Extract response type for a path and method
 * @example type Res = ExtractResponseType<"sessions", "GET">; // Session[]
 */
export type ExtractResponseType<
  P extends FlexibleApiPath<E, Prefix>,
  M extends HttpMethod,
  E extends Record<string, any> = Endpoints,
  Prefix extends string = DefaultApiPrefix,
> =
  NormalizePath<P, E, Prefix> extends keyof E
    ? E[NormalizePath<P, E, Prefix>] extends Record<string, any>
      ? M extends keyof E[NormalizePath<P, E, Prefix>]
        ? E[NormalizePath<P, E, Prefix>][M] extends (...args: any) => infer R
          ? R
          : never
        : never
      : never
    : never;

/**
 * Extract all full paths that support a specific HTTP method
 * @example type GetPaths = PathsWithMethod<"GET">; // "/api/sessions" | "/api/accounts" | ...
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
 * Extract all short paths that support a specific HTTP method
 * @example type GetPaths = ShortPathsWithMethod<"GET">; // "sessions" | "accounts" | ...
 */
export type ShortPathsWithMethod<
  M extends HttpMethod,
  E extends Record<string, any> = Endpoints,
  Prefix extends string = DefaultApiPrefix,
> = StripApiPrefix<PathsWithMethod<M, E>, Prefix>;

/**
 * Extract paths for a specific route/module, optionally filtered by method
 * @example type AccountPaths = PathsForRoute<"accounts">; // "/api/accounts" | "/api/accounts/{id}"
 * @example type AccountGetPaths = PathsForRoute<"accounts", "GET">;
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
 * Check if a path requires parameters (contains {param})
 * @example type NeedsParams = RequiresParams<"/api/users/{id}">; // true
 */
export type RequiresParams<P extends string> = P extends `${string}{${string}}${string}`
  ? true
  : false;

/**
 * Extract parameter names from a path string
 * @example type Params = ExtractPathParams<"/api/users/{id}">; // "id"
 * @example type Params = ExtractPathParams<"/api/accounts/{id}/sessions/{sessionId}">; // "id" | "sessionId"
 */
export type ExtractPathParams<P extends string> =
  P extends `${infer _Start}{${infer Param}}${infer Rest}`
    ? Param | ExtractPathParams<Rest>
    : never;

/**
 * Convert path template to pattern matching template literals
 * @example type Pattern = PathPattern<"/api/users/{id}">; // `/api/users/${string}`
 */
type Segment = Exclude<string, `${string}/${string}`> & { __noSlash?: true };

export type PathPattern<P extends string> =
  P extends `${infer Before}{${infer _Param}}${infer After}`
    ? `${Before}${Segment}${PathPattern<After>}`
    : P;

/**
 * Convert path template to accept both template and actual values
 * @example type UserPath = PathWithValues<"/api/users/{id}">; // "/api/users/{id}" | `/api/users/${string}`
 */
type AsLiteral<T extends string> = T & { __locked?: true };

export type PathWithValues<P extends string> =
  P extends `${infer Before}{${infer _Param}}${infer After}`
    ? {
        readonly template: AsLiteral<P>;
        readonly runtime: AsLiteral<PathPattern<P>>;
      }
    : {
        readonly static: AsLiteral<P>;
      };

/** Extract both template and runtime path literals */
export type UnwrappedPath<P extends string> = PathWithValues<P>[keyof PathWithValues<P>];

/**
 * Extract paths that accept either template or actual values
 * @example type FlexiblePaths = FlexiblePath<Endpoints>; // Accepts "/api/users/{id}" and "/api/users/123"
 */
export type FlexiblePath<E extends Record<string, unknown>> = {
  [P in ExtractPaths<E>]: UnwrappedPath<P>;
}[ExtractPaths<E>];

/**
 * Match a runtime path to its template path
 * @example type Matched = MatchPathTemplate<Endpoints, `/api/users/${string}`>; // "/api/users/{id}"
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

/** Accept either a template path or a runtime path with values */
export type AcceptPath<E extends Record<string, unknown>> = ExtractPaths<E> | FlexiblePath<E>;

/**
 * Build a path with parameters replaced
 * @example buildPath("/api/users/{id}", { id: "123" }); // "/api/users/123"
 * @param path - Path template with parameters in {braces}
 * @param params - Parameter values, or undefined if no params needed
 */
export function buildPath(
  path: string,
  params?: Record<string, string | number> | undefined | never
): string {
  if (!params || typeof params !== 'object' || Object.keys(params).length === 0) {
    return path;
  }

  let result = path;
  Object.entries(params).forEach(([key, value]) => {
    result = result.replace(`{${key}}`, String(value));
  });
  return result;
}
