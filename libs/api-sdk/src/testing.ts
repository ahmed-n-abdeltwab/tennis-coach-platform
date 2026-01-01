/**
 * API SDK Testing Utilities
 *
 * This module provides test utilities for API testing.
 * It includes the TypeSafeHttpClient which depends on supertest and NestJS testing.
 *
 * Import from '@api-sdk/testing' for test utilities:
 * ```typescript
 * import { TypeSafeHttpClient, TypedResponse } from '@api-sdk/testing';
 * ```
 *
 * For production code, use '@api-sdk' instead:
 * ```typescript
 * import { buildPath, ExtractPaths } from '@api-sdk';
 * ```
 *
 * @module testing
 */

// HTTP Client for testing (uses supertest, INestApplication)
export {
  TypeSafeHttpClient,
  type DeepPartial,
  type ErrorResponse,
  type FailureResponse,
  type RequestOptions,
  type RequestType,
  type SuccessResponse,
  type SuccessStatus,
  type TypedResponse,
  type ValidationErrorResponse,
} from './http';
