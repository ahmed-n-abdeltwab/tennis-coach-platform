/**
 * Test to verify DRY base classes work correctly
 */

import { Role } from '@prisma/client';

import { ControllerTest, E2ETest, IntegrationTest, ServiceTest } from '../index';

describe('DRY Base Classes', () => {
  describe('IntegrationTest', () => {
    it('should be instantiable', () => {
      const test = new IntegrationTest({
        modules: [],
      });
      expect(test).toBeDefined();
      expect(test.http).toBeDefined();
      expect(test.auth).toBeDefined();
      expect(test.db).toBeDefined();
      expect(test.assert).toBeDefined();
    });
  });

  describe('ControllerTest', () => {
    it('should be instantiable', () => {
      class MockController {}

      const test = new ControllerTest({
        controllerClass: MockController,
        moduleName: 'test',
        providers: [],
      });
      expect(test).toBeDefined();
      expect(test.http).toBeDefined();
      expect(test.auth).toBeDefined();
      expect(test.assert).toBeDefined();
      expect(test.mock).toBeDefined();
    });
  });

  describe('ServiceTest', () => {
    it('should be instantiable', () => {
      class MockService {}

      const test = new ServiceTest({
        serviceClass: MockService,
      });
      expect(test).toBeDefined();
      expect(test.mock).toBeDefined();
    });
  });

  describe('E2ETest', () => {
    it('should be instantiable', () => {
      const test = new E2ETest();
      expect(test).toBeDefined();
      expect(test.http).toBeDefined();
      expect(test.auth).toBeDefined();
      expect(test.db).toBeDefined();
      expect(test.assert).toBeDefined();
    });
  });

  describe('AuthMixin', () => {
    it('should create tokens', async () => {
      const test = new IntegrationTest({ modules: [] });
      const token = await test.auth.createTestJwtToken();
      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
    });

    it('should create role tokens', async () => {
      const test = new IntegrationTest({ modules: [] });
      const token = await test.auth.createRoleToken(Role.COACH);
      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
    });

    it('should create auth headers', async () => {
      const test = new IntegrationTest({ modules: [] });
      const headers = await test.auth.createAuthHeaders();
      expect(headers).toBeDefined();
      expect(headers.Authorization).toContain('Bearer ');
    });
  });

  describe('MockMixin', () => {
    it('should create mock repository', () => {
      class MockService {}
      const test = new ServiceTest({ serviceClass: MockService });
      const mockRepo = test.mock.createMockRepository();
      expect(mockRepo).toBeDefined();
      expect(mockRepo.create).toBeDefined();
      expect(mockRepo.findMany).toBeDefined();
    });

    it('should create mock PrismaService', () => {
      class MockService {}
      const test = new ServiceTest({ serviceClass: MockService });
      const mockPrisma = test.mock.createMockPrismaService();
      expect(mockPrisma).toBeDefined();
      expect(mockPrisma.$connect).toBeDefined();
      expect(mockPrisma.account).toBeDefined();
    });
  });

  describe('AssertionsMixin', () => {
    it('should have assertion methods', () => {
      const test = new IntegrationTest({ modules: [] });
      expect(test.assert.assertSuccessResponse).toBeDefined();
      expect(test.assert.assertErrorResponse).toBeDefined();
      expect(test.assert.assertNotFound).toBeDefined();
      expect(test.assert.assertUnauthorized).toBeDefined();
      expect(test.assert.assertForbidden).toBeDefined();
    });
  });
});
