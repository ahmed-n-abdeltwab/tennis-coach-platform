import { UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Role } from '@prisma/client';
import { DeepMocked, GuardTest } from '@test-utils';

import { AUTH_TYPE_KEY } from '../../decorators/auth.decorator';
import { AuthType } from '../../enums/auth-type.enum';
import { AccessTokenGuard } from '../access-token/access-token.guard';

import { AuthenticationGuard } from './authentication.guard';

/**
 * Typed mocks interface for AuthenticationGuard tests.
 */
interface AuthenticationGuardMocks {
  Reflector: DeepMocked<Reflector>;
  AccessTokenGuard: DeepMocked<AccessTokenGuard>;
}

describe('AuthenticationGuard', () => {
  let test: GuardTest<AuthenticationGuard, AuthenticationGuardMocks>;

  beforeEach(async () => {
    test = new GuardTest({
      guard: AuthenticationGuard,
      providers: [Reflector, AccessTokenGuard],
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
    it('should use Bearer auth type by default when no auth type is specified', async () => {
      test.mocks.AccessTokenGuard.canActivate.mockResolvedValue(true);

      const context = test.createMockContextWithToken(
        'valid-token',
        {},
        { [AUTH_TYPE_KEY]: undefined }
      );
      const result = await test.guard.canActivate(context);

      expect(result).toBe(true);
      expect(test.mocks.Reflector.getAllAndOverride).toHaveBeenCalledWith(AUTH_TYPE_KEY, [
        context.getHandler(),
        context.getClass(),
      ]);
      expect(test.mocks.AccessTokenGuard.canActivate).toHaveBeenCalledWith(context);
    });

    it('should allow access when AuthType.None is specified', async () => {
      const context = test.createMockContextWithoutAuth({}, { [AUTH_TYPE_KEY]: [AuthType.None] });
      const result = await test.guard.canActivate(context);

      expect(result).toBe(true);
      expect(test.mocks.AccessTokenGuard.canActivate).not.toHaveBeenCalled();
    });

    it('should delegate to AccessTokenGuard when AuthType.Bearer is specified', async () => {
      test.mocks.AccessTokenGuard.canActivate.mockResolvedValue(true);

      const context = test.createMockContextWithToken(
        'valid-token',
        {},
        { [AUTH_TYPE_KEY]: [AuthType.Bearer] }
      );
      const result = await test.guard.canActivate(context);

      expect(result).toBe(true);
      expect(test.mocks.AccessTokenGuard.canActivate).toHaveBeenCalledWith(context);
    });

    it('should throw UnauthorizedException when AccessTokenGuard fails', async () => {
      test.mocks.AccessTokenGuard.canActivate.mockRejectedValue(
        new UnauthorizedException('Invalid token')
      );

      const context = test.createMockContextWithToken(
        'invalid-token',
        {},
        { [AUTH_TYPE_KEY]: [AuthType.Bearer] }
      );

      await expect(test.guard.canActivate(context)).rejects.toThrow(UnauthorizedException);
    });

    it('should try multiple auth types and succeed if any passes', async () => {
      test.mocks.AccessTokenGuard.canActivate.mockRejectedValue(
        new UnauthorizedException('No token')
      );

      const context = test.createMockContextWithoutAuth(
        {},
        { [AUTH_TYPE_KEY]: [AuthType.Bearer, AuthType.None] }
      );
      const result = await test.guard.canActivate(context);

      // Should succeed because AuthType.None allows access
      expect(result).toBe(true);
    });

    it('should throw the last error when all auth types fail', async () => {
      const customError = new UnauthorizedException('Custom auth error');
      test.mocks.AccessTokenGuard.canActivate.mockRejectedValue(customError);

      const context = test.createMockContextWithToken(
        'bad-token',
        {},
        { [AUTH_TYPE_KEY]: [AuthType.Bearer] }
      );

      await expect(test.guard.canActivate(context)).rejects.toThrow(customError);
    });

    it('should work with authenticated user payload', async () => {
      const mockPayload = {
        sub: 'user-id',
        email: 'user@example.com',
        role: Role.USER,
      };

      test.mocks.AccessTokenGuard.canActivate.mockImplementation(async ctx => {
        const request = ctx.switchToHttp().getRequest();
        request.user = mockPayload;
        return true;
      });

      const context = test.createMockContextWithToken(
        'valid-token',
        {},
        { [AUTH_TYPE_KEY]: [AuthType.Bearer] }
      );
      const result = await test.guard.canActivate(context);

      expect(result).toBe(true);
      const request = test.getRequestFromContext(context);
      expect(request.user).toEqual(mockPayload);
    });
  });
});
