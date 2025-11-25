/**
 * Unit tests for database helper functions
 * Tests common database operations used in tests
 */

import { Role } from '@prisma/client';

import { PrismaService } from '../../../../src/app/prisma/prisma.service';
import {
  cleanDatabase,
  cleanTable,
  countRecords,
  createRecord,
  deleteRecord,
  deleteRecords,
  findRecord,
  findRecords,
  recordExists,
  seedTestDatabase,
  updateRecord,
  waitForRecord,
} from '../database-helpers';

interface MockPrismaClient {
  account: {
    create: jest.Mock;
    findFirst: jest.Mock;
    findMany: jest.Mock;
    update: jest.Mock;
    delete: jest.Mock;
    deleteMany: jest.Mock;
    count: jest.Mock;
  };
  session: {
    deleteMany: jest.Mock;
  };
  message: {
    deleteMany: jest.Mock;
  };
  discount: {
    deleteMany: jest.Mock;
  };
  timeSlot: {
    deleteMany: jest.Mock;
  };
  bookingType: {
    create: jest.Mock;
    deleteMany: jest.Mock;
  };
  $transaction: jest.Mock;
  $queryRawUnsafe: jest.Mock;
  $executeRawUnsafe: jest.Mock;
  [key: string]: any;
}

describe.skip('Database Helpers', () => {
  let mockPrisma: MockPrismaClient;

  beforeEach(() => {
    // Create comprehensive mock Prisma service
    mockPrisma = {
      account: {
        create: jest.fn(),
        findFirst: jest.fn(),
        findMany: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        deleteMany: jest.fn(),
        count: jest.fn(),
      },
      session: {
        deleteMany: jest.fn(),
      },
      message: {
        deleteMany: jest.fn(),
      },
      discount: {
        deleteMany: jest.fn(),
      },
      timeSlot: {
        deleteMany: jest.fn(),
      },
      bookingType: {
        create: jest.fn(),
        deleteMany: jest.fn(),
      },
      $transaction: jest.fn(),
      $queryRawUnsafe: jest.fn(),
      $executeRawUnsafe: jest.fn(),
    };
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('cleanDatabase()', () => {
    it('should delete all data from all tables', async () => {
      await cleanDatabase(mockPrisma);

      expect(mockPrisma.message.deleteMany).toHaveBeenCalled();
      expect(mockPrisma.session.deleteMany).toHaveBeenCalled();
      expect(mockPrisma.discount.deleteMany).toHaveBeenCalled();
      expect(mockPrisma.timeSlot.deleteMany).toHaveBeenCalled();
      expect(mockPrisma.bookingType.deleteMany).toHaveBeenCalled();
      expect(mockPrisma.account.deleteMany).toHaveBeenCalled();
    });

    it('should delete tables in correct order (reverse dependencies)', async () => {
      const callOrder: string[] = [];

      mockPrisma.message.deleteMany.mockImplementation(async () => {
        callOrder.push('message');
        return { count: 0 };
      });
      mockPrisma.session.deleteMany.mockImplementation(async () => {
        callOrder.push('session');
        return { count: 0 };
      });
      mockPrisma.account.deleteMany.mockImplementation(async () => {
        callOrder.push('account');
        return { count: 0 };
      });

      await cleanDatabase(mockPrisma);

      // Account should be deleted last (it's referenced by other tables)
      const accountIndex = callOrder.indexOf('account');
      const messageIndex = callOrder.indexOf('message');
      const sessionIndex = callOrder.indexOf('session');

      expect(accountIndex).toBeGreaterThan(messageIndex);
      expect(accountIndex).toBeGreaterThan(sessionIndex);
    });
  });

  describe('seedTestDatabase()', () => {
    it('should create test users, coaches, and booking types', async () => {
      const mockUser = { id: 'user-1', email: 'user@test.com', role: Role.USER };
      const mockCoach = { id: 'coach-1', email: 'coach@test.com', role: Role.COACH };
      const mockBookingType = { id: 'booking-1', name: 'Test Booking' };

      (mockPrisma.account.create as jest.Mock)
        .mockResolvedValueOnce(mockUser)
        .mockResolvedValueOnce(mockCoach);

      (mockPrisma.bookingType.create as jest.Mock).mockResolvedValue(mockBookingType);

      const result = await seedTestDatabase(mockPrisma);

      expect(result).toHaveProperty('users');
      expect(result).toHaveProperty('coaches');
      expect(result).toHaveProperty('bookingTypes');
      expect(mockPrisma.account.create).toHaveBeenCalled();
      expect(mockPrisma.bookingType.create).toHaveBeenCalled();
    });

    it('should create users with USER role', async () => {
      mockPrisma.account.create.mockResolvedValue({
        id: 'user-1',
        role: Role.USER,
      });
      mockPrisma.bookingType.create.mockResolvedValue({ id: 'booking-1' });

      await seedTestDatabase(mockPrisma);

      const userCalls = mockPrisma.account.create.mock.calls.filter(
        (call: any) => call[0].data.role === Role.USER
      );

      expect(userCalls.length).toBeGreaterThan(0);
    });

    it('should create coaches with COACH role', async () => {
      mockPrisma.account.create.mockResolvedValue({
        id: 'coach-1',
        role: Role.COACH,
      });
      mockPrisma.bookingType.create.mockResolvedValue({ id: 'booking-1' });

      await seedTestDatabase(mockPrisma);

      const coachCalls = mockPrisma.account.create.mock.calls.filter(
        (call: any) => call[0].data.role === Role.COACH
      );

      expect(coachCalls.length).toBeGreaterThan(0);
    });

    it('should throw error if no coaches are created', async () => {
      // Mock to return empty array for coaches
      mockPrisma.account.create.mockResolvedValue({ id: 'user-1', role: Role.USER });

      // This should fail because we need at least one coach for booking types
      await expect(seedTestDatabase(mockPrisma)).rejects.toThrow();
    });
  });

  describe('cleanTable()', () => {
    it('should delete all records from specified table', async () => {
      mockPrisma.account.deleteMany.mockResolvedValue({ count: 5 });

      await cleanTable(mockPrisma, 'account');

      expect(mockPrisma.account.deleteMany).toHaveBeenCalled();
    });

    it('should throw error for non-existent table', async () => {
      await expect(
        cleanTable(mockPrisma as unknown as PrismaService, 'nonExistentTable')
      ).rejects.toThrow();
    });
  });

  describe('countRecords()', () => {
    it('should return count of records in table', async () => {
      mockPrisma.account.count.mockResolvedValue(10);

      const count = await countRecords(mockPrisma, 'account');

      expect(count).toBe(10);
      expect(mockPrisma.account.count).toHaveBeenCalledWith({ where: {} });
    });

    it('should apply where conditions', async () => {
      mockPrisma.account.count.mockResolvedValue(3);

      const count = await countRecords(mockPrisma as unknown as PrismaService, 'account', {
        role: 'USER',
      });

      expect(count).toBe(3);
      expect(mockPrisma.account.count).toHaveBeenCalledWith({
        where: { role: 'USER' },
      });
    });

    it('should throw error for non-existent table', async () => {
      await expect(
        countRecords(mockPrisma as unknown as PrismaService, 'invalidTable')
      ).rejects.toThrow();
    });
  });

  describe('findRecord()', () => {
    it('should find and return a single record', async () => {
      const mockRecord = { id: '123', email: 'test@example.com' };
      mockPrisma.account.findFirst.mockResolvedValue(mockRecord);

      const result = await findRecord(mockPrisma as unknown as PrismaService, 'account', {
        id: '123',
      });

      expect(result).toEqual(mockRecord);
      expect(mockPrisma.account.findFirst).toHaveBeenCalledWith({
        where: { id: '123' },
      });
    });

    it('should return null if record not found', async () => {
      mockPrisma.account.findFirst.mockResolvedValue(null);

      const result = await findRecord(mockPrisma as unknown as PrismaService, 'account', {
        id: 'nonexistent',
      });

      expect(result).toBeNull();
    });

    it('should throw error for non-existent table', async () => {
      await expect(
        findRecord(mockPrisma as unknown as PrismaService, 'invalidTable', {})
      ).rejects.toThrow();
    });
  });

  describe('findRecords()', () => {
    it('should find and return multiple records', async () => {
      const mockRecords = [
        { id: '1', email: 'user1@test.com' },
        { id: '2', email: 'user2@test.com' },
      ];
      mockPrisma.account.findMany.mockResolvedValue(mockRecords);

      const result = await findRecords(mockPrisma, 'account');

      expect(result).toEqual(mockRecords);
      expect(mockPrisma.account.findMany).toHaveBeenCalledWith({ where: {} });
    });

    it('should apply where conditions', async () => {
      mockPrisma.account.findMany.mockResolvedValue([]);

      await findRecords(mockPrisma, 'account', { role: 'COACH' });

      expect(mockPrisma.account.findMany).toHaveBeenCalledWith({
        where: { role: 'COACH' },
      });
    });

    it('should return empty array if no records found', async () => {
      mockPrisma.account.findMany.mockResolvedValue([]);

      const result = await findRecords(mockPrisma, 'account');

      expect(result).toEqual([]);
    });
  });

  describe('createRecord()', () => {
    it('should create and return a new record', async () => {
      const newData = { email: 'new@test.com', name: 'New User' };
      const createdRecord = { id: '123', ...newData };

      mockPrisma.account.create.mockResolvedValue(createdRecord);

      const result = await createRecord(mockPrisma, 'account', newData);

      expect(result).toEqual(createdRecord);
      expect(mockPrisma.account.create).toHaveBeenCalledWith({ data: newData });
    });

    it('should throw error for non-existent table', async () => {
      await expect(
        createRecord(mockPrisma as unknown as PrismaService, 'invalidTable', {})
      ).rejects.toThrow();
    });
  });

  describe('updateRecord()', () => {
    it('should update and return the updated record', async () => {
      const updateData = { name: 'Updated Name' };
      const updatedRecord = { id: '123', name: 'Updated Name' };

      mockPrisma.account.update.mockResolvedValue(updatedRecord);

      const result = await updateRecord(
        mockPrisma as unknown as PrismaService,
        'account',
        { id: '123' },
        updateData
      );

      expect(result).toEqual(updatedRecord);
      expect(mockPrisma.account.update).toHaveBeenCalledWith({
        where: { id: '123' },
        data: updateData,
      });
    });

    it('should throw error for non-existent table', async () => {
      await expect(
        updateRecord(mockPrisma as unknown as PrismaService, 'invalidTable', {}, {})
      ).rejects.toThrow();
    });
  });

  describe('deleteRecord()', () => {
    it('should delete and return the deleted record', async () => {
      const deletedRecord = { id: '123', email: 'deleted@test.com' };

      mockPrisma.account.delete.mockResolvedValue(deletedRecord);

      const result = await deleteRecord(mockPrisma as unknown as PrismaService, 'account', {
        id: '123',
      });

      expect(result).toEqual(deletedRecord);
      expect(mockPrisma.account.delete).toHaveBeenCalledWith({
        where: { id: '123' },
      });
    });

    it('should throw error for non-existent table', async () => {
      await expect(
        deleteRecord(mockPrisma as unknown as PrismaService, 'invalidTable', {})
      ).rejects.toThrow();
    });
  });

  describe('deleteRecords()', () => {
    it('should delete multiple records', async () => {
      mockPrisma.account.deleteMany.mockResolvedValue({ count: 5 });

      const result = await deleteRecords(mockPrisma as unknown as PrismaService, 'account', {
        role: 'USER',
      });

      expect(result).toEqual({ count: 5 });
      expect(mockPrisma.account.deleteMany).toHaveBeenCalledWith({
        where: { role: 'USER' },
      });
    });

    it('should delete all records when no where condition provided', async () => {
      mockPrisma.account.deleteMany.mockResolvedValue({ count: 10 });

      await deleteRecords(mockPrisma, 'account');

      expect(mockPrisma.account.deleteMany).toHaveBeenCalledWith({ where: {} });
    });
  });

  describe('recordExists()', () => {
    it('should return true if record exists', async () => {
      mockPrisma.account.findFirst.mockResolvedValue({ id: '123' });

      const exists = await recordExists(mockPrisma as unknown as PrismaService, 'account', {
        id: '123',
      });

      expect(exists).toBe(true);
    });

    it('should return false if record does not exist', async () => {
      mockPrisma.account.findFirst.mockResolvedValue(null);

      const exists = await recordExists(mockPrisma as unknown as PrismaService, 'account', {
        id: 'nonexistent',
      });

      expect(exists).toBe(false);
    });
  });

  describe('waitForRecord()', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should return record when found immediately', async () => {
      const mockRecord = { id: '123', email: 'test@test.com' };
      mockPrisma.account.findFirst.mockResolvedValue(mockRecord);

      const resultPromise = waitForRecord(
        mockPrisma as unknown as PrismaService,
        'account',
        { id: '123' },
        5000
      );

      const result = await resultPromise;

      expect(result).toEqual(mockRecord);
    });

    it('should poll until record is found', async () => {
      const mockRecord = { id: '123', email: 'test@test.com' };

      // Return null first two times, then return the record
      mockPrisma.account.findFirst
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null)
        .mockResolvedValue(mockRecord);

      const resultPromise = waitForRecord(
        mockPrisma as unknown as PrismaService,
        'account',
        { id: '123' },
        5000,
        100
      );

      // Advance timers to trigger polling
      await jest.advanceTimersByTimeAsync(250);

      const result = await resultPromise;

      expect(result).toEqual(mockRecord);
      expect(mockPrisma.account.findFirst).toHaveBeenCalledTimes(3);
    });

    it('should throw error if timeout is reached', async () => {
      mockPrisma.account.findFirst.mockResolvedValue(null);

      const resultPromise = waitForRecord(
        mockPrisma as unknown as PrismaService,
        'account',
        { id: '123' },
        500,
        100
      );

      // Advance past timeout
      await jest.advanceTimersByTimeAsync(600);

      await expect(resultPromise).rejects.toThrow();
    });
  });
});
