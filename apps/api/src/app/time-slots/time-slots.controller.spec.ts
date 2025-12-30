import { Role } from '@prisma/client';
import { ControllerTest } from '@test-utils';

import { CreateTimeSlotDto, TimeSlotResponseDto, UpdateTimeSlotDto } from './dto/time-slot.dto';
import { TimeSlotsController } from './time-slots.controller';
import { TimeSlotsService } from './time-slots.service';

describe.skip('TimeSlotsController', () => {
  let test: ControllerTest<TimeSlotsController, TimeSlotsService, 'time-slots'>;
  let mockService: jest.Mocked<TimeSlotsService>;

  beforeEach(async () => {
    mockService = {
      findAvailable: jest.fn(),
      findByCoach: jest.fn(),
      findAll: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      remove: jest.fn(),
    } as any;

    test = new ControllerTest({
      controllerClass: TimeSlotsController,
      moduleName: 'time-slots',
      providers: [{ provide: TimeSlotsService, useValue: mockService }],
    });

    await test.setup();
  });

  afterEach(async () => {
    await test.cleanup();
  });

  describe('GET /time-slots', () => {
    it('should call findAvailable service method without query parameters', async () => {
      const mockTimeSlots: TimeSlotResponseDto[] = [
        {
          id: 'slot-1',
          coachId: 'coach-1',
          dateTime: new Date('2024-12-25T10:00:00Z').toISOString(),
          durationMin: 60,
          isAvailable: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          coach: {
            id: 'coach-1',
            name: 'John Doe',
            email: 'john@example.com',
          },
        },
      ];

      mockService.findAvailable.mockResolvedValue(mockTimeSlots);

      await test.http.get('/api/time-slots');

      expect(mockService.findAvailable).toHaveBeenCalledWith(expect.any(Object));
    });

    it('should call findAvailable service method with query parameters', async () => {
      const mockTimeSlots: TimeSlotResponseDto[] = [];

      mockService.findAvailable.mockResolvedValue(mockTimeSlots);

      await test.http.get(
        '/api/time-slots?coachId=coach-1&startDate=2024-12-25T00:00:00Z' as '/api/time-slots'
      );

      expect(mockService.findAvailable).toHaveBeenCalledWith(expect.any(Object));
    });
  });

  describe('GET /time-slots/coach/:coachId', () => {
    it('should call findByCoach service method with correct parameters', async () => {
      const mockTimeSlots: TimeSlotResponseDto[] = [
        {
          id: 'slot-1',
          coachId: 'coach-1',
          dateTime: new Date('2024-12-25T10:00:00Z').toISOString(),
          durationMin: 60,
          isAvailable: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ];

      mockService.findByCoach.mockResolvedValue(mockTimeSlots);

      await test.http.get('/api/time-slots/coach/coach-1' as '/api/time-slots/coach/{coachId}');

      expect(mockService.findByCoach).toHaveBeenCalledWith('coach-1', expect.any(Object));
    });

    it('should call findByCoach service method with query parameters', async () => {
      const mockTimeSlots: TimeSlotResponseDto[] = [];

      mockService.findByCoach.mockResolvedValue(mockTimeSlots);

      await test.http.get(
        '/api/time-slots/coach/coach-1?startDate=2024-12-25T00:00:00Z' as '/api/time-slots/coach/{coachId}'
      );

      expect(mockService.findByCoach).toHaveBeenCalledWith('coach-1', expect.any(Object));
    });
  });

  describe('GET /time-slots/:id', () => {
    it('should call findOne service method with correct parameters', async () => {
      const mockTimeSlot: TimeSlotResponseDto = {
        id: 'slot-123',
        coachId: 'coach-1',
        dateTime: new Date('2024-12-25T10:00:00Z').toISOString(),
        durationMin: 60,
        isAvailable: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        coach: {
          id: 'coach-1',
          name: 'John Doe',
          email: 'john@example.com',
        },
      };

      mockService.findOne.mockResolvedValue(mockTimeSlot);

      await test.http.get('/api/time-slots/slot-123' as '/api/time-slots/{id}');

      expect(mockService.findOne).toHaveBeenCalledWith('slot-123');
    });
  });

  describe('POST /time-slots', () => {
    it('should call create service method with correct parameters', async () => {
      const createDto: CreateTimeSlotDto = {
        dateTime: '2024-12-25T10:00:00Z',
        durationMin: 60,
        isAvailable: true,
      };

      const mockTimeSlot: TimeSlotResponseDto = {
        id: 'slot-123',
        coachId: 'coach-1',
        dateTime: new Date('2024-12-25T10:00:00Z').toISOString(),
        durationMin: 60,
        isAvailable: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      mockService.create.mockResolvedValue(mockTimeSlot);

      const coachToken = await test.auth.createRoleToken(Role.COACH, {
        sub: 'coach-1',
      });
      await test.http.authenticatedPost('/api/time-slots', coachToken, {
        body: createDto,
      });

      expect(mockService.create).toHaveBeenCalledWith(createDto, 'coach-1');
    });
  });

  describe('PATCH /time-slots/:id', () => {
    it('should call update service method with correct parameters', async () => {
      const updateDto: UpdateTimeSlotDto = {
        isAvailable: false,
        durationMin: 90,
      };

      const mockTimeSlot: TimeSlotResponseDto = {
        id: 'slot-123',
        coachId: 'coach-1',
        dateTime: new Date('2024-12-25T10:00:00Z').toISOString(),
        durationMin: 90,
        isAvailable: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      mockService.update.mockResolvedValue(mockTimeSlot);

      const coachToken = await test.auth.createRoleToken(Role.COACH, {
        sub: 'coach-1',
      });
      await test.http.authenticatedPatch(
        '/api/time-slots/slot-123' as '/api/time-slots/{id}',
        coachToken,
        {
          body: updateDto,
        }
      );

      expect(mockService.update).toHaveBeenCalledWith('slot-123', updateDto, 'coach-1');
    });
  });

  describe('DELETE /time-slots/:id', () => {
    it('should call remove service method with correct parameters', async () => {
      mockService.remove.mockResolvedValue(undefined);

      const coachToken = await test.auth.createRoleToken(Role.COACH, {
        sub: 'coach-1',
      });
      await test.http.authenticatedDelete(
        '/api/time-slots/slot-123' as '/api/time-slots/{id}',
        coachToken
      );

      expect(mockService.remove).toHaveBeenCalledWith('slot-123', 'coach-1');
    });
  });
});
