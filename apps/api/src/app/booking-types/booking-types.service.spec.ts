import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { Decimal } from '@prisma/client/runtime/client';
import { BaseServiceTest } from '@test-utils';

import { PrismaService } from '../prisma/prisma.service';

import { BookingTypesService } from './booking-types.service';
import { CreateBookingTypeDto, UpdateBookingTypeDto } from './dto/booking-type.dto';

class BookingTypesServiceTest extends BaseServiceTest<BookingTypesService, PrismaService> {
  async setupService(): Promise<void> {
    this.service = this.module.get<BookingTypesService>(BookingTypesService);
    this.prisma = this.module.get<PrismaService>(PrismaService);
  }

  setupMocks() {
    const mockPrismaService = this.createMockPrismaService();
    return [
      {
        provide: PrismaService,
        useValue: mockPrismaService,
      },
    ];
  }

  getServiceClass(): new (...args: unknown[]) => BookingTypesService {
    return BookingTypesService as new (...args: unknown[]) => BookingTypesService;
  }

  override getProviders(): unknown[] {
    return [];
  }

  // Public accessors
  getService(): BookingTypesService {
    return this.service;
  }

  getPrisma(): any {
    return this.prisma;
  }

  mockReturn<T>(mockMethod: jest.Mock | jest.MockInstance<any, any[]>, returnValue: T): void {
    return this.mockMethodToReturn(mockMethod, returnValue);
  }

  mockThrow(mockMethod: jest.Mock | jest.MockInstance<any, any[]>, error: Error | string): void {
    return this.mockMethodToThrow(mockMethod, error);
  }
}

describe('BookingTypesService', () => {
  let test: BookingTypesServiceTest;

  beforeEach(async () => {
    test = new BookingTypesServiceTest();
    await test.setup();
  });

  afterEach(async () => {
    await test.cleanup();
  });

  describe('findAll', () => {
    it('should return all active booking types with coach information', async () => {
      const mockBookingTypes = [
        {
          id: 'booking-type-1',
          name: 'Personal Training',
          description: 'One-on-one training',
          basePrice: 99.99,
          isActive: true,
          coachId: 'coach-1',
          createdAt: new Date(),
          updatedAt: new Date(),
          coach: {
            id: 'coach-1',
            name: 'Coach One',
            credentials: 'Certified Trainer',
          },
        },
      ];

      const mockPrisma = test.getPrisma();
      mockPrisma.bookingType.findMany.mockResolvedValue(mockBookingTypes);

      const result = await test.getService().findAll();

      expect(result).toHaveLength(1);
      expect(mockPrisma.bookingType.findMany).toHaveBeenCalledWith({
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

  describe('findByCoach', () => {
    it('should return booking types for specific coach', async () => {
      const coachId = 'coach-1';
      const mockBookingTypes = [
        {
          id: 'booking-type-1',
          name: 'Personal Training',
          description: 'One-on-one training',
          basePrice: 99.99,
          isActive: true,
          coachId,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      const mockPrisma = test.getPrisma();
      mockPrisma.bookingType.findMany.mockResolvedValue(mockBookingTypes);

      const result = await test.getService().findByCoach(coachId);

      expect(result).toHaveLength(1);
      expect(mockPrisma.bookingType.findMany).toHaveBeenCalledWith({
        where: {
          coachId,
          isActive: true,
        },
        orderBy: { createdAt: 'asc' },
      });
    });
  });

  describe('findOne', () => {
    it('should return booking type by id', async () => {
      const mockBookingType = {
        id: 'booking-type-1',
        name: 'Personal Training',
        description: 'One-on-one training',
        basePrice: 99.99,
        isActive: true,
        coachId: 'coach-1',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const mockPrisma = test.getPrisma();
      mockPrisma.bookingType.findUnique.mockResolvedValue(mockBookingType);

      const result = await test.getService().findOne('booking-type-1');

      expect(result).toMatchObject({
        id: 'booking-type-1',
        name: 'Personal Training',
      });
      expect(mockPrisma.bookingType.findUnique).toHaveBeenCalledWith({
        where: { id: 'booking-type-1' },
      });
    });

    it('should throw NotFoundException when booking type not found', async () => {
      const mockPrisma = test.getPrisma();
      mockPrisma.bookingType.findUnique.mockResolvedValue(null);

      await expect(test.getService().findOne('non-existent-id')).rejects.toThrow(NotFoundException);
    });
  });

  describe('create', () => {
    it('should create a new booking type successfully', async () => {
      const createDto: CreateBookingTypeDto = {
        name: 'Personal Training',
        description: 'One-on-one training',
        basePrice: new Decimal(99.99),
        isActive: true,
      };

      const coachId = 'coach-1';

      const mockBookingType = {
        id: 'booking-type-1',
        ...createDto,
        coachId,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const mockPrisma = test.getPrisma();
      mockPrisma.bookingType.create.mockResolvedValue(mockBookingType);

      const result = await test.getService().create(createDto, coachId);

      expect(result).toMatchObject({
        id: 'booking-type-1',
        name: createDto.name,
        coachId,
      });
      expect(mockPrisma.bookingType.create).toHaveBeenCalledWith({
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

      const existingBookingType = {
        id: bookingTypeId,
        name: 'Personal Training',
        description: 'One-on-one training',
        basePrice: 99.99,
        isActive: true,
        coachId,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const updatedBookingType = {
        ...existingBookingType,
        ...updateDto,
      };

      const mockPrisma = test.getPrisma();
      mockPrisma.bookingType.findUnique.mockResolvedValue(existingBookingType);
      mockPrisma.bookingType.update.mockResolvedValue(updatedBookingType);

      const result = await test.getService().update(bookingTypeId, updateDto, coachId);

      expect(result).toMatchObject({
        id: bookingTypeId,
        name: 'Updated Training',
      });
      expect(mockPrisma.bookingType.findUnique).toHaveBeenCalledWith({
        where: { id: bookingTypeId },
      });
      expect(mockPrisma.bookingType.update).toHaveBeenCalledWith({
        where: { id: bookingTypeId },
        data: updateDto,
      });
    });

    it('should throw NotFoundException when booking type not found', async () => {
      const updateDto: UpdateBookingTypeDto = {
        name: 'Updated Training',
      };

      const mockPrisma = test.getPrisma();
      mockPrisma.bookingType.findUnique.mockResolvedValue(null);

      await expect(
        test.getService().update('non-existent-id', updateDto, 'coach-1')
      ).rejects.toThrow(NotFoundException);
      expect(mockPrisma.bookingType.update).not.toHaveBeenCalled();
    });

    it('should throw ForbiddenException when not the owner', async () => {
      const updateDto: UpdateBookingTypeDto = {
        name: 'Updated Training',
      };

      const existingBookingType = {
        id: 'booking-type-1',
        name: 'Personal Training',
        description: 'One-on-one training',
        basePrice: 99.99,
        isActive: true,
        coachId: 'coach-1',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const mockPrisma = test.getPrisma();
      mockPrisma.bookingType.findUnique.mockResolvedValue(existingBookingType);

      await expect(
        test.getService().update('booking-type-1', updateDto, 'different-coach')
      ).rejects.toThrow(ForbiddenException);
      expect(mockPrisma.bookingType.update).not.toHaveBeenCalled();
    });
  });

  describe('remove', () => {
    it('should soft delete booking type successfully when owner', async () => {
      const coachId = 'coach-1';
      const bookingTypeId = 'booking-type-1';

      const existingBookingType = {
        id: bookingTypeId,
        name: 'Personal Training',
        description: 'One-on-one training',
        basePrice: 99.99,
        isActive: true,
        coachId,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const mockPrisma = test.getPrisma();
      mockPrisma.bookingType.findUnique.mockResolvedValue(existingBookingType);
      mockPrisma.bookingType.update.mockResolvedValue({
        ...existingBookingType,
        isActive: false,
      });

      await test.getService().remove(bookingTypeId, coachId);

      expect(mockPrisma.bookingType.findUnique).toHaveBeenCalledWith({
        where: { id: bookingTypeId },
      });
      expect(mockPrisma.bookingType.update).toHaveBeenCalledWith({
        where: { id: bookingTypeId },
        data: { isActive: false },
      });
    });

    it('should throw NotFoundException when booking type not found', async () => {
      const mockPrisma = test.getPrisma();
      mockPrisma.bookingType.findUnique.mockResolvedValue(null);

      await expect(test.getService().remove('non-existent-id', 'coach-1')).rejects.toThrow(
        NotFoundException
      );
      expect(mockPrisma.bookingType.update).not.toHaveBeenCalled();
    });

    it('should throw ForbiddenException when not the owner', async () => {
      const existingBookingType = {
        id: 'booking-type-1',
        name: 'Personal Training',
        description: 'One-on-one training',
        basePrice: 99.99,
        isActive: true,
        coachId: 'coach-1',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const mockPrisma = test.getPrisma();
      mockPrisma.bookingType.findUnique.mockResolvedValue(existingBookingType);

      await expect(test.getService().remove('booking-type-1', 'different-coach')).rejects.toThrow(
        ForbiddenException
      );
      expect(mockPrisma.bookingType.update).not.toHaveBeenCalled();
    });
  });
});
