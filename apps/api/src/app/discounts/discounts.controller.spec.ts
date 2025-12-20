import { Decimal } from '@prisma/client/runtime/client';
import { createControllerTest, DiscountMockFactory } from '@test-utils';

import { DiscountsController } from './discounts.controller';
import { DiscountsService } from './discounts.service';
import { DiscountResponseDto } from './dto/discount.dto';

describe('DiscountsController', () => {
  let controller: DiscountsController;
  let service: jest.Mocked<DiscountsService>;
  let discountFactory: DiscountMockFactory;

  const mockService = {
    validateCode: jest.fn(),
    findByCoach: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  };

  beforeEach(async () => {
    discountFactory = new DiscountMockFactory();

    const result = await createControllerTest({
      controllerClass: DiscountsController,
      serviceClass: DiscountsService,
      mockService,
    });

    controller = result.controller;
    service = result.service;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  function toDiscountResponse(
    mockDiscount: ReturnType<typeof discountFactory.create>
  ): DiscountResponseDto {
    return {
      id: mockDiscount.id,
      code: mockDiscount.code,
      amount: new Decimal(mockDiscount.amount),
      expiry: mockDiscount.expiry,
      useCount: mockDiscount.useCount,
      maxUsage: mockDiscount.maxUsage,
      isActive: mockDiscount.isActive,
      coachId: mockDiscount.coachId,
      createdAt: mockDiscount.createdAt.toISOString(),
      updatedAt: mockDiscount.updatedAt.toISOString(),
    };
  }

  describe('validate', () => {
    it('should validate a discount code', async () => {
      const validateDto = { code: 'SUMMER2024' };
      const expectedResponse = {
        code: 'SUMMER2024',
        amount: new Decimal(10),
        isValid: true,
      };
      service.validateCode.mockResolvedValue(expectedResponse);

      const result = await controller.validate(validateDto);

      expect(result).toEqual(expectedResponse);
      expect(service.validateCode).toHaveBeenCalledWith('SUMMER2024');
    });
  });

  describe('findByCoach', () => {
    it('should return all discounts for the authenticated coach', async () => {
      const mockDiscounts = [
        toDiscountResponse(discountFactory.create({ code: 'DISCOUNT1', coachId: 'coach-123' })),
        toDiscountResponse(discountFactory.create({ code: 'DISCOUNT2', coachId: 'coach-123' })),
      ];
      service.findByCoach.mockResolvedValue(mockDiscounts);

      const result = await controller.findByCoach('coach-123');

      expect(result).toHaveLength(2);
      expect(service.findByCoach).toHaveBeenCalledWith('coach-123');
    });

    it('should return empty array when coach has no discounts', async () => {
      service.findByCoach.mockResolvedValue([]);

      const result = await controller.findByCoach('coach-456');

      expect(result).toEqual([]);
      expect(service.findByCoach).toHaveBeenCalledWith('coach-456');
    });
  });

  describe('create', () => {
    it('should create a new discount', async () => {
      const createDto = {
        code: 'NEWCODE',
        amount: 15,
        expiry: '2025-12-31T23:59:59Z',
        maxUsage: 50,
        isActive: true,
      };
      const mockDiscount = toDiscountResponse(
        discountFactory.create({
          code: 'NEWCODE',
          amount: 15,
          maxUsage: 50,
          coachId: 'coach-123',
        })
      );
      service.create.mockResolvedValue(mockDiscount);

      const result = await controller.create(createDto, 'coach-123');

      expect(result.code).toBe('NEWCODE');
      expect(service.create).toHaveBeenCalledWith(createDto, 'coach-123');
    });
  });

  describe('update', () => {
    it('should update an existing discount', async () => {
      const updateDto = {
        amount: 20,
        maxUsage: 200,
      };
      const updatedDiscount = toDiscountResponse(
        discountFactory.create({
          code: 'SUMMER2024',
          amount: 20,
          maxUsage: 200,
          coachId: 'coach-123',
        })
      );
      service.update.mockResolvedValue(updatedDiscount);

      const result = await controller.update('SUMMER2024', updateDto, 'coach-123');

      expect(result.amount).toEqual(new Decimal(20));
      expect(service.update).toHaveBeenCalledWith('SUMMER2024', updateDto, 'coach-123');
    });

    it('should update discount with new expiry', async () => {
      const updateDto = {
        expiry: '2026-06-30T23:59:59Z',
      };
      const updatedDiscount = toDiscountResponse(
        discountFactory.create({
          code: 'SUMMER2024',
          expiry: new Date('2026-06-30T23:59:59Z'),
          coachId: 'coach-123',
        })
      );
      service.update.mockResolvedValue(updatedDiscount);

      const result = await controller.update('SUMMER2024', updateDto, 'coach-123');

      expect(result).toBeDefined();
      expect(service.update).toHaveBeenCalledWith('SUMMER2024', updateDto, 'coach-123');
    });
  });

  describe('remove', () => {
    it('should remove a discount', async () => {
      service.remove.mockResolvedValue(undefined);

      await controller.remove('SUMMER2024', 'coach-123');

      expect(service.remove).toHaveBeenCalledWith('SUMMER2024', 'coach-123');
    });
  });
});
