import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { Decimal } from '@prisma/client/runtime/client';
import { DiscountMockFactory, ServiceTest } from '@test-utils';

import { PrismaService } from '../prisma/prisma.service';

import { DiscountsService } from './discounts.service';

describe('DiscountsService', () => {
  let test: ServiceTest<DiscountsService, PrismaService>;
  let discountFactory: DiscountMockFactory;

  const mockCoach = {
    id: 'coach-123',
    name: 'Test Coach',
    email: 'coach@test.com',
  };

  beforeEach(async () => {
    discountFactory = new DiscountMockFactory();

    const mockPrisma = {
      $connect: jest.fn(),
      $disconnect: jest.fn(),
      $transaction: jest.fn(),
      $executeRaw: jest.fn(),
      $queryRaw: jest.fn(),
      discount: {
        findFirst: jest.fn(),
        findMany: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
    };

    test = new ServiceTest({
      serviceClass: DiscountsService,
      mocks: [{ provide: PrismaService, useValue: mockPrisma }],
    });

    await test.setup();
  });

  afterEach(async () => {
    await test.cleanup();
  });

  function createMockDiscount(overrides: Partial<ReturnType<typeof discountFactory.create>> = {}) {
    const mock = discountFactory.create(overrides);
    return {
      ...mock,
      amount: new Decimal(mock.amount),
      coach: mockCoach,
    };
  }

  describe('validateCode', () => {
    it('should validate a valid discount code', async () => {
      const mockDiscount = createMockDiscount({ code: 'SUMMER2024', amount: 10 });
      test.prisma.discount.findFirst.mockResolvedValue(mockDiscount);

      const result = await test.service.validateCode('SUMMER2024');

      expect(result).toEqual({
        code: 'SUMMER2024',
        amount: new Decimal(10),
        isValid: true,
      });
      expect(test.prisma.discount.findFirst).toHaveBeenCalledWith({
        where: {
          code: 'SUMMER2024',
          isActive: true,
          expiry: { gte: expect.any(Date) },
        },
      });
    });

    it('should throw BadRequestException for invalid discount code', async () => {
      test.prisma.discount.findFirst.mockResolvedValue(null);

      await expect(test.service.validateCode('INVALID')).rejects.toThrow(BadRequestException);
      await expect(test.service.validateCode('INVALID')).rejects.toThrow(
        'Invalid or expired discount code'
      );
    });

    it('should throw BadRequestException when usage limit reached', async () => {
      const mockDiscount = createMockDiscount({ useCount: 100, maxUsage: 100 });
      test.prisma.discount.findFirst.mockResolvedValue(mockDiscount);

      await expect(test.service.validateCode('SUMMER2024')).rejects.toThrow(BadRequestException);
      await expect(test.service.validateCode('SUMMER2024')).rejects.toThrow(
        'Discount code usage limit reached'
      );
    });
  });

  describe('findByCoach', () => {
    it('should return all discounts for a coach', async () => {
      const mockDiscounts = [
        createMockDiscount({ code: 'DISCOUNT1' }),
        createMockDiscount({ code: 'DISCOUNT2' }),
      ];
      test.prisma.discount.findMany.mockResolvedValue(mockDiscounts);

      const result = await test.service.findByCoach('coach-123');

      expect(result).toHaveLength(2);
      expect(test.prisma.discount.findMany).toHaveBeenCalledWith({
        where: { coachId: 'coach-123' },
        orderBy: { createdAt: 'desc' },
        include: {
          coach: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      });
    });

    it('should return empty array when coach has no discounts', async () => {
      test.prisma.discount.findMany.mockResolvedValue([]);

      const result = await test.service.findByCoach('coach-456');

      expect(result).toEqual([]);
    });
  });

  describe('create', () => {
    const createDto = {
      code: 'NEWCODE',
      amount: 15,
      expiry: '2025-12-31T23:59:59Z',
      maxUsage: 50,
      isActive: true,
    };

    it('should create a new discount', async () => {
      const mockDiscount = createMockDiscount({
        code: 'NEWCODE',
        amount: 15,
        maxUsage: 50,
      });
      test.prisma.discount.findUnique.mockResolvedValue(null);
      test.prisma.discount.create.mockResolvedValue(mockDiscount);

      const result = await test.service.create(createDto, 'coach-123');

      expect(result.code).toBe('NEWCODE');
      expect(test.prisma.discount.findUnique).toHaveBeenCalledWith({
        where: { code: 'NEWCODE' },
      });
      expect(test.prisma.discount.create).toHaveBeenCalledWith({
        data: {
          ...createDto,
          expiry: new Date(createDto.expiry),
          coachId: 'coach-123',
        },
        include: {
          coach: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      });
    });

    it('should throw BadRequestException when code already exists', async () => {
      const existingDiscount = createMockDiscount({ code: 'NEWCODE' });
      test.prisma.discount.findUnique.mockResolvedValue(existingDiscount);

      await expect(test.service.create(createDto, 'coach-123')).rejects.toThrow(
        BadRequestException
      );
      await expect(test.service.create(createDto, 'coach-123')).rejects.toThrow(
        'Discount code already exists'
      );
      expect(test.prisma.discount.create).not.toHaveBeenCalled();
    });
  });

  describe('update', () => {
    const updateDto = {
      amount: 20,
      maxUsage: 200,
    };

    it('should update an existing discount', async () => {
      const existingDiscount = createMockDiscount({ coachId: 'coach-123' });
      const updatedDiscount = createMockDiscount({
        amount: 20,
        maxUsage: 200,
        coachId: 'coach-123',
      });
      test.prisma.discount.findUnique.mockResolvedValue(existingDiscount);
      test.prisma.discount.update.mockResolvedValue(updatedDiscount);

      const result = await test.service.update('SUMMER2024', updateDto, 'coach-123');

      expect(result.amount).toEqual(20);
      expect(test.prisma.discount.update).toHaveBeenCalledWith({
        where: { code: 'SUMMER2024' },
        data: {
          ...updateDto,
          expiry: undefined,
        },
        include: {
          coach: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      });
    });

    it('should update discount with new expiry date', async () => {
      const existingDiscount = createMockDiscount({ coachId: 'coach-123' });
      const updateDtoWithExpiry = {
        ...updateDto,
        expiry: '2026-06-30T23:59:59Z',
      };
      const updatedDiscount = createMockDiscount({
        amount: 20,
        expiry: new Date('2026-06-30T23:59:59Z'),
        coachId: 'coach-123',
      });
      test.prisma.discount.findUnique.mockResolvedValue(existingDiscount);
      test.prisma.discount.update.mockResolvedValue(updatedDiscount);

      await test.service.update('SUMMER2024', updateDtoWithExpiry, 'coach-123');

      expect(test.prisma.discount.update).toHaveBeenCalledWith({
        where: { code: 'SUMMER2024' },
        data: {
          ...updateDtoWithExpiry,
          expiry: new Date('2026-06-30T23:59:59Z'),
        },
        include: {
          coach: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      });
    });

    it('should throw NotFoundException when discount not found', async () => {
      test.prisma.discount.findUnique.mockResolvedValue(null);

      await expect(test.service.update('INVALID', updateDto, 'coach-123')).rejects.toThrow(
        NotFoundException
      );
      await expect(test.service.update('INVALID', updateDto, 'coach-123')).rejects.toThrow(
        'Discount not found'
      );
    });

    it('should throw NotFoundException when discount is inactive', async () => {
      const inactiveDiscount = createMockDiscount({ isActive: false, coachId: 'coach-123' });
      test.prisma.discount.findUnique.mockResolvedValue(inactiveDiscount);

      await expect(test.service.update('SUMMER2024', updateDto, 'coach-123')).rejects.toThrow(
        NotFoundException
      );
    });

    it('should throw ForbiddenException when coach is not owner', async () => {
      const existingDiscount = createMockDiscount({ coachId: 'other-coach' });
      test.prisma.discount.findUnique.mockResolvedValue(existingDiscount);

      await expect(test.service.update('SUMMER2024', updateDto, 'coach-123')).rejects.toThrow(
        ForbiddenException
      );
      await expect(test.service.update('SUMMER2024', updateDto, 'coach-123')).rejects.toThrow(
        'Not authorized to update this discount'
      );
    });
  });

  describe('remove', () => {
    it('should soft delete a discount by setting isActive to false', async () => {
      const existingDiscount = createMockDiscount({ coachId: 'coach-123' });
      test.prisma.discount.findUnique.mockResolvedValue(existingDiscount);
      test.prisma.discount.update.mockResolvedValue({ ...existingDiscount, isActive: false });

      await test.service.remove('SUMMER2024', 'coach-123');

      expect(test.prisma.discount.update).toHaveBeenCalledWith({
        where: { code: 'SUMMER2024' },
        data: { isActive: false },
      });
    });

    it('should throw NotFoundException when discount not found', async () => {
      test.prisma.discount.findUnique.mockResolvedValue(null);

      await expect(test.service.remove('INVALID', 'coach-123')).rejects.toThrow(NotFoundException);
      await expect(test.service.remove('INVALID', 'coach-123')).rejects.toThrow(
        'Discount not found'
      );
    });

    it('should throw ForbiddenException when coach is not owner', async () => {
      const existingDiscount = createMockDiscount({ coachId: 'other-coach' });
      test.prisma.discount.findUnique.mockResolvedValue(existingDiscount);

      await expect(test.service.remove('SUMMER2024', 'coach-123')).rejects.toThrow(
        ForbiddenException
      );
      await expect(test.service.remove('SUMMER2024', 'coach-123')).rejects.toThrow(
        'Not authorized to delete this discount'
      );
    });
  });
});
