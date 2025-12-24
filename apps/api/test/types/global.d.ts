/**
 * Global type declarations for test utilities
 *
 * @deprecated These global test type declarations are UNUSED in the codebase.
 * The test infrastructure has evolved to use composition-based patterns via
 * `@test-utils` (IntegrationTest, MockMixin, factories) instead of global variables.
 *
 * Analysis performed: 2024-12-24
 * - No usage of `testApp`, `testPrisma`, or `testRequest` found in any test files
 * - No jest setup file initializes these globals
 * - Modern tests use IntegrationTest class from @test-utils
 *
 * Recommended: Use the composition-based @test-utils pattern for new tests:
 * ```typescript
 * import { IntegrationTest } from '@test-utils';
 *
 * describe('MyFeature', () => {
 *   const test = new IntegrationTest({ modules: [MyModule] });
 *   beforeAll(() => test.setup());
 *   afterAll(() => test.cleanup());
 * });
 * ```
 *
 * This file is retained for backward compatibility but should not be used
 * for new test implementations. Consider removal in a future cleanup.
 */

import { INestApplication } from '@nestjs/common';
import request from 'supertest';

import { PrismaService } from '../../src/app/prisma/prisma.service';

declare global {
  var testApp: INestApplication;
  var testPrisma: PrismaService;
  var testRequest: () => request.SuperTest<request.Test>;

  namespace NodeJS {
    interface Global {
      testApp: INestApplication;
      testPrisma: PrismaService;
      testRequest: () => request.SuperTest<request.Test>;
    }
  }
}
