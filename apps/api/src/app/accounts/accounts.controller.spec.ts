import { Role } from '@prisma/client';
import { ControllerTest } from '@test-utils';

import { AccountsController } from './accounts.controller';
import { AccountsService } from './accounts.service';
import { AccountResponseDto } from './dto/account.dto';

describe('AccountsController', () => {
  let test: ControllerTest<AccountsController, AccountsService, 'accounts'>;
  let mockService: jest.Mocked<AccountsService>;

  beforeEach(async () => {
    mockService = {
      create: jest.fn(),
      findById: jest.fn(),
      findByEmail: jest.fn(),
      findByRole: jest.fn(),
      findCoaches: jest.fn(),
      findUsers: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      updateOnlineStatus: jest.fn(),
      findCoachById: jest.fn(),
    } as any;

    test = new ControllerTest({
      controllerClass: AccountsController,
      moduleName: 'accounts',
      providers: [{ provide: AccountsService, useValue: mockService }],
    });

    await test.setup();
  });

  afterEach(async () => {
    await test.cleanup();
  });

  describe('GET /accounts', () => {
    it('should call findUsers service method', async () => {
      const mockAccounts: AccountResponseDto[] = [
        {
          id: 'user-1',
          email: 'user1@example.com',
          name: 'User One',
          role: Role.USER,
          isActive: true,
          isOnline: false,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ];

      mockService.findUsers.mockResolvedValue(mockAccounts);

      const adminToken = await test.auth.createRoleToken(Role.ADMIN);
      await test.http.authenticatedGet('/api/accounts', adminToken);

      expect(mockService.findUsers).toHaveBeenCalledTimes(1);
    });
  });

  describe('GET /accounts/me', () => {
    it('should call findById with current user id', async () => {
      const mockAccount: AccountResponseDto = {
        id: 'current-user-id',
        email: 'current@example.com',
        name: 'Current User',
        role: Role.USER,
        isActive: true,
        isOnline: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      mockService.findById.mockResolvedValue(mockAccount);

      const userToken = await test.auth.createRoleToken(Role.USER, {
        sub: 'current-user-id',
      });
      await test.http.authenticatedGet('/api/accounts/me', userToken);

      expect(mockService.findById).toHaveBeenCalledWith('current-user-id');
    });
  });

  describe('GET /accounts/:id', () => {
    it('should call findById with the provided id for admin', async () => {
      const mockAccount: AccountResponseDto = {
        id: 'target-user-id',
        email: 'target@example.com',
        name: 'Target User',
        role: Role.USER,
        isActive: true,
        isOnline: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      mockService.findById.mockResolvedValue(mockAccount);

      const adminToken = await test.auth.createRoleToken(Role.ADMIN);
      await test.http.authenticatedGet(
        `/api/accounts/${mockAccount.id}` as '/api/accounts/{id}',
        adminToken
      );

      expect(mockService.findById).toHaveBeenCalledWith(mockAccount.id);
    });

    it('should call findById with own id for regular user', async () => {
      const mockAccount: AccountResponseDto = {
        id: 'current-user-id',
        email: 'current@example.com',
        name: 'Current User',
        role: Role.USER,
        isActive: true,
        isOnline: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      mockService.findById.mockResolvedValue(mockAccount);

      const userToken = await test.auth.createRoleToken(Role.USER, {
        sub: mockAccount.id,
      });
      await test.http.authenticatedGet(
        `/api/accounts/${mockAccount.id}` as '/api/accounts/{id}',
        userToken
      );

      expect(mockService.findById).toHaveBeenCalledWith(mockAccount.id);
    });
  });

  describe('PATCH /accounts/:id', () => {
    it('should call update with provided id for admin', async () => {
      const updateData = {
        name: 'Updated Name',
      };

      const mockUpdatedAccount: AccountResponseDto = {
        id: 'target-user-id',
        email: 'target@example.com',
        name: 'Updated Name',
        role: Role.USER,
        isActive: true,
        isOnline: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      mockService.update.mockResolvedValue(mockUpdatedAccount);

      const adminToken = await test.auth.createRoleToken(Role.ADMIN);
      await test.http.authenticatedPatch(
        `/api/accounts/${mockUpdatedAccount.id}` as '/api/accounts/{id}',
        adminToken,
        {
          body: updateData,
        }
      );

      expect(mockService.update).toHaveBeenCalledWith(mockUpdatedAccount.id, updateData);
    });

    it('should call update with own id for regular user', async () => {
      const updateData = {
        name: 'Updated Name',
      };

      const mockUpdatedAccount: AccountResponseDto = {
        id: 'current-user-id',
        email: 'current@example.com',
        name: 'Updated Name',
        role: Role.USER,
        isActive: true,
        isOnline: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      mockService.update.mockResolvedValue(mockUpdatedAccount);

      const userToken = await test.auth.createRoleToken(Role.USER, {
        sub: 'current-user-id',
      });
      await test.http.authenticatedPatch(
        `/api/accounts/${mockUpdatedAccount.id}` as '/api/accounts/{id}',
        userToken,
        {
          body: updateData,
        }
      );

      expect(mockService.update).toHaveBeenCalledWith(mockUpdatedAccount.id, updateData);
    });
  });

  describe('DELETE /accounts/:id', () => {
    it('should call delete with provided id', async () => {
      mockService.delete.mockResolvedValue(undefined);

      const adminToken = await test.auth.createRoleToken(Role.ADMIN);
      await test.http.authenticatedDelete(
        '/api/accounts/target-user-id' as '/api/accounts/{id}',
        adminToken
      );

      expect(mockService.delete).toHaveBeenCalledWith('target-user-id');
    });
  });
});
