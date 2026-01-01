/**
 * Integration test setup
 * This file runs before each integration test file
 *
 * Note: For integration testing, use the `IntegrationTest` class from `@test-utils`
 * instead of the legacy `NestIntegrationTestContext`. The IntegrationTest class
 * provides a modern API with type-safe HTTP methods, authentication helpers,
 * and database utilities through mixins.
 *
 * @example
 * ```typescript
 * import { IntegrationTest } from '@test-utils';
 *
 * describe('My Integration Test', () => {
 *   let test: IntegrationTest;
 *
 *   beforeAll(async () => {
 *     test = new IntegrationTest({es: [MyModule] });
 *     await test.setup();
 *   });
 *
 *   afterAll(() => test.cleanup());
 * });
 * ```
 */

import { suppressConsoleOutput } from './shared';

// Suppress console output in integration tests
suppressConsoleOutput();
