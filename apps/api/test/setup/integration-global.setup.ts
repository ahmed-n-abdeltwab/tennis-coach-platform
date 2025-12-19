/**
 * Global setup for integration tests
 * This file runs once before all integration tests start
 */

import { setupTestEnvironment } from './shared';

export default async function integrationGlobalSetup(): Promise<void> {
  // Set up common test environment variables
  setupTestEnvironment({
    databaseSuffix: 'test_integration',
    port: '3333',
    useStrictAssignment: false, // Use ??= to preserve CI variables
  });

  console.log('🔧 Integration tests global setup completed');
}
