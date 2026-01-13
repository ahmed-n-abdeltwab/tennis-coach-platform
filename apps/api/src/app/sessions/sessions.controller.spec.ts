import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { Role, SessionStatus } from '@prisma/client';
import { ControllerTest } from '@test-utils';
import { DeepMocked } from '@test-utils/mixins/mock.mixin';

import { SessionsController } from './sessions.controller';
import { SessionsService } from './sessions.service';

/**
 * Typed mocks interface for SessionsController tests.
 * Provides IntelliSense support for all mocked dependencies.
 */
interface SessionsControllerMocks {
  SessionsService: DeepMocked<SessionsService>;
}

describe('SessionsController', () => {
  let test: ControllerTest<SessionsController, SessionsControllerMocks, 'sessions'>;

  beforeEach(async () => {
    test = new ControllerTest({
      controller: SessionsController,
      moduleName: 'sessions',
      providers: [SessionsService],
    });

    await test.setup();
  });

  afterEach(async () => {
    await test.cleanup();
  });

  describe('GET /sessions', () => {
    it('should call findByUser service method for USER role', async () => {
      const mockSessions = [
        test.factory.session.createWithNulls({ userId: 'cuser12345678901234567' }),
        test.factory.session.createWithNulls({ userId: 'cuser12345678901234567' }),
      ];
      test.mocks.SessionsService.findByUser.mockResolvedValue(mockSessions);

      const userToken = await test.auth.createToken({
        role: Role.USER,
        sub: 'cuser12345678901234567',
      });
      await test.http.authenticatedGet('/api/sessions', userToken);

      expect(test.mocks.SessionsService.findByUser).toHaveBeenCalledWith(
        'cuser12345678901234567',
        Role.USER,
        expect.any(Object)
      );
    });

    it('should call findByUser service method for COACH role', async () => {
      const mockSessions = [
        test.factory.session.createWithNulls({ coachId: 'ccoach1234567890123456' }),
      ];
      test.mocks.SessionsService.findByUser.mockResolvedValue(mockSessions);

      const coachToken = await test.auth.createToken({
        role: Role.COACH,
        sub: 'ccoach1234567890123456',
      });
      await test.http.authenticatedGet('/api/sessions', coachToken);

      expect(test.mocks.SessionsService.findByUser).toHaveBeenCalledWith(
        'ccoach1234567890123456',
        Role.COACH,
        expect.any(Object)
      );
    });

    it('should pass query parameters to service', async () => {
      test.mocks.SessionsService.findByUser.mockResolvedValue([]);

      const userToken = await test.auth.createToken({
        role: Role.USER,
        sub: 'cuser12345678901234567',
      });
      await test.http.authenticatedGet(
        '/api/sessions?status=COMPLETED&startDate=2024-11-01&endDate=2024-11-30' as '/api/sessions',
        userToken
      );

      expect(test.mocks.SessionsService.findByUser).toHaveBeenCalledWith(
        'cuser12345678901234567',
        Role.USER,
        {
          status: SessionStatus.COMPLETED,
          startDate: '2024-11-01',
          endDate: '2024-11-30',
        }
      );
    });

    it('should return empty array when no sessions found', async () => {
      test.mocks.SessionsService.findByUser.mockResolvedValue([]);

      const userToken = await test.auth.createToken({
        role: Role.USER,
        sub: 'cuser45678901234567890',
      });
      await test.http.authenticatedGet('/api/sessions', userToken);

      expect(test.mocks.SessionsService.findByUser).toHaveBeenCalledWith(
        'cuser45678901234567890',
        Role.USER,
        expect.any(Object)
      );
    });
  });

  describe('GET /sessions/:id', () => {
    it('should call findOne service method with correct parameters for USER', async () => {
      const mockSession = test.factory.session.createWithNulls({
        id: 'csession123456789012345',
        userId: 'cuser12345678901234567',
      });
      test.mocks.SessionsService.findOne.mockResolvedValue(mockSession);

      const userToken = await test.auth.createToken({
        role: Role.USER,
        sub: 'cuser12345678901234567',
      });
      await test.http.authenticatedGet(
        '/api/sessions/csession123456789012345' as '/api/sessions/{id}',
        userToken
      );

      expect(test.mocks.SessionsService.findOne).toHaveBeenCalledWith(
        'csession123456789012345',
        'cuser12345678901234567',
        Role.USER
      );
    });

    it('should call findOne service method with correct parameters for COACH', async () => {
      const mockSession = test.factory.session.createWithNulls({
        id: 'csession123456789012345',
        coachId: 'ccoach1234567890123456',
      });
      test.mocks.SessionsService.findOne.mockResolvedValue(mockSession);

      const coachToken = await test.auth.createToken({
        role: Role.COACH,
        sub: 'ccoach1234567890123456',
      });
      await test.http.authenticatedGet(
        '/api/sessions/csession123456789012345' as '/api/sessions/{id}',
        coachToken
      );

      expect(test.mocks.SessionsService.findOne).toHaveBeenCalledWith(
        'csession123456789012345',
        'ccoach1234567890123456',
        Role.COACH
      );
    });
  });

  describe('POST /sessions', () => {
    it('should call create service method with correct parameters', async () => {
      const createDto = {
        bookingTypeId: 'cbookingtype12345678901',
        timeSlotId: 'ctimeslot1234567890123',
        notes: 'Test notes',
      };
      const mockSession = test.factory.session.createWithNulls({
        userId: 'cuser12345678901234567',
        bookingTypeId: createDto.bookingTypeId,
        timeSlotId: createDto.timeSlotId,
        notes: createDto.notes,
      });
      test.mocks.SessionsService.create.mockResolvedValue(mockSession);

      const userToken = await test.auth.createToken({
        role: Role.USER,
        sub: 'cuser12345678901234567',
      });
      await test.http.authenticatedPost('/api/sessions', userToken, { body: createDto });

      expect(test.mocks.SessionsService.create).toHaveBeenCalledWith(
        createDto,
        'cuser12345678901234567'
      );
    });

    it('should call create service method with discount code', async () => {
      const createDto = {
        bookingTypeId: 'cbookingtype12345678901',
        timeSlotId: 'ctimeslot1234567890123',
        discountCode: 'SAVE20',
      };
      const mockSession = test.factory.session.createWithNulls({
        userId: 'cuser12345678901234567',
        discountCode: 'SAVE20',
      });
      test.mocks.SessionsService.create.mockResolvedValue(mockSession);

      const userToken = await test.auth.createToken({
        role: Role.USER,
        sub: 'cuser12345678901234567',
      });
      await test.http.authenticatedPost('/api/sessions', userToken, { body: createDto });

      expect(test.mocks.SessionsService.create).toHaveBeenCalledWith(
        createDto,
        'cuser12345678901234567'
      );
    });
  });

  describe('PUT /sessions/:id', () => {
    it('should call update service method with correct parameters for USER', async () => {
      const updateDto = { notes: 'Updated notes' };
      const mockSession = test.factory.session.createWithNulls({
        id: 'csession123456789012345',
        userId: 'cuser12345678901234567',
        notes: updateDto.notes,
      });
      test.mocks.SessionsService.update.mockResolvedValue(mockSession);

      const userToken = await test.auth.createToken({
        role: Role.USER,
        sub: 'cuser12345678901234567',
      });
      await test.http.authenticatedPut(
        '/api/sessions/csession123456789012345' as '/api/sessions/{id}',
        userToken,
        { body: updateDto }
      );

      expect(test.mocks.SessionsService.update).toHaveBeenCalledWith(
        'csession123456789012345',
        updateDto,
        'cuser12345678901234567',
        Role.USER
      );
    });

    it('should call update service method with correct parameters for COACH', async () => {
      const updateDto = { notes: 'Coach updated notes' };
      const mockSession = test.factory.session.createWithNulls({
        id: 'csession123456789012345',
        coachId: 'ccoach1234567890123456',
        notes: updateDto.notes,
      });
      test.mocks.SessionsService.update.mockResolvedValue(mockSession);

      const coachToken = await test.auth.createToken({
        role: Role.COACH,
        sub: 'ccoach1234567890123456',
      });
      await test.http.authenticatedPut(
        '/api/sessions/csession123456789012345' as '/api/sessions/{id}',
        coachToken,
        { body: updateDto }
      );

      expect(test.mocks.SessionsService.update).toHaveBeenCalledWith(
        'csession123456789012345',
        updateDto,
        'ccoach1234567890123456',
        Role.COACH
      );
    });
  });

  describe('PATCH /sessions/:id', () => {
    it('should call update service method with correct parameters', async () => {
      const updateDto = { notes: 'Partially updated notes' };
      const mockSession = test.factory.session.createWithNulls({
        id: 'csession123456789012345',
        userId: 'cuser12345678901234567',
        notes: updateDto.notes,
      });
      test.mocks.SessionsService.update.mockResolvedValue(mockSession);

      const userToken = await test.auth.createToken({
        role: Role.USER,
        sub: 'cuser12345678901234567',
      });
      await test.http.authenticatedPatch(
        '/api/sessions/csession123456789012345' as '/api/sessions/{id}',
        userToken,
        { body: updateDto }
      );

      expect(test.mocks.SessionsService.update).toHaveBeenCalledWith(
        'csession123456789012345',
        updateDto,
        'cuser12345678901234567',
        Role.USER
      );
    });
  });

  describe('PUT /sessions/:id/cancel', () => {
    it('should call cancel service method with correct parameters for USER', async () => {
      const mockSession = test.factory.session.createWithNulls({
        id: 'csession123456789012345',
        userId: 'cuser12345678901234567',
        status: SessionStatus.CANCELLED,
      });
      test.mocks.SessionsService.cancel.mockResolvedValue(mockSession);

      const userToken = await test.auth.createToken({
        role: Role.USER,
        sub: 'cuser12345678901234567',
      });
      await test.http.authenticatedPut(
        '/api/sessions/csession123456789012345/cancel' as '/api/sessions/{id}/cancel',
        userToken
      );

      expect(test.mocks.SessionsService.cancel).toHaveBeenCalledWith(
        'csession123456789012345',
        'cuser12345678901234567',
        Role.USER
      );
    });

    it('should call cancel service method with correct parameters for COACH', async () => {
      const mockSession = test.factory.session.createWithNulls({
        id: 'csession123456789012345',
        coachId: 'ccoach1234567890123456',
        status: SessionStatus.CANCELLED,
      });
      test.mocks.SessionsService.cancel.mockResolvedValue(mockSession);

      const coachToken = await test.auth.createToken({
        role: Role.COACH,
        sub: 'ccoach1234567890123456',
      });
      await test.http.authenticatedPut(
        '/api/sessions/csession123456789012345/cancel' as '/api/sessions/{id}/cancel',
        coachToken
      );

      expect(test.mocks.SessionsService.cancel).toHaveBeenCalledWith(
        'csession123456789012345',
        'ccoach1234567890123456',
        Role.COACH
      );
    });
  });

  describe('Error Scenarios', () => {
    describe('Not found errors', () => {
      it('should return 404 when session not found on findOne', async () => {
        test.mocks.SessionsService.findOne.mockRejectedValue(
          new NotFoundException('Session not found')
        );

        const userToken = await test.auth.createToken({
          role: Role.USER,
          sub: 'cuser12345678901234567',
        });
        const response = await test.http.authenticatedGet(
          '/api/sessions/cnonexistent12345678901' as '/api/sessions/{id}',
          userToken
        );

        expect(response.status).toBe(404);
      });

      it('should return 404 when session not found on update', async () => {
        test.mocks.SessionsService.update.mockRejectedValue(
          new NotFoundException('Session not found')
        );

        const userToken = await test.auth.createToken({
          role: Role.USER,
          sub: 'cuser12345678901234567',
        });
        const response = await test.http.authenticatedPut(
          '/api/sessions/cnonexistent12345678901' as '/api/sessions/{id}',
          userToken,
          { body: { notes: 'Updated' } }
        );

        expect(response.status).toBe(404);
      });

      it('should return 404 when session not found on cancel', async () => {
        test.mocks.SessionsService.cancel.mockRejectedValue(
          new NotFoundException('Session not found')
        );

        const userToken = await test.auth.createToken({
          role: Role.USER,
          sub: 'cuser12345678901234567',
        });
        const response = await test.http.authenticatedPut(
          '/api/sessions/cnonexistent12345678901/cancel' as '/api/sessions/{id}/cancel',
          userToken
        );

        expect(response.status).toBe(404);
      });
    });

    describe('Forbidden errors (authorization)', () => {
      it('should return 403 when user not authorized to access session', async () => {
        test.mocks.SessionsService.findOne.mockRejectedValue(
          new ForbiddenException('Not authorized to access this session')
        );

        const userToken = await test.auth.createToken({
          role: Role.USER,
          sub: 'cotheruser12345678901',
        });
        const response = await test.http.authenticatedGet(
          '/api/sessions/csession123456789012345' as '/api/sessions/{id}',
          userToken
        );

        expect(response.status).toBe(403);
      });

      it('should return 403 when user not authorized to update session', async () => {
        test.mocks.SessionsService.update.mockRejectedValue(
          new ForbiddenException('Not authorized to access this session')
        );

        const userToken = await test.auth.createToken({
          role: Role.USER,
          sub: 'cotheruser12345678901',
        });
        const response = await test.http.authenticatedPut(
          '/api/sessions/csession123456789012345' as '/api/sessions/{id}',
          userToken,
          { body: { notes: 'Updated' } }
        );

        expect(response.status).toBe(403);
      });

      it('should return 403 when user not authorized to cancel session', async () => {
        test.mocks.SessionsService.cancel.mockRejectedValue(
          new ForbiddenException('Not authorized to cancel this session')
        );

        const userToken = await test.auth.createToken({
          role: Role.USER,
          sub: 'cotheruser12345678901',
        });
        const response = await test.http.authenticatedPut(
          '/api/sessions/csession123456789012345/cancel' as '/api/sessions/{id}/cancel',
          userToken
        );

        expect(response.status).toBe(403);
      });
    });

    describe('Validation errors', () => {
      it('should return 400 when booking type is invalid', async () => {
        test.mocks.SessionsService.create.mockRejectedValue(
          new BadRequestException('Invalid booking type')
        );

        const userToken = await test.auth.createToken({
          role: Role.USER,
          sub: 'cuser12345678901234567',
        });
        const response = await test.http.authenticatedPost('/api/sessions', userToken, {
          body: {
            bookingTypeId: 'cinvalidbookingtype1234',
            timeSlotId: 'ctimeslot1234567890123',
          },
        });

        expect(response.status).toBe(400);
      });

      it('should return 400 when time slot is not available', async () => {
        test.mocks.SessionsService.create.mockRejectedValue(
          new BadRequestException('Time slot not available')
        );

        const userToken = await test.auth.createToken({
          role: Role.USER,
          sub: 'cuser12345678901234567',
        });
        const response = await test.http.authenticatedPost('/api/sessions', userToken, {
          body: {
            bookingTypeId: 'cbookingtype12345678901',
            timeSlotId: 'cunavailableslot1234567',
          },
        });

        expect(response.status).toBe(400);
      });

      it('should return 400 when session already cancelled', async () => {
        test.mocks.SessionsService.cancel.mockRejectedValue(
          new BadRequestException('Session already cancelled')
        );

        const userToken = await test.auth.createToken({
          role: Role.USER,
          sub: 'cuser12345678901234567',
        });
        const response = await test.http.authenticatedPut(
          '/api/sessions/csession123456789012345/cancel' as '/api/sessions/{id}/cancel',
          userToken
        );

        expect(response.status).toBe(400);
      });

      it('should return 400 when cancelling past session', async () => {
        test.mocks.SessionsService.cancel.mockRejectedValue(
          new BadRequestException('Cannot cancel past sessions')
        );

        const userToken = await test.auth.createToken({
          role: Role.USER,
          sub: 'cuser12345678901234567',
        });
        const response = await test.http.authenticatedPut(
          '/api/sessions/csession123456789012345/cancel' as '/api/sessions/{id}/cancel',
          userToken
        );

        expect(response.status).toBe(400);
      });
    });
  });
});
