/**
 * Base test classes and utilities index
 * Exports all base classes and helper functions for testing
 */

// Configuration-based approach with zero boilerplate
export { BaseControllerTest } from './base-controller';
export type { ControllerTestConfig } from './base-controller';
export { BaseE2ETest } from './base-e2e';
export type { E2ETestConfig } from './base-e2e';
export { BaseIntegrationTest } from './base-integration';
export type { IntegrationTestConfig } from './base-integration';
export { BaseServiceTest } from './base-service';
export type { ServiceTestConfig } from './base-service';

/**
 * Test application setup helpers
 */
export * from './test-app-helpers';
