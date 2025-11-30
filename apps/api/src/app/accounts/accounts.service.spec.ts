import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { Role } from '@prisma/client';
import { BaseServiceTest } from '@test-utils';

import { HashingService } from '../iam/hashing/hashing.service';
import { PrismaService } from '../prisma/prisma.service';

import { AccountsService } from './accounts.service';
import { CreateAccountDto, UpdateAccountDto } from './dto/account.dto';

class AccountsServiceTest extends BaseServiceTest<AccountsService, PrismaService> {
  private mockHashingService: jest.Mocked<HashingService>;

  async setupService(): Promise<void> {
    this.service = this.module.get<AccountsService>(AccountsService);
    this.prisma = this.module.get<PrismaService>(PrismaService);
  }

  setupMocks() {
    const mockPrismaService = this.createMockPrismaService();

    this.mockHashingService = {
      hash: jest.fn(),
      compare: jest.fn(),
    } as unknown as jest.Mocked<HashingService>;

    return [
      {
        provide: PrismaService,
        useValue: mockPrismaService,
      },
      {
        provide: HashingService,
        useValue: this.mockHashingService,
      },
    ];
  }

  getServiceClass(): new (...args: unknown[]) => AccountsService {
    return AccountsService as new (...args: unknown[]) => AccountsService;
  }

  override getProviders(): unknown[] {
    return [];
  }

  // Public accessors for protected properties
  getService(): AccountsService {
    return this.service;
  }

  getPrisma(): any {
    return this.prisma;
  }

  getMockHashingService(): jest.Mocked<HashingService> {
    return this.mockHashingService;
  }

  // Public accessors for protected helper methods
  mockReturn<T>(mockMethod: jest.Mock | jest.MockInstance<any, any[]>, returnValue: T): void {
    return this.mockMethodToReturn(mockMethod, returnValue);
  }

  mockThrow(mockMethod: jest.Mock | jest.MockInstance<any, any[]>, error: Error | string): void {
    return this.mockMethodToThrow(mockMethod, error);
  }
}

describe('AccountsService', () => {
  let test: AccountsServiceTest;

  beforeEach(async () => {
    test = new AccountsServiceTest();
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

      const mockAccount = {
        id: 'test-id',
        email: createDto.email,
        name: createDto.name,
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

      const mockPrisma = test.getPrisma();
      mockPrisma.account.findUnique.mockResolvedValue(null);
      mockPrisma.account.create.mockResolvedValue(mockAccount);
      test.getMockHashingService().hash.mockResolvedValue('hashed-password');

      const result = await test.getService().create(createDto);

      expect(result).toMatchObject({
        id: 'test-id',
        email: createDto.email,
        name: createDto.name,
        role: Role.USER,
      });
      expect(result).not.toHaveProperty('passwordHash');
      expect(mockPrisma.account.findUnique).toHaveBeenCalledWith({
        where: { email: createDto.email },
      });
      expect(test.getMockHashingService().hash).toHaveBeenCalledWith(createDto.password);
      expect(mockPrisma.account.create).toHaveBeenCalledTimes(1);
    });

    it('should throw ConflictException when email already exists', async () => {
      const createDto: CreateAccountDto = {
        email: 'existing@example.com',
        password: 'password123',
        name: 'Test User',
      };

      const existingAccount = {
        id: 'existing-id',
        email: createDto.email,
        name: 'Existing User',
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
      };

      const mockPrisma = test.getPrisma();
      mockPrisma.account.findUnique.mockResolvedValue(existingAccount);

      await expect(test.getService().create(createDto)).rejects.toThrow(ConflictException);
      expect(mockPrisma.account.findUnique).toHaveBeenCalledWith({
        where: { email: createDto.email },
      });
      expect(mockPrisma.account.create).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException when disability is true but disabilityCause is missing', async () => {
      const createDto: CreateAccountDto = {
        email: 'test@example.com',
        password: 'password123',
        name: 'Test User',
        disability: true,
      };

      const mockPrisma = test.getPrisma();
      mockPrisma.account.findUnique.mockResolvedValue(null);

      await expect(test.getService().create(createDto)).rejects.toThrow(BadRequestException);
      expect(mockPrisma.account.create).not.toHaveBeenCalled();
    });
  });

  describe('findById', () => {
    it('should return account by id', async () => {
      const mockAccount = {
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

      const mockPrisma = test.getPrisma();
      mockPrisma.account.findUnique.mockResolvedValue(mockAccount);

      const result = await test.getService().findById('test-id');

      expect(result).toMatchObject({
        id: 'test-id',
        email: 'test@example.com',
        name: 'Test User',
      });
      expect(result).not.toHaveProperty('passwordHash');
      expect(mockPrisma.account.findUnique).toHaveBeenCalledWith({
        where: { id: 'test-id' },
      });
    });

    it('should throw NotFoundException when account not found', async () => {
      const mockPrisma = test.getPrisma();
      mockPrisma.account.findUnique.mockResolvedValue(null);

      await expect(test.getService().findById('non-existent-id')).rejects.toThrow(
        NotFoundException
      );
      expect(mockPrisma.account.findUnique).toHaveBeenCalledWith({
        where: { id: 'non-existent-id' },
      });
    });
  });

  describe('findByEmail', () => {
    it('should return account by email', async () => {
      const mockAccount = {
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

      const mockPrisma = test.getPrisma();
      mockPrisma.account.findUnique.mockResolvedValue(mockAccount);

      const result = await test.getService().findByEmail('test@example.com');

      expect(result).toMatchObject({
        id: 'test-id',
        email: 'test@example.com',
      });
      expect(result).not.toHaveProperty('passwordHash');
      expect(mockPrisma.account.findUnique).toHaveBeenCalledWith({
        where: { email: 'test@example.com' },
      });
    });

    it('should throw NotFoundException when account not found', async () => {
      const mockPrisma = test.getPrisma();
      mockPrisma.account.findUnique.mockResolvedValue(null);

      await expect(test.getService().findByEmail('nonexistent@example.com')).rejects.toThrow(
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
        name: updateDto.name,
        bio: updateDto.bio,
      };

      const mockPrisma = test.getPrisma();
      mockPrisma.account.findUnique.mockResolvedValue(existingAccount);
      mockPrisma.account.update.mockResolvedValue(updatedAccount);

      const result = await test.getService().update('test-id', updateDto);

      expect(result).toMatchObject({
        id: 'test-id',
        name: 'Updated Name',
        bio: 'Updated bio',
      });
      expect(result).not.toHaveProperty('passwordHash');
      expect(mockPrisma.account.findUnique).toHaveBeenCalledWith({
        where: { id: 'test-id' },
      });
      expect(mockPrisma.account.update).toHaveBeenCalledWith({
        where: { id: 'test-id' },
        data: updateDto,
      });
    });

    it('should throw NotFoundException when account not found', async () => {
      const updateDto: UpdateAccountDto = {
        name: 'Updated Name',
      };

      const mockPrisma = test.getPrisma();
      mockPrisma.account.findUnique.mockResolvedValue(null);

      await expect(test.getService().update('non-existent-id', updateDto)).rejects.toThrow(
        NotFoundException
      );
      expect(mockPrisma.account.update).not.toHaveBeenCalled();
    });
  });

  describe('delete', () => {
    it('should delete account successfully', async () => {
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

      const mockPrisma = test.getPrisma();
      mockPrisma.account.findUnique.mockResolvedValue(existingAccount);
      mockPrisma.account.delete.mockResolvedValue(existingAccount);

      await test.getService().delete('test-id');

      expect(mockPrisma.account.findUnique).toHaveBeenCalledWith({
        where: { id: 'test-id' },
      });
      expect(mockPrisma.account.delete).toHaveBeenCalledWith({
        where: { id: 'test-id' },
      });
    });

    it('should throw NotFoundException when account not found', async () => {
      const mockPrisma = test.getPrisma();
      mockPrisma.account.findUnique.mockResolvedValue(null);

      await expect(test.getService().delete('non-existent-id')).rejects.toThrow(NotFoundException);
      expect(mockPrisma.account.delete).not.toHaveBeenCalled();
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

      const mockPrisma = test.getPrisma();
      mockPrisma.account.findMany.mockResolvedValue(mockAccounts);

      const result = await test.getService().findByRole(Role.COACH);

      expect(result).toHaveLength(2);
      expect(result[0]).toMatchObject({
        id: 'coach-1',
        email: 'coach1@example.com',
        role: Role.COACH,
      });
      expect(result[0]).not.toHaveProperty('passwordHash');
      expect(mockPrisma.account.findMany).toHaveBeenCalledWith({
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
          bio: 'Coach bio',
          credentials: 'Certified',
          philosophy: 'Philosophy',
          profileImage: null,
          isActive: true,
          role: Role.COACH,
          createdAt: new Date(),
          updatedAt: new Date(),
          bookingTypes: [],
        },
      ];

      const mockPrisma = test.getPrisma();
      mockPrisma.account.findMany.mockResolvedValue(mockCoaches);

      const result = await test.getService().findCoaches();

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        id: 'coach-1',
        email: 'coach1@example.com',
        role: Role.COACH,
      });
      expect(mockPrisma.account.findMany).toHaveBeenCalledWith({
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
          bio: 'Coach bio',
          credentials: 'Certified',
          philosophy: 'Philosophy',
          profileImage: null,
          isActive: true,
          role: Role.COACH,
          createdAt: new Date(),
          updatedAt: new Date(),
          bookingTypes: [],
        },
      ];

      const mockPrisma = test.getPrisma();
      mockPrisma.account.findMany.mockResolvedValue(mockCoaches);

      const result = await test.getService().findCoaches({ isActive: true, country: 'USA' });

      expect(result).toHaveLength(1);
      expect(mockPrisma.account.findMany).toHaveBeenCalledWith({
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

      const mockPrisma = test.getPrisma();
      mockPrisma.account.findMany.mockResolvedValue(mockUsers);

      const result = await test.getService().findUsers(true);

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        id: 'user-1',
        email: 'user1@example.com',
        role: Role.USER,
      });
      expect(result[0]).not.toHaveProperty('passwordHash');
      expect(mockPrisma.account.findMany).toHaveBeenCalledWith({
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

      const mockPrisma = test.getPrisma();
      mockPrisma.account.findUnique.mockResolvedValue(existingAccount);
      mockPrisma.account.update.mockResolvedValue(updatedAccount);

      const result = await test.getService().updateOnlineStatus('test-id', true);

      expect(result.isOnline).toBe(true);
      expect(mockPrisma.account.findUnique).toHaveBeenCalledWith({
        where: { id: 'test-id' },
      });
      expect(mockPrisma.account.update).toHaveBeenCalledWith({
        where: { id: 'test-id' },
        data: { isOnline: true },
      });
    });

    it('should throw NotFoundException when account not found', async () => {
      const mockPrisma = test.getPrisma();
      mockPrisma.account.findUnique.mockResolvedValue(null);

      await expect(test.getService().updateOnlineStatus('non-existent-id', true)).rejects.toThrow(
        NotFoundException
      );
      expect(mockPrisma.account.update).not.toHaveBeenCalled();
    });
  });

  describe('findCoachById', () => {
    it('should return coach with booking types', async () => {
      const mockCoach = {
        id: 'coach-id',
        name: 'Coach Name',
        bio: 'Coach bio',
        credentials: 'Certified',
        philosophy: 'Philosophy',
        profileImage: null,
        bookingTypes: [
          {
            id: 'booking-1',
            name: 'Session Type',
            description: 'Description',
            basePrice: 100,
          },
        ],
      };

      const mockPrisma = test.getPrisma();
      mockPrisma.account.findUnique.mockResolvedValue(mockCoach);

      const result = await test.getService().findCoachById('coach-id');

      expect(result).toMatchObject({
        id: 'coach-id',
        name: 'Coach Name',
      });
      expect(result.bookingTypes).toHaveLength(1);
      expect(mockPrisma.account.findUnique).toHaveBeenCalledWith({
        where: { id: 'coach-id', role: Role.COACH },
        select: expect.any(Object),
      });
    });

    it('should throw NotFoundException when coach not found', async () => {
      const mockPrisma = test.getPrisma();
      mockPrisma.account.findUnique.mockResolvedValue(null);

      await expect(test.getService().findCoachById('non-existent-id')).rejects.toThrow(
        NotFoundException
      );
    });
  });
});
