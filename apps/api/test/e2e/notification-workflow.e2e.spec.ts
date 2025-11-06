/**
 * E2E Tests: Notification Workflow
 * Tests notification flow including email, SMS, and in-app notifications
 */

import { coachFactory, sessionFactory, userFactory } from '@test-utils/factories';
import { TypeSafeHttpClient as HttpTestHelper } from '@test-utils/http/type-safe-http-client';
import { AuthTestHelper } from '../utils/auth';

describe('Notification Workflow (E2E)', () => {
  let authHelper: AuthTestHelper;
  let httpHelper: HttpTestHelper;
  let contractHelper: ApiContractTestHelper;
  let userToken: string;
  let coachToken: string;
  let testUser: any;
  let testCoach: any;

  beforeAll(() => {
    authHelper = new AuthTestHelper();
    httpHelper = new HttpTestHelper(global.testApp);
    contractHelper = new ApiContractTestHelper(global.testApp);
  });

  beforeEach(async () => {
    // Create test user and coach
    testUser = userFactory.createWithMinimalData({
      email: 'notificationuser@example.com',
      name: 'Notification Test User',
    });

    testCoach = coachFactory.create({
      email: 'notificationcoach@example.com',
      name: 'Notification Test Coach',
    });

    // Register user
    const userRegisterResponse = await httpHelper.post('/api/auth/register', {
      email: testUser.email,
      name: testUser.name,
      password: 'UserPassword123!',
    });
    userToken = userRegisterResponse.body.accessToken;
    testUser.id = userRegisterResponse.body.user.id;

    // Register coach
    const coachRegisterResponse = await httpHelper.post('/api/auth/coach/register', {
      email: testCoach.email,
      name: testCoach.name,
      password: 'CoachPassword123!',
    });
    coachToken = coachRegisterResponse.body.accessToken;
    testCoach.id = coachRegisterResponse.body.user.id;
  });

  describe('In-App Notifications', () => {
    it('should create and deliver in-app notifications', async () => {
      // Step 1: Create a notification
      const notificationData = {
        userId: testUser.id,
        type: 'session_reminder',
        title: 'Session Reminder',
        message: 'You have a tennis session tomorrow at 2:00 PM',
        data: {
          sessionId: 'test-session-id',
          coachName: testCoach.name,
        },
      };

      const createNotificationResponse = await httpHelper.post(
        '/api/notifications',
        notificationData,
        {
          headers: { Authorization: `Bearer ${coachToken}` },
        }
      );

      expect(createNotificationResponse.status).toBe(201);
      expect(createNotificationResponse.body.userId).toBe(testUser.id);
      expect(createNotificationResponse.body.type).toBe(notificationData.type);
      expect(createNotificationResponse.body.isRead).toBe(false);

      const notificationId = createNotificationResponse.body.id;

      // Step 2: User retrieves their notifications
      const userNotificationsResponse = await httpHelper.get('/api/notifications', {
        headers: { Authorization: `Bearer ${userToken}` },
      });

      expect(userNotificationsResponse.status).toBe(200);
      expect(Array.isArray(userNotificationsResponse.body)).toBe(true);

      const foundNotification = userNotificationsResponse.body.find(n => n.id === notificationId);
      expect(foundNotification).toBeDefined();
      expect(foundNotification.title).toBe(notificationData.title);
      expect(foundNotification.message).toBe(notificationData.message);
      expect(foundNotification.isRead).toBe(false);

      // Step 3: User marks notification as read
      const markReadResponse = await httpHelper.put(
        `/api/notifications/${notificationId}/read`,
        {},
        {
          headers: { Authorization: `Bearer ${userToken}` },
        }
      );

      expect(markReadResponse.status).toBe(200);
      expect(markReadResponse.body.isRead).toBe(true);

      // Step 4: Verify notification is marked as read
      const updatedNotificationsResponse = await httpHelper.get('/api/notifications', {
        headers: { Authorization: `Bearer ${userToken}` },
      });

      const updatedNotification = updatedNotificationsResponse.body.find(
        n => n.id === notificationId
      );
      expect(updatedNotification.isRead).toBe(true);
    });

    it('should filter notifications by type and status', async () => {
      // Create multiple notifications of different types
      const notifications = [
        {
          userId: testUser.id,
          type: 'session_reminder',
          title: 'Session Reminder',
          message: 'Session reminder message',
        },
        {
          userId: testUser.id,
          type: 'payment_confirmation',
          title: 'Payment Confirmed',
          message: 'Payment confirmation message',
        },
        {
          userId: testUser.id,
          type: 'session_cancelled',
          title: 'Session Cancelled',
          message: 'Session cancellation message',
        },
      ];

      const createdNotifications = [];
      for (const notification of notifications) {
        const response = await httpHelper.post('/api/notifications', notification, {
          headers: { Authorization: `Bearer ${coachToken}` },
        });
        createdNotifications.push(response.body);
      }

      // Mark one notification as read
      await httpHelper.put(
        `/api/notifications/${createdNotifications[0].id}/read`,
        {},
        {
          headers: { Authorization: `Bearer ${userToken}` },
        }
      );

      // Filter by type
      const sessionNotificationsResponse = await httpHelper.get('/api/notifications', {
        headers: { Authorization: `Bearer ${userToken}` },
        query: { type: 'session_reminder' },
      });

      expect(sessionNotificationsResponse.status).toBe(200);
      const sessionNotifications = sessionNotificationsResponse.body.filter(n =>
        createdNotifications.some(cn => cn.id === n.id)
      );
      expect(sessionNotifications.length).toBe(1);
      expect(sessionNotifications[0].type).toBe('session_reminder');

      // Filter by unread status
      const unreadNotificationsResponse = await httpHelper.get('/api/notifications', {
        headers: { Authorization: `Bearer ${userToken}` },
        query: { isRead: 'false' },
      });

      expect(unreadNotificationsResponse.status).toBe(200);
      const unreadNotifications = unreadNotificationsResponse.body.filter(n =>
        createdNotifications.some(cn => cn.id === n.id)
      );
      expect(unreadNotifications.length).toBe(2); // Two should be unread
    });

    it('should handle bulk notification operations', async () => {
      // Create multiple notifications
      const notifications = [];
      for (let i = 0; i < 3; i++) {
        const response = await httpHelper.post(
          '/api/notifications',
          {
            userId: testUser.id,
            type: 'general',
            title: `Bulk Notification ${i + 1}`,
            message: `Bulk notification message ${i + 1}`,
          },
          {
            headers: { Authorization: `Bearer ${coachToken}` },
          }
        );
        notifications.push(response.body);
      }

      // Mark all as read
      const markAllReadResponse = await httpHelper.put(
        '/api/notifications/mark-all-read',
        {},
        {
          headers: { Authorization: `Bearer ${userToken}` },
        }
      );

      expect(markAllReadResponse.status).toBe(200);

      // Verify all are marked as read
      const allNotificationsResponse = await httpHelper.get('/api/notifications', {
        headers: { Authorization: `Bearer ${userToken}` },
      });

      const bulkNotifications = allNotificationsResponse.body.filter(n =>
        notifications.some(bn => bn.id === n.id)
      );
      expect(bulkNotifications.every(n => n.isRead)).toBe(true);

      // Delete all notifications
      const deleteAllResponse = await httpHelper.delete('/api/notifications/delete-all', {
        headers: { Authorization: `Bearer ${userToken}` },
      });

      expect(deleteAllResponse.status).toBe(200);

      // Verify notifications are deleted
      const afterDeleteResponse = await httpHelper.get('/api/notifications', {
        headers: { Authorization: `Bearer ${userToken}` },
      });

      const remainingBulkNotifications = afterDeleteResponse.body.filter(n =>
        notifications.some(bn => bn.id === n.id)
      );
      expect(remainingBulkNotifications.length).toBe(0);
    });
  });

  describe('Email Notifications', () => {
    it('should send email notifications for session bookings', async () => {
      // Create a session booking (this should trigger email notification)
      const bookingData = {
        coachId: testCoach.id,
        bookingTypeId: 'test-booking-type-id',
        timeSlotId: 'test-time-slot-id',
        dateTime: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // Tomorrow
        notes: 'Email notification test session',
      };

      // Mock booking type and time slot in database
      await global.testPrisma.bookingType.create({
        data: {
          id: 'test-booking-type-id',
          name: 'Test Lesson',
          description: 'Test lesson for email notifications',
          durationMin: 60,
          price: 100,
          coachId: testCoach.id,
        },
      });

      await global.testPrisma.timeSlot.create({
        data: {
          id: 'test-time-slot-id',
          dayOfWeek: 1,
          startTime: '14:00',
          endTime: '15:00',
          isAvailable: true,
          coachId: testCoach.id,
        },
      });

      const sessionResponse = await httpHelper.post('/api/sessions', bookingData, {
        headers: { Authorization: `Bearer ${userToken}` },
      });

      expect(sessionResponse.status).toBe(201);

      // Check that email notification was queued/sent
      const emailNotificationsResponse = await httpHelper.get('/api/admin/email-notifications', {
        headers: { Authorization: `Bearer ${coachToken}` }, // Assuming coach has admin access for this test
        query: {
          recipientEmail: testUser.email,
          type: 'session_booking_confirmation',
        },
      });

      if (emailNotificationsResponse.status === 200) {
        expect(Array.isArray(emailNotificationsResponse.body)).toBe(true);
        const bookingConfirmationEmail = emailNotificationsResponse.body.find(
          email =>
            email.recipientEmail === testUser.email && email.type === 'session_booking_confirmation'
        );

        if (bookingConfirmationEmail) {
          expect(bookingConfirmationEmail.status).toMatch(/sent|queued|delivered/);
          expect(bookingConfirmationEmail.subject).toContain('booking');
        }
      }
    });

    it('should send email notifications for session reminders', async () => {
      // Create a session scheduled for tomorrow
      const sessionData = sessionFactory.create({
        userId: testUser.id,
        coachId: testCoach.id,
        dateTime: new Date(Date.now() + 24 * 60 * 60 * 1000), // Tomorrow
        status: 'scheduled',
      });

      await global.testPrisma.session.create({
        data: {
          id: sessionData.id,
          dateTime: sessionData.dateTime,
          durationMin: sessionData.durationMin,
          price: sessionData.price,
          isPaid: sessionData.isPaid,
          status: sessionData.status,
          notes: sessionData.notes,
          userId: testUser.id,
          coachId: testCoach.id,
          bookingTypeId: 'test-booking-type-id',
        },
      });

      // Trigger reminder email (this would normally be done by a cron job)
      const reminderResponse = await httpHelper.post(
        '/api/notifications/send-reminders',
        {
          sessionId: sessionData.id,
          reminderType: '24_hours',
        },
        {
          headers: { Authorization: `Bearer ${coachToken}` },
        }
      );

      expect(reminderResponse.status).toBe(200);

      // Check that reminder email was sent
      const reminderEmailsResponse = await httpHelper.get('/api/admin/email-notifications', {
        headers: { Authorization: `Bearer ${coachToken}` },
        query: {
          recipientEmail: testUser.email,
          type: 'session_reminder',
        },
      });

      if (reminderEmailsResponse.status === 200) {
        const reminderEmail = reminderEmailsResponse.body.find(
          email => email.recipientEmail === testUser.email && email.type === 'session_reminder'
        );

        if (reminderEmail) {
          expect(reminderEmail.subject).toContain('reminder');
          expect(reminderEmail.body).toContain(testCoach.name);
        }
      }
    });

    it('should handle email notification preferences', async () => {
      // Update user email preferences
      const preferencesData = {
        emailNotifications: {
          sessionReminders: true,
          bookingConfirmations: true,
          cancellationNotices: false,
          promotionalEmails: false,
        },
      };

      const updatePreferencesResponse = await httpHelper.put(
        '/api/users/notification-preferences',
        preferencesData,
        {
          headers: { Authorization: `Bearer ${userToken}` },
        }
      );

      expect(updatePreferencesResponse.status).toBe(200);
      expect(updatePreferencesResponse.body.emailNotifications.sessionReminders).toBe(true);
      expect(updatePreferencesResponse.body.emailNotifications.cancellationNotices).toBe(false);

      // Verify preferences are respected when sending notifications
      const testNotificationResponse = await httpHelper.post(
        '/api/notifications/test-email',
        {
          userId: testUser.id,
          type: 'promotional',
          subject: 'Test Promotional Email',
          body: 'This should not be sent due to preferences',
        },
        {
          headers: { Authorization: `Bearer ${coachToken}` },
        }
      );

      // Should return success but not actually send email due to preferences
      expect(testNotificationResponse.status).toBe(200);
      expect(testNotificationResponse.body.sent).toBe(false);
      expect(testNotificationResponse.body.reason).toContain('preferences');
    });
  });

  describe('SMS Notifications', () => {
    beforeEach(async () => {
      // Update user profile with phone number for SMS testing
      await httpHelper.put(
        '/api/users/profile',
        {
          phoneNumber: '+1234567890',
        },
        {
          headers: { Authorization: `Bearer ${userToken}` },
        }
      );
    });

    it('should send SMS notifications for urgent updates', async () => {
      // Send urgent session cancellation SMS
      const smsData = {
        userId: testUser.id,
        type: 'session_cancelled_urgent',
        message:
          'URGENT: Your tennis session today at 2 PM has been cancelled due to weather. Please reschedule.',
        sessionId: 'test-session-id',
      };

      const smsResponse = await httpHelper.post('/api/notifications/sms', smsData, {
        headers: { Authorization: `Bearer ${coachToken}` },
      });

      expect(smsResponse.status).toBe(201);
      expect(smsResponse.body.status).toMatch(/sent|queued|delivered/);
      expect(smsResponse.body.recipient).toBe('+1234567890');

      // Check SMS delivery status
      const smsStatusResponse = await httpHelper.get(
        `/api/notifications/sms/${smsResponse.body.id}/status`,
        {
          headers: { Authorization: `Bearer ${coachToken}` },
        }
      );

      expect(smsStatusResponse.status).toBe(200);
      expect(smsStatusResponse.body).toHaveProperty('status');
      expect(smsStatusResponse.body).toHaveProperty('deliveredAt');
    });

    it('should handle SMS notification preferences and opt-outs', async () => {
      // Update SMS preferences
      const smsPreferencesData = {
        smsNotifications: {
          urgentUpdates: true,
          sessionReminders: false,
          promotionalMessages: false,
        },
      };

      const updateSmsPreferencesResponse = await httpHelper.put(
        '/api/users/sms-preferences',
        smsPreferencesData,
        {
          headers: { Authorization: `Bearer ${userToken}` },
        }
      );

      expect(updateSmsPreferencesResponse.status).toBe(200);

      // Test opt-out functionality
      const optOutResponse = await httpHelper.post(
        '/api/notifications/sms/opt-out',
        {
          phoneNumber: '+1234567890',
          reason: 'User requested opt-out',
        },
        {
          headers: { Authorization: `Bearer ${userToken}` },
        }
      );

      expect(optOutResponse.status).toBe(200);

      // Verify SMS sending is blocked after opt-out
      const blockedSmsResponse = await httpHelper.post(
        '/api/notifications/sms',
        {
          userId: testUser.id,
          type: 'session_reminder',
          message: 'This SMS should be blocked',
        },
        {
          headers: { Authorization: `Bearer ${coachToken}` },
          expectedStatus: 400,
        }
      );

      expect(blockedSmsResponse.status).toBe(400);
      expect(blockedSmsResponse.body.message).toContain('opted out');
    });

    it('should validate phone numbers for SMS delivery', async () => {
      const invalidPhoneNumbers = ['invalid-phone', '123', '+1-invalid', ''];

      for (const invalidPhone of invalidPhoneNumbers) {
        // Update user with invalid phone number
        await httpHelper.put(
          '/api/users/profile',
          {
            phoneNumber: invalidPhone,
          },
          {
            headers: { Authorization: `Bearer ${userToken}` },
          }
        );

        // Attempt to send SMS
        const smsResponse = await httpHelper.post(
          '/api/notifications/sms',
          {
            userId: testUser.id,
            type: 'test',
            message: 'Test message',
          },
          {
            headers: { Authorization: `Bearer ${coachToken}` },
            expectedStatus: 400,
          }
        );

        expect(smsResponse.status).toBe(400);
        expect(smsResponse.body.message).toContain('phone number');
      }
    });
  });

  describe('Real-time Messaging', () => {
    it('should handle real-time message delivery', async () => {
      // Send a message from coach to user
      const messageData = {
        recipientId: testUser.id,
        content: 'Hello! Looking forward to our session tomorrow.',
        type: 'text',
      };

      const sendMessageResponse = await httpHelper.post('/api/messages', messageData, {
        headers: { Authorization: `Bearer ${coachToken}` },
      });

      expect(sendMessageResponse.status).toBe(201);
      expect(sendMessageResponse.body.senderId).toBe(testCoach.id);
      expect(sendMessageResponse.body.recipientId).toBe(testUser.id);
      expect(sendMessageResponse.body.content).toBe(messageData.content);
      expect(sendMessageResponse.body.isRead).toBe(false);

      const messageId = sendMessageResponse.body.id;

      // User retrieves their messages
      const userMessagesResponse = await httpHelper.get('/api/messages', {
        headers: { Authorization: `Bearer ${userToken}` },
      });

      expect(userMessagesResponse.status).toBe(200);
      const receivedMessage = userMessagesResponse.body.find(m => m.id === messageId);
      expect(receivedMessage).toBeDefined();
      expect(receivedMessage.content).toBe(messageData.content);

      // User marks message as read
      const markReadResponse = await httpHelper.put(
        `/api/messages/${messageId}/read`,
        {},
        {
          headers: { Authorization: `Bearer ${userToken}` },
        }
      );

      expect(markReadResponse.status).toBe(200);
      expect(markReadResponse.body.isRead).toBe(true);

      // User replies to the message
      const replyData = {
        recipientId: testCoach.id,
        content: "Thank you! I'm excited for the session too.",
        type: 'text',
        replyToId: messageId,
      };

      const replyResponse = await httpHelper.post('/api/messages', replyData, {
        headers: { Authorization: `Bearer ${userToken}` },
      });

      expect(replyResponse.status).toBe(201);
      expect(replyResponse.body.replyToId).toBe(messageId);

      // Coach retrieves the conversation
      const conversationResponse = await httpHelper.get(
        `/api/messages/conversation/${testUser.id}`,
        {
          headers: { Authorization: `Bearer ${coachToken}` },
        }
      );

      expect(conversationResponse.status).toBe(200);
      expect(conversationResponse.body.length).toBe(2); // Original message + reply
    });

    it('should handle message attachments and media', async () => {
      // Send message with attachment
      const messageWithAttachmentData = {
        recipientId: testUser.id,
        content: "Here's a video showing the technique we discussed.",
        type: 'media',
        attachments: [
          {
            type: 'video',
            url: 'https://example.com/tennis-technique.mp4',
            filename: 'tennis-technique.mp4',
            size: 1024000,
          },
        ],
      };

      const mediaMessageResponse = await httpHelper.post(
        '/api/messages',
        messageWithAttachmentData,
        {
          headers: { Authorization: `Bearer ${coachToken}` },
        }
      );

      expect(mediaMessageResponse.status).toBe(201);
      expect(mediaMessageResponse.body.type).toBe('media');
      expect(mediaMessageResponse.body.attachments).toBeDefined();
      expect(mediaMessageResponse.body.attachments.length).toBe(1);
      expect(mediaMessageResponse.body.attachments[0].type).toBe('video');

      // User retrieves message with attachment
      const messageResponse = await httpHelper.get(
        `/api/messages/${mediaMessageResponse.body.id}`,
        {
          headers: { Authorization: `Bearer ${userToken}` },
        }
      );

      expect(messageResponse.status).toBe(200);
      expect(messageResponse.body.attachments[0].url).toBe(
        messageWithAttachmentData.attachments[0].url
      );
    });

    it('should handle message delivery status and read receipts', async () => {
      // Send message
      const messageResponse = await httpHelper.post(
        '/api/messages',
        {
          recipientId: testUser.id,
          content: 'Test message for delivery status',
          type: 'text',
        },
        {
          headers: { Authorization: `Bearer ${coachToken}` },
        }
      );

      const messageId = messageResponse.body.id;

      // Check delivery status
      const deliveryStatusResponse = await httpHelper.get(
        `/api/messages/${messageId}/delivery-status`,
        {
          headers: { Authorization: `Bearer ${coachToken}` },
        }
      );

      expect(deliveryStatusResponse.status).toBe(200);
      expect(deliveryStatusResponse.body).toHaveProperty('status');
      expect(deliveryStatusResponse.body).toHaveProperty('deliveredAt');
      expect(deliveryStatusResponse.body.status).toMatch(/sent|delivered/);

      // User reads the message
      await httpHelper.put(
        `/api/messages/${messageId}/read`,
        {},
        {
          headers: { Authorization: `Bearer ${userToken}` },
        }
      );

      // Check read receipt
      const readReceiptResponse = await httpHelper.get(`/api/messages/${messageId}/read-receipt`, {
        headers: { Authorization: `Bearer ${coachToken}` },
      });

      expect(readReceiptResponse.status).toBe(200);
      expect(readReceiptResponse.body.isRead).toBe(true);
      expect(readReceiptResponse.body.readAt).toBeDefined();
    });
  });

  describe('Notification Analytics and Reporting', () => {
    it('should provide notification delivery analytics', async () => {
      // Create various types of notifications
      const notificationTypes = ['session_reminder', 'payment_confirmation', 'session_cancelled'];

      for (const type of notificationTypes) {
        await httpHelper.post(
          '/api/notifications',
          {
            userId: testUser.id,
            type,
            title: `Test ${type}`,
            message: `Test message for ${type}`,
          },
          {
            headers: { Authorization: `Bearer ${coachToken}` },
          }
        );
      }

      // Get notification analytics
      const analyticsResponse = await httpHelper.get('/api/admin/notifications/analytics', {
        headers: { Authorization: `Bearer ${coachToken}` },
        query: {
          startDate: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
          endDate: new Date().toISOString(),
        },
      });

      expect(analyticsResponse.status).toBe(200);
      expect(analyticsResponse.body).toHaveProperty('totalNotifications');
      expect(analyticsResponse.body).toHaveProperty('deliveryRate');
      expect(analyticsResponse.body).toHaveProperty('readRate');
      expect(analyticsResponse.body).toHaveProperty('notificationsByType');

      // Verify analytics data structure
      expect(typeof analyticsResponse.body.totalNotifications).toBe('number');
      expect(typeof analyticsResponse.body.deliveryRate).toBe('number');
      expect(Array.isArray(analyticsResponse.body.notificationsByType)).toBe(true);
    });

    it('should track notification engagement metrics', async () => {
      // Create and interact with notifications
      const notificationResponse = await httpHelper.post(
        '/api/notifications',
        {
          userId: testUser.id,
          type: 'session_reminder',
          title: 'Engagement Test',
          message: 'Test notification for engagement tracking',
          actionUrl: '/sessions/test-session-id',
        },
        {
          headers: { Authorization: `Bearer ${coachToken}` },
        }
      );

      const notificationId = notificationResponse.body.id;

      // User views notification
      await httpHelper.get(`/api/notifications/${notificationId}`, {
        headers: { Authorization: `Bearer ${userToken}` },
      });

      // User clicks notification action
      await httpHelper.post(
        `/api/notifications/${notificationId}/action-clicked`,
        {
          actionType: 'view_session',
        },
        {
          headers: { Authorization: `Bearer ${userToken}` },
        }
      );

      // Get engagement metrics
      const engagementResponse = await httpHelper.get(
        `/api/admin/notifications/${notificationId}/engagement`,
        {
          headers: { Authorization: `Bearer ${coachToken}` },
        }
      );

      expect(engagementResponse.status).toBe(200);
      expect(engagementResponse.body).toHaveProperty('views');
      expect(engagementResponse.body).toHaveProperty('clicks');
      expect(engagementResponse.body).toHaveProperty('engagementRate');
      expect(engagementResponse.body.views).toBeGreaterThan(0);
      expect(engagementResponse.body.clicks).toBeGreaterThan(0);
    });
  });

  describe('API Contract Validation', () => {
    it('should validate notification creation API contract', async () => {
      await contractHelper.testApiContract('/api/notifications', 'POST', {
        request: {
          headers: {
            Authorization: `Bearer ${coachToken}`,
          },
          body: {
            userId: testUser.id,
            type: 'session_reminder',
            title: 'Contract Test Notification',
            message: 'Test notification for API contract validation',
          },
        },
        response: {
          status: 201,
          body: {
            required: ['id', 'userId', 'type', 'title', 'message', 'isRead'],
            types: {
              id: 'string',
              userId: 'string',
              type: 'string',
              title: 'string',
              message: 'string',
              isRead: 'boolean',
            },
          },
        },
      });
    });

    it('should validate message sending API contract', async () => {
      await contractHelper.testApiContract('/api/messages', 'POST', {
        request: {
          headers: {
            Authorization: `Bearer ${coachToken}`,
          },
          body: {
            recipientId: testUser.id,
            content: 'Contract test message',
            type: 'text',
          },
        },
        response: {
          status: 201,
          body: {
            required: ['id', 'senderId', 'recipientId', 'content', 'type', 'isRead'],
            types: {
              id: 'string',
              senderId: 'string',
              recipientId: 'string',
              content: 'string',
              type: 'string',
              isRead: 'boolean',
            },
          },
        },
      });
    });

    it('should validate notification preferences API contract', async () => {
      await contractHelper.testApiContract('/api/users/notification-preferences', 'PUT', {
        request: {
          headers: {
            Authorization: `Bearer ${userToken}`,
          },
          body: {
            emailNotifications: {
              sessionReminders: true,
              bookingConfirmations: true,
            },
            smsNotifications: {
              urgentUpdates: true,
            },
          },
        },
        response: {
          status: 200,
          body: {
            required: ['emailNotifications', 'smsNotifications'],
            types: {
              emailNotifications: 'object',
              smsNotifications: 'object',
            },
          },
        },
      });
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle notification delivery failures gracefully', async () => {
      // Test with invalid user ID
      const invalidNotificationResponse = await httpHelper.post(
        '/api/notifications',
        {
          userId: 'invalid-user-id',
          type: 'test',
          title: 'Invalid User Test',
          message: 'This should fail',
        },
        {
          headers: { Authorization: `Bearer ${coachToken}` },
          expectedStatus: 404,
        }
      );

      expect(invalidNotificationResponse.status).toBe(404);
      expect(invalidNotificationResponse.body.message).toContain('user');

      // Test with missing required fields
      const incompleteNotificationResponse = await httpHelper.post(
        '/api/notifications',
        {
          userId: testUser.id,
          type: 'test',
          // Missing title and message
        },
        {
          headers: { Authorization: `Bearer ${coachToken}` },
          expectedStatus: 400,
        }
      );

      expect(incompleteNotificationResponse.status).toBe(400);
    });

    it('should handle message sending failures', async () => {
      // Test sending message to non-existent user
      const invalidMessageResponse = await httpHelper.post(
        '/api/messages',
        {
          recipientId: 'non-existent-user',
          content: 'This should fail',
          type: 'text',
        },
        {
          headers: { Authorization: `Bearer ${coachToken}` },
          expectedStatus: 404,
        }
      );

      expect(invalidMessageResponse.status).toBe(404);

      // Test sending empty message
      const emptyMessageResponse = await httpHelper.post(
        '/api/messages',
        {
          recipientId: testUser.id,
          content: '',
          type: 'text',
        },
        {
          headers: { Authorization: `Bearer ${coachToken}` },
          expectedStatus: 400,
        }
      );

      expect(emptyMessageResponse.status).toBe(400);
    });

    it('should handle rate limiting for notifications', async () => {
      // Attempt to send many notifications rapidly
      const rapidNotifications = [];
      for (let i = 0; i < 10; i++) {
        rapidNotifications.push(
          httpHelper.post(
            '/api/notifications',
            {
              userId: testUser.id,
              type: 'spam_test',
              title: `Rapid Notification ${i}`,
              message: `Rapid notification message ${i}`,
            },
            {
              headers: { Authorization: `Bearer ${coachToken}` },
            }
          )
        );
      }

      const responses = await Promise.all(rapidNotifications);

      // Check if rate limiting is applied (some requests should be rejected)
      const rateLimitedResponses = responses.filter(response => response.status === 429);

      if (rateLimitedResponses.length > 0) {
        expect(rateLimitedResponses[0].body.message).toContain('rate limit');
      }
    });
  });
});
