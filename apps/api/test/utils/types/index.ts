/**
 * Type Utilities for Test Infrastructure
 *
 * Provides comprehensive type utilities for type-safe testing including:
 * - DeepPartial: Make all properties optional recursively
 * - MockRequest/MockResponse: Type-safe mock HTTP objects
 * - Type guards: Runtime type checking utilities (isDefined, isString, etc.)
 * - Utility types: RequireProps, OptionalProps, Merge, etc.
 * - Endpoint type utilities: Extract paths, methods, and request/response types
 *
 * These type utilities are framework-agnostic and remain recommended for all test code.
 *
 * @example DeepPartial
 * ```typescript
 * import { DeepPartial } from '@test-utils/types';
 *
 * const partialUser: DeepPartial<User> = {
 *   name: 'John',
 *   profile: { bio: 'Test bio' } // All nested properties are optional
 * };
 * ```
 *
 * @example Type guards
 * ```typescript
 * import { isDefined, isString } from '@test-utils/types';
 *
 * if (isDefined(value)) {
 *   // TypeScript knows value is not null or undefined
 * }
 *
 * if (isString(value)) {
 *   // TypeScript knows value is a string
 * }
 * ```
 *
 * @example Mock HTTP objects
 * ```typescript
 * import { MockRequest, MockResponse } from '@test-utils/types';
 *
 * const mockReq: MockRequest = {
 *   body: { name: 'Test' },
 *   params: { id: '123' },
 *   user: { sub: 'user-id', role: Role.USER }
 * };
 * ```
 *
 * @module types
 */

export * from './type-utils';
