/**
 * Global setup for all Jest test types
 * This file runs once before all tests start
 */

export default async function globalSetup(): Promise<void> {
  // Set test environment variables
  process.env.NODE_ENV = 'test';
  process.env.DATABASE_URL =
    process.env.DATABASE_URL?.replace('tennis_coach_dev', 'tennis_coach_test') ??
    'postgresql://postgres:password@localhost:5432/tennis_coach_test?connection_limit=5&pool_timeout=2';

  // Set test-specific JWT configuration
  process.env.JWT_SECRET = 'e2e-test-jwt-secret-key';
  process.env.JWT_EXPIRES_IN = '1h';
  process.env.BCRYPT_SALT_ROUNDS = '4';
  process.env.JWT_REFRESH_SECRET = 'e2e-test-jwt-secret-key-for-refresh-tokens-only';
  process.env.JWT_REFRESH_EXPIRES_IN = '7d';

  // Disable external services in test environment
  process.env.SMTP_TOKEN = 'test-token';
  process.env.PAYPAL_CLIENT_ID = 'test-paypal-client-id';
  process.env.PAYPAL_CLIENT_SECRET = 'test-paypal-client-secret';
  process.env.PAYPAL_ENVIRONMENT = 'sandbox';

  // Set test-specific configurations
  process.env.PORT = '0'; // Let the system assign a random port
  process.env.FRONTEND_URL = 'http://localhost:3000';

  console.log('🚀 Global Jest setup completed');
}
