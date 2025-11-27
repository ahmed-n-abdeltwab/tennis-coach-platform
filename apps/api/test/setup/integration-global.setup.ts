/**
 * Global setup for integration tests
 * This file runs once before all integration tests start
 */

export default async function integrationGlobalSetup(): Promise<void> {
  // Set integration test environment variables (use ??= to preserve CI variables)
  process.env.NODE_ENV ??= 'test';

  // Handle DATABASE_URL - replace dev with integration if it exists, otherwise use default
  if (!process.env.DATABASE_URL || process.env.DATABASE_URL.includes('tennis_coach_dev')) {
    process.env.DATABASE_URL =
      process.env.DATABASE_URL?.replace('tennis_coach_dev', 'tennis_coach_test_integration') ??
      'postgresql://postgres:password@localhost:5432/tennis_coach_test_integration?connection_limit=5&pool_timeout=2';
  }

  // Set test-specific configuration (use ??= to preserve CI variables)
  process.env.JWT_SECRET ??= 'integration-test-jwt-secret-key-min-32-chars';
  process.env.JWT_EXPIRES_IN ??= '1h';
  process.env.BCRYPT_SALT_ROUNDS ??= '4';
  process.env.JWT_REFRESH_SECRET ??= 'integration-test-jwt-refresh-secret-key-min-32-chars';
  process.env.JWT_REFRESH_EXPIRES_IN ??= '7d';

  // PayPal configuration
  process.env.PAYPAL_CLIENT_ID ??= 'test-paypal-client-id';
  process.env.PAYPAL_CLIENT_SECRET ??= 'test-paypal-client-secret';
  process.env.PAYPAL_ENVIRONMENT ??= 'sandbox';

  // Google OAuth configuration
  process.env.GOOGLE_CLIENT_ID ??= 'test-google-client-id';
  process.env.GOOGLE_CLIENT_SECRET ??= 'test-google-client-secret';
  process.env.GOOGLE_REDIRECT_URI ??= 'http://localhost:3333/auth/google/callback';

  // Email configuration
  process.env.SMTP_SENDER_EMAIL ??= 'test@example.com';
  process.env.SMTP_TOKEN ??= 'integration-test-token';

  // App configuration
  process.env.PORT ??= '3333';
  process.env.FRONTEND_URL ??= 'http://localhost:4200';
  process.env.npm_package_version ??= '1.0.0';

  // Optional services
  process.env.LOG_LEVEL ??= 'error';

  console.log('🔧 Integration tests global setup completed');
}
