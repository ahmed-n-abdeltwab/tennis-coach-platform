import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { Decimal } from '@prisma/client/runtime/client';
import { ServiceTest } from '@test-utils';

import { PrismaService } from '../prisma/prisma.service';

import { DiscountsService } from './discounts.service';

interface DiscountMocks {
  PrismaService: {
    discount: {
      findFirst: jest.Mock;
      findMany: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
    };
  };
}

describe('DiscountsService', () => {
  let test: ServiceTest<DiscountsService, DiscountMocks>;

  beforeEach(async () => {
    test = new ServiceTest({
      service: DiscountsService,
      providers: [
        {
          provide: PrismaService,
          useValue: {
            discount: {
              findFirst: jest.fn(),
              findMany: jest.fn(),
              create: jest.fn(),
              update: jest.fn(),
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

  describe('findDiscountInternal behavior', () => {
    describe('throwIfNotFound option', () => {
      it('should throw NotFoundException when throwIfNotFound=true and no results (via findByCode)', async () => {
        test.mocks.PrismaService.discount.findFirst.mockResolvedValue(null);

        await expect(test.service.findByCode('NONEXISTENT')).rejects.toThrow(NotFoundException);
        await expect(test.service.findByCode('NONEXISTENT')).rejects.toThrow('Discount not found');
      });

      it('should return null when throwIfNotFound=false and no results (via findActiveByCode)', async () => {
        test.mocks.PrismaService.discount.findFirst.mockResolvedValue(null);

        const result = await test.service.findActiveByCode('NONEXISTENT');

        expect(result).toBeNull();
      });
    });

    describe('isMany option', () => {
      it('should return array when isMany=true (via findByCoach)', async () => {
        const mockDiscounts = [
          test.factory.discount.createWithNulls({ code: 'CODE1' }),
          test.factory.discount.createWithNulls({ code: 'CODE2' }),
        ];
        test.mocks.PrismaService.discount.findMany.mockResolvedValue(mockDiscounts);

        const result = await test.service.findByCoach('coach-123');

        expect(Array.isArray(result)).toBe(true);
        expect(result).toHaveLength(2);
        expect(test.mocks.PrismaService.discount.findMany).toHaveBeenCalled();
      });

      it('should return empty array when isMany=true and no results (via findByCoach)', async () => {
        test.mocks.PrismaService.discount.findMany.mockResolvedValue([]);

        const result = await test.service.findByCoach('coach-123');

        expect(Array.isArray(result)).toBe(true);
        expect(result).toHaveLength(0);
      });

      it('should return single object when isMany=false (via findByCode)', async () => {
        const mockDiscount = test.factory.discount.createWithNulls({ code: 'SINGLE' });
        test.mocks.PrismaService.discount.findFirst.mockResolvedValue(mockDiscount);

        const result = await test.service.findByCode('SINGLE');

        expect(Array.isArray(result)).toBe(false);
        expect(result.code).toBe('SINGLE');
        expect(test.mocks.PrismaService.discount.findFirst).toHaveBeenCalled();
      });
    });

    describe('include option', () => {
      it('should include coach relation in queries', async () => {
        const mockDiscount = test.factory.discount.createWithNulls();
        test.mocks.PrismaService.discount.findFirst.mockResolvedValue(mockDiscount);

        await test.service.findByCode('CODE');

        expect(test.mocks.PrismaService.discount.findFirst).toHaveBeenCalledWith({
          where: { code: 'CODE' },
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
    });
  });

  // ═══════════════════════════════════════════════════════════════════════
  // Tests for internal methods (findByCode, findActiveByCode)
  // ═══════════════════════════════════════════════════════════════════════

  describe('findByCode (internal method)', () => {
    it('should return discount when found', async () => {
      const mockDiscount = test.factory.discount.createWithNulls({ code: 'TESTCODE' });
      test.mocks.PrismaService.discount.findFirst.mockResolvedValue(mockDiscount);

      const result = await test.service.findByCode('TESTCODE');

      expect(result.code).toBe('TESTCODE');
      expect(test.mocks.PrismaService.discount.findFirst).toHaveBeenCalledWith({
        where: { code: 'TESTCODE' },
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
      test.mocks.PrismaService.discount.findFirst.mockResolvedValue(null);

      await expect(test.service.findByCode('INVALID')).rejects.toThrow(NotFoundException);
    });
  });

  describe('findActiveByCode (internal method)', () => {
    it('should return active discount when found', async () => {
      const mockDiscount = test.factory.discount.createWithNulls({
        code: 'ACTIVE',
        isActive: true,
      });
      test.mocks.PrismaService.discount.findFirst.mockResolvedValue(mockDiscount);

      const result = await test.service.findActiveByCode('ACTIVE');

      expect(result).not.toBeNull();
      expect(result?.code).toBe('ACTIVE');
      expect(test.mocks.PrismaService.discount.findFirst).toHaveBeenCalledWith({
        where: {
          code: 'ACTIVE',
          isActive: true,
          expiry: { gte: expect.any(Date) },
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

    it('should return null when discount not found', async () => {
      test.mocks.PrismaService.discount.findFirst.mockResolvedValue(null);

      const result = await test.service.findActiveByCode('NONEXISTENT');

      expect(result).toBeNull();
    });

    it('should return null when discount is inactive', async () => {
      // The query filters by isActive: true, so inactive discounts won't be returned
      test.mocks.PrismaService.discount.findFirst.mockResolvedValue(null);

      const result = await test.service.findActiveByCode('INACTIVE');

      expect(result).toBeNull();
    });

    it('should return null when discount is expired', async () => {
      // The query filters by expiry >= now, so expired discounts won't be returned
      test.mocks.PrismaService.discount.findFirst.mockResolvedValue(null);

      const result = await test.service.findActiveByCode('EXPIRED');

      expect(result).toBeNull();
    });
  });

  describe('validateCode', () => {
    it('should validate a valid discount code', async () => {
      const mockDiscount = test.factory.discount.createWithNulls({
        code: 'SUMMER2024',
        amount: new Decimal(10),
      });
      test.mocks.PrismaService.discount.findFirst.mockResolvedValue(mockDiscount);

      const result = await test.service.validateCode('SUMMER2024');

      expect(result.code).toBe('SUMMER2024');
      expect(result.isValid).toBe(true);
      // Amount is transformed by plainToInstance, so we check the numeric value
      expect(Number(result.amount)).toBe(10);
      expect(test.mocks.PrismaService.discount.findFirst).toHaveBeenCalledWith({
        where: {
          code: 'SUMMER2024',
          isActive: true,
          expiry: { gte: expect.any(Date) },
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

    it('should throw BadRequestException for invalid discount code', async () => {
      test.mocks.PrismaService.discount.findFirst.mockResolvedValue(null);

      await expect(test.service.validateCode('INVALID')).rejects.toThrow(BadRequestException);
      await expect(test.service.validateCode('INVALID')).rejects.toThrow(
        'Invalid or expired discount code'
      );
    });

    it('should throw BadRequestException when usage limit reached', async () => {
      const mockDiscount = test.factory.discount.createWithNulls({
        useCount: 100,
        maxUsage: 100,
      });
      test.mocks.PrismaService.discount.findFirst.mockResolvedValue(mockDiscount);

      await expect(test.service.validateCode('SUMMER2024')).rejects.toThrow(BadRequestException);
      await expect(test.service.validateCode('SUMMER2024')).rejects.toThrow(
        'Discount code usage limit reached'
      );
    });
  });

  describe('findByCoach', () => {
    it('should return all discounts for a coach', async () => {
      const mockDiscounts = [
        test.factory.discount.createWithNulls({ code: 'DISCOUNT1' }),
        test.factory.discount.createWithNulls({ code: 'DISCOUNT2' }),
      ];
      test.mocks.PrismaService.discount.findMany.mockResolvedValue(mockDiscounts);

      const result = await test.service.findByCoach('coach-123');

      expect(result).toHaveLength(2);
      expect(test.mocks.PrismaService.discount.findMany).toHaveBeenCalledWith({
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
      test.mocks.PrismaService.discount.findMany.mockResolvedValue([]);

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
      const mockDiscount = test.factory.discount.createWithNulls({
        code: 'NEWCODE',
        amount: new Decimal(15),
        maxUsage: 50,
      });
      // First call for checking existing code returns null
      test.mocks.PrismaService.discount.findFirst.mockResolvedValueOnce(null);
      test.mocks.PrismaService.discount.create.mockResolvedValue(mockDiscount);

      const result = await test.service.create(createDto, 'coach-123');

      expect(result.code).toBe('NEWCODE');
      expect(test.mocks.PrismaService.discount.findFirst).toHaveBeenCalledWith({
        where: { code: 'NEWCODE' },
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
      expect(test.mocks.PrismaService.discount.create).toHaveBeenCalledWith({
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
      const existingDiscount = test.factory.discount.createWithNulls({ code: 'NEWCODE' });
      test.mocks.PrismaService.discount.findFirst.mockResolvedValue(existingDiscount);

      await expect(test.service.create(createDto, 'coach-123')).rejects.toThrow(
        BadRequestException
      );
      await expect(test.service.create(createDto, 'coach-123')).rejects.toThrow(
        'Discount code already exists'
      );
      expect(test.mocks.PrismaService.discount.create).not.toHaveBeenCalled();
    });
  });

  describe('update', () => {
    const updateDto = {
      amount: 20,
      maxUsage: 200,
    };

    it('should update an existing discount', async () => {
      const existingDiscount = test.factory.discount.createWithNulls({ coachId: 'coach-123' });
      const updatedDiscount = test.factory.discount.createWithNulls({
        amount: new Decimal(20),
        maxUsage: 200,
        coachId: 'coach-123',
      });
      test.mocks.PrismaService.discount.findFirst.mockResolvedValue(existingDiscount);
      test.mocks.PrismaService.discount.update.mockResolvedValue(updatedDiscount);

      const result = await test.service.update('SUMMER2024', updateDto, 'coach-123');

      expect(result.amount).toEqual(20);
      expect(test.mocks.PrismaService.discount.findFirst).toHaveBeenCalledWith({
        where: { code: 'SUMMER2024', isActive: true },
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
      expect(test.mocks.PrismaService.discount.update).toHaveBeenCalledWith({
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
      const existingDiscount = test.factory.discount.createWithNulls({ coachId: 'coach-123' });
      const updateDtoWithExpiry = {
        ...updateDto,
        expiry: '2026-06-30T23:59:59Z',
      };
      const updatedDiscount = test.factory.discount.createWithNulls({
        amount: new Decimal(20),
        expiry: new Date('2026-06-30T23:59:59Z'),
        coachId: 'coach-123',
      });
      test.mocks.PrismaService.discount.findFirst.mockResolvedValue(existingDiscount);
      test.mocks.PrismaService.discount.update.mockResolvedValue(updatedDiscount);

      await test.service.update('SUMMER2024', updateDtoWithExpiry, 'coach-123');

      expect(test.mocks.PrismaService.discount.update).toHaveBeenCalledWith({
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
      test.mocks.PrismaService.discount.findFirst.mockResolvedValue(null);

      await expect(test.service.update('INVALID', updateDto, 'coach-123')).rejects.toThrow(
        NotFoundException
      );
      await expect(test.service.update('INVALID', updateDto, 'coach-123')).rejects.toThrow(
        'Discount not found'
      );
    });

    it('should throw ForbiddenException when coach is not owner', async () => {
      const existingDiscount = test.factory.discount.createWithNulls({ coachId: 'other-coach' });
      test.mocks.PrismaService.discount.findFirst.mockResolvedValue(existingDiscount);

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
      const existingDiscount = test.factory.discount.createWithNulls({ coachId: 'coach-123' });
      test.mocks.PrismaService.discount.findFirst.mockResolvedValue(existingDiscount);
      test.mocks.PrismaService.discount.update.mockResolvedValue({
        ...existingDiscount,
        isActive: false,
      });

      await test.service.remove('SUMMER2024', 'coach-123');

      expect(test.mocks.PrismaService.discount.findFirst).toHaveBeenCalledWith({
        where: { code: 'SUMMER2024' },
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
      expect(test.mocks.PrismaService.discount.update).toHaveBeenCalledWith({
        where: { code: 'SUMMER2024' },
        data: { isActive: false },
      });
    });

    it('should throw NotFoundException when discount not found', async () => {
      test.mocks.PrismaService.discount.findFirst.mockResolvedValue(null);

      await expect(test.service.remove('INVALID', 'coach-123')).rejects.toThrow(NotFoundException);
      await expect(test.service.remove('INVALID', 'coach-123')).rejects.toThrow(
        'Discount not found'
      );
    });

    it('should throw ForbiddenException when coach is not owner', async () => {
      const existingDiscount = test.factory.discount.createWithNulls({ coachId: 'other-coach' });
      test.mocks.PrismaService.discount.findFirst.mockResolvedValue(existingDiscount);

      await expect(test.service.remove('SUMMER2024', 'coach-123')).rejects.toThrow(
        ForbiddenException
      );
      await expect(test.service.remove('SUMMER2024', 'coach-123')).rejects.toThrow(
        'Not authorized to delete this discount'
      );
    });
  });
});
