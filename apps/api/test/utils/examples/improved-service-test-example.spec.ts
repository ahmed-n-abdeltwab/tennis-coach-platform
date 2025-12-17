/**
 * Example of using BaseServiceTest with configuration-based approach
 *
 * Benefits:
 * - Zero boilerplate code
 * - Direct property access (test.service, test.prisma)
 * - Built-in helper methods
 * - Full type safety maintained
 */

import { NotFoundException } from '@nestjs/common';
import { Decimal } from '@prisma/client/runtime/client';

import { BookingTypesService } from '../../../src/app/booking-types/booking-types.service';
import { CreateBookingTypeDto } from '../../../src/app/booking-types/dto/booking-type.dto';
import { PrismaService } from '../../../src/app/prisma/prisma.service';
import { BaseServiceTest } from '../base/base-service';

describe('BookingTypesService (Example)', () => {
  let test: BaseServiceTest<BookingTypesService, PrismaService>;
  let mockPrisma: any;

  beforeEach(async () => {
    // Create mock PrismaService
    mockPrisma = {
      $connect: jest.fn(),
      $disconnect: jest.fn(),
      $transaction: jest.fn(),
      bookingType: {
        create: jest.fn(),
        findMany: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
    };

    // Create test instance with simple configuration
    test = new BaseServiceTest({
      serviceClass: BookingTypesService,
      mocks: [{ provide: PrismaService, useValue: mockPrisma }],
    });

    await test.setup();
  });

  afterEach(async () => {
    await test.cleanup();
  });

  describe('findAll', () => {
    it('should return all active booking types', async () => {
      const mockBookingTypes = [
        {
          id: 'booking-1',
          name: 'Personal Training',
          basePrice: 99.99,
          isActive: true,
          coachId: 'coach-1',
          createdAt: new Date(),
          updatedAt: new Date(),
          coach: {
            id: 'coach-1',
            name: 'Coach One',
            credentials: 'Certified',
          },
        },
      ];

      // Direct access to prisma mock - no need for getPrisma() accessor
      test.prisma.bookingType.findMany.mockResolvedValue(mockBookingTypes);

      // Direct access to service - no need for getService() accessor
      const result = await test.service.findAll();

      expect(result).toHaveLength(1);
      expect(test.prisma.bookingType.findMany).toHaveBeenCalledWith({
        where: { isActive: true },
        include: {
          coach: {
            select: {
              id: true,
              name: true,
              credentials: true,
            },
          },
        },
      });
    });
  });

  describe('create', () => {
    it('should create a new booking type', async () => {
      const createDto: CreateBookingTypeDto = {
        name: 'Personal Training',
        description: 'One-on-one training',
        basePrice: new Decimal(99.99),
        isActive: true,
      };

      const mockCreated = {
        id: 'booking-1',
        ...createDto,
        coachId: 'coach-1',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // Use built-in helper method - no need to create your own
      test.mockReturn(test.prisma.bookingType.create, mockCreated);

      const result = await test.service.create(createDto, 'coach-1');

      expect(result).toMatchObject({
        id: 'booking-1',
        name: createDto.name,
      });
    });
  });

  describe('findOne', () => {
    it('should throw NotFoundException when not found', async () => {
      // Use built-in helper method
      test.mockReturn(test.prisma.bookingType.findUnique, null);

      await expect(test.service.findOne('non-existent')).rejects.toThrow(NotFoundException);
    });
  });
});
