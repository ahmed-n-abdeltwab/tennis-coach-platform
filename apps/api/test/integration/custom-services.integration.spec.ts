/**
 * Custom Services Module Integration Tests
 * Tests custom service creation, retrieval, update, deletion, and send-to-user workflows
 */

import { Role } from '@prisma/client';

import { CustomServicesModule } from '../../src/app/custom-services/custom-services.module';
import { IamModule } from '../../src/app/iam/iam.module';
import { NotificationsModule } from '../../src/app/notifications/notifications.module';
import { IntegrationTest } from '../utils';

describe('Custom Services Integration', () => {
  let test: IntegrationTest;
  let userToken: string;
  let coachToken: string;
  let adminToken: string;
  let coachId: string;
  let userId: string;

  beforeAll(async () => {
    test = new IntegrationTest({
      modules: [CustomServicesModule, IamModule, NotificationsModule],
    });
    await test.setup();
  });

  afterAll(async () => {
    await test.cleanup();
  });

  beforeEach(async () => {
    await test.db.cleanupDatabase();

    const user = await test.db.createTestUser();
    const coach = await test.db.createTestCoach();
    const admin = await test.db.createTestUser({ role: Role.ADMIN });

    userId = user.id;
    coachId = coach.id;

    userToken = await test.auth.createToken({
      sub: user.id,
      email: user.email,
      role: user.role,
    });

    coachToken = await test.auth.createToken({
      sub: coach.id,
      email: coach.email,
      role: coach.role,
    });

    adminToken = await test.auth.createToken({
      sub: admin.id,
      email: admin.email,
      role: admin.role,
    });
  });

  describe('Custom Service Creation', () => {
    describe('POST /api/custom-services', () => {
      it('should allow coach to create a custom service', async () => {
        const createData = {
          name: 'Personal Training Session',
          description: 'One-on-one coaching session',
          basePrice: '99.99',
          duration: 60,
        };

        const response = await test.http.authenticatedPost('/api/custom-services', coachToken, {
          body: createData,
        });

        expect(response.ok).toBe(true);
        if (response.ok) {
          expect(response.status).toBe(201);
          expect(response.body).toHaveProperty('id');
          expect(response.body.name).toBe(createData.name);
          expect(response.body.description).toBe(createData.description);
          expect(response.body.duration).toBe(createData.duration);
          expect(response.body.coachId).toBe(coachId);
          expect(response.body.isTemplate).toBe(false);
          expect(response.body.isPublic).toBe(false);
        }
      });

      it('should allow admin to create a custom service', async () => {
        const createData = {
          name: 'Admin Created Service',
          description: 'Service created by admin',
          basePrice: '150.00',
          duration: 90,
        };

        const response = await test.http.authenticatedPost('/api/custom-services', adminToken, {
          body: createData,
        });

        expect(response.ok).toBe(true);
        if (response.ok) {
          expect(response.status).toBe(201);
          expect(response.body.name).toBe(createData.name);
        }
      });

      it('should prevent regular users from creating custom services', async () => {
        const createData = {
          name: 'User Service',
          description: 'Should not be created',
          basePrice: '50.00',
          duration: 30,
        };

        const response = await test.http.authenticatedPost('/api/custom-services', userToken, {
          body: createData,
        });

        expect(response.ok).toBe(false);
        if (!response.ok) {
          expect(response.status).toBe(403);
        }
      });

      it('should create custom service with template flag', async () => {
        const createData = {
          name: 'Template Service',
          description: 'Reusable template',
          basePrice: '75.00',
          duration: 45,
          isTemplate: true,
        };

        const response = await test.http.authenticatedPost('/api/custom-services', coachToken, {
          body: createData,
        });

        expect(response.ok).toBe(true);
        if (response.ok) {
          expect(response.body.isTemplate).toBe(true);
        }
      });

      it('should create public custom service', async () => {
        const createData = {
          name: 'Public Service',
          description: 'Visible to all users',
          basePrice: '80.00',
          duration: 60,
          isPublic: true,
        };

        const response = await test.http.authenticatedPost('/api/custom-services', coachToken, {
          body: createData,
        });

        expect(response.ok).toBe(true);
        if (response.ok) {
          expect(response.body.isPublic).toBe(true);
        }
      });

      it('should fail without authentication', async () => {
        const createData = {
          name: 'Unauthenticated Service',
          basePrice: '50.00',
          duration: 30,
        };

        const response = await test.http.post('/api/custom-services', {
          body: createData,
        });

        expect(response.ok).toBe(false);
        if (!response.ok) {
          expect(response.status).toBeGreaterThanOrEqual(401);
        }
      });
    });
  });

  describe('Custom Service Retrieval', () => {
    describe('GET /api/custom-services', () => {
      it('should return coach own services', async () => {
        await test.db.createTestCustomService({ coachId, name: 'Coach Service 1' });
        await test.db.createTestCustomService({ coachId, name: 'Coach Service 2' });

        const response = await test.http.authenticatedGet('/api/custom-services', coachToken);

        expect(response.ok).toBe(true);
        if (response.ok) {
          expect(response.status).toBe(200);
          expect(Array.isArray(response.body)).toBe(true);
          expect(response.body.length).toBeGreaterThanOrEqual(2);
        }
      });

      it('should return public services to users', async () => {
        await test.db.createTestCustomService({
          coachId,
          name: 'Public Service',
          isPublic: true,
        });
        await test.db.createTestCustomService({
          coachId,
          name: 'Private Service',
          isPublic: false,
        });

        const response = await test.http.authenticatedGet('/api/custom-services', userToken);

        expect(response.ok).toBe(true);
        if (response.ok) {
          expect(Array.isArray(response.body)).toBe(true);
          const publicServices = response.body.filter((s: { isPublic: boolean }) => s.isPublic);
          expect(publicServices.length).toBeGreaterThanOrEqual(1);
        }
      });

      it('should filter by template status', async () => {
        await test.db.createTestCustomService({
          coachId,
          name: 'Template',
          isTemplate: true,
        });
        await test.db.createTestCustomService({
          coachId,
          name: 'Non-Template',
          isTemplate: false,
        });

        const response = await test.http.authenticatedGet(
          '/api/custom-services?isTemplate=true' as '/api/custom-services',
          coachToken
        );

        expect(response.ok).toBe(true);
        if (response.ok) {
          expect(Array.isArray(response.body)).toBe(true);
          response.body.forEach((service: { isTemplate: boolean }) => {
            expect(service.isTemplate).toBe(true);
          });
        }
      });

      it('should allow admin to see all services', async () => {
        const otherCoach = await test.db.createTestCoach();
        await test.db.createTestCustomService({
          coachId: otherCoach.id,
          name: 'Other Coach Service',
        });

        const response = await test.http.authenticatedGet('/api/custom-services', adminToken);

        expect(response.ok).toBe(true);
        if (response.ok) {
          expect(Array.isArray(response.body)).toBe(true);
        }
      });
    });

    describe('GET /api/custom-services/:id', () => {
      it('should return custom service by ID for owner', async () => {
        const service = await test.db.createTestCustomService({
          coachId,
          name: 'Test Service',
        });

        const response = await test.http.authenticatedGet(
          `/api/custom-services/${service.id}` as '/api/custom-services/{id}',
          coachToken
        );

        expect(response.ok).toBe(true);
        if (response.ok) {
          expect(response.status).toBe(200);
          expect(response.body.id).toBe(service.id);
          expect(response.body.name).toBe('Test Service');
        }
      });

      it('should allow user to access public service', async () => {
        const service = await test.db.createTestCustomService({
          coachId,
          name: 'Public Service',
          isPublic: true,
        });

        const response = await test.http.authenticatedGet(
          `/api/custom-services/${service.id}` as '/api/custom-services/{id}',
          userToken
        );

        expect(response.ok).toBe(true);
        if (response.ok) {
          expect(response.body.id).toBe(service.id);
        }
      });

      it('should deny user access to private service', async () => {
        const service = await test.db.createTestCustomService({
          coachId,
          name: 'Private Service',
          isPublic: false,
        });

        const response = await test.http.authenticatedGet(
          `/api/custom-services/${service.id}` as '/api/custom-services/{id}',
          userToken
        );

        expect(response.ok).toBe(false);
        if (!response.ok) {
          expect(response.status).toBe(403);
        }
      });

      it('should return 404 for non-existent service', async () => {
        const response = await test.http.authenticatedGet(
          '/api/custom-services/cnonexistent12345678901' as '/api/custom-services/{id}',
          coachToken
        );

        expect(response.ok).toBe(false);
        if (!response.ok) {
          expect(response.status).toBe(404);
        }
      });
    });
  });

  describe('Custom Service Update', () => {
    describe('PATCH /api/custom-services/:id', () => {
      it('should allow coach to update own service', async () => {
        const service = await test.db.createTestCustomService({
          coachId,
          name: 'Original Name',
        });

        const updateData = {
          name: 'Updated Name',
          description: 'Updated description',
        };

        const response = await test.http.authenticatedPatch(
          `/api/custom-services/${service.id}` as '/api/custom-services/{id}',
          coachToken,
          { body: updateData }
        );

        expect(response.ok).toBe(true);
        if (response.ok) {
          expect(response.status).toBe(200);
          expect(response.body.name).toBe(updateData.name);
          expect(response.body.description).toBe(updateData.description);
        }
      });

      it('should allow admin to update any service', async () => {
        const service = await test.db.createTestCustomService({
          coachId,
          name: 'Coach Service',
        });

        const updateData = {
          name: 'Admin Updated',
        };

        const response = await test.http.authenticatedPatch(
          `/api/custom-services/${service.id}` as '/api/custom-services/{id}',
          adminToken,
          { body: updateData }
        );

        expect(response.ok).toBe(true);
        if (response.ok) {
          expect(response.body.name).toBe(updateData.name);
        }
      });

      it('should prevent coach from updating other coach services', async () => {
        const otherCoach = await test.db.createTestCoach();
        const service = await test.db.createTestCustomService({
          coachId: otherCoach.id,
          name: 'Other Coach Service',
        });

        const updateData = {
          name: 'Unauthorized Update',
        };

        const response = await test.http.authenticatedPatch(
          `/api/custom-services/${service.id}` as '/api/custom-services/{id}',
          coachToken,
          { body: updateData }
        );

        expect(response.ok).toBe(false);
        if (!response.ok) {
          expect(response.status).toBe(403);
        }
      });

      it('should prevent users from updating services', async () => {
        const service = await test.db.createTestCustomService({
          coachId,
          name: 'Service',
          isPublic: true,
        });

        const updateData = {
          name: 'User Update Attempt',
        };

        const response = await test.http.authenticatedPatch(
          `/api/custom-services/${service.id}` as '/api/custom-services/{id}',
          userToken,
          { body: updateData }
        );

        expect(response.ok).toBe(false);
        if (!response.ok) {
          expect(response.status).toBe(403);
        }
      });
    });
  });

  describe('Custom Service Deletion', () => {
    describe('DELETE /api/custom-services/:id', () => {
      it('should allow coach to delete own service', async () => {
        const service = await test.db.createTestCustomService({
          coachId,
          name: 'To Delete',
        });

        const response = await test.http.authenticatedDelete(
          `/api/custom-services/${service.id}` as '/api/custom-services/{id}',
          coachToken
        );

        expect(response.ok).toBe(true);
        if (response.ok) {
          expect(response.status).toBe(200);
        }

        // Verify deletion
        const verifyResponse = await test.http.authenticatedGet(
          `/api/custom-services/${service.id}` as '/api/custom-services/{id}',
          coachToken
        );
        expect(verifyResponse.ok).toBe(false);
      });

      it('should allow admin to delete any service', async () => {
        const service = await test.db.createTestCustomService({
          coachId,
          name: 'Admin Delete Target',
        });

        const response = await test.http.authenticatedDelete(
          `/api/custom-services/${service.id}` as '/api/custom-services/{id}',
          adminToken
        );

        expect(response.ok).toBe(true);
      });

      it('should prevent coach from deleting other coach services', async () => {
        const otherCoach = await test.db.createTestCoach();
        const service = await test.db.createTestCustomService({
          coachId: otherCoach.id,
          name: 'Other Coach Service',
        });

        const response = await test.http.authenticatedDelete(
          `/api/custom-services/${service.id}` as '/api/custom-services/{id}',
          coachToken
        );

        expect(response.ok).toBe(false);
        if (!response.ok) {
          expect(response.status).toBe(403);
        }
      });
    });
  });

  describe('Save As Template', () => {
    describe('POST /api/custom-services/:id/save-as-template', () => {
      it('should save service as template', async () => {
        const service = await test.db.createTestCustomService({
          coachId,
          name: 'Regular Service',
          isTemplate: false,
        });

        const response = await test.http.authenticatedPost(
          `/api/custom-services/${service.id}/save-as-template` as '/api/custom-services/{id}/save-as-template',
          coachToken
        );

        expect(response.ok).toBe(true);
        if (response.ok) {
          expect(response.body.isTemplate).toBe(true);
        }
      });

      it('should prevent non-owner from saving as template', async () => {
        const otherCoach = await test.db.createTestCoach();
        const service = await test.db.createTestCustomService({
          coachId: otherCoach.id,
          name: 'Other Service',
        });

        const response = await test.http.authenticatedPost(
          `/api/custom-services/${service.id}/save-as-template` as '/api/custom-services/{id}/save-as-template',
          coachToken
        );

        expect(response.ok).toBe(false);
        if (!response.ok) {
          expect(response.status).toBe(403);
        }
      });
    });
  });

  describe('Send To User', () => {
    describe('POST /api/custom-services/:id/send-to-user', () => {
      it('should send custom service to user', async () => {
        const service = await test.db.createTestCustomService({
          coachId,
          name: 'Service to Send',
        });

        const sendData = {
          userId,
          message: 'Check out this custom service!',
        };

        const response = await test.http.authenticatedPost(
          `/api/custom-services/${service.id}/send-to-user` as '/api/custom-services/{id}/send-to-user',
          coachToken,
          { body: sendData }
        );

        expect(response.ok).toBe(true);
        if (response.ok) {
          expect(response.body).toHaveProperty('message');
        }
      });

      it('should increment usage count when sent', async () => {
        const service = await test.db.createTestCustomService({
          coachId,
          name: 'Service to Track',
          usageCount: 0,
        });

        const sendData = {
          userId,
        };

        await test.http.authenticatedPost(
          `/api/custom-services/${service.id}/send-to-user` as '/api/custom-services/{id}/send-to-user',
          coachToken,
          { body: sendData }
        );

        // Verify usage count increased
        const getResponse = await test.http.authenticatedGet(
          `/api/custom-services/${service.id}` as '/api/custom-services/{id}',
          coachToken
        );

        expect(getResponse.ok).toBe(true);
        if (getResponse.ok) {
          expect(getResponse.body.usageCount).toBe(1);
        }
      });

      it('should prevent non-owner from sending service', async () => {
        const otherCoach = await test.db.createTestCoach();
        const service = await test.db.createTestCustomService({
          coachId: otherCoach.id,
          name: 'Other Coach Service',
        });

        const sendData = {
          userId,
        };

        const response = await test.http.authenticatedPost(
          `/api/custom-services/${service.id}/send-to-user` as '/api/custom-services/{id}/send-to-user',
          coachToken,
          { body: sendData }
        );

        expect(response.ok).toBe(false);
        if (!response.ok) {
          expect(response.status).toBe(403);
        }
      });
    });
  });

  describe('Role-Based Access Control', () => {
    const roleTestCases = [
      { role: Role.ADMIN, canCreate: true, description: 'ADMIN' },
      { role: Role.COACH, canCreate: true, description: 'COACH' },
      { role: Role.USER, canCreate: false, description: 'USER' },
    ] as const;

    it.each(roleTestCases)(
      'should $description role $canCreate create custom services',
      async ({ role, canCreate }) => {
        const account = await test.db.createTestUser({ role });
        const token = await test.auth.createToken({
          sub: account.id,
          email: account.email,
          role,
        });

        const createData = {
          name: 'Role Test Service',
          basePrice: '50.00',
          duration: 30,
        };

        const response = await test.http.authenticatedPost('/api/custom-services', token, {
          body: createData,
        });

        if (canCreate) {
          expect(response.ok).toBe(true);
        } else {
          expect(response.ok).toBe(false);
          if (!response.ok) {
            expect(response.status).toBe(403);
          }
        }
      }
    );
  });
});
