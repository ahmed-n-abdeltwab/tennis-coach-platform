/**
 * Global setup for e2e tests
 * This file runs once before all e2e tests start
 */

import { setupTestEnvironment } from './shared';

export default async function e2eGlobalSetup(): Promise<void> {
  // Set up common test environment variables
  setupTestEnvironment({
    databaseSuffix: 'test_e2e',
    port: '0', // Let system assign random port
    useStrictAssignment: false, // Use ??= to preserve CI variables
  });

  console.log('🎭 E2E tests global setup completed');
}
