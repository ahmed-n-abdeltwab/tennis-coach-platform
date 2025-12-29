import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { Decimal } from '@prisma/client/runtime/client';
import { ServiceTest } from '@test-utils';

import { PrismaService } from '../prisma/prisma.service';

import { BookingTypesService } from './booking-types.service';
import { CreateBookingTypeDto, UpdateBookingTypeDto } from './dto/booking-type.dto';

describe('BookingTypesService', () => {
  let test: ServiceTest<BookingTypesService, PrismaService>;

  beforeEach(async () => {
    // Create mock PrismaService
    const mockPrisma = {
      $connect: jest.fn(),
      $disconnect: jest.fn(),
      $transaction: jest.fn(),
      bookingType: {
        create: jest.fn(),
        findMany: jest.fn(),
        findFirst: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
    };

    // Create test instance with configuration - no class extension needed!
    test = new ServiceTest({
      serviceClass: BookingTypesService,
      mocks: [{ provide: PrismaService, useValue: mockPrisma }],
    });

    await test.setup();
  });

  afterEach(async () => {
    await test.cleanup();
  });

  describe('findAll', () => {
    it('should return all active booking types with coach information', async () => {
      const mockBookingTypes = test.factory.bookingType.createManyWithNulls(1, {
        id: 'booking-type-1',
        name: 'Personal Training',
        coachId: 'coach-1',
      });

      // Direct access to prisma - no getPrisma() needed!
      test.prisma.bookingType.findMany.mockResolvedValue(mockBookingTypes);

      // Direct access to service - no getService() needed!
      const result = await test.service.findAll();

      expect(result).toHaveLength(1);
      expect(test.prisma.bookingType.findMany).toHaveBeenCalledWith({
        where: { isActive: true },
      });
    });
  });

  describe('findByCoach', () => {
    it('should return booking types for specific coach', async () => {
      const coachId = 'coach-1';
      const mockBookingTypes = test.factory.bookingType.createManyWithNulls(1, {
        id: 'booking-type-1',
        name: 'Personal Training',
        coachId: 'coach-1',
      });

      test.prisma.bookingType.findMany.mockResolvedValue(mockBookingTypes);

      const result = await test.service.findByCoach(coachId);

      expect(result).toHaveLength(1);
      expect(test.prisma.bookingType.findMany).toHaveBeenCalledWith({
        where: {
          coachId,
          isActive: true,
        },
      });
    });
  });

  describe('findOne', () => {
    it('should return booking type by id', async () => {
      const mockBookingType = test.factory.bookingType.createWithNulls({
        id: 'booking-type-1',
        name: 'Personal Training',
      });

      test.prisma.bookingType.findFirst.mockResolvedValue(mockBookingType);

      const result = await test.service.findOne('booking-type-1');

      expect(result).toMatchObject({
        id: 'booking-type-1',
        name: 'Personal Training',
      });
      expect(test.prisma.bookingType.findFirst).toHaveBeenCalledWith({
        where: { id: 'booking-type-1' },
      });
    });

    it('should throw NotFoundException when booking type not found', async () => {
      test.prisma.bookingType.findFirst.mockResolvedValue(null);

      await expect(test.service.findOne('non-existent-id')).rejects.toThrow(NotFoundException);
    });
  });

  describe('create', () => {
    it('should create a new booking type successfully', async () => {
      const createDto: CreateBookingTypeDto = {
        name: 'Personal Training',
        description: 'One-on-one training',
        basePrice: new Decimal(99.99),
      };

      const coachId = 'coach-1';
      const bookingTypeId = 'booking-type-1';

      const mockBookingType = test.factory.bookingType.createWithNulls({
        id: bookingTypeId,
        coachId,
        ...createDto,
      });

      test.prisma.bookingType.create.mockResolvedValue(mockBookingType);

      const result = await test.service.create(createDto, coachId);

      expect(result).toMatchObject({
        id: bookingTypeId,
        name: createDto.name,
        coachId,
      });
      expect(test.prisma.bookingType.create).toHaveBeenCalledWith({
        data: {
          ...createDto,
          coachId,
        },
      });
    });
  });

  describe('update', () => {
    it('should update booking type successfully when owner', async () => {
      const updateDto: UpdateBookingTypeDto = {
        name: 'Updated Training',
        basePrice: new Decimal(149.99),
      };

      const coachId = 'coach-1';
      const bookingTypeId = 'booking-type-1';

      const existingBookingType = test.factory.bookingType.createWithNulls({
        id: bookingTypeId,
        coachId,
      });

      const updatedBookingType = {
        ...existingBookingType,
        ...updateDto,
      };

      test.prisma.bookingType.findFirst.mockResolvedValue(existingBookingType);
      test.prisma.bookingType.update.mockResolvedValue(updatedBookingType);

      const result = await test.service.update(bookingTypeId, updateDto, coachId);

      expect(result).toMatchObject({
        id: bookingTypeId,
        name: 'Updated Training',
      });
      expect(test.prisma.bookingType.findFirst).toHaveBeenCalledWith({
        where: { id: bookingTypeId },
      });
      expect(test.prisma.bookingType.update).toHaveBeenCalledWith({
        where: { id: bookingTypeId },
        data: updateDto,
      });
    });

    it('should throw NotFoundException when booking type not found', async () => {
      const updateDto: UpdateBookingTypeDto = {
        name: 'Updated Training',
      };

      test.prisma.bookingType.findFirst.mockResolvedValue(null);

      await expect(test.service.update('non-existent-id', updateDto, 'coach-1')).rejects.toThrow(
        NotFoundException
      );
      expect(test.prisma.bookingType.update).not.toHaveBeenCalled();
    });

    it('should throw ForbiddenException when not the owner', async () => {
      const updateDto: UpdateBookingTypeDto = {
        name: 'Updated Training',
      };
      const bookingTypeId = 'booking-type-1';

      const existingBookingType = test.factory.bookingType.createWithNulls({ id: bookingTypeId });

      test.prisma.bookingType.findFirst.mockResolvedValue(existingBookingType);

      await expect(
        test.service.update(bookingTypeId, updateDto, 'different-coach')
      ).rejects.toThrow(ForbiddenException);
      expect(test.prisma.bookingType.update).not.toHaveBeenCalled();
    });
  });

  describe('remove', () => {
    it('should soft delete booking type successfully when owner', async () => {
      const coachId = 'coach-1';
      const bookingTypeId = 'booking-type-1';

      const existingBookingType = test.factory.bookingType.createWithNulls({
        id: bookingTypeId,
        coachId,
      });

      test.prisma.bookingType.findFirst.mockResolvedValue(existingBookingType);
      test.prisma.bookingType.update.mockResolvedValue({
        ...existingBookingType,
        isActive: false,
      });

      await test.service.remove(bookingTypeId, coachId);

      expect(test.prisma.bookingType.findFirst).toHaveBeenCalledWith({
        where: { id: bookingTypeId },
      });
      expect(test.prisma.bookingType.update).toHaveBeenCalledWith({
        where: { id: bookingTypeId },
        data: { isActive: false },
      });
    });

    it('should throw NotFoundException when booking type not found', async () => {
      test.prisma.bookingType.findFirst.mockResolvedValue(null);

      await expect(test.service.remove('non-existent-id', 'coach-1')).rejects.toThrow(
        NotFoundException
      );
      expect(test.prisma.bookingType.update).not.toHaveBeenCalled();
    });

    it('should throw ForbiddenException when not the owner', async () => {
      const bookingTypeId = 'booking-type-1';

      const existingBookingType = test.factory.bookingType.createWithNulls({ id: bookingTypeId });

      test.prisma.bookingType.findFirst.mockResolvedValue(existingBookingType);

      await expect(test.service.remove(bookingTypeId, 'different-coach')).rejects.toThrow(
        ForbiddenException
      );
      expect(test.prisma.bookingType.update).not.toHaveBeenCalled();
    });
  });
});
