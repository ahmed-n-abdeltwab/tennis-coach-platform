/**
 * Verification test for consolidated setup/teardown
 * This test verifies that the global setup and teardown work correctly
 */

describe('Global Setup Verification', () => {
  it('should have NODE_ENV set to test', () => {
    expect(process.env.NODE_ENV).toBe('test');
  });

  it('should have DATABASE_URL configured', () => {
    expect(process.env.DATABASE_URL).toBeDefined();
    expect(process.env.DATABASE_URL).toContain('tennis_coach_');
  });

  it('should have JWT_SECRET configured', () => {
    expect(process.env.JWT_SECRET).toBeDefined();
    expect(process.env.JWT_SECRET).toContain('jwt-secret-key');
  });

  it('should have PORT configured', () => {
    expect(process.env.PORT).toBeDefined();
  });

  it('should have PAYPAL configuration', () => {
    expect(process.env.PAYPAL_CLIENT_ID).toBe('test-paypal-client-id');
    expect(process.env.PAYPAL_CLIENT_SECRET).toBe('test-paypal-client-secret');
    expect(process.env.PAYPAL_ENVIRONMENT).toBe('sandbox');
  });

  it('should have Google OAuth configuration', () => {
    expect(process.env.GOOGLE_CLIENT_ID).toBe('test-google-client-id');
    expect(process.env.GOOGLE_CLIENT_SECRET).toBe('test-google-client-secret');
  });
});
