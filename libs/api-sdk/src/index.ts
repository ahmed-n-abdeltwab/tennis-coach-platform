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
  AddApiPrefix,
  DefaultApiPrefix,
  ExtractMethods,
  ExtractPathParams,
  ExtractPaths,
  ExtractRequestBody,
  ExtractRequestParams,
  ExtractRequestType,
  ExtractResponseType,
  FlexibleApiPath,
  FlexiblePath,
  MatchPathTemplate,
  NormalizePath,
  PathPattern,
  PathWithValues,
  PathsForRoute,
  PathsWithMethod,
  RequiresParams,
  ShortPaths,
  ShortPathsWithMethod,
  StripApiPrefix,
  UnwrappedPath,
  ValidatePath,
} from './utils/type-utils';

// Export runtime helper function
export { buildPath } from './utils/type-utils';

export type { HttpMethod } from './interfaces/IRoutes';

/**
 * Production API Client using axios
 *
 * Type-safe HTTP client for making API requests from web applications.
 * Provides compile-time validation of paths, methods, request data, and response types.
 *
 * @example
 * import { ApiClient } from '@api-sdk';
 *
 * const api = new ApiClient({ baseURL: 'https://api.example.com' });
 *
 * // Type-safe GET request
 * const response = await api.get('/api/sessions');
 * if (response.ok) {
 *   console.log(response.data); // Typed as Session[]
 * }
 *
 * // Type-safe POST with body
 * const loginResponse = await api.post('/api/authentication/login', {
 *   body: { email: 'user@example.com', password: 'password123' }
 * });
 */
export {
  ApiClient,
  type ApiClientConfig,
  type ApiErrorResponse,
  type RequestOptions as ApiRequestOptions,
  type ApiRequestPayload,
  type ApiResponse,
  type ApiSuccessResponse,
} from './client';

/**
 * Test utilities are available from '@api-sdk/testing'
 *
 * For test utilities like TypeSafeHttpClient, import from the testing sub-path:
 * ```typescript
 * import { TypeSafeHttpClient, TypedResponse } from '@api-sdk/testing';
 * ```
 *
 * This keeps the main '@api-sdk' entry point free of test-specific dependencies
 * (supertest, @nestjs/testing) for cleaner production bundles.
 */
