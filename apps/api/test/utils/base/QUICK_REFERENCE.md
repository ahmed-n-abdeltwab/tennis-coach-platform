# Base Test Classes - Quick Reference

## BaseIntegrationTest

### Setup

```typescript
class MyTest extends BaseIntegrationTest {
  async setupTestApp() {
    /* optional */
  }
  getTestModules() {
    return [MyModule];
  }
  async seedTestData() {
    /* optional */
  }
}

describe('My Tests', () => {
  let test: MyTest;
  beforeAll(async () => {
    test = new MyTest();
    await test.setup();
  });
  afterAll(async () => {
    await test.cleanup();
  });
});
```

### Type-Safe HTTP Methods

```typescript
// GET
const res = await test.typeSafeGet<Endpoints>('/api/sessions');

// POST
const res = await test.typeSafePost<Endpoints>('/api/sessions', { data });

// Authenticated
const res = await test.typeSafeAuthenticatedGet<Endpoints>(
  '/api/sessions',
  token
);
const res = await test.typeSafeAuthenticatedPost<Endpoints>(
  '/api/sessions',
  token,
  data
);

// PUT, PATCH, DELETE also available
```

### Test Data Creation

```typescript
const user = await test.createTestUser({ email: 'test@example.com' });
const coach = await test.createTestCoach({ bio: 'Expert' });
const bookingType = await test.createTestBookingType({ coachId: coach.id });
const session = await test.createTestSession({
  userId: user.id,
  coachId: coach.id,
});
const timeSlot = await test.createTestTimeSlot({ coachId: coach.id });
const discount = await test.createTestDiscount({ coachId: coach.id });
const message = await test.createTestMessage({ senderId: user.id });
```

### Authentication

```typescript
const token = test.createTestJwtToken({ sub: user.id, role: Role.USER });
const userToken = test.createRoleToken(Role.USER);
const coachToken = test.createRoleToken(Role.COACH);
const adminToken = test.createRoleToken(Role.ADMIN);
const expiredToken = test.createExpiredToken();
const headers = test.createAuthHeaders(token);
```

### Database Operations

```typescript
// Find
const record = await test.findRecord('session', { id: sessionId });
const records = await test.findRecords('session', { userId: user.id });

// Count
const count = await test.countRecords('session', { status: 'SCHEDULED' });

// Update/Delete
await test.updateRecord('session', { id: sessionId }, { status: 'COMPLETED' });
await test.deleteRecord('session', { id: sessionId });
await test.deleteRecords('session', { userId: user.id });

// Assertions
await test.assertDataExists('session', { id: sessionId });
await test.assertDataNotExists('session', { id: 'invalid' });
```

### Assertions

```typescript
// Response assertions
test.assertSuccessResponse(response, 200);
test.assertErrorResponse(response, 404, 'Not found');
test.assertUnauthorized(response);
test.assertForbidden(response);
test.assertNotFound(response);
test.assertValidationError(response, ['email', 'password']);

// Array assertions
test.assertArrayLength(response, 5);
test.assertArrayContains(response, { id: sessionId });

// Structure assertions
test.assertResponseStructure(response, ['id', 'name', 'email']);
test.assertResponseBody(response, { name: 'Test' });

// Extract fields
const userId = test.extractField<string>(response, 'user.id');
```

### Discriminated Union Pattern

```typescript
const response = await test.typeSafeGet<Endpoints>('/api/sessions');

if (response.ok) {
  // Success - response.body is typed as Session[]
  expect(response.body).toBeDefined();
} else {
  // Error - response.body is typed as ErrorResponse
  expect(response.body.message).toBeDefined();
}
```

---

## BaseControllerTest

### Setup

```typescript
class MyControllerTest extends BaseControllerTest<MyController, MyService> {
  getControllerClass() {
    return MyController;
  }

  setupMocks() {
    return [{ provide: MyService, useValue: { findAll: jest.fn() } }];
  }

  async setupController() {
    this.controller = this.module.get(MyController);
    this.service = this.module.get(MyService);
  }
}

describe('MyController', () => {
  let test: MyControllerTest;
  beforeEach(async () => {
    test = new MyControllerTest();
    await test.setup();
  });
  afterEach(async () => {
    await test.cleanup();
  });
});
```

### HTTP Methods

```typescript
// Unauthenticated
const res = await test.get('/api/endpoint');
const res = await test.post('/api/endpoint', data);

// Authenticated
const token = test.createTestJwtToken();
const res = await test.authenticatedGet('/api/endpoint', token);
const res = await test.authenticatedPost('/api/endpoint', token, data);
const res = await test.authenticatedPut('/api/endpoint', token, data);
const res = await test.authenticatedDelete('/api/endpoint', token);
```

### Mocking

```typescript
const mockReq = test.createMockRequest(data, user);
const mockRes = test.createMockResponse();
const token = test.createTestJwtToken();
const roleToken = test.createRoleToken(Role.COACH);
```

---

## BaseServiceTest

### Setup

```typescript
class MyServiceTest extends BaseServiceTest<MyService> {
  getServiceClass() {
    return MyService;
  }

  setupMocks() {
    this.prisma = this.createMockPrismaService();
    return [{ provide: PrismaService, useValue: this.prisma }];
  }

  async setupService() {
    this.service = this.module.get(MyService);
  }
}

describe('MyService', () => {
  let test: MyServiceTest;
  beforeEach(async () => {
    test = new MyServiceTest();
    await test.setup();
  });
  afterEach(async () => {
    await test.cleanup();
  });
});
```

### Mocking

```typescript
// Create mocks
const mockRepo = test.createMockRepository();
const mockPrisma = test.createMockPrismaService();

// Setup return values
test.mockMethodToReturn(mockRepo.findMany, [{ id: '1' }]);
test.mockMethodToThrow(mockRepo.findOne, new Error('Not found'));
test.mockMethodToReturnSequence(mockRepo.findMany, [
  [{ id: '1' }],
  [{ id: '2' }],
]);
test.mockMethodToFailThenSucceed(mockRepo.create, new Error('Fail'), {
  id: '1',
});
```

### Test Data

```typescript
const data = test.createTestData();
const dataArray = test.createTestDataArray(5);
const partial = test.createPartialData({ name: 'Updated' });
```

### Query Helpers

```typescript
const pagination = test.createPaginationParams(2, 20); // page 2, 20 per page
const filters = test.createFilterParams({ status: 'ACTIVE' });
const sort = test.createSortParams('createdAt', 'desc');
const include = test.createIncludeParams(['user', 'coach']);
```

### Assertions

```typescript
// Method calls
test.assertMethodCalledWith(mockRepo.create, [{ name: 'Test' }]);
test.assertMethodCalledTimes(mockRepo.findMany, 2);
test.assertMethodNotCalled(mockRepo.delete);

// Return values
test.assertMethodReturns(result, expectedData);
test.assertReturnsArray(result, 3);
test.assertReturnsNull(result);
test.assertHasProperties(result, ['id', 'name']);
test.assertMatchesPartial(result, { name: 'Test' });

// Errors
await test.assertMethodThrows(() => service.findOne('invalid'), 'Not found');

// Call arguments
const lastArgs = test.getLastCallArgs(mockRepo.create);
const firstArgs = test.getFirstCallArgs(mockRepo.create);
```

---

## Common Patterns

### Custom Test Class with Shared Data

```typescript
class BookingSystemTest extends BaseIntegrationTest {
  testUser!: Account;
  testCoach!: Account;
  userToken!: string;

  async seedTestData() {
    this.testUser = await this.createTestUser();
    this.testCoach = await this.createTestCoach();
    this.userToken = this.createTestJwtToken({ sub: this.testUser.id });
  }
}
```

### Testing Error Scenarios

```typescript
it('should handle invalid input', async () => {
  const response = await test.typeSafePost<Endpoints>('/api/sessions', {
    /* invalid */
  });

  expect(response.ok).toBe(false);
  if (!response.ok) {
    test.assertValidationError(response, ['coachId', 'userId']);
  }
});
```

### Testing Authentication

```typescript
it('should require authentication', async () => {
  const response = await test.typeSafeGet<Endpoints>('/api/sessions');

  expect(response.ok).toBe(false);
  if (!response.ok) {
    test.assertUnauthorized(response);
  }
});

it('should reject expired token', async () => {
  const expiredToken = test.createExpiredToken();
  const response = await test.typeSafeAuthenticatedGet<Endpoints>(
    '/api/sessions',
    expiredToken
  );

  expect(response.ok).toBe(false);
});
```

### Testing RBAC

```typescript
it('should allow only admins', async () => {
  const userToken = test.createRoleToken(Role.USER);
  const response = await test.typeSafeAuthenticatedGet<Endpoints>(
    '/api/admin/users',
    userToken
  );

  expect(response.ok).toBe(false);
  if (!response.ok) {
    test.assertForbidden(response);
  }
});
```

---

## Tips

1. **Always use type-safe methods** - `typeSafeGet`, `typeSafePost`, etc.
2. **Use discriminated unions** - Check `response.ok` before accessing
   `response.body`
3. **Leverage built-in helpers** - `createTestUser`, `createTestSession`, etc.
4. **Create custom test classes** - For tests that share common setup
5. **Use assertion helpers** - `assertSuccessResponse`, `assertArrayLength`,
   etc.

---

## Resources

- [Full Usage Guide](./USAGE_GUIDE.md)
- [Migration Guide](../../MIGRATION_GUIDE.md)
- [Test Utils README](../README.md)
