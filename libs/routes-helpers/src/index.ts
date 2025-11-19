/**
 * Routes Helpers Library
 *
 * This library provides utilities for generating and working with type-safe API routes.
 * It extracts endpoint definitions from Swagger/OpenAPI documentation and provides
 * TypeScript utility types for compile-time type safety.
 */

// Route generation functions
export * from './lib/generate-routes-from-swagger';

/**
 * Endpoints interface - Auto-generated from Swagger documentation
 * Contains all API routes with their request/response types
 *
 * @example
 * import { Endpoints } from '@routes-helpers';
 *
 * type LoginPath = keyof Endpoints; // "/api/auth/login" | ...
 */
// // @ts-expect-error - This file is auto-generated at runtime
export type { Endpoints } from './constants/api-routes.registry';

/**
 * TypeScript utility types for working with Endpoints
 *
 * These types provide compile-time validation and type extraction
 * for API routes, methods, requests, and responses.
 *
 * @example
 * import { ExtractPaths, ExtractRequestType } from '@routes-helpers';
 *
 * type AllPaths = ExtractPaths<Endpoints>;
 * type LoginRequest = ExtractRequestType<Endpoints, "/api/auth/login", "POST">;
 */
export type {
  AcceptPath,
  ExtractMethods,
  ExtractPathParams,
  ExtractPaths,
  ExtractRequestType,
  ExtractResponseType,
  FlexiblePath,
  MatchPathTemplate,
  PathPattern,
  PathWithValues,
  PathsWithMethod,
  RequiresParams,
  UnwrappedPath,
} from './utils/type-utils';

// Export runtime helper function
export { buildPath } from './utils/type-utils';
