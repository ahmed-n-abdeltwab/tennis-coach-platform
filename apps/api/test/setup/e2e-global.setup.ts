/**
 * Global setup for e2e tests
 * This file runs once before all e2e tests start
 */

export default async function e2eGlobalSetup(): Promise<void> {
  // Set e2e test environment variables
  process.env.NODE_ENV = 'test';
  process.env.DATABASE_URL =
    process.env.DATABASE_URL?.replace('tennis_coach_dev', 'tennis_coach_test_e2e') ??
    'postgresql://postgres:password@localhost:5432/tennis_coach_test_e2e?connection_limit=5&pool_timeout=2';

  // Set test-specific JWT configuration
  process.env.JWT_SECRET = 'e2e-test-jwt-secret-key-minimum-32-chars';
  process.env.JWT_EXPIRES_IN = '1h';
  process.env.BCRYPT_SALT_ROUNDS = '4';
  process.env.JWT_REFRESH_SECRET = 'e2e-test-jwt-refresh-secret-key-minimum-32-chars';
  process.env.JWT_REFRESH_EXPIRES_IN = '7d';

  // PayPal configuration
  process.env.PAYPAL_CLIENT_ID = 'test-paypal-client-id';
  process.env.PAYPAL_CLIENT_SECRET = 'test-paypal-client-secret';
  process.env.PAYPAL_ENVIRONMENT = 'sandbox';

  // Google OAuth configuration
  process.env.GOOGLE_CLIENT_ID = 'test-google-client-id';
  process.env.GOOGLE_CLIENT_SECRET = 'test-google-client-secret';
  process.env.GOOGLE_REDIRECT_URI = 'http://localhost:3333/auth/google/callback';

  // Email configuration
  process.env.SMTP_SENDER_EMAIL = 'test@example.com';
  process.env.SMTP_TOKEN = 'e2e-test-token';

  // App configuration
  process.env.PORT = '0'; // Let system assign random port
  process.env.FRONTEND_URL = 'http://localhost:3000';
  process.env.npm_package_version = '1.0.0';

  // Optional services
  process.env.LOG_LEVEL = 'error';

  console.log('🎭 E2E tests global setup completed');
  console.log(`📊 Using database: ${process.env.DATABASE_URL}`);
}
