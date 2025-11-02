import { INestApplication } from '@nestjs/common';

/**
 * HTTP Methods enum for type safety
 */
export enum HttpMethod {
  GET = 'GET',
  POST = 'POST',
  PUT = 'PUT',
  DELETE = 'DELETE',
  PATCH = 'PATCH',
  OPTIONS = 'OPTIONS',
  HEAD = 'HEAD',
}

/**
 * Extracted route information from NestJS application
 */
export interface ExtractedRoute {
  method: HttpMethod;
  path: string;
}

/**
 * Extracts all routes from a NestJS application
 * Call this after app initialization to get all registered routes
 */
export function extractRoutes(app: INestApplication): ExtractedRoute[] {
  const server = app.getHttpServer();
  const router = server._events.request?.router;

  if (!router?.stack) {
    throw new Error('Unable to access router stack. Ensure the app is initialized.');
  }

  return router.stack
    .filter((layer: any) => layer.route)
    .flatMap((layer: any) => {
      const routePath = layer.route.path;
      const methods = Object.keys(layer.route.methods).map(
        method => method.toUpperCase() as HttpMethod
      );
      return methods.map(method => ({ method, path: routePath }));
    });
}

/**
 * Type-safe API endpoint definition
 */
export interface ApiEndpoint<TParams = void, TQuery = void, TBody = void, TResponse = unknown> {
  method: HttpMethod;
  path: string;
  params?: TParams;
  query?: TQuery;
  body?: TBody;
  response?: TResponse;
}

/**
 * API Routes Registry
 * Define your endpoints with full type information
 *
 * Example:
 * const routes = {
 *   'GET /users/:id': {
 *     method: HttpMethod.GET,
 *     path: '/users/:id',
 *     params: { id: string },
 *     response: UserDto
 *   }
 * }
 */
export type ApiRoutesRegistry = Record<string, ApiEndpoint<any, any, any, any>>;

/**
 * Extract params type from a route path
 * e.g., '/users/:id/posts/:postId' => { id: string; postId: string }
 */
export type ExtractRouteParams<T extends string> =
  T extends `${infer _Start}:${infer Param}/${infer Rest}`
    ? { [K in Param]: string } & ExtractRouteParams<Rest>
    : T extends `${infer _Start}:${infer Param}`
      ? { [K in Param]: string }
      : Record<never, never>;

/**
 * Defines a route handler function signature.
 *
 * The function signature defines:
 * - Param types (path parameters like :id)
 * - Query types (query string parameters)
 * - Body types (request body)
 * - Return type (response payload)
 *
 * @example
 * ```typescript
 * // Simple GET endpoint with no parameters
 * (params: void, query: void, body: void) => UserDto[]
 *
 * // GET with path parameter
 * (params: { id: string }, query: void, body: void) => UserDto
 *
 * // POST with body
 * (params: void, query: void, body: CreateUserDto) => UserDto
 *
 * // Complex endpoint with all three
 * (params: { id: string }, query: { filter: string }, body: UpdateDto) => ResultDto
 * ```
 */
export type RouteHandler<TParams = void, TQuery = void, TBody = void, TResponse = unknown> = (
  params: TParams,
  query: TQuery,
  body: TBody
) => TResponse;

/**
 * Type utility to extract parameter type from a route handler function.
 */
export type ExtractParams<T> = T extends RouteHandler<infer P, any, any, any> ? P : never;

/**
 * Type utility to extract query type from a route handler function.
 */
export type ExtractQuery<T> = T extends RouteHandler<any, infer Q, any, any> ? Q : never;

/**
 * Type utility to extract body type from a route handler function.
 */
export type ExtractBody<T> = T extends RouteHandler<any, any, infer B, any> ? B : never;

/**
 * Type utility to extract response type from a route handler function.
 */
export type ExtractResponse<T> = T extends RouteHandler<any, any, any, infer R> ? R : never;

/**
 * API Routes registry type.
 *
 * Keys are route identifiers (e.g., 'GET /users', 'POST /users/:id').
 * Values are route handler function signatures.
 */
export type ApiRoutes = Record<string, RouteHandler<any, any, any, any>>;
