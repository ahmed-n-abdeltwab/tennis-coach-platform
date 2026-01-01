/**
 * API SDK Library
 *
 * This library provides utilities for working with type-safe API routes.
 * It provides TypeScript utility types for compile-time type safety
 * and runtime helpers for building paths.
 */

// Route generation functions (from generator module)
export {
  generateEndpointsFromSwagger,
  generateEndpointsObject,
  type GenerationOptions,
} from './generator';

// Legacy re-exports for backward compatibility
export { generateApiRoutes, generateEndpointsInterface } from './lib/generate-routes-from-swagger';

/**
 * Endpoints interface - Re-exported from @contracts
 * Contains all API routes with their request/response types
 *
 * @example
 * import { Endpoints } from '@api-sdk';
 *
 * type LoginPath = keyof Endpoints; // "/api/auth/login" | ...
 */
export type { Endpoints } from '@contracts';

/**
 * TypeScript utility types for working with Endpoints
 *
 * These types provide compile-time validation and type extraction
 * for API routes, methods, requests, and responses.
 *
 * @example
 * import { ExtractPaths, ExtractRequestType } from '@api-sdk';
 *
 * type AllPaths = ExtractPaths<Endpoints>;
 * type LoginRequest = ExtractRequestType<Endpoints, "/api/auth/login", "POST">;
 */
export type {
  AcceptPath,
  ExtractMethods,
  ExtractPathParams,
  ExtractPaths,
  ExtractRequestBody,
  ExtractRequestParams,
  ExtractRequestType,
  ExtractResponseType,
  FlexiblePath,
  MatchPathTemplate,
  PathPattern,
  PathWithValues,
  PathsForRoute,
  PathsWithMethod,
  RequiresParams,
  UnwrappedPath,
} from './utils/type-utils';

// Export runtime helper function
export { buildPath } from './utils/type-utils';

export type { HttpMethod } from './interfaces/IRoutes';
