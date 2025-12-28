import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { Role } from '@prisma/client';
import { ServiceTest } from '@test-utils';

import { HashingService } from '../iam/hashing/hashing.service';
import { PrismaService } from '../prisma/prisma.service';

import { AccountsService } from './accounts.service';
import { CreateAccountDto, UpdateAccountDto } from './dto/account.dto';

describe('AccountsService', () => {
  let test: ServiceTest<AccountsService, PrismaService>;
  let mockHashingService: jest.Mocked<HashingService>;

  beforeEach(async () => {
    const mockPrisma = {
      $connect: jest.fn(),
      $disconnect: jest.fn(),
      $transaction: jest.fn(),
      account: {
        create: jest.fn(),
        findMany: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
    };

    mockHashingService = {
      hash: jest.fn(),
      compare: jest.fn(),
    } as any;

    test = new ServiceTest({
      serviceClass: AccountsService,
      mocks: [
        { provide: PrismaService, useValue: mockPrisma },
        { provide: HashingService, useValue: mockHashingService },
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

      const mockUsers = test.factory.createUserWithNulls({ ...createDto, id: 'test-id' });

      test.prisma.account.findUnique.mockResolvedValue(null);
      test.prisma.account.create.mockResolvedValue(mockUsers);
      mockHashingService.hash.mockResolvedValue('hashed-password');

      const result = await test.service.create(createDto);

      expect(result).toMatchObject({
        id: 'test-id',
        email: createDto.email,
        name: createDto.name,
        role: createDto.role,
      });
      expect(result).not.toHaveProperty('passwordHash');
      expect(test.prisma.account.findUnique).toHaveBeenCalledWith({
        where: { email: createDto.email },
      });
      expect(mockHashingService.hash).toHaveBeenCalledWith(createDto.password);
      expect(test.prisma.account.create).toHaveBeenCalledTimes(1);
    });

    it('should throw ConflictException when email already exists', async () => {
      const createDto: CreateAccountDto = {
        email: 'existing@example.com',
        password: 'password123',
        name: 'Test User',
      };

      const existingAccount = test.factory.createUserWithNulls({
        ...createDto,
        id: 'existing-id',
        name: 'Existing User',
      });

      test.prisma.account.findUnique.mockResolvedValue(existingAccount);

      await expect(test.service.create(createDto)).rejects.toThrow(ConflictException);
      expect(test.prisma.account.findUnique).toHaveBeenCalledWith({
        where: { email: createDto.email },
      });
      expect(test.prisma.account.create).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException when disability is true but disabilityCause is missing', async () => {
      const createDto: CreateAccountDto = {
        email: 'test@example.com',
        password: 'password123',
        name: 'Test User',
        disability: true,
      };

      test.prisma.account.findUnique.mockResolvedValue(null);

      await expect(test.service.create(createDto)).rejects.toThrow(BadRequestException);
      expect(test.prisma.account.create).not.toHaveBeenCalled();
    });
  });

  describe('findById', () => {
    it('should return account by id', async () => {
      const mockAccount = test.factory.createUserWithNulls();

      test.prisma.account.findUnique.mockResolvedValue(mockAccount);

      const result = await test.service.findById(mockAccount.id);

      expect(result).toMatchObject({
        id: mockAccount.id,
        email: mockAccount.email,
        name: mockAccount.name,
      });
      expect(result).not.toHaveProperty('passwordHash');
      expect(test.prisma.account.findUnique).toHaveBeenCalledWith({
        where: { id: mockAccount.id },
      });
    });

    it('should throw NotFoundException when account not found', async () => {
      test.prisma.account.findUnique.mockResolvedValue(null);

      await expect(test.service.findById('non-existent-id')).rejects.toThrow(NotFoundException);
      expect(test.prisma.account.findUnique).toHaveBeenCalledWith({
        where: { id: 'non-existent-id' },
      });
    });
  });

  describe('findByEmail', () => {
    it('should return account by email', async () => {
      const mockAccount = test.factory.createUserWithNulls();

      test.prisma.account.findUnique.mockResolvedValue(mockAccount);

      const result = await test.service.findByEmail(mockAccount.email);

      expect(result).toMatchObject({
        id: mockAccount.id,
        email: mockAccount.email,
      });
      expect(result).not.toHaveProperty('passwordHash');
      expect(test.prisma.account.findUnique).toHaveBeenCalledWith({
        where: { email: mockAccount.email },
      });
    });

    it('should throw NotFoundException when account not found', async () => {
      test.prisma.account.findUnique.mockResolvedValue(null);

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

      const existingAccount = test.factory.createUserWithNulls({ id: 'test-id' });

      const updatedAccount = {
        ...existingAccount,
        ...updateDto,
      };

      test.prisma.account.findUnique.mockResolvedValue(existingAccount);
      test.prisma.account.update.mockResolvedValue(updatedAccount);

      const result = await test.service.update('test-id', updateDto);

      expect(result).toMatchObject({
        id: 'test-id',
        name: 'Updated Name',
        bio: 'Updated bio',
      });
      expect(result).not.toHaveProperty('passwordHash');
      expect(test.prisma.account.findUnique).toHaveBeenCalledWith({
        where: { id: 'test-id' },
      });
      expect(test.prisma.account.update).toHaveBeenCalledWith({
        where: { id: 'test-id' },
        data: updateDto,
      });
    });

    it('should throw NotFoundException when account not found', async () => {
      const updateDto: UpdateAccountDto = {
        name: 'Updated Name',
      };

      test.prisma.account.findUnique.mockResolvedValue(null);

      await expect(test.service.update('non-existent-id', updateDto)).rejects.toThrow(
        NotFoundException
      );
      expect(test.prisma.account.update).not.toHaveBeenCalled();
    });
  });

  describe('delete', () => {
    it('should delete account successfully', async () => {
      const existingAccount = test.factory.createUserWithNulls({ id: 'test-id' });

      test.prisma.account.findUnique.mockResolvedValue(existingAccount);
      test.prisma.account.delete.mockResolvedValue(existingAccount);

      await test.service.delete('test-id');

      expect(test.prisma.account.findUnique).toHaveBeenCalledWith({
        where: { id: 'test-id' },
      });
      expect(test.prisma.account.delete).toHaveBeenCalledWith({
        where: { id: 'test-id' },
      });
    });

    it('should throw NotFoundException when account not found', async () => {
      test.prisma.account.findUnique.mockResolvedValue(null);

      await expect(test.service.delete('non-existent-id')).rejects.toThrow(NotFoundException);
      expect(test.prisma.account.delete).not.toHaveBeenCalled();
    });
  });

  describe('findByRole', () => {
    it('should return accounts by role', async () => {
      const mockAccounts = [
        {
          id: 'coach-1',
          email: 'coach1@example.com',
          name: 'Coach One',
          passwordHash: 'hash',
          role: Role.COACH,
          gender: null,
          age: null,
          height: null,
          weight: null,
          disability: false,
          disabilityCause: null,
          country: null,
          address: null,
          notes: null,
          bio: 'Coach bio',
          credentials: 'Certified',
          philosophy: 'Philosophy',
          profileImage: null,
          isActive: true,
          isOnline: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 'coach-2',
          email: 'coach2@example.com',
          name: 'Coach Two',
          passwordHash: 'hash',
          role: Role.COACH,
          gender: null,
          age: null,
          height: null,
          weight: null,
          disability: false,
          disabilityCause: null,
          country: null,
          address: null,
          notes: null,
          bio: 'Coach bio 2',
          credentials: 'Certified',
          philosophy: 'Philosophy 2',
          profileImage: null,
          isActive: true,
          isOnline: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      test.prisma.account.findMany.mockResolvedValue(mockAccounts);

      const result = await test.service.findByRole(Role.COACH);

      expect(result).toHaveLength(2);
      expect(result[0]).toMatchObject({
        id: 'coach-1',
        email: 'coach1@example.com',
        role: Role.COACH,
      });
      expect(result[0]).not.toHaveProperty('passwordHash');
      expect(test.prisma.account.findMany).toHaveBeenCalledWith({
        where: { role: Role.COACH },
      });
    });
  });

  describe('findCoaches', () => {
    it('should return all coaches without filters', async () => {
      const mockCoaches = [
        {
          id: 'coach-1',
          email: 'coach1@example.com',
          name: 'Coach One',
          passwordHash: 'hash',
          gender: null,
          age: null,
          height: null,
          weight: null,
          disability: false,
          disabilityCause: null,
          country: null,
          address: null,
          notes: null,
          bio: 'Coach bio',
          credentials: 'Certified',
          philosophy: 'Philosophy',
          profileImage: null,
          isActive: true,
          isOnline: false,
          role: Role.COACH,
          createdAt: new Date(),
          updatedAt: new Date(),
          bookingTypes: [],
        },
      ];

      test.prisma.account.findMany.mockResolvedValue(mockCoaches);

      const result = await test.service.findCoaches();

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        id: 'coach-1',
        email: 'coach1@example.com',
        role: Role.COACH,
      });
      expect(test.prisma.account.findMany).toHaveBeenCalledWith({
        where: { role: Role.COACH },
        select: expect.any(Object),
      });
    });

    it('should return coaches with filters', async () => {
      const mockCoaches = [
        {
          id: 'coach-1',
          email: 'coach1@example.com',
          name: 'Coach One',
          passwordHash: 'hash',
          gender: null,
          age: null,
          height: null,
          weight: null,
          disability: false,
          disabilityCause: null,
          country: 'USA',
          address: null,
          notes: null,
          bio: 'Coach bio',
          credentials: 'Certified',
          philosophy: 'Philosophy',
          profileImage: null,
          isActive: true,
          isOnline: false,
          role: Role.COACH,
          createdAt: new Date(),
          updatedAt: new Date(),
          bookingTypes: [],
        },
      ];

      test.prisma.account.findMany.mockResolvedValue(mockCoaches);

      const result = await test.service.findCoaches({ isActive: true, country: 'USA' });

      expect(result).toHaveLength(1);
      expect(test.prisma.account.findMany).toHaveBeenCalledWith({
        where: { role: Role.COACH, isActive: true, country: 'USA' },
        select: expect.any(Object),
      });
    });
  });

  describe('findUsers', () => {
    it('should return active users', async () => {
      const mockUsers = [
        {
          id: 'user-1',
          email: 'user1@example.com',
          name: 'User One',
          passwordHash: 'hash',
          role: Role.USER,
          gender: null,
          age: null,
          height: null,
          weight: null,
          disability: false,
          disabilityCause: null,
          country: null,
          address: null,
          notes: null,
          bio: null,
          credentials: null,
          philosophy: null,
          profileImage: null,
          isActive: true,
          isOnline: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      test.prisma.account.findMany.mockResolvedValue(mockUsers);

      const result = await test.service.findUsers(true);

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        id: 'user-1',
        email: 'user1@example.com',
        role: Role.USER,
      });
      expect(result[0]).not.toHaveProperty('passwordHash');
      expect(test.prisma.account.findMany).toHaveBeenCalledWith({
        where: {
          role: { in: [Role.USER, Role.PREMIUM_USER] },
          isActive: true,
        },
      });
    });
  });

  describe('updateOnlineStatus', () => {
    it('should update online status successfully', async () => {
      const existingAccount = {
        id: 'test-id',
        email: 'test@example.com',
        name: 'Test User',
        passwordHash: 'hashed-password',
        role: Role.USER,
        gender: null,
        age: null,
        height: null,
        weight: null,
        disability: false,
        disabilityCause: null,
        country: null,
        address: null,
        notes: null,
        bio: null,
        credentials: null,
        philosophy: null,
        profileImage: null,
        isActive: true,
        isOnline: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const updatedAccount = {
        ...existingAccount,
        isOnline: true,
      };

      test.prisma.account.findUnique.mockResolvedValue(existingAccount);
      test.prisma.account.update.mockResolvedValue(updatedAccount);

      const result = await test.service.updateOnlineStatus('test-id', true);

      expect(result.isOnline).toBe(true);
      expect(test.prisma.account.findUnique).toHaveBeenCalledWith({
        where: { id: 'test-id' },
      });
      expect(test.prisma.account.update).toHaveBeenCalledWith({
        where: { id: 'test-id' },
        data: { isOnline: true },
      });
    });

    it('should throw NotFoundException when account not found', async () => {
      test.prisma.account.findUnique.mockResolvedValue(null);

      await expect(test.service.updateOnlineStatus('non-existent-id', true)).rejects.toThrow(
        NotFoundException
      );
      expect(test.prisma.account.update).not.toHaveBeenCalled();
    });
  });

  describe('findCoachById', () => {
    it('should return coach with booking types', async () => {
      const mockCoach = {
        id: 'coach-id',
        email: 'coach@example.com',
        name: 'Coach Name',
        passwordHash: 'hash',
        gender: null,
        age: null,
        height: null,
        weight: null,
        disability: false,
        disabilityCause: null,
        country: null,
        address: null,
        notes: null,
        bio: 'Coach bio',
        credentials: 'Certified',
        philosophy: 'Philosophy',
        profileImage: null,
        isActive: true,
        isOnline: false,
        role: Role.COACH,
        createdAt: new Date(),
        updatedAt: new Date(),
        bookingTypes: [
          {
            id: 'booking-1',
            name: 'Session Type',
            description: 'Description',
            basePrice: 100,
          },
        ],
      };

      test.prisma.account.findUnique.mockResolvedValue(mockCoach);

      const result = await test.service.findCoachById('coach-id');

      expect(result).toMatchObject({
        id: 'coach-id',
        name: 'Coach Name',
      });
      expect(result.bookingTypes).toHaveLength(1);
      expect(test.prisma.account.findUnique).toHaveBeenCalledWith({
        where: { id: 'coach-id', role: Role.COACH },
        select: expect.any(Object),
      });
    });

    it('should throw NotFoundException when coach not found', async () => {
      test.prisma.account.findUnique.mockResolvedValue(null);

      await expect(test.service.findCoachById('non-existent-id')).rejects.toThrow(
        NotFoundException
      );
    });
  });
});
