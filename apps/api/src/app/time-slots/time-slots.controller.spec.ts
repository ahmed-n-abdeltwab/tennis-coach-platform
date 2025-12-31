import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { Role } from '@prisma/client';
import { ControllerTest } from '@test-utils';
import { DeepMocked } from '@test-utils/mixins/mock.mixin';

import { TimeSlotsController } from './time-slots.controller';
import { TimeSlotsService } from './time-slots.service';

interface TimeSlotsControllerMocks {
  TimeSlotsService: DeepMocked<TimeSlotsService>;
}

describe('TimeSlotsController', () => {
  let test: ControllerTest<TimeSlotsController, TimeSlotsControllerMocks, 'time-slots'>;

  beforeEach(async () => {
    test = new ControllerTest({
      controller: TimeSlotsController,
      moduleName: 'time-slots',
      providers: [TimeSlotsService],
    });

    await test.setup();
  });

  afterEach(async () => {
    await test.cleanup();
  });

  describe('GET /time-slots', () => {
    it('should call findAvailable service method without query parameters', async () => {
      const mockTimeSlots = [
        test.factory.timeSlot.createWithNulls({ isAvailable: true }),
        test.factory.timeSlot.createWithNulls({ isAvailable: true }),
      ];
      test.mocks.TimeSlotsService.findAvailable.mockResolvedValue(mockTimeSlots);

      await test.http.get('/api/time-slots');

      expect(test.mocks.TimeSlotsService.findAvailable).toHaveBeenCalledWith(expect.any(Object));
    });

    it('should call findAvailable service method with query parameters', async () => {
      const mockTimeSlots = [test.factory.timeSlot.createWithNulls()];
      test.mocks.TimeSlotsService.findAvailable.mockResolvedValue(mockTimeSlots);

      await test.http.get(
        '/api/time-slots?coachId=coach-123&startDate=2024-12-25T00:00:00Z' as '/api/time-slots'
      );

      expect(test.mocks.TimeSlotsService.findAvailable).toHaveBeenCalledWith(expect.any(Object));
    });

    it('should return empty array when no available slots', async () => {
      test.mocks.TimeSlotsService.findAvailable.mockResolvedValue([]);

      const response = await test.http.get('/api/time-slots');

      expect(response.status).toBe(200);
      expect(test.mocks.TimeSlotsService.findAvailable).toHaveBeenCalled();
    });
  });

  describe('GET /time-slots/coach/:coachId', () => {
    it('should call findByCoach service method with correct parameters', async () => {
      const mockTimeSlots = [
        test.factory.timeSlot.createWithNulls({ coachId: 'coach-123' }),
        test.factory.timeSlot.createWithNulls({ coachId: 'coach-123' }),
      ];
      test.mocks.TimeSlotsService.findByCoach.mockResolvedValue(mockTimeSlots);

      await test.http.get('/api/time-slots/coach/coach-123' as '/api/time-slots/coach/{coachId}');

      expect(test.mocks.TimeSlotsService.findByCoach).toHaveBeenCalledWith(
        'coach-123',
        expect.any(Object)
      );
    });

    it('should call findByCoach service method with query parameters', async () => {
      const mockTimeSlots = [test.factory.timeSlot.createWithNulls({ coachId: 'coach-123' })];
      test.mocks.TimeSlotsService.findByCoach.mockResolvedValue(mockTimeSlots);

      await test.http.get(
        '/api/time-slots/coach/coach-123?startDate=2024-12-25T00:00:00Z&endDate=2024-12-31T23:59:59Z' as '/api/time-slots/coach/{coachId}'
      );

      expect(test.mocks.TimeSlotsService.findByCoach).toHaveBeenCalledWith(
        'coach-123',
        expect.any(Object)
      );
    });

    it('should return empty array when coach has no time slots', async () => {
      test.mocks.TimeSlotsService.findByCoach.mockResolvedValue([]);

      const response = await test.http.get(
        '/api/time-slots/coach/coach-456' as '/api/time-slots/coach/{coachId}'
      );

      expect(response.status).toBe(200);
      expect(test.mocks.TimeSlotsService.findByCoach).toHaveBeenCalledWith(
        'coach-456',
        expect.any(Object)
      );
    });
  });

  describe('GET /time-slots/:id', () => {
    it('should call findOne service method with correct parameters', async () => {
      const mockTimeSlot = test.factory.timeSlot.createWithNulls({ id: 'slot-123' });
      test.mocks.TimeSlotsService.findOne.mockResolvedValue(mockTimeSlot);

      await test.http.get('/api/time-slots/slot-123' as '/api/time-slots/{id}');

      expect(test.mocks.TimeSlotsService.findOne).toHaveBeenCalledWith('slot-123');
    });

    it('should return 404 when time slot not found', async () => {
      test.mocks.TimeSlotsService.findOne.mockRejectedValue(
        new NotFoundException('Time slot not found')
      );

      const response = await test.http.get(
        '/api/time-slots/nonexistent-id' as '/api/time-slots/{id}'
      );

      expect(response.status).toBe(404);
    });
  });

  describe('POST /time-slots', () => {
    it('should call create service method with correct parameters', async () => {
      const createDto = {
        dateTime: '2024-12-25T10:00:00Z',
        durationMin: 60,
        isAvailable: true,
      };
      const mockTimeSlot = test.factory.timeSlot.createWithNulls({
        dateTime: new Date('2024-12-25T10:00:00Z'),
        durationMin: 60,
        isAvailable: true,
        coachId: 'coach-123',
      });
      test.mocks.TimeSlotsService.create.mockResolvedValue(mockTimeSlot);

      const coachToken = await test.auth.createRoleToken(Role.COACH, { sub: 'coach-123' });
      await test.http.authenticatedPost('/api/time-slots', coachToken, {
        body: createDto,
      });

      expect(test.mocks.TimeSlotsService.create).toHaveBeenCalledWith(createDto, 'coach-123');
    });

    it('should create time slot with default values', async () => {
      const createDto = {
        dateTime: '2024-12-25T10:00:00Z',
      };
      const mockTimeSlot = test.factory.timeSlot.createWithNulls({
        dateTime: new Date('2024-12-25T10:00:00Z'),
        coachId: 'coach-123',
      });
      test.mocks.TimeSlotsService.create.mockResolvedValue(mockTimeSlot);

      const coachToken = await test.auth.createRoleToken(Role.COACH, { sub: 'coach-123' });
      await test.http.authenticatedPost('/api/time-slots', coachToken, {
        body: createDto,
      });

      expect(test.mocks.TimeSlotsService.create).toHaveBeenCalledWith(createDto, 'coach-123');
    });
  });

  describe('PATCH /time-slots/:id', () => {
    it('should call update service method with correct parameters', async () => {
      const updateDto = {
        dateTime: '2024-12-25T10:00:00Z',
        isAvailable: false,
        durationMin: 90,
      };
      const mockTimeSlot = test.factory.timeSlot.createWithNulls({
        id: 'slot-123',
        isAvailable: false,
        durationMin: 90,
        coachId: 'coach-123',
      });
      test.mocks.TimeSlotsService.update.mockResolvedValue(mockTimeSlot);

      const coachToken = await test.auth.createRoleToken(Role.COACH, { sub: 'coach-123' });
      await test.http.authenticatedPatch(
        '/api/time-slots/slot-123' as '/api/time-slots/{id}',
        coachToken,
        { body: updateDto }
      );

      expect(test.mocks.TimeSlotsService.update).toHaveBeenCalledWith(
        'slot-123',
        updateDto,
        'coach-123'
      );
    });

    it('should return 404 when updating non-existent time slot', async () => {
      test.mocks.TimeSlotsService.update.mockRejectedValue(
        new NotFoundException('Time slot not found')
      );

      const coachToken = await test.auth.createRoleToken(Role.COACH, { sub: 'coach-123' });
      const response = await test.http.authenticatedPatch(
        '/api/time-slots/nonexistent-id' as '/api/time-slots/{id}',
        coachToken,
        { body: { dateTime: '2024-12-25T10:00:00Z', isAvailable: false } }
      );

      expect(response.status).toBe(404);
    });

    it('should return 403 when coach does not own the time slot', async () => {
      test.mocks.TimeSlotsService.update.mockRejectedValue(
        new ForbiddenException('Not authorized to update this time slot')
      );

      const coachToken = await test.auth.createRoleToken(Role.COACH, { sub: 'other-coach' });
      const response = await test.http.authenticatedPatch(
        '/api/time-slots/slot-123' as '/api/time-slots/{id}',
        coachToken,
        { body: { dateTime: '2024-12-25T10:00:00Z', isAvailable: false } }
      );

      expect(response.status).toBe(403);
    });
  });

  describe('DELETE /time-slots/:id', () => {
    it('should call remove service method with correct parameters', async () => {
      test.mocks.TimeSlotsService.remove.mockResolvedValue(undefined);

      const coachToken = await test.auth.createRoleToken(Role.COACH, { sub: 'coach-123' });
      await test.http.authenticatedDelete(
        '/api/time-slots/slot-123' as '/api/time-slots/{id}',
        coachToken
      );

      expect(test.mocks.TimeSlotsService.remove).toHaveBeenCalledWith('slot-123', 'coach-123');
    });

    it('should return 404 when time slot not found', async () => {
      test.mocks.TimeSlotsService.remove.mockRejectedValue(
        new NotFoundException('Time slot not found')
      );

      const coachToken = await test.auth.createRoleToken(Role.COACH, { sub: 'coach-123' });
      const response = await test.http.authenticatedDelete(
        '/api/time-slots/nonexistent-id' as '/api/time-slots/{id}',
        coachToken
      );

      expect(response.status).toBe(404);
    });

    it('should return 403 when coach does not own the time slot', async () => {
      test.mocks.TimeSlotsService.remove.mockRejectedValue(
        new ForbiddenException('Not authorized to delete this time slot')
      );

      const coachToken = await test.auth.createRoleToken(Role.COACH, { sub: 'other-coach' });
      const response = await test.http.authenticatedDelete(
        '/api/time-slots/slot-123' as '/api/time-slots/{id}',
        coachToken
      );

      expect(response.status).toBe(403);
    });
  });

  describe('Role-based access control', () => {
    describe('COACH-only endpoints', () => {
      it('should return 403 when USER tries to create time slot', async () => {
        const createDto = {
          dateTime: '2024-12-25T10:00:00Z',
          durationMin: 60,
        };

        const userToken = await test.auth.createRoleToken(Role.USER, { sub: 'user-123' });
        const response = await test.http.authenticatedPost('/api/time-slots', userToken, {
          body: createDto,
        });

        expect(response.status).toBe(403);
        expect(test.mocks.TimeSlotsService.create).not.toHaveBeenCalled();
      });

      it('should return 403 when USER tries to update time slot', async () => {
        const updateDto = {
          dateTime: '2024-12-25T10:00:00Z',
          isAvailable: false,
        };

        const userToken = await test.auth.createRoleToken(Role.USER, { sub: 'user-123' });
        const response = await test.http.authenticatedPatch(
          '/api/time-slots/slot-123' as '/api/time-slots/{id}',
          userToken,
          { body: updateDto }
        );

        expect(response.status).toBe(403);
        expect(test.mocks.TimeSlotsService.update).not.toHaveBeenCalled();
      });

      it('should return 403 when USER tries to delete time slot', async () => {
        const userToken = await test.auth.createRoleToken(Role.USER, { sub: 'user-123' });
        const response = await test.http.authenticatedDelete(
          '/api/time-slots/slot-123' as '/api/time-slots/{id}',
          userToken
        );

        expect(response.status).toBe(403);
        expect(test.mocks.TimeSlotsService.remove).not.toHaveBeenCalled();
      });
    });

    describe('Public endpoints (no auth required)', () => {
      it('should allow unauthenticated access to findAvailable', async () => {
        const mockTimeSlots = [test.factory.timeSlot.createWithNulls()];
        test.mocks.TimeSlotsService.findAvailable.mockResolvedValue(mockTimeSlots);

        const response = await test.http.get('/api/time-slots');

        expect(response.status).toBe(200);
        expect(test.mocks.TimeSlotsService.findAvailable).toHaveBeenCalled();
      });

      it('should allow unauthenticated access to findByCoach', async () => {
        const mockTimeSlots = [test.factory.timeSlot.createWithNulls({ coachId: 'coach-123' })];
        test.mocks.TimeSlotsService.findByCoach.mockResolvedValue(mockTimeSlots);

        const response = await test.http.get(
          '/api/time-slots/coach/coach-123' as '/api/time-slots/coach/{coachId}'
        );

        expect(response.status).toBe(200);
        expect(test.mocks.TimeSlotsService.findByCoach).toHaveBeenCalled();
      });

      it('should allow unauthenticated access to findOne', async () => {
        const mockTimeSlot = test.factory.timeSlot.createWithNulls({ id: 'slot-123' });
        test.mocks.TimeSlotsService.findOne.mockResolvedValue(mockTimeSlot);

        const response = await test.http.get('/api/time-slots/slot-123' as '/api/time-slots/{id}');

        expect(response.status).toBe(200);
        expect(test.mocks.TimeSlotsService.findOne).toHaveBeenCalled();
      });
    });
  });
});
