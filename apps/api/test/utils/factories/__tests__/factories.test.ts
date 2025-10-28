/**
 * Tests for the mock factory system
 */

import {
  authFactory,
  coachFactory,
  createBookingScenario,
  createConversationScenario,
  createTestScenario,
  discountFactory,
  httpFactory,
  messageFactory,
  sessionFactory,
  userFactory,
} from '../index';

describe('Mock Factory System', () => {
  describe('UserMockFactory', () => {
    it('should create a user with default values', () => {
      const user = userFactory.create();

      expect(user).toHaveProperty('id');
      expect(user).toHaveProperty('email');
      expect(user).toHaveProperty('name');
      expect(user).toHaveProperty('passwordHash');
      expect(user.disability).toBe(false);
      expect(user.createdAt).toBeInstanceOf(Date);
      expect(user.updatedAt).toBeInstanceOf(Date);
    });

    it('should create a user with overrides', () => {
      const user = userFactory.create({
        email: 'test@example.com',
        name: 'Test User',
        age: 30,
      });

      expect(user.email).toBe('test@example.com');
      expect(user.name).toBe('Test User');
      expect(user.age).toBe(30);
    });

    it('should create multiple users', () => {
      const users = userFactory.createMany(3);

      expect(users).toHaveLength(3);
      expect(users[0].id).not.toBe(users[1].id);
      expect(users[1].id).not.toBe(users[2].id);
    });

    it('should create minimal user data', () => {
      const user = userFactory.createWithMinimalData();

      expect(user).toHaveProperty('id');
      expect(user).toHaveProperty('email');
      expect(user).toHaveProperty('name');
      expect(user.gender).toBeUndefined();
      expect(user.age).toBeUndefined();
    });
  });

  describe('CoachMockFactory', () => {
    it('should create a coach with default values', () => {
      const coach = coachFactory.create();

      expect(coach).toHaveProperty('id');
      expect(coach).toHaveProperty('email');
      expect(coach).toHaveProperty('name');
      expect(coach.isAdmin).toBe(true);
      expect(coach).toHaveProperty('bio');
      expect(coach).toHaveProperty('credentials');
    });

    it('should create an admin coach', () => {
      const coach = coachFactory.createAdmin();

      expect(coach.isAdmin).toBe(true);
      expect(coach.name).toContain('Admin Coach');
    });

    it('should create a regular coach', () => {
      const coach = coachFactory.createRegularCoach();

      expect(coach.isAdmin).toBe(false);
      expect(coach.name).toContain('Regular Coach');
    });
  });

  describe('SessionMockFactory', () => {
    it('should create a session with default values', () => {
      const session = sessionFactory.create();

      expect(session).toHaveProperty('id');
      expect(session).toHaveProperty('userId');
      expect(session).toHaveProperty('coachId');
      expect(session.status).toBe('scheduled');
      expect(session.isPaid).toBe(false);
      expect(session.dateTime).toBeInstanceOf(Date);
    });

    it('should create a completed session', () => {
      const session = sessionFactory.createCompleted();

      expect(session.status).toBe('completed');
      expect(session.isPaid).toBe(true);
      expect(session.paymentId).toContain('pay_');
    });

    it('should create a session with discount', () => {
      const session = sessionFactory.createWithDiscount('SAVE20', 'discount123');

      expect(session.discountCode).toBe('SAVE20');
      expect(session.discountId).toBe('discount123');
    });
  });

  describe('AuthMockFactory', () => {
    it('should create a user auth payload', () => {
      const payload = authFactory.createUserPayload();

      expect(payload.type).toBe('USER');
      expect(payload).toHaveProperty('sub');
      expect(payload).toHaveProperty('email');
      expect(payload).toHaveProperty('iat');
      expect(payload).toHaveProperty('exp');
    });

    it('should create a coach auth payload', () => {
      const payload = authFactory.createCoachPayload();

      expect(payload.type).toBe('COACH');
      expect(payload.email).toContain('coach');
    });

    it('should generate a token', () => {
      const token = authFactory.generateToken();

      expect(typeof token).toBe('string');
      expect(token.split('.')).toHaveLength(3); // JWT format
    });

    it('should create auth headers', () => {
      const headers = authFactory.createAuthHeaders();

      expect(headers.authorization).toContain('Bearer ');
    });

    it('should decode token', () => {
      const originalPayload = authFactory.createUserPayload();
      const token = authFactory.generateToken(originalPayload);
      const decodedPayload = authFactory.decodeToken(token);

      expect(decodedPayload).toBeTruthy();
      expect(decodedPayload?.sub).toBe(originalPayload.sub);
      expect(decodedPayload?.email).toBe(originalPayload.email);
    });
  });

  describe('HttpMockFactory', () => {
    it('should create a basic request', () => {
      const request = httpFactory.createRequest();

      expect(request).toHaveProperty('body');
      expect(request).toHaveProperty('params');
      expect(request).toHaveProperty('query');
      expect(request).toHaveProperty('headers');
      expect(request.method).toBe('GET');
    });

    it('should create a POST request', () => {
      const body = { name: 'Test' };
      const request = httpFactory.createPostRequest(body);

      expect(request.method).toBe('POST');
      expect(request.body).toEqual(body);
    });

    it('should create a mock response', () => {
      const response = httpFactory.createResponse();

      expect(response.status).toBeDefined();
      expect(response.json).toBeDefined();
      expect(response.send).toBeDefined();
      expect(typeof response.status).toBe('function');
    });

    it('should create success response', () => {
      const data = { id: '123', name: 'Test' };
      const response = httpFactory.createSuccessResponse(data);

      expect(response.statusCode).toBe(200);
      expect(response.data).toEqual(data);
      expect(response.timestamp).toBeDefined();
    });

    it('should create error response', () => {
      const response = httpFactory.createErrorResponse('Not found', 404);

      expect(response.statusCode).toBe(404);
      expect(response.error).toBe('Not Found');
      expect(response.message).toBe('Not found');
    });
  });

  describe('Convenience Functions', () => {
    it('should create a complete test scenario', () => {
      const scenario = createTestScenario();

      expect(scenario).toHaveProperty('user');
      expect(scenario).toHaveProperty('coach');
      expect(scenario).toHaveProperty('bookingType');
      expect(scenario).toHaveProperty('timeSlot');
      expect(scenario).toHaveProperty('session');

      // Check relationships
      expect(scenario.session.userId).toBe(scenario.user.id);
      expect(scenario.session.coachId).toBe(scenario.coach.id);
      expect(scenario.session.bookingTypeId).toBe(scenario.bookingType.id);
      expect(scenario.session.timeSlotId).toBe(scenario.timeSlot.id);
    });

    it('should create a booking scenario with discount', () => {
      const scenario = createBookingScenario({
        withDiscount: true,
        sessionStatus: 'completed',
        isPaid: true,
      });

      expect(scenario).toHaveProperty('discount');
      expect(scenario.discount).toBeTruthy();
      expect(scenario.session.status).toBe('completed');
      expect(scenario.session.isPaid).toBe(true);
      expect(scenario.session.discountId).toBe(scenario.discount?.id);
    });

    it('should create a conversation scenario', () => {
      const scenario = createConversationScenario(5);

      expect(scenario).toHaveProperty('user');
      expect(scenario).toHaveProperty('coach');
      expect(scenario).toHaveProperty('messages');
      expect(scenario.messages).toHaveLength(5);

      // Check message relationships
      scenario.messages.forEach((message, index) => {
        if (index % 2 === 0) {
          // User messages
          expect(message.senderUserId).toBe(scenario.user.id);
          expect(message.receiverCoachId).toBe(scenario.coach.id);
        } else {
          // Coach messages
          expect(message.senderCoachId).toBe(scenario.coach.id);
          expect(message.receiverUserId).toBe(scenario.user.id);
        }
      });
    });
  });

  describe('DiscountMockFactory', () => {
    it('should create an active discount', () => {
      const discount = discountFactory.createActive();

      expect(discount.isActive).toBe(true);
      expect(discount.expiry.getTime()).toBeGreaterThan(Date.now());
    });

    it('should create an expired discount', () => {
      const discount = discountFactory.createExpired();

      expect(discount.expiry.getTime()).toBeLessThan(Date.now());
    });

    it('should create a fully used discount', () => {
      const discount = discountFactory.createFullyUsed();

      expect(discount.useCount).toBe(discount.maxUsage);
    });
  });

  describe('MessageMockFactory', () => {
    it('should create a user to coach message', () => {
      const message = messageFactory.createUserToCoach('user123', 'coach456');

      expect(message.senderType).toBe('user');
      expect(message.senderUserId).toBe('user123');
      expect(message.receiverType).toBe('coach');
      expect(message.receiverCoachId).toBe('coach456');
    });

    it('should create a conversation', () => {
      const messages = messageFactory.createConversation('user123', 'coach456', 4);

      expect(messages).toHaveLength(4);

      // Check alternating senders
      expect(messages[0].senderType).toBe('user');
      expect(messages[1].senderType).toBe('coach');
      expect(messages[2].senderType).toBe('user');
      expect(messages[3].senderType).toBe('coach');

      // Check chronological order
      expect(messages[0].sentAt.getTime()).toBeLessThan(messages[1].sentAt.getTime());
      expect(messages[1].sentAt.getTime()).toBeLessThan(messages[2].sentAt.getTime());
    });
  });
});
