import { Role } from '@prisma/client';
import { ControllerTest } from '@test-utils';
import { DeepMocked } from '@test-utils/mixins/mock.mixin';

import { AccountsController } from './accounts.controller';
import { AccountsService } from './accounts.service';

interface AccountsControllerMocks {
  AccountsService: DeepMocked<AccountsService>;
}

describe('AccountsController', () => {
  let test: ControllerTest<AccountsController, AccountsControllerMocks, 'accounts'>;

  beforeEach(async () => {
    test = new ControllerTest({
      controller: AccountsController,
      moduleName: 'accounts',
      providers: [AccountsService],
    });

    await test.setup();
  });

  afterEach(async () => {
    await test.cleanup();
  });

  describe('GET /accounts', () => {
    it('should call findUsers service method', async () => {
      const mockUsers = test.factory.account.createManyUser(1);

      test.mocks.AccountsService.findUsers.mockResolvedValue(mockUsers);

      const adminToken = await test.auth.createRoleToken(Role.ADMIN);

      await test.http.authenticatedGet('/api/accounts', adminToken);

      expect(test.mocks.AccountsService.findUsers).toHaveBeenCalledTimes(1);
    });
  });

  describe('GET /accounts/me', () => {
    it('should call findById with current user id', async () => {
      const mockUsers = test.factory.account.createUser({ id: 'current-user-id' });

      test.mocks.AccountsService.findById.mockResolvedValue(mockUsers);

      const userToken = await test.auth.createRoleToken(Role.USER, {
        sub: 'current-user-id',
      });
      await test.http.authenticatedGet('/api/accounts/me', userToken);

      expect(test.mocks.AccountsService.findById).toHaveBeenCalledWith(mockUsers.id);
    });
  });

  describe('GET /accounts/:id', () => {
    it('should call findById with the provided id for admin', async () => {
      const mockUsers = test.factory.account.createUser({ id: 'target-user-id' });

      test.mocks.AccountsService.findById.mockResolvedValue(mockUsers);

      const adminToken = await test.auth.createRoleToken(Role.ADMIN);
      await test.http.authenticatedGet(
        `/api/accounts/${mockUsers.id}` as '/api/accounts/{id}',
        adminToken
      );

      expect(test.mocks.AccountsService.findById).toHaveBeenCalledWith(mockUsers.id);
    });

    it('should call findById with own id for regular user', async () => {
      const mockUsers = test.factory.account.createUser({ id: 'current-user-id' });

      test.mocks.AccountsService.findById.mockResolvedValue(mockUsers);

      const userToken = await test.auth.createRoleToken(Role.USER, {
        sub: mockUsers.id,
      });
      await test.http.authenticatedGet(
        `/api/accounts/${mockUsers.id}` as '/api/accounts/{id}',
        userToken
      );

      expect(test.mocks.AccountsService.findById).toHaveBeenCalledWith(mockUsers.id);
    });
  });

  describe('PATCH /accounts/:id', () => {
    it('should call update with provided id for admin', async () => {
      const updateData = {
        name: 'Updated Name',
      };
      const mockUsers = test.factory.account.createUser({ id: 'target-user-id', name: 'Name' });

      test.mocks.AccountsService.update.mockResolvedValue(mockUsers);

      const adminToken = await test.auth.createRoleToken(Role.ADMIN);
      await test.http.authenticatedPatch(
        `/api/accounts/${mockUsers.id}` as '/api/accounts/{id}',
        adminToken,
        {
          body: updateData,
        }
      );

      expect(test.mocks.AccountsService.update).toHaveBeenCalledWith(mockUsers.id, updateData);
    });

    it('should call update with own id for regular user', async () => {
      const updateData = {
        name: 'Updated Name',
      };
      const mockUsers = test.factory.account.createUser({ id: 'current-user-id', name: 'Name' });

      test.mocks.AccountsService.update.mockResolvedValue(mockUsers);

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

      expect(test.mocks.AccountsService.update).toHaveBeenCalledWith(mockUsers.id, updateData);
    });
  });

  describe('DELETE /accounts/:id', () => {
    it('should call delete with provided id', async () => {
      test.mocks.AccountsService.delete.mockResolvedValue(undefined);

      const adminToken = await test.auth.createRoleToken(Role.ADMIN);
      await test.http.authenticatedDelete(
        '/api/accounts/target-user-id' as '/api/accounts/{id}',
        adminToken
      );

      expect(test.mocks.AccountsService.delete).toHaveBeenCalledWith('target-user-id');
    });
  });
});
