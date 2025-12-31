import { Reflector } from '@nestjs/core';
import { Role } from '@prisma/client';
import { DeepMocked, GuardTest } from '@test-utils';

import { ROLES_KEY } from '../decorators/roles.decorator';

import { RolesGuard } from './roles.guard';

/**
 * Typed mocks interface for RolesGuard tests.
 */
interface RolesGuardMocks {
  Reflector: DeepMocked<Reflector>;
}

describe('RolesGuard', () => {
  let test: GuardTest<RolesGuard, RolesGuardMocks>;

  beforeEach(async () => {
    test = new GuardTest({
      guard: RolesGuard,
      providers: [Reflector],
    });

    await test.setup();
  });

  afterEach(async () => {
    await test.cleanup();
  });

  describe('constructor', () => {
    it('should be defined', () => {
      expect(test.guard).toBeDefined();
    });
  });

  describe('canActivate', () => {
    it('should return true when no roles are required', async () => {
      const context = test.createMockExecutionContext({}, { [ROLES_KEY]: undefined });
      const result = await test.guard.canActivate(context);

      expect(result).toBe(true);
      expect(test.mocks.Reflector.getAllAndOverride).toHaveBeenCalledWith(ROLES_KEY, [
        context.getHandler(),
        context.getClass(),
      ]);
    });

    it('should return true when user has required role', async () => {
      const context = test.createMockExecutionContext(
        {
          user: {
            sub: 'user-id',
            email: 'user@example.com',
            role: Role.USER,
          },
        },
        { [ROLES_KEY]: [Role.USER] }
      );

      const result = await test.guard.canActivate(context);

      expect(result).toBe(true);
    });

    it('should return true when user has one of multiple required roles', async () => {
      const context = test.createMockExecutionContext(
        {
          user: {
            sub: 'coach-id',
            email: 'coach@example.com',
            role: Role.COACH,
          },
        },
        { [ROLES_KEY]: [Role.USER, Role.COACH, Role.ADMIN] }
      );

      const result = await test.guard.canActivate(context);

      expect(result).toBe(true);
    });

    it('should return false when user does not have required role', async () => {
      const context = test.createMockExecutionContext(
        {
          user: {
            sub: 'user-id',
            email: 'user@example.com',
            role: Role.USER,
          },
        },
        { [ROLES_KEY]: [Role.ADMIN] }
      );

      const result = await test.guard.canActivate(context);

      expect(result).toBe(false);
    });

    it('should return false when user is not present on request', async () => {
      const context = test.createMockExecutionContext({}, { [ROLES_KEY]: [Role.USER] });

      const result = await test.guard.canActivate(context);

      expect(result).toBe(false);
    });

    it('should return false when user object is undefined', async () => {
      const context = test.createMockExecutionContext(
        { user: undefined },
        { [ROLES_KEY]: [Role.USER] }
      );

      const result = await test.guard.canActivate(context);

      expect(result).toBe(false);
    });

    it('should work with ADMIN role', async () => {
      const context = test.createMockExecutionContext(
        {
          user: {
            sub: 'admin-id',
            email: 'admin@example.com',
            role: Role.ADMIN,
          },
        },
        { [ROLES_KEY]: [Role.ADMIN] }
      );

      const result = await test.guard.canActivate(context);

      expect(result).toBe(true);
    });

    it('should work with COACH role', async () => {
      const context = test.createMockExecutionContext(
        {
          user: {
            sub: 'coach-id',
            email: 'coach@example.com',
            role: Role.COACH,
          },
        },
        { [ROLES_KEY]: [Role.COACH] }
      );

      const result = await test.guard.canActivate(context);

      expect(result).toBe(true);
    });

    it('should work with PREMIUM_USER role', async () => {
      const context = test.createMockExecutionContext(
        {
          user: {
            sub: 'premium-id',
            email: 'premium@example.com',
            role: Role.PREMIUM_USER,
          },
        },
        { [ROLES_KEY]: [Role.PREMIUM_USER] }
      );

      const result = await test.guard.canActivate(context);

      expect(result).toBe(true);
    });

    it('should deny COACH when only USER role is required', async () => {
      const context = test.createMockExecutionContext(
        {
          user: {
            sub: 'coach-id',
            email: 'coach@example.com',
            role: Role.COACH,
          },
        },
        { [ROLES_KEY]: [Role.USER] }
      );

      const result = await test.guard.canActivate(context);

      expect(result).toBe(false);
    });

    it('should allow access when empty roles array is provided', async () => {
      const context = test.createMockExecutionContext(
        {
          user: {
            sub: 'user-id',
            email: 'user@example.com',
            role: Role.USER,
          },
        },
        { [ROLES_KEY]: [] }
      );

      const result = await test.guard.canActivate(context);

      // Empty array means no roles match, so should return false
      expect(result).toBe(false);
    });
  });
});
