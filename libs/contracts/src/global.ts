/**
 * Global Type Declarations for API Contracts
 *
 * This file makes the Endpoints interface available globally without explicit imports.
 * It augments the global namespace so you can use Endpoints anywhere in the codebase.
 *
 * Usage:
 * ```typescript
 * // No import needed after importing @contracts
 * type AllPaths = keyof Endpoints;
 * type LoginResponse = Endpoints['/api/authentication/login']['POST'];
 * ```
 *
 * To enable global Endpoints in your project:
 * 1. Add "@contracts" to your tsconfig paths (already done in tsconfig.base.json)
 * 2. Import '@contracts' once in your entry point or a global types file
 *
 * Note: For explicit imports (recommended for clarity), use:
 * ```typescript
 * import type { Endpoints } from '@contracts';
 * ```
 *
 * @module global
 */

import type { Endpoints as EndpointsType } from './endpoints.generated';

declare global {
  /**
   * Global Endpoints interface containing all API route definitions.
   * Auto-generated from Swagger/OpenAPI documentation.
   *
   * This type maps API paths to their HTTP methods, request types, and response types.
   *
   * @example Access endpoint types directly
   * ```typescript
   * type LoginPath = keyof Endpoints;
   * type SessionResponse = Endpoints['/api/sessions']['GET'];
   * ```
   *
   * @example Use with utility types from @api-sdk
   * ```typescript
   * import { ExtractResponseType } from '@api-sdk';
   * type Response = ExtractResponseType<Endpoints, '/api/sessions', 'GET'>;
   * ```
   */
  type Endpoints = EndpointsType;
}

// This export is required to make this file a module
// which is necessary for the `declare global` to work
export {};
