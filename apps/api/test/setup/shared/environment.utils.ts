/**
 * Shared environment variable setup utilities
 * Used across all test types to eliminate duplication
 */

export interface TestEnvironmentConfig {
  /**
   * Database name suffix (e.g., 'test', 'test_integration', 'test_e2e')
   */
  databaseSuffix: string;
  /**
   * Port configuration ('0' for random, or specific port number)
   */
  port?: string;
  /**
   * Whether to use strict assignment (=) or fallback assignment (??=)
   * Strict is used for base setup, fallback for global setup to preserve CI variables
   */
  useStrictAssignment?: boolean;
}

/**
 * Sets up common test environment variables
 * This eliminates duplication across setup.ts, global.setup.ts, integration-global.setup.ts, and e2e-global.setup.ts
 */
export function setupTestEnvironment(config: TestEnvironmentConfig): void {
  const { databaseSuffix, port = '3333', useStrictAssignment = false } = config;

  // Helper to assign based on mode
  const assign = (key: string, value: string) => {
    if (useStrictAssignment) {
      process.env[key] = value;
    } else {
      process.env[key] ??= value;
    }
  };

  // Set NODE_ENV
  assign('NODE_ENV', 'test');

  // Database configuration
  const defaultDbUrl = `postgresql://postgres:password@localhost:5432/tennis_coach_${databaseSuffix}?connection_limit=5&pool_timeout=2`;

  if (useStrictAssignment) {
    // For setup.ts - use ??= to allow override
    process.env.DATABASE_URL ??= defaultDbUrl;
  } else {
    // For global setup files - replace dev with test database if needed
    if (!process.env.DATABASE_URL || process.env.DATABASE_URL.includes('tennis_coach_dev')) {
      process.env.DATABASE_URL =
        process.env.DATABASE_URL?.replace('tennis_coach_dev', `tennis_coach_${databaseSuffix}`) ??
        defaultDbUrl;
    }
  }

  // JWT configuration
  const jwtSecretSuffix = databaseSuffix.replace(/_/g, '-');
  assign('JWT_SECRET', `${jwtSecretSuffix}-jwt-secret-key-minimum-32-chars`);
  assign('JWT_EXPIRES_IN', '1h');
  assign('BCRYPT_SALT_ROUNDS', '4');
  assign('JWT_REFRESH_SECRET', `${jwtSecretSuffix}-jwt-refresh-secret-key-minimum-32-chars`);
  assign('JWT_REFRESH_EXPIRES_IN', '7d');

  // PayPal configuration
  assign('PAYPAL_CLIENT_ID', 'test-paypal-client-id');
  assign('PAYPAL_CLIENT_SECRET', 'test-paypal-client-secret');
  assign('PAYPAL_ENVIRONMENT', 'sandbox');

  // Google OAuth configuration
  assign('GOOGLE_CLIENT_ID', 'test-google-client-id');
  assign('GOOGLE_CLIENT_SECRET', 'test-google-client-secret');
  assign('GOOGLE_REDIRECT_URI', 'http://localhost:3333/auth/google/callback');

  // Email configuration
  assign('SMTP_SENDER_EMAIL', 'test@example.com');
  assign('SMTP_TOKEN', `${jwtSecretSuffix}-token`);

  // Redis configuration
  const redisDb =
    databaseSuffix === 'test_integration' ? '1' : databaseSuffix === 'test_e2e' ? '2' : '0';
  assign('REDIS_HOST', process.env.REDIS_HOST ?? '127.0.0.1');
  assign('REDIS_PORT', process.env.REDIS_PORT ?? '6379');
  assign('REDIS_DB', redisDb);
  // REDIS_PASSWORD is optional - only set if provided in environment

  // App configuration
  assign('PORT', port);
  assign('FRONTEND_URL', port === '0' ? 'http://localhost:3000' : 'http://localhost:4200');
  assign('npm_package_version', '1.0.0');

  // Logging configuration
  assign('LOG_LEVEL', 'error');
}

/**
 * Test type detection result
 */
export type TestType = 'unit' | 'integration' | 'e2e';

/**
 * Detect test type from various sources
 * Used by global setup and teardown to determine appropriate configuration
 */
export function detectTestType(): TestType {
  // Check explicit environment variable first
  const envTestType = process.env.JEST_TEST_TYPE;
  if (envTestType === 'integration' || envTestType === 'e2e') {
    return envTestType;
  }

  // Check NX_TASK_TARGET_TARGET which Nx sets when running tasks
  const nxTarget = process.env.NX_TASK_TARGET_TARGET ?? '';
  if (nxTarget.includes('e2e')) {
    return 'e2e';
  }
  if (nxTarget.includes('integration')) {
    return 'integration';
  }

  // Check command line arguments for config file hints
  const args = process.argv.join(' ');

  // Check for e2e patterns
  if (
    args.includes('e2e.config') ||
    args.includes('test:e2e') ||
    args.includes(':e2e') ||
    args.includes('e2e.spec')
  ) {
    return 'e2e';
  }

  // Check for integration patterns
  if (
    args.includes('integration.config') ||
    args.includes('test:integration') ||
    args.includes(':integration') ||
    args.includes('integration.spec')
  ) {
    return 'integration';
  }

  // Check Jest config displayName if available
  const jestConfig = (global as Record<string, unknown>).jestConfig as
    | { displayName?: string }
    | undefined;
  const displayName = jestConfig?.displayName ?? '';

  if (displayName.toLowerCase().includes('e2e')) {
    return 'e2e';
  }
  if (displayName.toLowerCase().includes('integration')) {
    return 'integration';
  }

  return 'unit';
}
