import { HttpStatus } from '@nestjs/common';
import { Account, Role } from '@prisma/client';

import { E2ETest } from '../utils';

describe('Custom Service Workflow (E2E)', () => {
  let test: E2ETest;
  let userToken: string;
  let coachToken: string;
  let adminToken: string;
  let testUser: Account;
  let testCoach: Account;
  let testAdmin: Account;

  beforeAll(async () => {
    test = new E2ETest();
    await test.setup();
  });

  afterAll(async () => {
    await test.cleanup();
  });

  beforeEach(async () => {
    await test.db.cleanupDatabase();

    // Create test users with different roles
    testUser = await test.db.createTestUser();
    testCoach = await test.db.createTestCoach();
    testAdmin = await test.db.createTestUser({ role: Role.ADMIN });

    userToken = await test.auth.createToken({
      sub: testUser.id,
      email: testUser.email,
      role: testUser.role,
    });
    coachToken = await test.auth.createToken({
      sub: testCoach.id,
      email: testCoach.email,
      role: testCoach.role,
    });
    adminToken = await test.auth.createToken({
      sub: testAdmin.id,
      email: testAdmin.email,
      role: testAdmin.role,
    });
  });

  describe('Complete Custom Service Creation to Booking Workflow', () => {
    it('should complete full workflow: create service -> send to user -> user books service', async () => {
      // Step 1: Coach creates a custom service
      const createServiceResponse = await test.http.authenticatedPost(
        '/api/custom-services',
        coachToken,
        {
          body: {
            name: 'Premium Tennis Coaching',
            description: 'Advanced tennis coaching session with video analysis',
            basePrice: '200.00',
            duration: 120,
            isTemplate: false,
            isPublic: false,
          },
        }
      );

      expect(createServiceResponse.ok).toBe(true);
      if (!createServiceResponse.ok) return;

      expect(createServiceResponse.body.name).toBe('Premium Tennis Coaching');
      const customServiceId = createServiceResponse.body.id;

      // Step 2: Coach sends custom service to user through chat
      const sendServiceResponse = await test.http.authenticatedPost(
        `/api/custom-services/${customServiceId}/send-to-user` as '/api/custom-services/{id}/send-to-user',
        coachToken,
        {
          body: {
            userId: testUser.id,
            message: 'Check out this premium coaching service I created for you!',
          },
        }
      );

      expect(sendServiceResponse.ok).toBe(true);
      if (sendServiceResponse.ok) {
        expect(sendServiceResponse.body.message).toBeDefined();
      }

      // Step 3: Verify message was created in chat system
      const messagesResponse = await test.http.authenticatedGet(
        `/api/messages/conversation/${testCoach.id}` as '/api/messages/conversation/{userId}',
        userToken
      );

      expect(messagesResponse.ok).toBe(true);
      if (messagesResponse.ok) {
        expect(Array.isArray(messagesResponse.body)).toBe(true);

        const customServiceMessage = messagesResponse.body.find(
          (msg: { messageType?: string; customServiceId?: string }) =>
            msg.messageType === 'CUSTOM_SERVICE' && msg.customServiceId === customServiceId
        );
        expect(customServiceMessage).toBeDefined();
      }

      // Step 4: User views the custom service
      const viewServiceResponse = await test.http.authenticatedGet(
        `/api/custom-services/${customServiceId}` as '/api/custom-services/{id}',
        userToken
      );

      // User may not have access to private service, so check accordingly
      if (viewServiceResponse.ok) {
        expect(viewServiceResponse.body.name).toBe('Premium Tennis Coaching');
      }

      // Step 5: Coach creates a booking type based on the custom service
      const bookingTypeResponse = await test.http.authenticatedPost(
        '/api/booking-types',
        coachToken,
        {
          body: {
            name: 'Premium Tennis Coaching',
            description: 'Advanced tennis coaching session with video analysis',
            basePrice: 200,
          },
        }
      );

      expect(bookingTypeResponse.ok).toBe(true);
      if (!bookingTypeResponse.ok) return;

      const bookingTypeId = bookingTypeResponse.body.id;

      // Step 6: Create a time slot for booking
      const futureDate = new Date();
      futureDate.setMonth(futureDate.getMonth() + 1);

      const timeSlotResponse = await test.http.authenticatedPost('/api/time-slots', coachToken, {
        body: {
          dateTime: futureDate.toISOString(),
          durationMin: 120,
        },
      });

      expect(timeSlotResponse.ok).toBe(true);
      if (!timeSlotResponse.ok) return;

      const timeSlotId = timeSlotResponse.body.id;

      // Step 7: User books a session using the custom service details
      const sessionResponse = await test.http.authenticatedPost('/api/sessions', userToken, {
        body: {
          bookingTypeId,
          timeSlotId,
        },
      });

      expect(sessionResponse.ok).toBe(true);
      if (sessionResponse.ok) {
        expect(sessionResponse.body.bookingTypeId).toBe(bookingTypeId);
      }

      // Step 8: Verify analytics reflect the custom service usage
      const analyticsResponse = await test.http.authenticatedGet(
        '/api/analytics/custom-services',
        coachToken
      );

      expect(analyticsResponse.ok).toBe(true);
      if (analyticsResponse.ok) {
        expect(analyticsResponse.body.totalCustomServices).toBeGreaterThanOrEqual(1);
      }
    });

    it('should handle custom service template workflow', async () => {
      // Step 1: Coach creates a custom service
      const createServiceResponse = await test.http.authenticatedPost(
        '/api/custom-services',
        coachToken,
        {
          body: {
            name: 'Beginner Tennis Lesson',
            description: 'Perfect for tennis beginners',
            basePrice: '80.00',
            duration: 60,
            isTemplate: false,
            isPublic: false,
          },
        }
      );

      expect(createServiceResponse.ok).toBe(true);
      if (!createServiceResponse.ok) return;

      const customServiceId = createServiceResponse.body.id;

      // Step 2: Coach saves service as template
      const saveTemplateResponse = await test.http.authenticatedPost(
        `/api/custom-services/${customServiceId}/save-as-template` as '/api/custom-services/{id}/save-as-template',
        coachToken
      );

      expect(saveTemplateResponse.ok).toBe(true);
      if (saveTemplateResponse.ok) {
        expect(saveTemplateResponse.body.isTemplate).toBe(true);
      }

      // Step 3: Coach makes template public via PATCH
      const updateServiceResponse = await test.http.authenticatedPatch(
        `/api/custom-services/${customServiceId}` as '/api/custom-services/{id}',
        coachToken,
        {
          body: {
            isPublic: true,
          },
        }
      );

      expect(updateServiceResponse.ok).toBe(true);
      if (updateServiceResponse.ok) {
        expect(updateServiceResponse.body.isPublic).toBe(true);
      }

      // Step 4: User can now see the public template
      const publicServicesResponse = await test.http.authenticatedGet(
        '/api/custom-services',
        userToken
      );

      expect(publicServicesResponse.ok).toBe(true);
      if (publicServicesResponse.ok) {
        const publicService = publicServicesResponse.body.find(
          (service: { id: string }) => service.id === customServiceId
        );
        expect(publicService).toBeDefined();
        if (publicService) {
          expect(publicService.isPublic).toBe(true);
          expect(publicService.isTemplate).toBe(true);
        }
      }

      // Step 5: Verify template appears in analytics
      const analyticsResponse = await test.http.authenticatedGet(
        '/api/analytics/custom-services',
        coachToken
      );

      expect(analyticsResponse.ok).toBe(true);
      if (analyticsResponse.ok) {
        expect(analyticsResponse.body.templatesCreated).toBeGreaterThanOrEqual(1);
      }
    });
  });

  describe('Role-Based Access Control Workflow', () => {
    it('should enforce proper access control throughout custom service workflow', async () => {
      // Step 1: Verify user cannot create custom services
      const userCreateResponse = await test.http.authenticatedPost(
        '/api/custom-services',
        userToken,
        {
          body: {
            name: 'User Service',
            description: 'Service created by user',
            basePrice: '50.00',
            duration: 30,
          },
        }
      );

      expect(userCreateResponse.ok).toBe(false);
      if (!userCreateResponse.ok) {
        expect(userCreateResponse.status).toBe(HttpStatus.FORBIDDEN);
      }

      // Step 2: Coach creates service successfully
      const coachCreateResponse = await test.http.authenticatedPost(
        '/api/custom-services',
        coachToken,
        {
          body: {
            name: 'Coach Service',
            description: 'Service created by coach',
            basePrice: '100.00',
            duration: 60,
          },
        }
      );

      expect(coachCreateResponse.ok).toBe(true);
      if (!coachCreateResponse.ok) return;

      const serviceId = coachCreateResponse.body.id;

      // Step 3: Verify user cannot update coach's service
      const userUpdateResponse = await test.http.authenticatedPatch(
        `/api/custom-services/${serviceId}` as '/api/custom-services/{id}',
        userToken,
        {
          body: {
            name: 'User Modified Service',
          },
        }
      );

      expect(userUpdateResponse.ok).toBe(false);
      if (!userUpdateResponse.ok) {
        expect(userUpdateResponse.status).toBe(HttpStatus.FORBIDDEN);
      }

      // Step 4: Verify user cannot send services
      const userSendResponse = await test.http.authenticatedPost(
        `/api/custom-services/${serviceId}/send-to-user` as '/api/custom-services/{id}/send-to-user',
        userToken,
        {
          body: {
            userId: testCoach.id,
            message: 'User trying to send service',
          },
        }
      );

      expect(userSendResponse.ok).toBe(false);
      if (!userSendResponse.ok) {
        expect(userSendResponse.status).toBe(HttpStatus.FORBIDDEN);
      }

      // Step 5: Admin can access and modify any service
      const adminUpdateResponse = await test.http.authenticatedPatch(
        `/api/custom-services/${serviceId}` as '/api/custom-services/{id}',
        adminToken,
        {
          body: {
            name: 'Admin Modified Service',
          },
        }
      );

      expect(adminUpdateResponse.ok).toBe(true);
      if (adminUpdateResponse.ok) {
        expect(adminUpdateResponse.body.name).toBe('Admin Modified Service');
      }

      // Step 6: Admin can delete any service
      const adminDeleteResponse = await test.http.authenticatedDelete(
        `/api/custom-services/${serviceId}` as '/api/custom-services/{id}',
        adminToken
      );

      expect(adminDeleteResponse.ok).toBe(true);
    });
  });

  describe('Chat Integration with Custom Services', () => {
    it('should integrate custom services with chat system properly', async () => {
      // Step 1: Create custom service
      const serviceResponse = await test.http.authenticatedPost(
        '/api/custom-services',
        coachToken,
        {
          body: {
            name: 'Chat Integration Service',
            description: 'Service for testing chat integration',
            basePrice: '120.00',
            duration: 90,
          },
        }
      );

      expect(serviceResponse.ok).toBe(true);
      if (!serviceResponse.ok) return;

      const serviceId = serviceResponse.body.id;

      // Step 2: Send service through chat
      const sendResponse = await test.http.authenticatedPost(
        `/api/custom-services/${serviceId}/send-to-user` as '/api/custom-services/{id}/send-to-user',
        coachToken,
        {
          body: {
            userId: testUser.id,
            message: 'Here is a custom service for you!',
          },
        }
      );

      expect(sendResponse.ok).toBe(true);

      // Step 3: Verify conversation was created/updated
      const conversationsResponse = await test.http.authenticatedGet(
        '/api/conversations',
        coachToken
      );

      expect(conversationsResponse.ok).toBe(true);
      if (!conversationsResponse.ok) return;

      const userConversation = conversationsResponse.body.find(
        (conv: { participantIds: string[] }) => conv.participantIds.includes(testUser.id)
      );
      expect(userConversation).toBeDefined();
      if (!userConversation) return;

      // Step 4: Verify message appears in conversation
      const messagesResponse = await test.http.authenticatedGet(
        `/api/messages/conversation/${testUser.id}` as '/api/messages/conversation/{userId}',
        coachToken
      );

      expect(messagesResponse.ok).toBe(true);
      if (messagesResponse.ok) {
        const serviceMessage = messagesResponse.body.find(
          (msg: { messageType?: string; customServiceId?: string }) =>
            msg.messageType === 'CUSTOM_SERVICE' && msg.customServiceId === serviceId
        );
        expect(serviceMessage).toBeDefined();
      }

      // Step 5: Coach can pin the conversation
      const pinResponse = await test.http.authenticatedPost(
        `/api/conversations/${userConversation.id}/pin` as '/api/conversations/{id}/pin',
        coachToken
      );

      expect(pinResponse.ok).toBe(true);
      if (pinResponse.ok) {
        expect(pinResponse.body.isPinned).toBe(true);
      }

      // Step 6: Verify pinned conversation appears first
      const pinnedConversationsResponse = await test.http.authenticatedGet(
        '/api/conversations',
        coachToken
      );

      expect(pinnedConversationsResponse.ok).toBe(true);
      if (pinnedConversationsResponse.ok && pinnedConversationsResponse.body.length > 0) {
        const firstConversation = pinnedConversationsResponse.body[0] as { isPinned: boolean };
        expect(firstConversation.isPinned).toBe(true);
      }
    });
  });
});
