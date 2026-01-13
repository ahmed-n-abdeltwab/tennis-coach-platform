import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { Role } from '@prisma/client';
import { ControllerTest } from '@test-utils';
import { DeepMocked } from '@test-utils/mixins/mock.mixin';

import { CustomServicesController } from './custom-services.controller';
import { CustomServicesService } from './custom-services.service';

interface CustomServicesControllerMocks {
  CustomServicesService: DeepMocked<CustomServicesService>;
}

describe('CustomServicesController', () => {
  let test: ControllerTest<
    CustomServicesController,
    CustomServicesControllerMocks,
    'custom-services'
  >;

  beforeEach(async () => {
    test = new ControllerTest({
      controller: CustomServicesController,
      moduleName: 'custom-services',
      providers: [CustomServicesService],
    });

    await test.setup();
  });

  afterEach(async () => {
    await test.cleanup();
  });

  describe('POST /api/custom-services', () => {
    const createDto = {
      name: 'Personal Training',
      description: 'One-on-one coaching',
      basePrice: '99.99',
      duration: 60,
    };

    it('should create a custom service as COACH', async () => {
      const mockService = test.factory.customService.createWithNulls({
        name: 'Personal Training',
        coachId: 'ccoach1234567890123456',
      });
      test.mocks.CustomServicesService.create.mockResolvedValue(mockService);

      const coachToken = await test.auth.createToken({
        role: Role.COACH,
        sub: 'ccoach1234567890123456',
      });
      await test.http.authenticatedPost('/api/custom-services', coachToken, {
        body: createDto,
      });

      expect(test.mocks.CustomServicesService.create).toHaveBeenCalledWith(
        createDto,
        'ccoach1234567890123456',
        Role.COACH
      );
    });

    it('should create a custom service as ADMIN', async () => {
      const mockService = test.factory.customService.createWithNulls({
        name: 'Personal Training',
        coachId: 'cadmin1234567890123456',
      });
      test.mocks.CustomServicesService.create.mockResolvedValue(mockService);

      const adminToken = await test.auth.createToken({
        role: Role.ADMIN,
        sub: 'cadmin1234567890123456',
      });
      await test.http.authenticatedPost('/api/custom-services', adminToken, {
        body: createDto,
      });

      expect(test.mocks.CustomServicesService.create).toHaveBeenCalledWith(
        createDto,
        'cadmin1234567890123456',
        Role.ADMIN
      );
    });
  });

  describe('GET /api/custom-services', () => {
    it('should return all custom services for ADMIN', async () => {
      const mockServices = [
        test.factory.customService.createWithNulls({ name: 'Service 1' }),
        test.factory.customService.createWithNulls({ name: 'Service 2' }),
      ];
      test.mocks.CustomServicesService.findAll.mockResolvedValue(mockServices);

      const adminToken = await test.auth.createToken({
        role: Role.ADMIN,
        sub: 'cadmin1234567890123456',
      });
      await test.http.authenticatedGet('/api/custom-services', adminToken);

      expect(test.mocks.CustomServicesService.findAll).toHaveBeenCalledWith(
        expect.any(Object),
        'cadmin1234567890123456',
        Role.ADMIN
      );
    });

    it('should pass query parameters to service', async () => {
      test.mocks.CustomServicesService.findAll.mockResolvedValue([]);

      const coachToken = await test.auth.createToken({
        role: Role.COACH,
        sub: 'ccoach1234567890123456',
      });
      const response = await test.http.authenticatedGet(
        '/api/custom-services?isTemplate=true' as '/api/custom-services',
        coachToken
      );

      expect(response.ok).toBe(true);
      expect(test.mocks.CustomServicesService.findAll).toHaveBeenCalledWith(
        expect.objectContaining({ isTemplate: true }),
        'ccoach1234567890123456',
        Role.COACH
      );
    });

    it('should allow USER to access public services', async () => {
      test.mocks.CustomServicesService.findAll.mockResolvedValue([]);

      const userToken = await test.auth.createToken({
        role: Role.USER,
        sub: 'cuser12345678901234567',
      });
      await test.http.authenticatedGet('/api/custom-services', userToken);

      expect(test.mocks.CustomServicesService.findAll).toHaveBeenCalled();
    });
  });

  describe('GET /api/custom-services/:id', () => {
    it('should return a single custom service by ID', async () => {
      const mockService = test.factory.customService.createWithNulls({
        id: 'ccustomservice123456789',
        isPublic: true,
      });
      test.mocks.CustomServicesService.findOne.mockResolvedValue(mockService);

      const userToken = await test.auth.createToken({
        role: Role.USER,
        sub: 'cuser12345678901234567',
      });
      await test.http.authenticatedGet(
        '/api/custom-services/ccustomservice123456789' as '/api/custom-services/{id}',
        userToken
      );

      expect(test.mocks.CustomServicesService.findOne).toHaveBeenCalledWith(
        'ccustomservice123456789',
        'cuser12345678901234567',
        Role.USER
      );
    });
  });

  describe('PATCH /api/custom-services/:id', () => {
    const updateDto = { name: 'Updated Service Name' };

    it('should update a custom service as COACH', async () => {
      const mockService = test.factory.customService.createWithNulls({
        id: 'ccustomservice123456789',
        name: 'Updated Service Name',
        coachId: 'ccoach1234567890123456',
      });
      test.mocks.CustomServicesService.update.mockResolvedValue(mockService);

      const coachToken = await test.auth.createToken({
        role: Role.COACH,
        sub: 'ccoach1234567890123456',
      });
      await test.http.authenticatedPatch(
        '/api/custom-services/ccustomservice123456789' as '/api/custom-services/{id}',
        coachToken,
        { body: updateDto }
      );

      expect(test.mocks.CustomServicesService.update).toHaveBeenCalledWith(
        'ccustomservice123456789',
        updateDto,
        'ccoach1234567890123456',
        Role.COACH
      );
    });
  });

  describe('DELETE /api/custom-services/:id', () => {
    it('should delete a custom service as COACH', async () => {
      test.mocks.CustomServicesService.remove.mockResolvedValue(undefined);

      const coachToken = await test.auth.createToken({
        role: Role.COACH,
        sub: 'ccoach1234567890123456',
      });
      await test.http.authenticatedDelete(
        '/api/custom-services/ccustomservice123456789' as '/api/custom-services/{id}',
        coachToken
      );

      expect(test.mocks.CustomServicesService.remove).toHaveBeenCalledWith(
        'ccustomservice123456789',
        'ccoach1234567890123456',
        Role.COACH
      );
    });
  });

  describe('POST /api/custom-services/:id/save-as-template', () => {
    it('should save custom service as template', async () => {
      const mockService = test.factory.customService.createWithNulls({
        id: 'ccustomservice123456789',
        isTemplate: true,
        coachId: 'ccoach1234567890123456',
      });
      test.mocks.CustomServicesService.saveAsTemplate.mockResolvedValue(mockService);

      const coachToken = await test.auth.createToken({
        role: Role.COACH,
        sub: 'ccoach1234567890123456',
      });
      await test.http.authenticatedPost(
        '/api/custom-services/ccustomservice123456789/save-as-template' as '/api/custom-services/{id}/save-as-template',
        coachToken,
        {}
      );

      expect(test.mocks.CustomServicesService.saveAsTemplate).toHaveBeenCalledWith(
        'ccustomservice123456789',
        'ccoach1234567890123456',
        Role.COACH
      );
    });
  });

  describe('POST /api/custom-services/:id/send-to-user', () => {
    const sendDto = {
      userId: 'cuser12345678901234567',
      message: 'Check out this service!',
    };

    it('should send custom service to user', async () => {
      test.mocks.CustomServicesService.sendToUser.mockResolvedValue({
        message: 'Custom service sent to user cuser12345678901234567',
      });

      const coachToken = await test.auth.createToken({
        role: Role.COACH,
        sub: 'ccoach1234567890123456',
      });
      await test.http.authenticatedPost(
        '/api/custom-services/ccustomservice123456789/send-to-user' as '/api/custom-services/{id}/send-to-user',
        coachToken,
        { body: sendDto }
      );

      expect(test.mocks.CustomServicesService.sendToUser).toHaveBeenCalledWith(
        'ccustomservice123456789',
        sendDto,
        'ccoach1234567890123456',
        Role.COACH
      );
    });
  });

  describe('Error Scenarios', () => {
    describe('Not found errors', () => {
      it('should return 404 when custom service not found', async () => {
        test.mocks.CustomServicesService.findOne.mockRejectedValue(
          new NotFoundException('Custom service not found')
        );

        const userToken = await test.auth.createToken({
          role: Role.USER,
          sub: 'cuser12345678901234567',
        });
        const response = await test.http.authenticatedGet(
          '/api/custom-services/cnonexistent12345678901' as '/api/custom-services/{id}',
          userToken
        );

        expect(response.status).toBe(404);
      });
    });

    describe('Forbidden errors', () => {
      it('should return 403 when USER tries to create custom service', async () => {
        test.mocks.CustomServicesService.create.mockRejectedValue(
          new ForbiddenException('Only coaches can create custom services')
        );

        const userToken = await test.auth.createToken({
          role: Role.USER,
          sub: 'cuser12345678901234567',
        });
        const response = await test.http.authenticatedPost('/api/custom-services', userToken, {
          body: {
            name: 'Test Service',
            basePrice: '99.99',
            duration: 60,
          },
        });

        expect(response.status).toBe(403);
      });

      it('should return 403 when USER accesses non-public service', async () => {
        test.mocks.CustomServicesService.findOne.mockRejectedValue(
          new ForbiddenException('Access denied to this custom service')
        );

        const userToken = await test.auth.createToken({
          role: Role.USER,
          sub: 'cuser12345678901234567',
        });
        const response = await test.http.authenticatedGet(
          '/api/custom-services/cprivateservice123456789' as '/api/custom-services/{id}',
          userToken
        );

        expect(response.status).toBe(403);
      });

      it('should return 403 when COACH tries to update another coach service', async () => {
        test.mocks.CustomServicesService.update.mockRejectedValue(
          new ForbiddenException('You can only update your own custom services')
        );

        const coachToken = await test.auth.createToken({
          role: Role.COACH,
          sub: 'ccoach1234567890123456',
        });
        const response = await test.http.authenticatedPatch(
          '/api/custom-services/cotherservice123456789' as '/api/custom-services/{id}',
          coachToken,
          { body: { name: 'Updated Name' } }
        );

        expect(response.status).toBe(403);
      });

      it('should return 403 when COACH tries to delete another coach service', async () => {
        test.mocks.CustomServicesService.remove.mockRejectedValue(
          new ForbiddenException('You can only delete your own custom services')
        );

        const coachToken = await test.auth.createToken({
          role: Role.COACH,
          sub: 'ccoach1234567890123456',
        });
        const response = await test.http.authenticatedDelete(
          '/api/custom-services/cotherservice123456789' as '/api/custom-services/{id}',
          coachToken
        );

        expect(response.status).toBe(403);
      });
    });
  });
});
