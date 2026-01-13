import { Role } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/client';
import { ControllerTest } from '@test-utils';
import { DeepMocked } from '@test-utils/mixins/mock.mixin';

import { BookingTypesController } from './booking-types.controller';
import { BookingTypesService } from './booking-types.service';

interface BookingTypesMocks {
  BookingTypesService: DeepMocked<BookingTypesService>;
}

describe('BookingTypesController', () => {
  let test: ControllerTest<BookingTypesController, BookingTypesMocks, 'booking-types'>;

  beforeEach(async () => {
    // Create test instance with configuration - no class extension needed!
    test = new ControllerTest({
      controller: BookingTypesController,
      providers: [BookingTypesService],
      moduleName: 'booking-types',
    });

    await test.setup();
  });

  afterEach(async () => {
    await test.cleanup();
  });

  describe('GET /booking-types', () => {
    it('should call findAll service method', async () => {
      const mockBookingTypes = test.factory.bookingType.createManyWithNulls(1, {
        id: 'cbookingtype12345678901',
        name: 'Personal Training',
        coachId: 'ccoach1234567890123456',
      });

      test.mocks.BookingTypesService.findAll.mockResolvedValue(mockBookingTypes);

      // Direct access to HTTP methods - no wrapper needed!
      await test.http.get('/api/booking-types');

      expect(test.mocks.BookingTypesService.findAll).toHaveBeenCalledTimes(1);
    });
  });

  describe('GET /booking-types/coach/:coachId', () => {
    it('should call findByCoach with the provided coach id', async () => {
      const coachId = 'ccoach1234567890123456';
      const mockBookingTypes = test.factory.bookingType.createManyWithNulls(1, {
        id: 'cbookingtype12345678901',
        name: 'Personal Training',
        coachId,
      });
      test.mocks.BookingTypesService.findByCoach.mockResolvedValue(mockBookingTypes);

      await test.http.get(
        `/api/booking-types/coach/${coachId}` as '/api/booking-types/coach/{coachId}'
      );

      expect(test.mocks.BookingTypesService.findByCoach).toHaveBeenCalledWith(coachId);
    });
  });

  describe('GET /booking-types/:id', () => {
    it('should call findOne with the provided id', async () => {
      const mockBookingType = test.factory.bookingType.createWithNulls({
        id: 'cbookingtype12345678901',
        name: 'Personal Training',
        coachId: 'ccoach1234567890123456',
      });
      test.mocks.BookingTypesService.findOne.mockResolvedValue(mockBookingType);

      await test.http.get(`/api/booking-types/${mockBookingType.id}` as '/api/booking-types/{id}');

      expect(test.mocks.BookingTypesService.findOne).toHaveBeenCalledWith(mockBookingType.id);
    });
  });

  describe('POST /booking-types', () => {
    it('should call create with provided data and coach id', async () => {
      const createData = {
        name: 'Personal Training',
        description: 'One-on-one training',
        basePrice: 99.99,
      };

      const coachId = 'ccoach1234567890123456';
      const mockCreatedBookingType = test.factory.bookingType.createWithNulls({
        id: 'cbookingtype12345678901',
        ...createData,
        basePrice: new Decimal(createData.basePrice),
        coachId,
      });

      test.mocks.BookingTypesService.create.mockResolvedValue(mockCreatedBookingType);

      // Built-in token creation - no helper method needed!
      const coachToken = await test.auth.createToken({ role: Role.COACH, sub: coachId });

      // Direct access to authenticated HTTP methods!
      await test.http.authenticatedPost('/api/booking-types', coachToken, {
        body: createData,
      });

      expect(test.mocks.BookingTypesService.create).toHaveBeenCalledWith(createData, coachId);
    });
  });

  describe('PUT /booking-types/:id', () => {
    it('should call update with provided id, data, and coach id', async () => {
      const updateData = {
        name: 'Updated Training',
        basePrice: 149.99,
      };

      const coachId = 'ccoach1234567890123456';
      const bookingTypeId = 'cbookingtype12345678901';
      const mockUpdatedBookingType = test.factory.bookingType.createWithNulls({
        id: bookingTypeId,
        ...updateData,
        basePrice: new Decimal(updateData.basePrice),
        coachId,
      });

      test.mocks.BookingTypesService.update.mockResolvedValue(mockUpdatedBookingType);

      const coachToken = await test.auth.createToken({ role: Role.COACH, sub: coachId });
      await test.http.authenticatedPut(
        `/api/booking-types/${bookingTypeId}` as '/api/booking-types/{id}',
        coachToken,
        {
          body: updateData,
        }
      );

      expect(test.mocks.BookingTypesService.update).toHaveBeenCalledWith(
        bookingTypeId,
        updateData,
        coachId
      );
    });
  });

  describe('PATCH /booking-types/:id', () => {
    it('should call update with provided id, data, and coach id', async () => {
      const updateData = {
        name: 'Partially Updated Training',
      };

      const coachId = 'ccoach1234567890123456';
      const bookingTypeId = 'cbookingtype12345678901';

      const mockUpdatedBookingType = test.factory.bookingType.createWithNulls({
        id: bookingTypeId,
        ...updateData,
        coachId,
      });
      test.mocks.BookingTypesService.update.mockResolvedValue(mockUpdatedBookingType);

      const coachToken = await test.auth.createToken({ role: Role.COACH, sub: coachId });
      await test.http.authenticatedPatch(
        `/api/booking-types/${bookingTypeId}` as '/api/booking-types/{id}',
        coachToken,
        {
          body: updateData,
        }
      );

      expect(test.mocks.BookingTypesService.update).toHaveBeenCalledWith(
        bookingTypeId,
        updateData,
        coachId
      );
    });
  });

  describe('DELETE /booking-types/:id', () => {
    it('should call remove with provided id and coach id', async () => {
      const coachId = 'ccoach1234567890123456';
      const bookingTypeId = 'cbookingtype12345678901';

      test.mocks.BookingTypesService.remove.mockResolvedValue(undefined);

      const coachToken = await test.auth.createToken({ role: Role.COACH, sub: coachId });
      await test.http.authenticatedDelete(
        `/api/booking-types/${bookingTypeId}` as '/api/booking-types/{id}',
        coachToken
      );

      expect(test.mocks.BookingTypesService.remove).toHaveBeenCalledWith(bookingTypeId, coachId);
    });
  });
});
