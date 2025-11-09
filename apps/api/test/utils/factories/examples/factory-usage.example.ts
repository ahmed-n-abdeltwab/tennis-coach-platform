/**
 * Example usage of the mock factory system
 * This file demonstrates how to use the various factories for testing
 */

import {
  authFactory,
  bookingTypeFactory,
  coachFactory,
  createBookingScenario,
  createConversationScenario,
  createTestScenario,
  discountFactory,
  httpFactory,
  messageFactory,
  sessionFactory,
  timeSlotFactory,
  userFactory,
} from '../index';

// Example 1: Basic factory usage
export function basicFactoryExample() {
  // Create a basic user
  const user = userFactory.create();

  // Create a user with specific overrides
  const specificUser = userFactory.create({
    email: 'john.doe@example.com',
    name: 'John Doe',
    age: 25,
  });

  // Create multiple users
  const users = userFactory.createMany(5);

  // Create a user with minimal data
  const minimalUser = userFactory.createWithMinimalData();

  return { user, specificUser, users, minimalUser };
}

// Example 2: Coach factory usage
export function coachFactoryExample() {
  // Create a regular coach
  const coach = coachFactory.create();

  // Create an admin coach
  const adminCoach = coachFactory.createAdmin();

  // Create a regular (non-admin) coa
  const regularCoach = coachFactory.createRegularCoach();

  return { coach, adminCoach, regularCoach };
}

// Example 3: Related data creation
export function relatedDataExample() {
  // Create a coach and their booking types
  const coach = coachFactory.create();
  const bookingTypes = bookingTypeFactory.createMany(3, { coachId: coach.id });

  // Create time slots for the coach
  const timeSlots = timeSlotFactory.createMany(5, { coachId: coach.id });

  // Create a session linking user, coach, booking type, and time slot
  const user = userFactory.create();
  const session = sessionFactory.createForUserAndCoach(user.id, coach.id, {
    bookingTypeId: bookingTypes[0]!.id,
    timeSlotId: timeSlots[0]!.id,
  });

  return { coach, user, bookingTypes, timeSlots, session };
}

// Example 4: Session scenarios
export function sessionScenariosExample() {
  const user = userFactory.create();
  const coach = coachFactory.create();

  // Different session states
  const scheduledSession = sessionFactory.createScheduled({
    userId: user.id,
    coachId: coach.id,
  });

  const completedSession = sessionFactory.createCompleted({
    userId: user.id,
    coachId: coach.id,
  });

  const cancelledSession = sessionFactory.createCancelled({
    userId: user.id,
    coachId: coach.id,
  });

  const paidSession = sessionFactory.createPaid({
    userId: user.id,
    coachId: coach.id,
  });

  return { scheduledSession, completedSession, cancelledSession, paidSession };
}

// Example 5: Discount scenarios
export function discountScenariosExample() {
  const coach = coachFactory.create();

  // Different discount states
  const activeDiscount = discountFactory.createActive({ coachId: coach.id });
  const expiredDiscount = discountFactory.createExpired({ coachId: coach.id });
  const inactiveDiscount = discountFactory.createInactive({ coachId: coach.id });
  const fullyUsedDiscount = discountFactory.createFullyUsed({ coachId: coach.id });
  const singleUseDiscount = discountFactory.createSingleUse({ coachId: coach.id });

  // Session with discount
  const user = userFactory.create();
  const sessionWithDiscount = sessionFactory.createWithDiscount(
    activeDiscount.code,
    activeDiscount.id,
    { userId: user.id, coachId: coach.id }
  );

  return {
    activeDiscount,
    expiredDiscount,
    inactiveDiscount,
    fullyUsedDiscount,
    singleUseDiscount,
    sessionWithDiscount,
  };
}

// Example 6: Message scenarios
export function messageScenariosExample() {
  const user = userFactory.create();
  const coach = coachFactory.create();
  const session = sessionFactory.create();

  // Different message types
  const userToCoachMessage = messageFactory.createUserToCoach(user.id, coach.id);
  const coachToUserMessage = messageFactory.createCoachToUser(coach.id, user.id);
  const sessionMessage = messageFactory.createSessionMessage(session.id);

  // Full conversation
  const conversation = messageFactory.createConversation(user.id, coach.id, 10);

  return {
    userToCoachMessage,
    coachToUserMessage,
    sessionMessage,
    conversation,
  };
}

// Example 7: Authentication scenarios
export function authScenariosExample() {
  // Create auth payloads
  const userPayload = authFactory.createUserPayload();
  const coachPayload = authFactory.createCoachPayload();
  const expiredPayload = authFactory.createExpiredPayload();

  // Generate tokens and headers
  const userToken = authFactory.generateToken(userPayload);
  const userHeaders = authFactory.createUserAuthHeaders();
  const coachHeaders = authFactory.createCoachAuthHeaders();

  // Create auth responses
  const userAuthResponse = authFactory.createAuthResponse(userPayload);
  const coachAuthResponse = authFactory.createAuthResponse(coachPayload);

  // Create login/register DTOs
  const loginDto = authFactory.createLoginDto();
  const registerDto = authFactory.createRegisterDto();

  return {
    userPayload,
    coachPayload,
    expiredPayload,
    userToken,
    userHeaders,
    coachHeaders,
    userAuthResponse,
    coachAuthResponse,
    loginDto,
    registerDto,
  };
}

// Example 8: HTTP request/response scenarios
export function httpScenariosExample() {
  const user = userFactory.create();

  // Different request types
  const getRequest = httpFactory.createRequest({ body: { page: 1, limit: 10 }, method: 'GET' });
  const postRequest = httpFactory.createRequest({
    body: { name: 'Test', email: 'test@example.com' },
    method: 'POST',
  });
  const putRequest = httpFactory.createRequest({
    body: { name: 'Updated' },
    params: { id: '123' },
    method: 'PUT',
  });
  const deleteRequest = httpFactory.createRequest({ params: { id: '123' }, method: 'Delete' });

  // Authenticated requests
  const authRequest = httpFactory.createAuthenticatedRequest(user);

  // Different content types
  const jsonRequest = httpFactory.createJsonRequest({ data: 'test' });
  const formRequest = httpFactory.createFormRequest({ field: 'value' });
  const multipartRequest = httpFactory.createMultipartRequest([{ filename: 'test.jpg' }]);

  // Mock responses
  const mockResponse = httpFactory.createResponse();
  const successResponse = httpFactory.createSuccessResponse({ id: '123', name: 'Test' });
  const errorResponse = httpFactory.createErrorResponse('Not found', 404);
  const validationErrorResponse = httpFactory.createValidationErrorResponse([
    'Name is required',
    'Email must be valid',
  ]);
  const paginatedResponse = httpFactory.createPaginatedResponse(
    [{ id: '1' }, { id: '2' }],
    1,
    10,
    25
  );

  return {
    getRequest,
    postRequest,
    putRequest,
    deleteRequest,
    authRequest,
    jsonRequest,
    formRequest,
    multipartRequest,
    mockResponse,
    successResponse,
    errorResponse,
    validationErrorResponse,
    paginatedResponse,
  };
}

// Example 9: Complete test scenarios
export function completeScenarioExamples() {
  // Basic test scenario with related data
  const basicScenario = createTestScenario();

  // Booking scenario with discount
  const bookingWithDiscount = createBookingScenario({
    withDiscount: true,
    sessionStatus: 'completed',
    isPaid: true,
  });

  // Booking scenario without discount
  const simpleBooking = createBookingScenario({
    sessionStatus: 'scheduled',
    isPaid: false,
  });

  // Conversation scenario
  const conversationScenario = createConversationScenario(8);

  return {
    basicScenario,
    bookingWithDiscount,
    simpleBooking,
    conversationScenario,
  };
}

// Example 10: Time-based scenarios
export function timeBasedScenariosExample() {
  const coach = coachFactory.create();

  // Create time slots for specific date ranges
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const nextWeek = new Date(today);
  nextWeek.setDate(nextWeek.getDate() + 7);

  // Time slots for tomorrow
  const tomorrowSlots = timeSlotFactory.createForTimeRange(tomorrow, nextWeek, 5);

  // Available and unavailable slots
  const availableSlots = timeSlotFactory.createMany(3, {
    coachId: coach.id,
    isAvailable: true,
  });

  const unavailableSlots = timeSlotFactory.createMany(2, {
    coachId: coach.id,
    isAvailable: false,
  });

  return {
    tomorrowSlots,
    availableSlots,
    unavailableSlots,
  };
}
