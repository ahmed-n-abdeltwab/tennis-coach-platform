import { JwtRefreshGuard } from './jwt-refresh.guard';

/**
 * JwtRefreshGuard tests.
 *
 * This guard extends Passport's AuthGuard('jwt-refresh'), which delegates
 * authentication to the JwtRefreshStrategy. The actual token validation
 * logic is had by Passport and the strategy, not the guard itself.
 *
 * These tests verify the guard is properly configured.
 */
describe('JwtRefreshGuard', () => {
  describe('constructor', () => {
    it('should be defined', () => {
      const guard = new JwtRefreshGuard();
      expect(guard).toBeDefined();
    });

    it('should be an instance of AuthGuard', () => {
      const guard = new JwtRefreshGuard();
      // AuthGuard returns a mixin class, so we check for canActivate method
      expect(typeof guard.canActivate).toBe('function');
    });

    it('should have getRequest method from AuthGuard', () => {
      const guard = new JwtRefreshGuard();
      expect(typeof guard.getRequest).toBe('function');
    });
  });
});
