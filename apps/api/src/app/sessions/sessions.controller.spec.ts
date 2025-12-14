import { Provider } from '@nestjs/common';
import { Role } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/client';
import { BaseControllerTest, PathsForRoute, RequestType } from '@test-utils';

import { JwtPayload } from '../../common';

import { CreateSessionDto, SessionResponseDto, UpdateSessionDto } from './dto/session.dto';
import { SessionsController } from './sessions.controller';
import { SessionsService } from './sessions.service';

class SessionsControllerTest extends BaseControllerTest<SessionsController, SessionsService> {
  private mockSessionsService: jest.Mocked<SessionsService>;

  async setupController(): Promise<void> {
    this.controller = this.module.get<SessionsController>(SessionsController);
  }

  setupMocks() {
    this.mockSessionsService = {
      findByUser: jest.fn(),
      findOne: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      cancel: jest.fn(),
    } as unknown as jest.Mocked<SessionsService>;

    return [];
  }

  getControllerClass() {
    return SessionsController;
  }

  override getTestProviders(): Provider[] {
    return [
      {
        provide: SessionsService,
        useValue: this.mockSessionsService,
      },
    ];
  }

  getMockService(): jest.Mocked<SessionsService> {
    return this.mockSessionsService;
  }

  // SessionsController uses GET, POST, PUT, PATCH - create helpers for those
  async testGet<P extends PathsForRoute<'sessions', 'GET'>>(
    path: P,
    payload?: RequestType<P, 'GET'>
  ) {
    return this.get(path, payload);
  }

  async testPost<P extends PathsForRoute<'sessions', 'POST'>>(
    path: P,
    payload?: RequestType<P, 'POST'>
  ) {
    return this.post(path, payload);
  }

  async testPut<P extends PathsForRoute<'sessions', 'PUT'>>(
    path: P,
    payload?: RequestType<P, 'PUT'>
  ) {
    return this.put(path, payload);
  }

  async testPatch<P extends PathsForRoute<'sessions', 'PATCH'>>(
    path: P,
    payload?: RequestType<P, 'PATCH'>
  ) {
    return this.patch(path, payload);
  }

  async testAuthenticatedGet<P extends PathsForRoute<'sessions', 'GET'>>(
    path: P,
    token: string,
    payload?: RequestType<P, 'GET'>
  ) {
    return this.authenticatedGet(path, token, payload);
  }

  async testAuthenticatedPost<P extends PathsForRoute<'sessions', 'POST'>>(
    path: P,
    token: string,
    payload?: RequestType<P, 'POST'>
  ) {
    return this.authenticatedPost(path, token, payload);
  }

  async testAuthenticatedPut<P extends PathsForRoute<'sessions', 'PUT'>>(
    path: P,
    token: string,
    payload?: RequestType<P, 'PUT'>
  ) {
    return this.authenticatedPut(path, token, payload);
  }

  async testAuthenticatedPatch<P extends PathsForRoute<'sessions', 'PATCH'>>(
    path: P,
    token: string,
    payload?: RequestType<P, 'PATCH'>
  ) {
    return this.authenticatedPatch(path, token, payload);
  }

  async createTestRoleToken(role: Role, overrides?: Partial<JwtPayload>) {
    return this.createRoleToken(role, overrides);
  }
}
describe('SessionsController', () => {
  let test: SessionsControllerTest;

  beforeEach(async () => {
    test = new SessionsControllerTest();
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

      test.getMockService().findByUser.mockResolvedValue(mockSessions);

      const userToken = await test.createTestRoleToken(Role.USER, {
        sub: 'user-123',
      });
      await test.testAuthenticatedGet('/api/sessions', userToken);

      expect(test.getMockService().findByUser).toHaveBeenCalledWith(
        'user-123',
        Role.USER,
        expect.any(Object)
      );
    });

    it('should call findByUser service method for coach', async () => {
      const mockSessions: SessionResponseDto[] = [];

      test.getMockService().findByUser.mockResolvedValue(mockSessions);

      const coachToken = await test.createTestRoleToken(Role.COACH, {
        sub: 'coach-123',
      });
      await test.testAuthenticatedGet('/api/sessions', coachToken);

      expect(test.getMockService().findByUser).toHaveBeenCalledWith(
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

      test.getMockService().findOne.mockResolvedValue(mockSession);

      const userToken = await test.createTestRoleToken(Role.USER, {
        sub: 'user-123',
      });
      await test.testAuthenticatedGet(
        '/api/sessions/session-123' as '/api/sessions/{id}',
        userToken
      );

      expect(test.getMockService().findOne).toHaveBeenCalledWith(
        'session-123',
        'user-123',
        Role.USER
      );
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

      test.getMockService().create.mockResolvedValue(mockSession);

      const userToken = await test.createTestRoleToken(Role.USER, {
        sub: 'user-123',
      });
      await test.testAuthenticatedPost('/api/sessions', userToken, {
        body: createDto,
      });

      expect(test.getMockService().create).toHaveBeenCalledWith(createDto, 'user-123');
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

      test.getMockService().update.mockResolvedValue(mockSession);

      const userToken = await test.createTestRoleToken(Role.USER, {
        sub: 'user-123',
      });
      await test.testAuthenticatedPut(
        '/api/sessions/session-123' as '/api/sessions/{id}',
        userToken,
        {
          body: updateDto,
        }
      );

      expect(test.getMockService().update).toHaveBeenCalledWith(
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

      test.getMockService().update.mockResolvedValue(mockSession);

      const coachToken = await test.createTestRoleToken(Role.COACH, {
        sub: 'coach-1',
      });
      await test.testAuthenticatedPatch(
        '/api/sessions/session-123' as '/api/sessions/{id}',
        coachToken,
        {
          body: updateDto,
        }
      );

      expect(test.getMockService().update).toHaveBeenCalledWith(
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

      test.getMockService().cancel.mockResolvedValue(mockSession);

      const userToken = await test.createTestRoleToken(Role.USER, {
        sub: 'user-123',
      });
      await test.testAuthenticatedPut(
        '/api/sessions/session-123/cancel' as '/api/sessions/{id}/cancel',
        userToken
      );

      expect(test.getMockService().cancel).toHaveBeenCalledWith(
        'session-123',
        'user-123',
        Role.USER
      );
    });
  });
});
