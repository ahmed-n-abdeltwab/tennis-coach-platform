import { UnauthorizedException } from '@nestjs/common';
import { Role } from '@prisma/client';
import { ControllerTest, DeepMocked, MockAuthGuard } from '@test-utils';

import { RedisService } from '../../redis/redis.service';

import { AuthenticationController } from './authentication.controller';
import { AuthenticationService } from './authentication.service';
import { JwtRefreshGuard } from './guards/jwt-refresh/jwt-refresh.guard';

/**
 * Typed mocks interface for AuthenticationController tests.
 * Provides IntelliSense support for all mocked dependencies.
 */
interface AuthenticationControllerMocks {
  AuthenticationService: DeepMocked<AuthenticationService>;
  RedisService: DeepMocked<RedisService>;
}

describe('AuthenticationController', () => {
  let test: ControllerTest<
    AuthenticationController,
    AuthenticationControllerMocks,
    'authentication'
  >;

  beforeEach(async () => {
    test = new ControllerTest({
      controller: AuthenticationController,
      moduleName: 'authentication',
      providers: [AuthenticationService, RedisService],
      guardOverrides: [{ guard: JwtRefreshGuard, useClass: MockAuthGuard }],
    });

    await test.setup();
  });

  afterEach(async () => {
    await test.cleanup();
  });

  describe('constructor', () => {
    it('should be defined', () => {
      expect(test.controller).toBeDefined();
    });
  });

  describe('POST /api/authentication/signup', () => {
    it('should create a new account and return tokens', async () => {
      const signupDto = {
        email: 'newuser@example.com',
        password: 'password123',
        name: 'New User',
      };

      const mockResponse = {
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
        account: {
          id: 'new-user-id',
          email: signupDto.email,
          role: Role.USER,
        },
      };

      test.mocks.AuthenticationService.signup.mockResolvedValue(mockResponse);

      const response = await test.http.post('/api/authentication/signup', {
        body: signupDto,
      });

      expect(response.ok).toBe(true);
      expect(response.status).toBe(201);
      expect(test.mocks.AuthenticationService.signup).toHaveBeenCalledWith(signupDto);
    });

    it('should return 401 when email already exists', async () => {
      const signupDto = {
        email: 'existing@example.com',
        password: 'password123',
        name: 'Existing User',
      };

      test.mocks.AuthenticationService.signup.mockRejectedValue(
        new UnauthorizedException('Invalid credentials')
      );

      const response = await test.http.post('/api/authentication/signup', {
        body: signupDto,
      });

      expect(response.ok).toBe(false);
      expect(response.status).toBe(401);
      expect(test.mocks.AuthenticationService.signup).toHaveBeenCalledWith(signupDto);
    });
  });

  describe('POST /api/authentication/login', () => {
    it('should authenticate user and return tokens', async () => {
      const loginDto = {
        email: 'user@example.com',
        password: 'password123',
      };

      const mockResponse = {
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
        account: {
          id: 'user-id',
          email: loginDto.email,
          role: Role.USER,
        },
      };

      test.mocks.AuthenticationService.login.mockResolvedValue(mockResponse);

      const response = await test.http.post('/api/authentication/login', {
        body: loginDto,
      });

      expect(response.ok).toBe(true);
      expect(response.status).toBe(201);
      expect(test.mocks.AuthenticationService.login).toHaveBeenCalledWith(loginDto);
    });

    it('should return 401 when credentials are invalid', async () => {
      const loginDto = {
        email: 'user@example.com',
        password: 'wrong-password',
      };

      test.mocks.AuthenticationService.login.mockRejectedValue(
        new UnauthorizedException('Invalid credentials')
      );

      const response = await test.http.post('/api/authentication/login', {
        body: loginDto,
      });

      expect(response.ok).toBe(false);
      expect(response.status).toBe(401);
      expect(test.mocks.AuthenticationService.login).toHaveBeenCalledWith(loginDto);
    });

    it('should return 401 when account is inactive', async () => {
      const loginDto = {
        email: 'inactive@example.com',
        password: 'password123',
      };

      test.mocks.AuthenticationService.login.mockRejectedValue(
        new UnauthorizedException('Account is inactive')
      );

      const response = await test.http.post('/api/authentication/login', {
        body: loginDto,
      });

      expect(response.ok).toBe(false);
      expect(response.status).toBe(401);
      expect(test.mocks.AuthenticationService.login).toHaveBeenCalledWith(loginDto);
    });
  });

  describe('POST /api/authentication/refresh', () => {
    it('should refresh tokens for authenticated user', async () => {
      const mockResponse = {
        accessToken: 'new-access-token',
        refreshToken: 'new-refresh-token',
        account: {
          id: 'user-id',
          email: 'user@example.com',
          role: Role.USER,
        },
      };

      test.mocks.AuthenticationService.refreshToken.mockResolvedValue(mockResponse);

      const userToken = await test.auth.createRefreshToken({
        role: Role.USER,
        sub: 'user-id',
        email: 'user@example.com',
      });

      const response = await test.http.authenticatedPost('/api/authentication/refresh', userToken);

      expect(response.ok).toBe(true);
      expect(response.status).toBe(200);
      expect(test.mocks.AuthenticationService.refreshToken).toHaveBeenCalledWith(
        expect.objectContaining({
          sub: 'user-id',
          email: 'user@example.com',
          role: Role.USER,
        })
      );
    });

    it('should work for coach role', async () => {
      const mockResponse = {
        accessToken: 'new-access-token',
        refreshToken: 'new-refresh-token',
        account: {
          id: 'coach-id',
          email: 'coach@example.com',
          role: Role.COACH,
        },
      };

      test.mocks.AuthenticationService.refreshToken.mockResolvedValue(mockResponse);

      const coachToken = await test.auth.createRefreshToken({
        role: Role.COACH,
        sub: 'coach-id',
        email: 'coach@example.com',
      });

      const response = await test.http.authenticatedPost('/api/authentication/refresh', coachToken);

      expect(response.ok).toBe(true);
      expect(test.mocks.AuthenticationService.refreshToken).toHaveBeenCalledWith(
        expect.objectContaining({
          sub: 'coach-id',
          email: 'coach@example.com',
          role: Role.COACH,
        })
      );
    });
  });

  describe('POST /api/authentication/logout', () => {
    it('should logout authenticated user', async () => {
      test.mocks.AuthenticationService.logout.mockResolvedValue(undefined);

      const userToken = await test.auth.createToken({
        role: Role.USER,
        sub: 'user-id',
        email: 'user@example.com',
      });

      const response = await test.http.authenticatedPost('/api/authentication/logout', userToken);

      expect(response.ok).toBe(true);
      expect(response.status).toBe(201);
      expect(test.mocks.AuthenticationService.logout).toHaveBeenCalledWith(
        expect.objectContaining({
          sub: 'user-id',
          email: 'user@example.com',
          role: Role.USER,
        })
      );
    });

    it('should logout coach user', async () => {
      test.mocks.AuthenticationService.logout.mockResolvedValue(undefined);

      const coachToken = await test.auth.createToken({
        role: Role.COACH,
        sub: 'coach-id',
        email: 'coach@example.com',
      });

      const response = await test.http.authenticatedPost('/api/authentication/logout', coachToken);

      expect(response.ok).toBe(true);
      expect(test.mocks.AuthenticationService.logout).toHaveBeenCalledWith(
        expect.objectContaining({
          sub: 'coach-id',
          role: Role.COACH,
        })
      );
    });

    it('should logout admin user', async () => {
      test.mocks.AuthenticationService.logout.mockResolvedValue(undefined);

      const adminToken = await test.auth.createToken({
        role: Role.ADMIN,
        sub: 'admin-id',
        email: 'admin@example.com',
      });

      const response = await test.http.authenticatedPost('/api/authentication/logout', adminToken);

      expect(response.ok).toBe(true);
      expect(test.mocks.AuthenticationService.logout).toHaveBeenCalledWith(
        expect.objectContaining({
          sub: 'admin-id',
          role: Role.ADMIN,
        })
      );
    });
  });
});
