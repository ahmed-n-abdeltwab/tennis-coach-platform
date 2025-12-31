import { UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Role } from '@prisma/client';
import { DeepMocked, GuardTest } from '@test-utils';

import jwtConfig from '../../../config/jwt.config';

import { AccessTokenGuard } from './access-token.guard';

/**
 * Typed mocks interface for AccessTokenGuard tests.
 */
interface AccessTokenGuardMocks {
  JwtService: DeepMocked<JwtService>;
}

describe('AccessTokenGuard', () => {
  let test: GuardTest<AccessTokenGuard, AccessTokenGuardMocks>;

  const mockJwtConfig = {
    secret: 'test-secret',
    signOptions: {
      issuer: 'test-issuer',
      audience: 'test-audience',
      expiresIn: 900,
    },
  };

  beforeEach(async () => {
    test = new GuardTest({
      guard: AccessTokenGuard,
      providers: [
        JwtService,
        {
          provide: jwtConfig.KEY,
          useValue: mockJwtConfig,
        },
      ],
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
    it('should return true and set user on request when token is valid', async () => {
      const mockPayload = {
        sub: 'user-id',
        email: 'user@example.com',
        role: Role.USER,
      };

      test.mocks.JwtService.verifyAsync.mockResolvedValue(mockPayload);

      const context = test.createMockContextWithToken('valid-token');
      const result = await test.guard.canActivate(context);

      expect(result).toBe(true);
      expect(test.mocks.JwtService.verifyAsync).toHaveBeenCalledWith('valid-token', mockJwtConfig);

      const request = test.getRequestFromContext(context);
      expect(request.user).toEqual(mockPayload);
    });

    it('should throw UnauthorizedException when no authorization header is present', async () => {
      const context = test.createMockContextWithoutAuth();

      await expect(test.guard.canActivate(context)).rejects.toThrow(UnauthorizedException);
      await expect(test.guard.canActivate(context)).rejects.toThrow('No token found');
    });

    it('should throw UnauthorizedException when authorization header is not Bearer type', async () => {
      const context = test.createMockExecutionContext({
        headers: { authorization: 'Basic some-credentials' },
      });

      await expect(test.guard.canActivate(context)).rejects.toThrow(UnauthorizedException);
      await expect(test.guard.canActivate(context)).rejects.toThrow('No token found');
    });

    it('should throw UnauthorizedException when token is invalid', async () => {
      test.mocks.JwtService.verifyAsync.mockRejectedValue(new Error('Invalid token'));

      const context = test.createMockContextWithToken('invalid-token');

      await expect(test.guard.canActivate(context)).rejects.toThrow(UnauthorizedException);
      await expect(test.guard.canActivate(context)).rejects.toThrow('Invalid token');
    });

    it('should throw UnauthorizedException when token is expired', async () => {
      test.mocks.JwtService.verifyAsync.mockRejectedValue(new Error('jwt expired'));

      const context = test.createMockContextWithToken('expired-token');

      await expect(test.guard.canActivate(context)).rejects.toThrow(UnauthorizedException);
    });

    it('should handle token with extra whitespace in authorization header', async () => {
      const mockPayload = { sub: 'user-id', email: 'user@example.com', role: Role.USER };
      test.mocks.JwtService.verifyAsync.mockResolvedValue(mockPayload);

      const context = test.createMockExecutionContext({
        headers: { authorization: 'Bearer   token-with-spaces' },
      });

      // The guard splits by space and takes index 1, so extra spaces result in empty token
      await expect(test.guard.canActivate(context)).rejects.toThrow(UnauthorizedException);
    });

    it('should work with different user roles', async () => {
      const roles = [Role.USER, Role.COACH, Role.ADMIN, Role.PREMIUM_USER];

      for (const role of roles) {
        test.resetMocks();

        const mockPayload = {
          sub: `${role.toLowerCase()}-id`,
          email: `${role.toLowerCase()}@example.com`,
          role,
        };

        test.mocks.JwtService.verifyAsync.mockResolvedValue(mockPayload);

        const context = test.createMockContextWithToken(`${role}-token`);
        const result = await test.guard.canActivate(context);

        expect(result).toBe(true);

        const request = test.getRequestFromContext(context);
        expect(request.user).toEqual(mockPayload);
      }
    });
  });
});
