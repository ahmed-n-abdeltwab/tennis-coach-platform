import { Provider } from '@nestjs/common';
import { Role } from '@prisma/client';
import { BaseControllerTest, PathsForRoute } from '@test-utils';

import { JwtPayload } from '../../common';

import { AccountsController } from './accounts.controller';
import { AccountsService } from './accounts.service';
import { AccountResponseDto, UpdateAccountDto } from './dto/account.dto';

class AccountsControllerTest extends BaseControllerTest<AccountsController, AccountsService> {
  private mockAccountsService: jest.Mocked<AccountsService>;

  async setupController(): Promise<void> {
    this.controller = this.module.get<AccountsController>(AccountsController);
  }

  setupMocks() {
    this.mockAccountsService = {
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
    } as unknown as jest.Mocked<AccountsService>;

    return [];
  }

  getControllerClass() {
    return AccountsController;
  }

  override getTestProviders(): Provider[] {
    return [
      {
        provide: AccountsService,
        useValue: this.mockAccountsService,
      },
    ];
  }

  getMockService(): jest.Mocked<AccountsService> {
    return this.mockAccountsService;
  }

  // AccountsController uses GET, PATCH, DELETE - so create helpers for those
  async testGet(path: PathsForRoute<'accounts', 'GET'>) {
    return this.get(path);
  }

  async testPatch(path: PathsForRoute<'accounts', 'PATCH'>, payload?: { body?: UpdateAccountDto }) {
    return this.patch(path, payload as any);
  }

  async testDelete(path: PathsForRoute<'accounts', 'DELETE'>, payload?: { params?: any }) {
    return this.delete(path, payload);
  }

  async testAuthenticatedGet(path: PathsForRoute<'accounts', 'GET'>, token: string) {
    return this.authenticatedGet(path, token);
  }

  async testAuthenticatedPatch(
    path: PathsForRoute<'accounts', 'PATCH'>,
    token: string,
    payload?: { body?: UpdateAccountDto }
  ) {
    return this.authenticatedPatch(path, token, payload as any);
  }

  async testAuthenticatedDelete(path: PathsForRoute<'accounts', 'DELETE'>, token: string) {
    return this.authenticatedDelete(path, token);
  }

  async createTestRoleToken(role: Role, overrides?: Partial<JwtPayload>) {
    return this.createRoleToken(role, overrides);
  }
}

describe('AccountsController', () => {
  let test: AccountsControllerTest;

  beforeEach(async () => {
    test = new AccountsControllerTest();
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

      test.getMockService().findUsers.mockResolvedValue(mockAccounts);

      const adminToken = await test.createTestRoleToken(Role.ADMIN);
      await test.testAuthenticatedGet('/api/accounts', adminToken);

      expect(test.getMockService().findUsers).toHaveBeenCalledTimes(1);
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

      test.getMockService().findById.mockResolvedValue(mockAccount);

      const userToken = await test.createTestRoleToken(Role.USER, {
        sub: 'current-user-id',
      });
      await test.testAuthenticatedGet('/api/accounts/me', userToken);

      expect(test.getMockService().findById).toHaveBeenCalledWith('current-user-id');
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

      test.getMockService().findById.mockResolvedValue(mockAccount);

      const adminToken = await test.createTestRoleToken(Role.ADMIN);
      await test.testAuthenticatedGet(
        `/api/accounts/${mockAccount.id}` as '/api/accounts/{id}',
        adminToken
      );

      expect(test.getMockService().findById).toHaveBeenCalledWith(mockAccount.id);
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

      test.getMockService().findById.mockResolvedValue(mockAccount);

      const userToken = await test.createTestRoleToken(Role.USER, {
        sub: mockAccount.id,
      });
      await test.testAuthenticatedGet(
        `/api/accounts/${mockAccount.id}` as '/api/accounts/{id}',
        userToken
      );

      expect(test.getMockService().findById).toHaveBeenCalledWith(mockAccount.id);
    });
  });

  describe('PATCH /accounts/:id', () => {
    it('should call update with provided id for admin', async () => {
      const updateDto: UpdateAccountDto = {
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

      test.getMockService().update.mockResolvedValue(mockUpdatedAccount);

      const adminToken = await test.createTestRoleToken(Role.ADMIN);
      await test.testAuthenticatedPatch(
        `/api/accounts/${mockUpdatedAccount.id}` as '/api/accounts/{id}',
        adminToken,
        {
          body: updateDto,
        }
      );

      expect(test.getMockService().update).toHaveBeenCalledWith(mockUpdatedAccount.id, updateDto);
    });

    it('should call update with own id for regular user', async () => {
      const updateDto: UpdateAccountDto = {
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

      test.getMockService().update.mockResolvedValue(mockUpdatedAccount);

      const userToken = await test.createTestRoleToken(Role.USER, {
        sub: 'current-user-id',
      });
      await test.testAuthenticatedPatch(
        `/api/accounts/${mockUpdatedAccount.id}` as '/api/accounts/{id}',
        userToken,
        {
          body: updateDto,
        }
      );

      expect(test.getMockService().update).toHaveBeenCalledWith(mockUpdatedAccount.id, updateDto);
    });
  });

  describe('DELETE /accounts/:id', () => {
    it('should call delete with provided id', async () => {
      test.getMockService().delete.mockResolvedValue(undefined);

      const adminToken = await test.createTestRoleToken(Role.ADMIN);
      await test.testAuthenticatedDelete(
        '/api/accounts/target-user-id' as '/api/accounts/{id}',
        adminToken
      );

      expect(test.getMockService().delete).toHaveBeenCalledWith('target-user-id');
    });
  });
});
