/**
 * Global setup for integration tests
 * This file runs once before all integration tests start
 */

export default async function integrationGlobalSetup(): Promise<void> {
  // Set integration test environment variables
  process.env.NODE_ENV = 'test';
  process.env.DATABASE_URL =
    process.env.DATABASE_URL?.replace('tennis_coach_dev', 'tennis_coach_test_integration') ??
    'postgresql://postgres:password@localhost:5432/tennis_coach_test_integration?connection_limit=5&pool_timeout=2';

  // Set test-specific JWT configuration
  process.env.JWT_SECRET = 'e2e-test-jwt-secret-key';
  process.env.JWT_EXPIRES_IN = '1h';
  process.env.BCRYPT_SALT_ROUNDS = '4';
  process.env.JWT_REFRESH_SECRET = 'e2e-test-jwt-secret-key-for-refresh-tokens-only';
  process.env.JWT_REFRESH_EXPIRES_IN = '7d';

  // Disable external services
  process.env.SMTP_TOKEN = 'integration-test-token';
  process.env.PAYPAL_ENVIRONMENT = 'sandbox';

  console.log('🔧 Integration tests global setup completed');
  console.log(`📊 Using database: ${process.env.DATABASE_URL}`);
}
