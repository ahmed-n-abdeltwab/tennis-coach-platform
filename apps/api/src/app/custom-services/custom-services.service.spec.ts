import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { Role } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/client';
import { ServiceTest } from '@test-utils';

import { NotificationsService } from '../notifications/notifications.service';
import { PrismaService } from '../prisma/prisma.service';

import { CustomServicesService } from './custom-services.service';

interface CustomServiceMocks {
  PrismaService: {
    customService: {
      findFirst: jest.Mock;
      findMany: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
      delete: jest.Mock;
      count: jest.Mock;
      aggregate: jest.Mock;
    };
  };
  NotificationsService: {
    sendCustomServiceNotification: jest.Mock;
  };
}

describe('CustomServicesService', () => {
  let test: ServiceTest<CustomServicesService, CustomServiceMocks>;

  beforeEach(async () => {
    test = new ServiceTest({
      service: CustomServicesService,
      providers: [
        {
          provide: PrismaService,
          useValue: {
            customService: {
              findFirst: jest.fn(),
              findMany: jest.fn(),
              create: jest.fn(),
              update: jest.fn(),
              delete: jest.fn(),
              count: jest.fn(),
              aggregate: jest.fn(),
            },
          },
        },
        {
          provide: NotificationsService,
          useValue: {
            sendCustomServiceNotification: jest.fn(),
          },
        },
      ],
    });

    await test.setup();
  });

  afterEach(async () => {
    await test.cleanup();
  });

  describe('findCustomServiceInternal behavior', () => {
    describe('throwIfNotFound option', () => {
      it('should throw NotFoundException when throwIfNotFound=true and no results (via findOne)', async () => {
        test.mocks.PrismaService.customService.findFirst.mockResolvedValue(null);

        await expect(
          test.service.findOne('cnonexistent12345678901', 'cuser12345678901234567', Role.ADMIN)
        ).rejects.toThrow(NotFoundException);
      });

      it('should return empty array when throwIfNotFound=false and no results (via findAll)', async () => {
        test.mocks.PrismaService.customService.findMany.mockResolvedValue([]);

        const result = await test.service.findAll({}, 'cuser12345678901234567', Role.ADMIN);

        expect(result).toEqual([]);
      });
    });

    describe('isMany option', () => {
      it('should return array when isMany=true (via findAll)', async () => {
        const mockServices = [
          test.factory.customService.createWithNulls({ name: 'Service 1' }),
          test.factory.customService.createWithNulls({ name: 'Service 2' }),
        ];
        test.mocks.PrismaService.customService.findMany.mockResolvedValue(mockServices);

        const result = await test.service.findAll({}, 'cadmin1234567890123456', Role.ADMIN);

        expect(Array.isArray(result)).toBe(true);
        expect(result).toHaveLength(2);
      });

      it('should return single object when isMany=false (via findOne)', async () => {
        const mockService = test.factory.customService.createWithNulls({
          id: 'ccustomservice123456789',
          isPublic: true,
        });
        test.mocks.PrismaService.customService.findFirst.mockResolvedValue(mockService);

        const result = await test.service.findOne(
          'ccustomservice123456789',
          'cuser12345678901234567',
          Role.USER
        );

        expect(Array.isArray(result)).toBe(false);
        expect(result.id).toBe('ccustomservice123456789');
      });
    });
  });

  describe('create', () => {
    const createDto = {
      name: 'Personal Training',
      description: 'One-on-one coaching',
      basePrice: '99.99',
      duration: 60,
      isTemplate: false,
      isPublic: false,
    };

    it('should create a custom service as COACH', async () => {
      const mockService = test.factory.customService.createWithNulls({
        name: 'Personal Training',
        basePrice: new Decimal(99.99),
        duration: 60,
        coachId: 'ccoach1234567890123456',
      });
      test.mocks.PrismaService.customService.create.mockResolvedValue(mockService);

      const result = await test.service.create(createDto, 'ccoach1234567890123456', Role.COACH);

      expect(result.name).toBe('Personal Training');
      expect(test.mocks.PrismaService.customService.create).toHaveBeenCalledWith({
        data: {
          ...createDto,
          coachId: 'ccoach1234567890123456',
          prefilledDateTime: undefined,
        },
        include: expect.any(Object),
      });
    });

    it('should create a custom service as ADMIN', async () => {
      const mockService = test.factory.customService.createWithNulls({
        name: 'Personal Training',
        coachId: 'cadmin1234567890123456',
      });
      test.mocks.PrismaService.customService.create.mockResolvedValue(mockService);

      const result = await test.service.create(createDto, 'cadmin1234567890123456', Role.ADMIN);

      expect(result.name).toBe('Personal Training');
    });

    it('should throw ForbiddenException when USER tries to create', async () => {
      await expect(
        test.service.create(createDto, 'cuser12345678901234567', Role.USER)
      ).rejects.toThrow(ForbiddenException);
      expect(test.mocks.PrismaService.customService.create).not.toHaveBeenCalled();
    });

    it('should handle prefilledDateTime conversion', async () => {
      const createDtoWithDateTime = {
        ...createDto,
        prefilledDateTime: new Date('2024-12-01T10:00:00Z'),
      };
      const mockService = test.factory.customService.createWithNulls({
        prefilledDateTime: new Date('2024-12-01T10:00:00Z'),
      });
      test.mocks.PrismaService.customService.create.mockResolvedValue(mockService);

      await test.service.create(createDtoWithDateTime, 'ccoach1234567890123456', Role.COACH);

      expect(test.mocks.PrismaService.customService.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          prefilledDateTime: expect.any(Date),
        }),
        include: expect.any(Object),
      });
    });
  });

  describe('findAll', () => {
    it('should return all services for ADMIN', async () => {
      const mockServices = [
        test.factory.customService.createWithNulls({ name: 'Service 1' }),
        test.factory.customService.createWithNulls({ name: 'Service 2' }),
      ];
      test.mocks.PrismaService.customService.findMany.mockResolvedValue(mockServices);

      const result = await test.service.findAll({}, 'cadmin1234567890123456', Role.ADMIN);

      expect(result).toHaveLength(2);
    });

    it('should filter by isTemplate', async () => {
      test.mocks.PrismaService.customService.findMany.mockResolvedValue([]);

      await test.service.findAll({ isTemplate: true }, 'cadmin1234567890123456', Role.ADMIN);

      expect(test.mocks.PrismaService.customService.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ isTemplate: true }),
        })
      );
    });

    it('should filter by isPublic', async () => {
      test.mocks.PrismaService.customService.findMany.mockResolvedValue([]);

      await test.service.findAll({ isPublic: true }, 'cadmin1234567890123456', Role.ADMIN);

      expect(test.mocks.PrismaService.customService.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ isPublic: true }),
        })
      );
    });

    it('should apply USER role filtering (public services only)', async () => {
      test.mocks.PrismaService.customService.findMany.mockResolvedValue([]);

      await test.service.findAll({}, 'cuser12345678901234567', Role.USER);

      expect(test.mocks.PrismaService.customService.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: expect.arrayContaining([{ isPublic: true }]),
          }),
        })
      );
    });

    it('should apply COACH role filtering (own services and public)', async () => {
      test.mocks.PrismaService.customService.findMany.mockResolvedValue([]);

      await test.service.findAll({}, 'ccoach1234567890123456', Role.COACH);

      expect(test.mocks.PrismaService.customService.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: expect.arrayContaining([{ coachId: 'ccoach1234567890123456' }, { isPublic: true }]),
          }),
        })
      );
    });
  });

  describe('findOne', () => {
    it('should return service when found and user has access', async () => {
      const mockService = test.factory.customService.createWithNulls({
        id: 'ccustomservice123456789',
        isPublic: true,
      });
      test.mocks.PrismaService.customService.findFirst.mockResolvedValue(mockService);

      const result = await test.service.findOne(
        'ccustomservice123456789',
        'cuser12345678901234567',
        Role.USER
      );

      expect(result.id).toBe('ccustomservice123456789');
    });

    it('should throw NotFoundException when service not found', async () => {
      test.mocks.PrismaService.customService.findFirst.mockResolvedValue(null);

      await expect(
        test.service.findOne('cnonexistent12345678901', 'cuser12345678901234567', Role.USER)
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException when USER accesses non-public service', async () => {
      const mockService = test.factory.customService.createWithNulls({
        isPublic: false,
        coachId: 'ccoach1234567890123456',
      });
      test.mocks.PrismaService.customService.findFirst.mockResolvedValue(mockService);

      await expect(
        test.service.findOne('ccustomservice123456789', 'cuser12345678901234567', Role.USER)
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw ForbiddenException when COACH accesses another coach non-public service', async () => {
      const mockService = test.factory.customService.createWithNulls({
        isPublic: false,
        coachId: 'cothercoach1234567890',
      });
      test.mocks.PrismaService.customService.findFirst.mockResolvedValue(mockService);

      await expect(
        test.service.findOne('ccustomservice123456789', 'ccoach1234567890123456', Role.COACH)
      ).rejects.toThrow(ForbiddenException);
    });

    it('should allow COACH to access their own non-public service', async () => {
      const mockService = test.factory.customService.createWithNulls({
        id: 'ccustomservice123456789',
        isPublic: false,
        coachId: 'ccoach1234567890123456',
      });
      test.mocks.PrismaService.customService.findFirst.mockResolvedValue(mockService);

      const result = await test.service.findOne(
        'ccustomservice123456789',
        'ccoach1234567890123456',
        Role.COACH
      );

      expect(result.id).toBe('ccustomservice123456789');
    });

    it('should allow ADMIN to access any service', async () => {
      const mockService = test.factory.customService.createWithNulls({
        id: 'ccustomservice123456789',
        isPublic: false,
        coachId: 'ccoach1234567890123456',
      });
      test.mocks.PrismaService.customService.findFirst.mockResolvedValue(mockService);

      const result = await test.service.findOne(
        'ccustomservice123456789',
        'cadmin1234567890123456',
        Role.ADMIN
      );

      expect(result.id).toBe('ccustomservice123456789');
    });
  });

  describe('update', () => {
    const updateDto = { name: 'Updated Service Name' };

    it('should update service when coach is owner', async () => {
      const existingService = test.factory.customService.createWithNulls({
        coachId: 'ccoach1234567890123456',
      });
      const updatedService = test.factory.customService.createWithNulls({
        name: 'Updated Service Name',
        coachId: 'ccoach1234567890123456',
      });
      test.mocks.PrismaService.customService.findFirst.mockResolvedValue(existingService);
      test.mocks.PrismaService.customService.update.mockResolvedValue(updatedService);

      const result = await test.service.update(
        'ccustomservice123456789',
        updateDto,
        'ccoach1234567890123456',
        Role.COACH
      );

      expect(result.name).toBe('Updated Service Name');
    });

    it('should allow ADMIN to update any service', async () => {
      const existingService = test.factory.customService.createWithNulls({
        coachId: 'ccoach1234567890123456',
      });
      const updatedService = test.factory.customService.createWithNulls({
        name: 'Updated Service Name',
      });
      test.mocks.PrismaService.customService.findFirst.mockResolvedValue(existingService);
      test.mocks.PrismaService.customService.update.mockResolvedValue(updatedService);

      const result = await test.service.update(
        'ccustomservice123456789',
        updateDto,
        'cadmin1234567890123456',
        Role.ADMIN
      );

      expect(result.name).toBe('Updated Service Name');
    });

    it('should throw ForbiddenException when coach is not owner', async () => {
      const existingService = test.factory.customService.createWithNulls({
        coachId: 'cothercoach1234567890',
      });
      test.mocks.PrismaService.customService.findFirst.mockResolvedValue(existingService);

      await expect(
        test.service.update(
          'ccustomservice123456789',
          updateDto,
          'ccoach1234567890123456',
          Role.COACH
        )
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw NotFoundException when service not found', async () => {
      test.mocks.PrismaService.customService.findFirst.mockResolvedValue(null);

      await expect(
        test.service.update(
          'cnonexistent12345678901',
          updateDto,
          'ccoach1234567890123456',
          Role.COACH
        )
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('remove', () => {
    it('should delete service when coach is owner', async () => {
      const existingService = test.factory.customService.createWithNulls({
        coachId: 'ccoach1234567890123456',
      });
      test.mocks.PrismaService.customService.findFirst.mockResolvedValue(existingService);
      test.mocks.PrismaService.customService.delete.mockResolvedValue(existingService);

      await test.service.remove('ccustomservice123456789', 'ccoach1234567890123456', Role.COACH);

      expect(test.mocks.PrismaService.customService.delete).toHaveBeenCalledWith({
        where: { id: 'ccustomservice123456789' },
      });
    });

    it('should allow ADMIN to delete any service', async () => {
      const existingService = test.factory.customService.createWithNulls({
        coachId: 'ccoach1234567890123456',
      });
      test.mocks.PrismaService.customService.findFirst.mockResolvedValue(existingService);
      test.mocks.PrismaService.customService.delete.mockResolvedValue(existingService);

      await test.service.remove('ccustomservice123456789', 'cadmin1234567890123456', Role.ADMIN);

      expect(test.mocks.PrismaService.customService.delete).toHaveBeenCalled();
    });

    it('should throw ForbiddenException when coach is not owner', async () => {
      const existingService = test.factory.customService.createWithNulls({
        coachId: 'cothercoach1234567890',
      });
      test.mocks.PrismaService.customService.findFirst.mockResolvedValue(existingService);

      await expect(
        test.service.remove('ccustomservice123456789', 'ccoach1234567890123456', Role.COACH)
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('saveAsTemplate', () => {
    it('should save service as template when coach is owner', async () => {
      const existingService = test.factory.customService.createWithNulls({
        coachId: 'ccoach1234567890123456',
        isTemplate: false,
      });
      const updatedService = test.factory.customService.createWithNulls({
        coachId: 'ccoach1234567890123456',
        isTemplate: true,
      });
      test.mocks.PrismaService.customService.findFirst.mockResolvedValue(existingService);
      test.mocks.PrismaService.customService.update.mockResolvedValue(updatedService);

      const result = await test.service.saveAsTemplate(
        'ccustomservice123456789',
        'ccoach1234567890123456',
        Role.COACH
      );

      expect(result.isTemplate).toBe(true);
      expect(test.mocks.PrismaService.customService.update).toHaveBeenCalledWith({
        where: { id: 'ccustomservice123456789' },
        data: { isTemplate: true },
        include: expect.any(Object),
      });
    });

    it('should throw ForbiddenException when coach is not owner', async () => {
      const existingService = test.factory.customService.createWithNulls({
        coachId: 'cothercoach1234567890',
      });
      test.mocks.PrismaService.customService.findFirst.mockResolvedValue(existingService);

      await expect(
        test.service.saveAsTemplate('ccustomservice123456789', 'ccoach1234567890123456', Role.COACH)
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('sendToUser', () => {
    const sendDto = {
      userId: 'cuser12345678901234567',
      message: 'Check out this service!',
    };

    it('should send service to user and increment usage count', async () => {
      const existingService = test.factory.customService.createWithNulls({
        id: 'ccustomservice123456789',
        name: 'Test Service',
        coachId: 'ccoach1234567890123456',
      });
      test.mocks.PrismaService.customService.findFirst.mockResolvedValue(existingService);
      test.mocks.PrismaService.customService.update.mockResolvedValue(existingService);
      test.mocks.NotificationsService.sendCustomServiceNotification.mockResolvedValue(undefined);

      const result = await test.service.sendToUser(
        'ccustomservice123456789',
        sendDto,
        'ccoach1234567890123456',
        Role.COACH
      );

      expect(result.message).toContain('cuser12345678901234567');
      expect(test.mocks.PrismaService.customService.update).toHaveBeenCalledWith({
        where: { id: 'ccustomservice123456789' },
        data: { usageCount: { increment: 1 } },
      });
      expect(test.mocks.NotificationsService.sendCustomServiceNotification).toHaveBeenCalledWith(
        'ccustomservice123456789',
        'Test Service',
        'ccoach1234567890123456',
        'cuser12345678901234567',
        'Check out this service!'
      );
    });

    it('should throw ForbiddenException when coach is not owner', async () => {
      const existingService = test.factory.customService.createWithNulls({
        coachId: 'cothercoach1234567890',
      });
      test.mocks.PrismaService.customService.findFirst.mockResolvedValue(existingService);

      await expect(
        test.service.sendToUser(
          'ccustomservice123456789',
          sendDto,
          'ccoach1234567890123456',
          Role.COACH
        )
      ).rejects.toThrow(ForbiddenException);
    });

    it('should handle notification failure gracefully', async () => {
      const existingService = test.factory.customService.createWithNulls({
        id: 'ccustomservice123456789',
        name: 'Test Service',
        coachId: 'ccoach1234567890123456',
      });
      test.mocks.PrismaService.customService.findFirst.mockResolvedValue(existingService);
      test.mocks.PrismaService.customService.update.mockResolvedValue(existingService);
      test.mocks.NotificationsService.sendCustomServiceNotification.mockRejectedValue(
        new Error('Notification failed')
      );

      // Should not throw, just log the error
      const result = await test.service.sendToUser(
        'ccustomservice123456789',
        sendDto,
        'ccoach1234567890123456',
        Role.COACH
      );

      expect(result.message).toContain('cuser12345678901234567');
    });
  });

  describe('countCustomServices', () => {
    it('should return count of custom services', async () => {
      test.mocks.PrismaService.customService.count.mockResolvedValue(5);

      const result = await test.service.countCustomServices();

      expect(result).toBe(5);
    });

    it('should apply where filter', async () => {
      test.mocks.PrismaService.customService.count.mockResolvedValue(3);

      await test.service.countCustomServices({ isPublic: true });

      expect(test.mocks.PrismaService.customService.count).toHaveBeenCalledWith({
        where: { isPublic: true },
      });
    });
  });

  describe('getTotalUsage', () => {
    it('should return total usage count', async () => {
      test.mocks.PrismaService.customService.aggregate.mockResolvedValue({
        _sum: { usageCount: 42 },
      });

      const result = await test.service.getTotalUsage();

      expect(result).toBe(42);
    });

    it('should return 0 when no services exist', async () => {
      test.mocks.PrismaService.customService.aggregate.mockResolvedValue({
        _sum: { usageCount: null },
      });

      const result = await test.service.getTotalUsage();

      expect(result).toBe(0);
    });
  });
});
