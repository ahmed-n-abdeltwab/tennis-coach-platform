import { Role } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/client';
import { ControllerTest } from '@test-utils';

import { BookingTypesController } from './booking-types.controller';
import { BookingTypesService } from './booking-types.service';
import { BookingTypeResponseDto } from './dto/booking-type.dto';

describe('BookingTypesController', () => {
  let test: ControllerTest<BookingTypesController, BookingTypesService, 'booking-types'>;
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

    // Create test instance with configuration - no class extension needed!
    test = new ControllerTest({
      controllerClass: BookingTypesController,
      moduleName: 'booking-types',
      providers: [{ provide: BookingTypesService, useValue: mockService }],
    });

    await test.setup();
  });

  afterEach(async () => {
    await test.cleanup();
  });

  describe('GET /booking-types', () => {
    it('should call findAll service method', async () => {
      const mockBookingTypes: BookingTypeResponseDto[] = [
        {
          id: 'booking-type-1',
          name: 'Personal Training',
          description: 'One-on-one training',
          basePrice: new Decimal(99.99),
          isActive: true,
          coachId: 'coach-1',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ];

      mockService.findAll.mockResolvedValue(mockBookingTypes as any);

      // Direct access to HTTP methods - no wrapper needed!
      await test.http.get('/api/booking-types');

      expect(mockService.findAll).toHaveBeenCalledTimes(1);
    });
  });

  describe('GET /booking-types/coach/:coachId', () => {
    it('should call findByCoach with the provided coach id', async () => {
      const coachId = 'coach-1';
      const mockBookingTypes: BookingTypeResponseDto[] = [
        {
          id: 'booking-type-1',
          name: 'Personal Training',
          description: 'One-on-one training',
          basePrice: new Decimal(99.99),
          isActive: true,
          coachId,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ];

      mockService.findByCoach.mockResolvedValue(mockBookingTypes as any);

      await test.http.get(
        `/api/booking-types/coach/${coachId}` as '/api/booking-types/coach/{coachId}'
      );

      expect(mockService.findByCoach).toHaveBeenCalledWith(coachId);
    });
  });

  describe('GET /booking-types/:id', () => {
    it('should call findOne with the provided id', async () => {
      const mockBookingType: BookingTypeResponseDto = {
        id: 'booking-type-1',
        name: 'Personal Training',
        description: 'One-on-one training',
        basePrice: new Decimal(99.99),
        isActive: true,
        coachId: 'coach-1',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      mockService.findOne.mockResolvedValue(mockBookingType as any);

      await test.http.get(`/api/booking-types/${mockBookingType.id}` as '/api/booking-types/{id}');

      expect(mockService.findOne).toHaveBeenCalledWith(mockBookingType.id);
    });
  });

  describe('POST /booking-types', () => {
    it('should call create with provided data and coach id', async () => {
      const createData = {
        name: 'Personal Training',
        description: 'One-on-one training',
        basePrice: 99.99,
        isActive: true,
      };

      const coachId = 'coach-1';

      const mockCreatedBookingType: BookingTypeResponseDto = {
        id: 'booking-type-1',
        ...createData,
        basePrice: new Decimal(createData.basePrice),
        coachId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      mockService.create.mockResolvedValue(mockCreatedBookingType as any);

      // Built-in token creation - no helper method needed!
      const coachToken = await test.auth.createRoleToken(Role.COACH, { sub: coachId });

      // Direct access to authenticated HTTP methods!
      await test.http.authenticatedPost('/api/booking-types', coachToken, {
        body: createData,
      });

      expect(mockService.create).toHaveBeenCalledWith(createData, coachId);
    });
  });

  describe('PUT /booking-types/:id', () => {
    it('should call update with provided id, data, and coach id', async () => {
      const updateData = {
        name: 'Updated Training',
        basePrice: 149.99,
      };

      const coachId = 'coach-1';
      const bookingTypeId = 'booking-type-1';

      const mockUpdatedBookingType: BookingTypeResponseDto = {
        id: bookingTypeId,
        name: updateData.name,
        description: 'One-on-one training',
        basePrice: new Decimal(updateData.basePrice),
        isActive: true,
        coachId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      mockService.update.mockResolvedValue(mockUpdatedBookingType as any);

      const coachToken = await test.auth.createRoleToken(Role.COACH, { sub: coachId });
      await test.http.authenticatedPut(
        `/api/booking-types/${bookingTypeId}` as '/api/booking-types/{id}',
        coachToken,
        {
          body: updateData,
        }
      );

      expect(mockService.update).toHaveBeenCalledWith(bookingTypeId, updateData, coachId);
    });
  });

  describe('PATCH /booking-types/:id', () => {
    it('should call update with provided id, data, and coach id', async () => {
      const updateData = {
        name: 'Partially Updated Training',
      };

      const coachId = 'coach-1';
      const bookingTypeId = 'booking-type-1';

      const mockUpdatedBookingType: BookingTypeResponseDto = {
        id: bookingTypeId,
        name: updateData.name,
        description: 'One-on-one training',
        basePrice: new Decimal(99.99),
        isActive: true,
        coachId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      mockService.update.mockResolvedValue(mockUpdatedBookingType as any);

      const coachToken = await test.auth.createRoleToken(Role.COACH, { sub: coachId });
      await test.http.authenticatedPatch(
        `/api/booking-types/${bookingTypeId}` as '/api/booking-types/{id}',
        coachToken,
        {
          body: updateData,
        }
      );

      expect(mockService.update).toHaveBeenCalledWith(bookingTypeId, updateData, coachId);
    });
  });

  describe('DELETE /booking-types/:id', () => {
    it('should call remove with provided id and coach id', async () => {
      const coachId = 'coach-1';
      const bookingTypeId = 'booking-type-1';

      mockService.remove.mockResolvedValue(undefined);

      const coachToken = await test.auth.createRoleToken(Role.COACH, { sub: coachId });
      await test.http.authenticatedDelete(
        `/api/booking-types/${bookingTypeId}` as '/api/booking-types/{id}',
        coachToken
      );

      expect(mockService.remove).toHaveBeenCalledWith(bookingTypeId, coachId);
    });
  });
});
