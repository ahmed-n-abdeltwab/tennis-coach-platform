/* eslint-disable no-console */
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

/**
 * Retries an async operation until it succeeds or max attempts is reached
 *
 * @param operation - Async function to retry
 * @param options - Configuration options
 * @returns Promise that resolves with the operation result
 * @throws Error if max attempts is reached
 *
 * @example
 * ```typescript
 * // Retry a flaky API call
 * const result = await retry(
 *   async () => {
 *     const response = await fetch('/api/data');
 *     if (!response.ok) throw new Error('Failed');
 *     return response.json();
 *   },
 *   { maxAttempts: 3, delay: 1000 }
 * );
 * ```
 */
export async function retry<T>(
  operation: () => Promise<T>,
  options: {
    maxAttempts?: number;
    delay?: number;
    backoff?: boolean;
    onRetry?: (attempt: number, error: Error) => void;
  } = {}
): Promise<T> {
  const { maxAttempts = 3, delay = 1000, backoff = false, onRetry } = options;

  let lastError: Error;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error as Error;

      if (attempt < maxAttempts) {
        if (onRetry) {
          onRetry(attempt, lastError);
        }

        const waitTime = backoff ? delay * attempt : delay;
        await wait(waitTime);
      }
    }
  }

  throw new Error(
    `Operation failed after ${maxAttempts} attempts. Last error: ${lastError!.message}`
  );
}

/**
 * Executes multiple async operations in parallel with a concurrency limit
 *
 * @param items - Array of items to process
 * @param operation - Async function to execute for each item
 * @param concurrency - Maximum number of concurrent operations
 * @returns Promise that resolves with array of results
 *
 * @example
 * ```typescript
 * // Process 100 items with max 5 concurrent operations
 * const results = await parallelLimit(
 *   items,
 *   async (item) => processItem(item),
 *   5
 * );
 * ```
 */
export async function parallelLimit<T, R>(
  items: T[],
  operation: (item: T, index: number) => Promise<R>,
  concurrency = 5
): Promise<R[]> {
  const results: R[] = [];
  const executing: Promise<void>[] = [];

  for (let i = 0; i < items.length; i++) {
    const item = items[i]!; // Safe because we're iterating within bounds
    const promise = operation(item, i).then(result => {
      results[i] = result;
    });

    executing.push(promise);

    if (executing.length >= concurrency) {
      await Promise.race(executing);
      const index = executing.findIndex(p => p === promise);
      if (index !== -1) {
        executing.splice(index, 1);
      }
    }
  }

  await Promise.all(executing);
  return results;
}

/**
 * Creates a mock logger for testing
 *
 * @returns Mock logger object with common logging methods
 *
 * @example
 * ```typescript
 * const logger = createMockLogger();
 * const service = new MyService(logger);
 *
 * // Verify logging
 * expect(logger.info).toHaveBeenCalledWith('Expected message');
 * ```
 */
export function createMockLogger(): any {
  return {
    log: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
    verbose: jest.fn(),
    info: jest.fn(),
  };
}

/**
 * Creates a mock configuration object for testing
 *
 * @param overrides - Partial configuration to override defaults
 * @returns Mock configuration object
 *
 * @example
 * ```typescript
 * const config = createMockConfig({
 *   database: { url: 'test-db-url' }
 * });
 * ```
 */
export function createMockConfig(overrides: Record<string, any> = {}): any {
  return {
    port: 3000,
    database: {
      url: 'postgresql://test:test@localhost:5432/test',
    },
    jwt: {
      secret: 'test-secret',
      expiresIn: '1h',
    },
    ...overrides,
  };
}

/**
 * Captures console output during test execution
 *
 * @param callback - Function to execute while capturing output
 * @returns Object containing captured stdout and stderr
 *
 * @example
 * ```typescript
 * const { stdout, stderr } = await captureConsole(async () => {
 *   console.log('test message');
 *   console.error('error message');
 * });
 *
 * expect(stdout).toContain('test message');
 * expect(stderr).toContain('error message');
 * ```
 */
export async function captureConsole(
  callback: () => Promise<void> | void
): Promise<{ stdout: string; stderr: string }> {
  const originalLog = console.log;
  const originalError = console.error;
  const originalWarn = console.warn;

  let stdout = '';
  let stderr = '';

  console.log = (...args: any[]) => {
    stdout += `${args.join(' ')  }\n`;
  };

  console.error = (...args: any[]) => {
    stderr += `${args.join(' ')  }\n`;
  };

  console.warn = (...args: any[]) => {
    stderr += `${args.join(' ')  }\n`;
  };

  try {
    await callback();
  } finally {
    console.log = originalLog;
    console.error = originalError;
    console.warn = originalWarn;
  }

  return { stdout, stderr };
}

/**
 * Suppresses console output during test execution
 *
 * @param callback - Function to execute with suppressed output
 * @returns Result of the callback function
 *
 * @example
 * ```typescript
 * // Run a noisy operation without console spam
 * const result = await suppressConsole(async () => {
 *   return noisyOperation();
 * });
 * ```
 */
export async function suppressConsole<T>(callback: () => Promise<T> | T): Promise<T> {
  const originalLog = console.log;
  const originalError = console.error;
  const originalWarn = console.warn;

  console.log = jest.fn();
  console.error = jest.fn();
  console.warn = jest.fn();

  try {
    return await callback();
  } finally {
    console.log = originalLog;
    console.error = originalError;
    console.warn = originalWarn;
  }
}
