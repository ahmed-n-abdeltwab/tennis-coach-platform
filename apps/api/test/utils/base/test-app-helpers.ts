/**
 * Test Application Setup Helpers
 *
 * Utilities for creating and configuring NestJS test applications.
 * These helpers simplify the setup of test modules and applications.
 */

import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';

/**
 * Creates a test module with common providers
 *
 * @param providers - Array of providers to include in the module
 * @returns Compiled testing module
 *
 * @example
 * ```typescript
 * const module = await createTestModule([
 *   MyService,
 *   { provide: 'CONFIG', useValue: testConfig }
 * ]);
 * ```
 */
export async function createTestModule(providers: any[] = []): Promise<TestingModule> {
  return Test.createTestingModule({
    providers,
  }).compile();
}

/**
 * Creates a test application instance with standard configuration
 *
 * Configures the application with:
 * - Global prefix 'api'
 * - Initialized and ready to use
 *
 * @param module - Testing module to create app from
 * @returns Initialized NestJS application
 *
 * @example
 * ```typescript
 * const module = await Test.createTestingModule({
 *   imports: [AppModule]
 * }).compile();
 *
 * const app = await createTestApp(module);
 * // app is ready to use with supertest
 * ```
 */
export async function createTestApp(module: TestingModule): Promise<INestApplication> {
  const app = module.createNestApplication();
  app.setGlobalPrefix('api');
  await app.init();
  return app;
}

/**
 * Creates a test application with custom configuration
 *
 * @param module - Testing module to create app from
 * @param configure - Optional callback to configure the app before initialization
 * @returns Initialized NestJS application
 *
 * @example
 * ```typescript
 * const app = await createTestAppWithConfig(module, (app) => {
 *   app.useGlobalPipes(new ValidationPipe());
 *   app.useGlobalFilters(new HttpExceptionFilter());
 * });
 * ```
 */
export async function createTestAppWithConfig(
  module: TestingModule,
  configure?: (app: INestApplication) => void | Promise<void>
): Promise<INestApplication> {
  const app = module.createNestApplication();
  app.setGlobalPrefix('api');

  if (configure) {
    await configure(app);
  }

  await app.init();
  return app;
}

/**
 * Waits for a specified amount of time
 *
 * Useful for:
 * - Waiting for async operations to complete
 * - Debouncing in tests
 * - Simulating delays
 *
 * @param ms - Milliseconds to wait
 * @returns Promise that resolves after the specified time
 *
 * @example
 * ```typescript
 * // Wait for 100ms
 * await wait(100);
 *
 * // Wait for async operation
 * await someAsyncOperation();
 * await wait(50); // Give it time to propagate
 * expect(result).toBeDefined();
 * ```
 */
export function wait(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Waits for a condition to become true
 *
 * Polls the condition function until it returns true or timeout is reached.
 *
 * @param condition - Function that returns true when condition is met
 * @param options - Configuration options
 * @returns Promise that resolves when condition is met
 * @throws Error if timeout is reached
 *
 * @example
 * ```typescript
 * // Wait for database record to be created
 * await waitFor(
 *   async () => {
 *     const user = await prisma.user.findUnique({ where: { id: userId } });
 *     return user !== null;
 *   },
 *   { timeout: 5000, interval: 100 }
 * );
 * ```
 */
export async function waitFor(
  condition: () => boolean | Promise<boolean>,
  options: {
    timeout?: number;
    interval?: number;
    timeoutMessage?: string;
  } = {}
): Promise<void> {
  const {
    timeout = 5000,
    interval = 100,
    timeoutMessage = 'Condition not met within timeout',
  } = options;

  const startTime = Date.now();

  while (Date.now() - startTime < timeout) {
    if (await condition()) {
      return;
    }
    await wait(interval);
  }

  throw new Error(timeoutMessage);
}
