import { Provider } from '@nestjs/common';
import { Role } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/client';
import { BaseControllerTest, PathsForRoute, RequestType } from '@test-utils';

import { JwtPayload } from '../../common';

import { BookingTypesController } from './booking-types.controller';
import { BookingTypesService } from './booking-types.service';
import { BookingTypeResponseDto } from './dto/booking-type.dto';

class BookingTypesControllerTest extends BaseControllerTest<
  BookingTypesController,
  BookingTypesService
> {
  private mockBookingTypesService: jest.Mocked<BookingTypesService>;

  async setupController(): Promise<void> {
    this.controller = this.module.get<BookingTypesController>(BookingTypesController);
  }

  setupMocks() {
    this.mockBookingTypesService = {
      findAll: jest.fn(),
      findByCoach: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      remove: jest.fn(),
    } as unknown as jest.Mocked<BookingTypesService>;

    return [];
  }

  getControllerClass() {
    return BookingTypesController;
  }

  override getTestProviders(): Provider[] {
    return [
      {
        provide: BookingTypesService,
        useValue: this.mockBookingTypesService,
      },
    ];
  }

  getMockService(): jest.Mocked<BookingTypesService> {
    return this.mockBookingTypesService;
  }

  // BookingTypesController uses GET, POST, PUT, PATCH, DELETE
  async testGet<P extends PathsForRoute<'booking-types', 'GET'>>(
    path: P,
    payload?: RequestType<P, 'GET'>
  ) {
    return this.get(path, payload);
  }

  async testPost<P extends PathsForRoute<'booking-types', 'POST'>>(
    path: P,
    payload?: RequestType<P, 'POST'>
  ) {
    return this.post(path, payload);
  }

  async testPut<P extends PathsForRoute<'booking-types', 'PUT'>>(
    path: P,
    payload?: RequestType<P, 'PUT'>
  ) {
    return this.put(path, payload);
  }

  async testPatch<P extends PathsForRoute<'booking-types', 'PATCH'>>(
    path: P,
    payload?: RequestType<P, 'PATCH'>
  ) {
    return this.patch(path, payload);
  }

  async testDelete<P extends PathsForRoute<'booking-types', 'DELETE'>>(
    path: P,
    payload?: RequestType<P, 'DELETE'>
  ) {
    return this.delete(path, payload);
  }

  // Authenticated versions
  async testAuthenticatedGet<P extends PathsForRoute<'booking-types', 'GET'>>(
    path: P,
    token: string,
    payload?: RequestType<P, 'GET'>
  ) {
    return this.authenticatedGet(path, token, payload);
  }

  async testAuthenticatedPost<P extends PathsForRoute<'booking-types', 'POST'>>(
    path: P,
    token: string,
    payload?: RequestType<P, 'POST'>
  ) {
    return this.authenticatedPost(path, token, payload);
  }

  async testAuthenticatedPut<P extends PathsForRoute<'booking-types', 'PUT'>>(
    path: P,
    token: string,
    payload?: RequestType<P, 'PUT'>
  ) {
    return this.authenticatedPut(path, token, payload);
  }

  async testAuthenticatedPatch<P extends PathsForRoute<'booking-types', 'PATCH'>>(
    path: P,
    token: string,
    payload?: RequestType<P, 'PATCH'>
  ) {
    return this.authenticatedPatch(path, token, payload);
  }

  async testAuthenticatedDelete<P extends PathsForRoute<'booking-types', 'DELETE'>>(
    path: P,
    token: string,
    payload?: RequestType<P, 'DELETE'>
  ) {
    return this.authenticatedDelete(path, token, payload);
  }

  async createTestRoleToken(role: Role, overrides?: Partial<JwtPayload>) {
    return this.createRoleToken(role, overrides);
  }
}

describe('BookingTypesController', () => {
  let test: BookingTypesControllerTest;

  beforeEach(async () => {
    test = new BookingTypesControllerTest();
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

      test.getMockService().findAll.mockResolvedValue(mockBookingTypes as any);

      await test.testGet('/api/booking-types');

      expect(test.getMockService().findAll).toHaveBeenCalledTimes(1);
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

      test.getMockService().findByCoach.mockResolvedValue(mockBookingTypes as any);

      await test.testGet(
        `/api/booking-types/coach/${coachId}` as '/api/booking-types/coach/{coachId}'
      );

      expect(test.getMockService().findByCoach).toHaveBeenCalledWith(coachId);
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

      test.getMockService().findOne.mockResolvedValue(mockBookingType as any);

      await test.testGet(`/api/booking-types/${mockBookingType.id}` as '/api/booking-types/{id}');

      expect(test.getMockService().findOne).toHaveBeenCalledWith(mockBookingType.id);
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

      test.getMockService().create.mockResolvedValue(mockCreatedBookingType as any);

      const coachToken = await test.createTestRoleToken(Role.COACH, { sub: coachId });
      await test.testAuthenticatedPost('/api/booking-types', coachToken, {
        body: createData,
      });

      expect(test.getMockService().create).toHaveBeenCalledWith(createData, coachId);
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

      test.getMockService().update.mockResolvedValue(mockUpdatedBookingType as any);

      const coachToken = await test.createTestRoleToken(Role.COACH, { sub: coachId });
      await test.testAuthenticatedPut(
        `/api/booking-types/${bookingTypeId}` as '/api/booking-types/{id}',
        coachToken,
        {
          body: updateData,
        }
      );

      expect(test.getMockService().update).toHaveBeenCalledWith(bookingTypeId, updateData, coachId);
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

      test.getMockService().update.mockResolvedValue(mockUpdatedBookingType as any);

      const coachToken = await test.createTestRoleToken(Role.COACH, { sub: coachId });
      await test.testAuthenticatedPatch(
        `/api/booking-types/${bookingTypeId}` as '/api/booking-types/{id}',
        coachToken,
        {
          body: updateData,
        }
      );

      expect(test.getMockService().update).toHaveBeenCalledWith(bookingTypeId, updateData, coachId);
    });
  });

  describe('DELETE /booking-types/:id', () => {
    it('should call remove with provided id and coach id', async () => {
      const coachId = 'coach-1';
      const bookingTypeId = 'booking-type-1';

      test.getMockService().remove.mockResolvedValue(undefined);

      const coachToken = await test.createTestRoleToken(Role.COACH, { sub: coachId });
      await test.testAuthenticatedDelete(
        `/api/booking-types/${bookingTypeId}` as '/api/booking-types/{id}',
        coachToken
      );

      expect(test.getMockService().remove).toHaveBeenCalledWith(bookingTypeId, coachId);
    });
  });
});
