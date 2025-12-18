import { Role } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/client';
import { ControllerTest } from '@test-utils';

import { CreateSessionDto, SessionResponseDto, UpdateSessionDto } from './dto/session.dto';
import { SessionsController } from './sessions.controller';
import { SessionsService } from './sessions.service';

describe('SessionsController', () => {
  let test: ControllerTest<SessionsController, SessionsService, 'sessions'>;
  let mockService: jest.Mocked<SessionsService>;

  beforeEach(async () => {
    mockService = {
      findByUser: jest.fn(),
      findOne: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      cancel: jest.fn(),
    } as any;

    test = new ControllerTest({
      controllerClass: SessionsController,
      moduleName: 'sessions',
      providers: [{ provide: SessionsService, useValue: mockService }],
    });

    await test.setup();
  });

  afterEach(async () => {
    await test.cleanup();
  });

  describe('GET /sessions', () => {
    it('should call findByUser service method for user', async () => {
      const mockSessions: SessionResponseDto[] = [
        {
          id: 'session-1',
          userId: 'user-123',
          coachId: 'coach-1',
          bookingTypeId: 'booking-1',
          timeSlotId: 'slot-1',
          dateTime: new Date().toISOString(),
          durationMin: 60,
          price: new Decimal(99.99),
          isPaid: false,
          status: 'scheduled',
          notes: null,
          paymentId: null,
          discountCode: null,
          calendarEventId: null,
          discountId: null,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ];

      mockService.findByUser.mockResolvedValue(mockSessions);

      const userToken = await test.auth.createRoleToken(Role.USER, {
        sub: 'user-123',
      });
      await test.http.authenticatedGet('/api/sessions', userToken);

      expect(mockService.findByUser).toHaveBeenCalledWith(
        'user-123',
        Role.USER,
        expect.any(Object)
      );
    });

    it('should call findByUser service method for coach', async () => {
      const mockSessions: SessionResponseDto[] = [];

      mockService.findByUser.mockResolvedValue(mockSessions);

      const coachToken = await test.auth.createRoleToken(Role.COACH, {
        sub: 'coach-123',
      });
      await test.http.authenticatedGet('/api/sessions', coachToken);

      expect(mockService.findByUser).toHaveBeenCalledWith(
        'coach-123',
        Role.COACH,
        expect.any(Object)
      );
    });
  });

  describe('GET /sessions/:id', () => {
    it('should call findOne service method with correct parameters', async () => {
      const mockSession: SessionResponseDto = {
        id: 'session-123',
        userId: 'user-123',
        coachId: 'coach-1',
        bookingTypeId: 'booking-1',
        timeSlotId: 'slot-1',
        dateTime: new Date().toISOString(),
        durationMin: 60,
        price: new Decimal(99.99),
        isPaid: false,
        status: 'scheduled',
        notes: null,
        paymentId: null,
        discountCode: null,
        calendarEventId: null,
        discountId: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      mockService.findOne.mockResolvedValue(mockSession);

      const userToken = await test.auth.createRoleToken(Role.USER, {
        sub: 'user-123',
      });
      await test.http.authenticatedGet(
        '/api/sessions/session-123' as '/api/sessions/{id}',
        userToken
      );

      expect(mockService.findOne).toHaveBeenCalledWith('session-123', 'user-123', Role.USER);
    });
  });

  describe('POST /sessions', () => {
    it('should call create service method with correct parameters', async () => {
      const createDto: CreateSessionDto = {
        bookingTypeId: 'booking-1',
        timeSlotId: 'slot-1',
        notes: 'Test notes',
      };

      const mockSession: SessionResponseDto = {
        id: 'session-123',
        userId: 'user-123',
        coachId: 'coach-1',
        bookingTypeId: 'booking-1',
        timeSlotId: 'slot-1',
        dateTime: new Date().toISOString(),
        durationMin: 60,
        price: new Decimal(99.99),
        isPaid: false,
        status: 'scheduled',
        notes: 'Test notes',
        paymentId: null,
        discountCode: null,
        calendarEventId: null,
        discountId: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      mockService.create.mockResolvedValue(mockSession);

      const userToken = await test.auth.createRoleToken(Role.USER, {
        sub: 'user-123',
      });
      await test.http.authenticatedPost('/api/sessions', userToken, {
        body: createDto,
      });

      expect(mockService.create).toHaveBeenCalledWith(createDto, 'user-123');
    });
  });

  describe('PUT /sessions/:id', () => {
    it('should call update service method with correct parameters', async () => {
      const updateDto: UpdateSessionDto = {
        notes: 'Updated notes',
      };

      const mockSession: SessionResponseDto = {
        id: 'session-123',
        userId: 'user-123',
        coachId: 'coach-1',
        bookingTypeId: 'booking-1',
        timeSlotId: 'slot-1',
        dateTime: new Date().toISOString(),
        durationMin: 60,
        price: new Decimal(99.99),
        isPaid: false,
        status: 'scheduled',
        notes: 'Updated notes',
        paymentId: null,
        discountCode: null,
        calendarEventId: null,
        discountId: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      mockService.update.mockResolvedValue(mockSession);

      const userToken = await test.auth.createRoleToken(Role.USER, {
        sub: 'user-123',
      });
      await test.http.authenticatedPut(
        '/api/sessions/session-123' as '/api/sessions/{id}',
        userToken,
        {
          body: updateDto,
        }
      );

      expect(mockService.update).toHaveBeenCalledWith(
        'session-123',
        updateDto,
        'user-123',
        Role.USER
      );
    });
  });

  describe('PATCH /sessions/:id', () => {
    it('should call update service method with correct parameters', async () => {
      const updateDto: UpdateSessionDto = {
        status: 'completed',
      };

      const mockSession: SessionResponseDto = {
        id: 'session-123',
        userId: 'user-123',
        coachId: 'coach-1',
        bookingTypeId: 'booking-1',
        timeSlotId: 'slot-1',
        dateTime: new Date().toISOString(),
        durationMin: 60,
        price: new Decimal(99.99),
        isPaid: false,
        status: 'completed',
        notes: null,
        paymentId: null,
        discountCode: null,
        calendarEventId: null,
        discountId: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      mockService.update.mockResolvedValue(mockSession);

      const coachToken = await test.auth.createRoleToken(Role.COACH, {
        sub: 'coach-1',
      });
      await test.http.authenticatedPatch(
        '/api/sessions/session-123' as '/api/sessions/{id}',
        coachToken,
        {
          body: updateDto,
        }
      );

      expect(mockService.update).toHaveBeenCalledWith(
        'session-123',
        updateDto,
        'coach-1',
        Role.COACH
      );
    });
  });

  describe('PUT /sessions/:id/cancel', () => {
    it('should call cancel service method with correct parameters', async () => {
      const mockSession: SessionResponseDto = {
        id: 'session-123',
        userId: 'user-123',
        coachId: 'coach-1',
        bookingTypeId: 'booking-1',
        timeSlotId: 'slot-1',
        dateTime: new Date().toISOString(),
        durationMin: 60,
        price: new Decimal(99.99),
        isPaid: false,
        status: 'cancelled',
        notes: null,
        paymentId: null,
        discountCode: null,
        calendarEventId: null,
        discountId: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      mockService.cancel.mockResolvedValue(mockSession);

      const userToken = await test.auth.createRoleToken(Role.USER, {
        sub: 'user-123',
      });
      await test.http.authenticatedPut(
        '/api/sessions/session-123/cancel' as '/api/sessions/{id}/cancel',
        userToken
      );

      expect(mockService.cancel).toHaveBeenCalledWith('session-123', 'user-123', Role.USER);
    });
  });
});
