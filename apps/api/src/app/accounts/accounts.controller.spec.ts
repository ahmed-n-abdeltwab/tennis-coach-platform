import { Role } from '@prisma/client';
import { ControllerTest } from '@test-utils';

import { AccountsController } from './accounts.controller';
import { AccountsService } from './accounts.service';

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
      const mockUsers = test.factory.account.createManyUser(1);

      mockService.findUsers.mockResolvedValue(mockUsers);

      const adminToken = await test.auth.createRoleToken(Role.ADMIN);

      await test.http.authenticatedGet('/api/accounts', adminToken);

      expect(mockService.findUsers).toHaveBeenCalledTimes(1);
    });
  });

  describe('GET /accounts/me', () => {
    it('should call findById with current user id', async () => {
      const mockUsers = test.factory.account.createUser({ id: 'current-user-id' });

      mockService.findById.mockResolvedValue(mockUsers);

      const userToken = await test.auth.createRoleToken(Role.USER, {
        sub: 'current-user-id',
      });
      await test.http.authenticatedGet('/api/accounts/me', userToken);

      expect(mockService.findById).toHaveBeenCalledWith(mockUsers.id);
    });
  });

  describe('GET /accounts/:id', () => {
    it('should call findById with the provided id for admin', async () => {
      const mockUsers = test.factory.account.createUser({ id: 'target-user-id' });

      mockService.findById.mockResolvedValue(mockUsers);

      const adminToken = await test.auth.createRoleToken(Role.ADMIN);
      await test.http.authenticatedGet(
        `/api/accounts/${mockUsers.id}` as '/api/accounts/{id}',
        adminToken
      );

      expect(mockService.findById).toHaveBeenCalledWith(mockUsers.id);
    });

    it('should call findById with own id for regular user', async () => {
      const mockUsers = test.factory.account.createUser({ id: 'current-user-id' });

      mockService.findById.mockResolvedValue(mockUsers);

      const userToken = await test.auth.createRoleToken(Role.USER, {
        sub: mockUsers.id,
      });
      await test.http.authenticatedGet(
        `/api/accounts/${mockUsers.id}` as '/api/accounts/{id}',
        userToken
      );

      expect(mockService.findById).toHaveBeenCalledWith(mockUsers.id);
    });
  });

  describe('PATCH /accounts/:id', () => {
    it('should call update with provided id for admin', async () => {
      const updateData = {
        name: 'Updated Name',
      };
      const mockUsers = test.factory.account.createUser({ id: 'target-user-id', name: 'Name' });

      mockService.update.mockResolvedValue(mockUsers);

      const adminToken = await test.auth.createRoleToken(Role.ADMIN);
      await test.http.authenticatedPatch(
        `/api/accounts/${mockUsers.id}` as '/api/accounts/{id}',
        adminToken,
        {
          body: updateData,
        }
      );

      expect(mockService.update).toHaveBeenCalledWith(mockUsers.id, updateData);
    });

    it('should call update with own id for regular user', async () => {
      const updateData = {
        name: 'Updated Name',
      };
      const mockUsers = test.factory.account.createUser({ id: 'current-user-id', name: 'Name' });

      mockService.update.mockResolvedValue(mockUsers);

      const userToken = await test.auth.createRoleToken(Role.USER, {
        sub: 'current-user-id',
      });
      await test.http.authenticatedPatch(
        `/api/accounts/${mockUsers.id}` as '/api/accounts/{id}',
        userToken,
        {
          body: updateData,
        }
      );

      expect(mockService.update).toHaveBeenCalledWith(mockUsers.id, updateData);
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
