/**
 * E2E test setup
 * This file runs before each e2e test file
 *
 * Note: For E2E testing, use the `E2ETest` class from `@test-utils` instead of
 * the legacy `NestE2ETestContext`. The E2ETest class provides a modern API with
 * type-safe HTTP methods, authentication helpers, and database utilities.
 *
 * @example
 * ```typescript
 * import { E2ETest } from '@test-utils';
 *
 * describe('My E2E Test', () => {
 *   let test: E2ETest;
 *
 *   beforeAll(async () => {
 *     test = new E2ETest();
 *     await test.setup();
 *   });
 *
 *   afterAll(() => test.cleanup());
 * });
 * ```
 */

import { suppressConsoleOutput } from './shared';

// Suppress console output in e2e tests
suppressConsoleOutput();
