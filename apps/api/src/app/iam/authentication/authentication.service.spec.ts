import { UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Role } from '@prisma/client';
import { DeepMocked, ServiceTest } from '@test-utils';

import { AccountsService } from '../../accounts/accounts.service';
import { RedisService } from '../../redis/redis.service';
import jwtConfig from '../config/jwt.config';
import { HashingService } from '../hashing/hashing.service';

import { AuthenticationService } from './authentication.service';

/**
 * Typed mocks interface for AuthenticationService tests.
 * Provides IntelliSense support for all mocked dependencies.
 *
 * Following the service-to-service communication pattern:
 * - AccountsService: handles all account operations
 * - HashingService: handles password hashing/comparison
 * - JwtService: handles token signing/verification
 * - RedisService: handles refresh token storage
 */
interface AuthenticationMocks {
  AccountsService: DeepMocked<AccountsService>;
  HashingService: {
    hash: jest.Mock;
    compare: jest.Mock;
  };
  JwtService: DeepMocked<JwtService>;
  RedisService: DeepMocked<RedisService>;
}

describe('AuthenticationService', () => {
  let test: ServiceTest<AuthenticationService, AuthenticationMocks>;

  const mockJwtConfigValue = {
    secret: 'test-secret',
    signOptions: {
      expiresIn: 900,
      issuer: 'test-issuer',
      audience: 'test-audience',
    },
  };

  beforeEach(async () => {
    test = new ServiceTest({
      service: AuthenticationService,
      providers: [
        AccountsService,
        {
          provide: HashingService,
          useValue: {
            hash: jest.fn(),
            compare: jest.fn(),
          },
        },
        JwtService,
        RedisService,
        {
          provide: jwtConfig.KEY,
          useValue: mockJwtConfigValue,
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
      expect(test.service).toBeDefined();
    });
  });

  describe('signup', () => {
    it('should create a new account and return tokens on successful signup', async () => {
      const signupDto = {
        email: 'test@example.com',
        password: 'password123',
        name: 'Test User',
      };

      const mockAccount = test.factory.account.createUserWithNulls({
        id: 'new-user-id',
        email: signupDto.email,
        name: signupDto.name,
        role: Role.USER,
      });

      test.mocks.AccountsService.emailExists.mockResolvedValue(false);
      test.mocks.HashingService.hash.mockResolvedValue('hashed-password');
      test.mocks.AccountsService.createForSignup.mockResolvedValue(mockAccount);
      test.mocks.JwtService.signAsync
        .mockResolvedValueOnce('access-token')
        .mockResolvedValueOnce('refresh-token');
      test.mocks.RedisService.set.mockResolvedValue('OK');

      const result = await test.service.signup(signupDto);

      expect(result).toMatchObject({
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
        account: {
          id: 'new-user-id',
          email: signupDto.email,
          role: Role.USER,
        },
      });
      expect(test.mocks.AccountsService.emailExists).toHaveBeenCalledWith(signupDto.email);
      expect(test.mocks.HashingService.hash).toHaveBeenCalledWith(signupDto.password);
      expect(test.mocks.AccountsService.createForSignup).toHaveBeenCalledWith({
        email: signupDto.email,
        name: signupDto.name,
        passwordHash: 'hashed-password',
        role: Role.USER,
      });
      expect(test.mocks.JwtService.signAsync).toHaveBeenCalledTimes(2);
      expect(test.mocks.RedisService.set).toHaveBeenCalledTimes(1);
    });

    it('should throw UnauthorizedException when email already exists', async () => {
      const signupDto = {
        email: 'existing@example.com',
        password: 'password123',
        name: 'Test User',
      };

      test.mocks.AccountsService.emailExists.mockResolvedValue(true);

      await expect(test.service.signup(signupDto)).rejects.toThrow(UnauthorizedException);
      expect(test.mocks.AccountsService.emailExists).toHaveBeenCalledWith(signupDto.email);
      expect(test.mocks.AccountsService.createForSignup).not.toHaveBeenCalled();
    });
  });

  describe('login', () => {
    it('should return tokens on successful login', async () => {
      const loginDto = {
        email: 'test@example.com',
        password: 'password123',
      };

      const mockAccount = test.factory.account.createUserWithNulls({
        id: 'user-id',
        email: loginDto.email,
        passwordHash: 'hashed-password',
        isActive: true,
        role: Role.USER,
      });

      test.mocks.AccountsService.findByEmailWithPassword.mockResolvedValue(mockAccount);
      test.mocks.HashingService.compare.mockResolvedValue(true);
      test.mocks.AccountsService.updateOnlineStatus.mockResolvedValue(undefined);
      test.mocks.JwtService.signAsync
        .mockResolvedValueOnce('access-token')
        .mockResolvedValueOnce('refresh-token');
      test.mocks.RedisService.set.mockResolvedValue('OK');

      const result = await test.service.login(loginDto);

      expect(result).toMatchObject({
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
        account: {
          id: 'user-id',
          email: loginDto.email,
          role: Role.USER,
        },
      });
      expect(test.mocks.AccountsService.findByEmailWithPassword).toHaveBeenCalledWith(
        loginDto.email
      );
      expect(test.mocks.HashingService.compare).toHaveBeenCalledWith(
        loginDto.password,
        mockAccount.passwordHash
      );
      expect(test.mocks.AccountsService.updateOnlineStatus).toHaveBeenCalledWith(
        mockAccount.id,
        true
      );
    });

    it('should throw UnauthorizedException when account not found', async () => {
      const loginDto = {
        email: 'nonexistent@example.com',
        password: 'password123',
      };

      test.mocks.AccountsService.findByEmailWithPassword.mockResolvedValue(null);

      await expect(test.service.login(loginDto)).rejects.toThrow(UnauthorizedException);
      expect(test.mocks.HashingService.compare).not.toHaveBeenCalled();
    });

    it('should throw UnauthorizedException when password is invalid', async () => {
      const loginDto = {
        email: 'test@example.com',
        password: 'wrong-password',
      };

      const mockAccount = test.factory.account.createUserWithNulls({
        email: loginDto.email,
        passwordHash: 'hashed-password',
        isActive: true,
      });

      test.mocks.AccountsService.findByEmailWithPassword.mockResolvedValue(mockAccount);
      test.mocks.HashingService.compare.mockResolvedValue(false);

      await expect(test.service.login(loginDto)).rejects.toThrow(UnauthorizedException);
      expect(test.mocks.HashingService.compare).toHaveBeenCalledWith(
        loginDto.password,
        mockAccount.passwordHash
      );
      expect(test.mocks.JwtService.signAsync).not.toHaveBeenCalled();
    });

    it('should throw UnauthorizedException when account is inactive', async () => {
      const loginDto = {
        email: 'test@example.com',
        password: 'password123',
      };

      const mockAccount = test.factory.account.createUserWithNulls({
        email: loginDto.email,
        passwordHash: 'hashed-password',
        isActive: false,
      });

      test.mocks.AccountsService.findByEmailWithPassword.mockResolvedValue(mockAccount);
      test.mocks.HashingService.compare.mockResolvedValue(true);

      await expect(test.service.login(loginDto)).rejects.toThrow(UnauthorizedException);
      expect(test.mocks.JwtService.signAsync).not.toHaveBeenCalled();
    });
  });

  describe('logout', () => {
    it('should update account online status and invalidate redis token', async () => {
      const jwtPayload = {
        sub: 'user-id',
        email: 'test@example.com',
        role: Role.USER,
      };

      test.mocks.AccountsService.updateOnlineStatus.mockResolvedValue(undefined);
      test.mocks.RedisService.invalidate.mockResolvedValue(undefined);

      await test.service.logout(jwtPayload);

      expect(test.mocks.AccountsService.updateOnlineStatus).toHaveBeenCalledWith(
        jwtPayload.sub,
        false
      );
      expect(test.mocks.RedisService.invalidate).toHaveBeenCalledWith(jwtPayload.sub);
    });
  });

  describe('refreshToken', () => {
    it('should generate new tokens for valid user payload', async () => {
      const jwtPayload = {
        sub: 'user-id',
        email: 'test@example.com',
        role: Role.USER,
      };

      test.mocks.JwtService.signAsync
        .mockResolvedValueOnce('new-access-token')
        .mockResolvedValueOnce('new-refresh-token');
      test.mocks.RedisService.set.mockResolvedValue('OK');

      const result = await test.service.refreshToken(jwtPayload);

      expect(result).toMatchObject({
        accessToken: 'new-access-token',
        refreshToken: 'new-refresh-token',
        account: {
          id: jwtPayload.sub,
          email: jwtPayload.email,
          role: jwtPayload.role,
        },
      });
      expect(test.mocks.JwtService.signAsync).toHaveBeenCalledTimes(2);
      expect(test.mocks.RedisService.set).toHaveBeenCalledTimes(1);
    });
  });
});
