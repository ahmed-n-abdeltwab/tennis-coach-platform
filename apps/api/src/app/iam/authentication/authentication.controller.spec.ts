import { Role } from '@prisma/client';
import { createControllerTest } from '@test-utils';

import { AuthenticationController } from './authentication.controller';
import { AuthenticationService } from './authentication.service';

describe('AuthenticationController', () => {
  let controller: AuthenticationController;
  let service: jest.Mocked<AuthenticationService>;

  const mockService = {
    signup: jest.fn(),
    login: jest.fn(),
    refreshToken: jest.fn(),
    logout: jest.fn(),
  };

  beforeEach(async () => {
    const result = await createControllerTest({
      controllerClass: AuthenticationController,
      serviceClass: AuthenticationService,
      mockService,
    });

    controller = result.controller;
    service = result.service;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('constructor', () => {
    it('should be defined', () => {
      expect(controller).toBeDefined();
    });
  });

  describe('signup', () => {
    it('should call signup service method', async () => {
      const signupDto = {
        email: 'test@example.com',
        password: 'password123',
        name: 'Test User',
      };
      const expectedResponse = {
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
      };

      service.signup.mockResolvedValue(expectedResponse as any);

      const result = await controller.signup(signupDto);

      expect(result).toEqual(expectedResponse);
      expect(service.signup).toHaveBeenCalledWith(signupDto);
    });
  });

  describe('login', () => {
    it('should call login service method', async () => {
      const loginDto = {
        email: 'test@example.com',
        password: 'password123',
      };
      const expectedResponse = {
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
      };

      service.login.mockResolvedValue(expectedResponse as any);

      const result = await controller.login(loginDto);

      expect(result).toEqual(expectedResponse);
      expect(service.login).toHaveBeenCalledWith(loginDto);
    });
  });

  describe('refresh', () => {
    it('should call refreshToken service method', async () => {
      const mockUser = { sub: 'user-123', email: 'test@example.com', role: Role.USER };
      const expectedResponse = {
        accessToken: 'new-access-token',
      };

      service.refreshToken.mockResolvedValue(expectedResponse as any);

      const result = await controller.refresh(mockUser);

      expect(result).toEqual(expectedResponse);
      expect(service.refreshToken).toHaveBeenCalledWith(mockUser);
    });
  });

  describe('logout', () => {
    it('should call logout service method', async () => {
      const mockUser = { sub: 'user-123', email: 'test@example.com', role: Role.USER };

      service.logout.mockResolvedValue(undefined);

      const result = await controller.logout(mockUser);

      expect(result).toEqual({ message: 'Logged out successfully' });
      expect(service.logout).toHaveBeenCalledWith(mockUser);
    });
  });
});
