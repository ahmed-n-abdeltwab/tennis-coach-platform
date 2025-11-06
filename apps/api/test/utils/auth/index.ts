/**
 * Authentication test utilities
 *
 * This module provides utilities for creating and managing JWT tokens
 * and authenticated HTTP clients in tests.
 */

// Export AuthTestHelper and related types
export { AuthTestHelper } from './auth-test-helper';
export type { AuthHeaders, JwtPayload, TestUser } from './auth-test-helper';

// Export AuthenticatedHttpClient
export { AuthenticatedHttpClient } from './authenticated-client';
