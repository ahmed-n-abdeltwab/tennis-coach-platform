import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { Role } from '@prisma/client';
import { ServiceTest } from '@test-utils';

import { HashingService } from '../iam/hashing/hashing.service';
import { PrismaService } from '../prisma/prisma.service';

import { AccountsService } from './accounts.service';
import { CreateAccountDto, UpdateAccountDto } from './dto/account.dto';

interface AccountsMocks {
  HashingService: {
    hash: jest.Mock;
    compare: jest.Mock;
  };
  PrismaService: {
    account: {
      create: jest.Mock;
      findMany: jest.Mock;
      findFirst: jest.Mock;
      update: jest.Mock;
      delete: jest.Mock;
    };
  };
}

describe('AccountsService', () => {
  let test: ServiceTest<AccountsService, AccountsMocks>;

  beforeEach(async () => {
    test = new ServiceTest({
      service: AccountsService,
      providers: [
        {
          provide: HashingService,
          useValue: {
            hash: jest.fn(),
            compare: jest.fn(),
          },
        },
        {
          provide: PrismaService,
          useValue: {
            account: {
              create: jest.fn(),
              findMany: jest.fn(),
              findFirst: jest.fn(),
              update: jest.fn(),
              delete: jest.fn(),
            },
          },
        },
      ],
    });

    await test.setup();
  });

  afterEach(async () => {
    await test.cleanup();
  });

  describe('create', () => {
    it('should create a new account successfully', async () => {
      const createDto: CreateAccountDto = {
        email: 'test@example.com',
        password: 'password123',
        name: 'Test User',
        role: Role.USER,
      };

      const mockUsers = test.factory.account.createUserWithNulls({ ...createDto, id: 'test-id' });

      test.mocks.PrismaService.account.findFirst.mockResolvedValue(null);
      test.mocks.PrismaService.account.create.mockResolvedValue(mockUsers);
      test.mocks.HashingService.hash.mockResolvedValue('hashed-password');

      const result = await test.service.create(createDto);

      expect(result).toMatchObject({
        id: 'test-id',
        email: createDto.email,
        name: createDto.name,
        role: createDto.role,
      });
      expect(result.passwordHash).toBeUndefined();
      expect(test.mocks.PrismaService.account.findFirst).toHaveBeenCalledWith({
        where: { email: createDto.email },
      });
      expect(test.mocks.HashingService.hash).toHaveBeenCalledWith(createDto.password);
      expect(test.mocks.PrismaService.account.create).toHaveBeenCalledTimes(1);
    });

    it('should throw ConflictException when email already exists', async () => {
      const createDto: CreateAccountDto = {
        email: 'existing@example.com',
        password: 'password123',
        name: 'Test User',
      };

      const existingAccount = test.factory.account.createUserWithNulls({
        ...createDto,
        id: 'existing-id',
        name: 'Existing User',
      });

      test.mocks.PrismaService.account.findFirst.mockResolvedValue(existingAccount);

      await expect(test.service.create(createDto)).rejects.toThrow(ConflictException);
      expect(test.mocks.PrismaService.account.findFirst).toHaveBeenCalledWith({
        where: { email: createDto.email },
      });
      expect(test.mocks.PrismaService.account.create).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException when disability is true but disabilityCause is missing', async () => {
      const createDto: CreateAccountDto = {
        email: 'test@example.com',
        password: 'password123',
        name: 'Test User',
        disability: true,
      };

      test.mocks.PrismaService.account.findFirst.mockResolvedValue(null);

      await expect(test.service.create(createDto)).rejects.toThrow(BadRequestException);
      expect(test.mocks.PrismaService.account.create).not.toHaveBeenCalled();
    });
  });

  describe('findById', () => {
    it('should return account by id', async () => {
      const mockAccount = test.factory.account.createUserWithNulls();

      test.mocks.PrismaService.account.findFirst.mockResolvedValue(mockAccount);

      const result = await test.service.findById(mockAccount.id);

      expect(result).toMatchObject({
        id: mockAccount.id,
        email: mockAccount.email,
        name: mockAccount.name,
      });
      expect(result.passwordHash).toBeUndefined();
      expect(test.mocks.PrismaService.account.findFirst).toHaveBeenCalledWith({
        where: { id: mockAccount.id },
      });
    });

    it('should throw NotFoundException when account not found', async () => {
      test.mocks.PrismaService.account.findFirst.mockResolvedValue(null);

      await expect(test.service.findById('non-existent-id')).rejects.toThrow(NotFoundException);
      expect(test.mocks.PrismaService.account.findFirst).toHaveBeenCalledWith({
        where: { id: 'non-existent-id' },
      });
    });
  });

  describe('findByEmail', () => {
    it('should return account by email', async () => {
      const mockAccount = test.factory.account.createUserWithNulls();

      test.mocks.PrismaService.account.findFirst.mockResolvedValue(mockAccount);

      const result = await test.service.findByEmail(mockAccount.email);

      expect(result).toMatchObject({
        id: mockAccount.id,
        email: mockAccount.email,
      });
      expect(result.passwordHash).toBeUndefined();
      expect(test.mocks.PrismaService.account.findFirst).toHaveBeenCalledWith({
        where: { email: mockAccount.email },
      });
    });

    it('should throw NotFoundException when account not found', async () => {
      test.mocks.PrismaService.account.findFirst.mockResolvedValue(null);

      await expect(test.service.findByEmail('nonexistent@example.com')).rejects.toThrow(
        NotFoundException
      );
    });
  });

  describe('update', () => {
    it('should update account successfully', async () => {
      const updateDto: UpdateAccountDto = {
        name: 'Updated Name',
        bio: 'Updated bio',
      };

      const existingAccount = test.factory.account.createUserWithNulls({ id: 'test-id' });

      const updatedAccount = {
        ...existingAccount,
        ...updateDto,
      };

      test.mocks.PrismaService.account.findFirst.mockResolvedValue(existingAccount);
      test.mocks.PrismaService.account.update.mockResolvedValue(updatedAccount);

      const result = await test.service.update('test-id', updateDto);

      expect(result).toMatchObject({
        id: 'test-id',
        name: 'Updated Name',
        bio: 'Updated bio',
      });
      expect(result.passwordHash).toBeUndefined();
      expect(test.mocks.PrismaService.account.findFirst).toHaveBeenCalledWith({
        where: { id: 'test-id' },
      });
      expect(test.mocks.PrismaService.account.update).toHaveBeenCalledWith({
        where: { id: 'test-id' },
        data: updateDto,
      });
    });

    it('should throw NotFoundException when account not found', async () => {
      const updateDto: UpdateAccountDto = {
        name: 'Updated Name',
      };

      test.mocks.PrismaService.account.findFirst.mockResolvedValue(null);

      await expect(test.service.update('non-existent-id', updateDto)).rejects.toThrow(
        NotFoundException
      );
      expect(test.mocks.PrismaService.account.update).not.toHaveBeenCalled();
    });
  });

  describe('delete', () => {
    it('should delete account successfully', async () => {
      const existingAccount = test.factory.account.createUserWithNulls({ id: 'test-id' });

      test.mocks.PrismaService.account.findFirst.mockResolvedValue(existingAccount);
      test.mocks.PrismaService.account.delete.mockResolvedValue(existingAccount);

      await test.service.delete('test-id');

      expect(test.mocks.PrismaService.account.findFirst).toHaveBeenCalledWith({
        where: { id: 'test-id' },
      });
      expect(test.mocks.PrismaService.account.delete).toHaveBeenCalledWith({
        where: { id: 'test-id' },
      });
    });

    it('should throw NotFoundException when account not found', async () => {
      test.mocks.PrismaService.account.findFirst.mockResolvedValue(null);

      await expect(test.service.delete('non-existent-id')).rejects.toThrow(NotFoundException);
      expect(test.mocks.PrismaService.account.delete).not.toHaveBeenCalled();
    });
  });

  describe('findByRole', () => {
    it('should return accounts by role', async () => {
      const mockAccounts = test.factory.account.createManyCoachWithNulls(2);

      test.mocks.PrismaService.account.findMany.mockResolvedValue(mockAccounts);

      const result = await test.service.findByRole(Role.COACH);

      expect(result).toHaveLength(2);

      expect(result).toMatchObject(
        mockAccounts.map(({ passwordHash: _passwordHash, ...rest }) => rest)
      );

      expect(result[0]?.passwordHash).toBeUndefined();
      expect(result[1]?.passwordHash).toBeUndefined();

      expect(test.mocks.PrismaService.account.findMany).toHaveBeenCalledWith({
        where: { role: Role.COACH },
      });
    });
  });

  describe('findUsers', () => {
    it('should return active users', async () => {
      const mockUsers = test.factory.account.createManyUserWithNulls(1);

      test.mocks.PrismaService.account.findMany.mockResolvedValue(mockUsers);

      const result = await test.service.findUsers(true);

      expect(result).toHaveLength(1);
      expect(result).toMatchObject(
        mockUsers.map(({ passwordHash: _passwordHash, ...rest }) => rest)
      );
      expect(result[0]?.passwordHash).toBeUndefined();
      expect(test.mocks.PrismaService.account.findMany).toHaveBeenCalledWith({
        where: {
          role: { in: [Role.USER, Role.PREMIUM_USER] },
          isActive: true,
        },
      });
    });
  });

  describe('updateOnlineStatus', () => {
    it('should update online status successfully', async () => {
      const existingAccount = test.factory.account.createUserWithNulls({ id: 'test-id' });

      const updatedAccount = {
        ...existingAccount,
        isOnline: true,
      };

      test.mocks.PrismaService.account.findFirst.mockResolvedValue(existingAccount);
      test.mocks.PrismaService.account.update.mockResolvedValue(updatedAccount);

      const accountId = 'test-id';
      const status = true;
      await test.service.updateOnlineStatus(accountId, status);

      expect(test.mocks.PrismaService.account.findFirst).toHaveBeenCalledWith({
        where: { id: accountId },
      });
      expect(test.mocks.PrismaService.account.update).toHaveBeenCalledWith({
        where: { id: accountId },
        data: { isOnline: status },
      });
    });

    it('should throw NotFoundException when account not found', async () => {
      test.mocks.PrismaService.account.findFirst.mockResolvedValue(null);

      await expect(test.service.updateOnlineStatus('non-existent-id', true)).rejects.toThrow(
        NotFoundException
      );
      expect(test.mocks.PrismaService.account.update).not.toHaveBeenCalled();
    });
  });
});
