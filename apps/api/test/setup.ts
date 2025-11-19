// Set NODE_ENV to test for all tests
process.env.NODE_ENV = 'test';

// Ensure DATABASE_URL is set for test database manager
// If not set, use a default test database URL
process.env.DATABASE_URL ??=
  'postgresql://postgres:password@localhost:5432/tennis_coach_test?connection_limit=5&pool_timeout=2';
