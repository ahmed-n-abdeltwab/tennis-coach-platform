/**
 * Example of using BaseControllerTest with configuration-based approach
 *
 * Benefits:
 * - Zero boilerplate code
 * - All HTTP methods available directly (get, post, authenticatedGet, etc.)
 * - Built-in token creation methods
 * - Full type safety with path validation
 */

import { Role } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/client';

import { BookingTypesController } from '../../../src/app/booking-types/booking-types.controller';
import { BookingTypesService } from '../../../src/app/booking-types/booking-types.service';
import { BookingTypeResponseDto } from '../../../src/app/booking-types/dto/booking-type.dto';
import { BaseControllerTest } from '../base/base-controller';

describe('BookingTypesController (Example)', () => {
  let test: BaseControllerTest<BookingTypesController, BookingTypesService, 'booking-types'>;
  let mockService: jest.Mocked<BookingTypesService>;

  beforeEach(async () => {
    // Create mock service
    mockService = {
      findAll: jest.fn(),
      findByCoach: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      remove: jest.fn(),
    } as any;

    // Create test instance with simple configuration
    test = new BaseControllerTest({
      controllerClass: BookingTypesController,
      moduleName: 'booking-types', // Used for type-safe routing
      providers: [{ provide: BookingTypesService, useValue: mockService }],
    });

    await test.setup();
  });

  afterEach(async () => {
    await test.cleanup();
  });

  describe('GET /booking-types', () => {
    it('should return all booking types', async () => {
      const mockBookingTypes: BookingTypeResponseDto[] = [
        {
          id: 'booking-1',
          name: 'Personal Training',
          description: 'One-on-one',
          basePrice: new Decimal(99.99),
          isActive: true,
          coachId: 'coach-1',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ];

      mockService.findAll.mockResolvedValue(mockBookingTypes as any);

      // Direct access to type-safe HTTP methods - no wrapper needed!
      await test.get('/api/booking-types');

      expect(mockService.findAll).toHaveBeenCalledTimes(1);
    });
  });

  describe('GET /booking-types/:id', () => {
    it('should return a specific booking type', async () => {
      const mockBookingType: BookingTypeResponseDto = {
        id: 'booking-1',
        name: 'Personal Training',
        description: 'One-on-one',
        basePrice: new Decimal(99.99),
        isActive: true,
        coachId: 'coach-1',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      mockService.findOne.mockResolvedValue(mockBookingType as any);

      // Type-safe path with parameters
      await test.get('/api/booking-types/booking-1' as '/api/booking-types/{id}');

      expect(mockService.findOne).toHaveBeenCalledWith('booking-1');
    });
  });

  describe('POST /booking-types', () => {
    it('should create a new booking type', async () => {
      const createData = {
        name: 'Personal Training',
        description: 'One-on-one',
        basePrice: 99.99,
        isActive: true,
      };

      const mockCreated: BookingTypeResponseDto = {
        id: 'booking-1',
        ...createData,
        basePrice: new Decimal(createData.basePrice),
        coachId: 'coach-1',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      mockService.create.mockResolvedValue(mockCreated as any);

      // Built-in token creation - no need to create your own helper!
      const coachToken = await test.createRoleToken(Role.COACH, { sub: 'coach-1' });

      // Type-safe authenticated POST - no wrapper needed!
      await test.authenticatedPost('/api/booking-types', coachToken, {
        body: createData,
      });

      expect(mockService.create).toHaveBeenCalledWith(createData, 'coach-1');
    });
  });

  describe('PATCH /booking-types/:id', () => {
    it('should update a booking type', async () => {
      const updateData = {
        name: 'Updated Training',
      };

      const mockUpdated: BookingTypeResponseDto = {
        id: 'booking-1',
        name: updateData.name,
        description: 'One-on-one',
        basePrice: new Decimal(99.99),
        isActive: true,
        coachId: 'coach-1',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      mockService.update.mockResolvedValue(mockUpdated as any);

      const coachToken = await test.createRoleToken(Role.COACH, { sub: 'coach-1' });

      // Type-safe authenticated PATCH
      await test.authenticatedPatch(
        '/api/booking-types/booking-1' as '/api/booking-types/{id}',
        coachToken,
        { body: updateData }
      );

      expect(mockService.update).toHaveBeenCalledWith('booking-1', updateData, 'coach-1');
    });
  });

  describe('DELETE /booking-types/:id', () => {
    it('should delete a booking type', async () => {
      mockService.remove.mockResolvedValue(undefined);

      const coachToken = await test.createRoleToken(Role.COACH, { sub: 'coach-1' });

      // Type-safe authenticated DELETE
      await test.authenticatedDelete(
        '/api/booking-types/booking-1' as '/api/booking-types/{id}',
        coachToken
      );

      expect(mockService.remove).toHaveBeenCalledWith('booking-1', 'coach-1');
    });
  });
});
