# Base Test Classes Usage Guide

This guide demonstrates how to use the base test classes (`BaseIntegrationTest`,
`BaseControllerTest`, and `BaseServiceTest`) to write consistent, type-safe
tests.

## Table of Contents

1. [BaseIntegrationTest](#baseintegrationtest)
2. [BaseControllerTest](#basecontrollertest)
3. [BaseServiceTest](#baseservicetest)
4. [Best Practices](#best-practices)

---

## BaseIntegrationTest

The `BaseIntegrationTest` class provides a foundation for integration tests
with:

- Automatic database setup and cleanup
- Type-safe HTTP methods using routes-helpers
- Built-in test data creation helpers
- Authentication token management

### Basic Usage

```typescript
import { BaseIntegrationTest } from '../utils/base/base-integration.test';
import { Endpoints } from '@routes-helpers';

class MyIntegrationTest extends BaseIntegrationTest {
  async setupTestApp(): Promise<void> {
    // Optional: Add any custom setup logic
  }

  getTestModules(): any[] {
    // Return the modules to import for your test
    return [MyModule, PrismaModule, IamModule];
  }

  // Optional: Override to customize test data seeding
  async seedTestData(): Promise<void> {
    // Use built-in helpers or create custom data
    await super.seedTestData(); // Calls default seeding
  }
}

describe('My Integration Tests', () => {
  let testInstance: MyIntegrationTest;

  beforeAll(async () => {
    testInstance = new MyIntegrationTest();
    await testInstance.setup();
  });

  afterAll(async () => {
    await testInstance.cleanup();
  });

  it('should make type-safe requests', async () => {
    const response =
      await testInstance.typeSafeGet<Endpoints>('/api/my-endpoint');

    if (response.ok) {
      // TypeScript knows the response body type
      expect(response.body).toBeDefined();
    }
  });
});
```

### Type-Safe HTTP Methods

The base class provides type-safe HTTP methods that leverage the auto-generated
routes:

```typescript
// GET request
const response = await testInstance.typeSafeGet<Endpoints>('/api/sessions');

// POST request
const createResponse = await testInstance.typeSafePost<Endpoints>(
  '/api/sessions',
  {
    coachId: 'coach-id',
    userId: 'user-id',
    dateTime: new Date().toISOString(),
  }
);

// Authenticated requests
const token = testInstance.createTestJwtToken();
const authResponse = await testInstance.typeSafeAuthenticatedGet<Endpoints>(
  '/api/accounts/me',
  token
);

// PUT, PATCH, DELETE also available
await testInstance.typeSafePut<Endpoints>('/api/sessions/123', updateData);
await testInstance.typeSafePatch<Endpoints>('/api/sessions/123', partialData);
await testInstance.typeSafeDelete<Endpoints>('/api/sessions/123');
```

### Built-in Test Data Helpers

Create test data easily with built-in helpers:

```typescript
// Create test users and coaches
const user = await testInstance.createTestUser({
  email: 'test@example.com',
  name: 'Test User',
});

const coach = await testInstce.createTestCoach({
  email: 'coach@example.com',
  bio: 'Expert coach',
});

// Create related entities
const bookingType = await testInstance.createTestBookingType({
  coachId: coach.id,
  name: 'Personal Training',
  basePrice: 100,
});

const timeSlot = await testInstance.createTestTimeSlot({
  coachId: coach.id,
  dateTime: new Date('2024-12-25T10:00:00Z'),
  isAvailable: true,
});

const session = await testInstance.createTestSession({
  userId: user.id,
  coachId: coach.id,
  bookingTypeId: bookingType.id,
  timeSlotId: timeSlot.id,
});

// Create messages, discounts, refresh tokens
const message = await testInstance.createTestMessage({
  senderId: user.id,
  receiverId: coach.id,
  content: 'Hello!',
});

const discount = await testInstance.createTestDiscount({
  coachId: coach.id,
  code: 'SAVE10',
  amount: 10,
});
```

### Authentication Helpers

```typescript
// Create JWT tokens for different roles
const userToken = testInstance.createTestJwtToken({
  sub: user.id,
  email: user.email,
  role: Role.USER,
});

const coachToken = testInstance.createRoleToken(Role.COACH);
const adminToken = testInstance.createRoleToken(Role.ADMIN);

// Create expired token for testing auth failures
const expiredToken = testInstance.createExpiredToken();

// Create auth headers
const headers = testInstance.createAuthHeaders(userToken);
```

### Database Helpers

```typescript
// Check if data exists
await testInstance.assertDataExists('session', { id: sessionId });
await testInstance.assertDataNotExists('session', { id: 'non-existent' });

// Count records
const count = await testInstance.countRecords('session', { userId: user.id });

// Find records
const session = await testInstance.findRecord('session', { id: sessionId });
const sessions = await testInstance.findRecords('session', { userId: user.id });

// Update/Delete records
await testInstance.updateRecord(
  'session',
  { id: sessionId },
  { status: 'COMPLETED' }
);
await testInstance.deleteRecord('session', { id: sessionId });
await testInstance.deleteRecords('session', { userId: user.id });
```

### Assertion Helpers

```typescript
// Response assertions
testInstance.assertSuccessResponse(response, 200);
testInstance.assertErrorResponse(response, 404, 'Not found');
testInstance.assertUnauthorized(response);
testInstance.assertForbidden(response);
testInstance.assertNotFound(response);

// Array assertions
testInstance.assertArrayLength(response, 5);
testInstance.assertArrayContains(response, { id: sessionId });

// Validation error assertions
testInstance.assertValidationError(response, ['email', 'password']);

// Response structure assertions
testInstance.assertResponseStructure(response, ['id', 'name', 'email']);
testInstance.assertResponseBody(response, { name: 'Test User' });

// Extract fields from response
const userId = testInstance.extractField<string>(response, 'user.id');
```

### Custom Seeding Example

```typescript
class BookingSystemIntegrationTest extends BaseIntegrationTest {
  testUser!: Account;
  testCoach!: Account;
  userToken!: string;
  coachToken!: string;

  async setupTestApp(): Promise<void> {
    // Custom setup if needed
  }

  getTestModules(): any[] {
    return [SessionsModule, BookingTypesModule, IamModule];
  }

  async seedTestData(): Promise<void> {
    // Create specific test data for booking system tests
    this.testUser = await this.createTestUser({
      email: 'user@example.com',
    });

    this.testCoach = await this.createTestCoach({
      email: 'coach@example.com',
    });

    this.userToken = this.createTestJwtToken({
      sub: this.testUser.id,
      email: this.testUser.email,
      role: this.testUser.role,
    });

    this.coachToken = this.createTestJwtToken({
      sub: this.testCoach.id,
      email: this.testCoach.email,
      role: this.testCoach.role,
    });
  }
}
```

---

## BaseControllerTest

The `BaseControllerTest` class provides a foundation for controller unit tests
with:

- Automatic controller and service mocking
- Type-safe HTTP request methods
- Built-in assertion helpers

### Basic Usage

```typescript
import { BaseControllerTest } from '../utils/base/base-controller.test';
import { MyController } from '../../src/app/my-module/my.controller';
import { MyService } from '../../src/app/my-module/my.service';

class MyControllerTest extends BaseControllerTest<MyController, MyService> {
  async setupController(): Promise<void> {
    this.controller = this.module.get<MyController>(MyController);
    this.service = this.module.get<MyService>(MyService);
  }

  setupMocks(): any {
    return [
      {
        provide: MyService,
        useValue: {
          findAll: jest.fn(),
          findOne: jest.fn(),
          create: jest.fn(),
          update: jest.fn(),
          delete: jest.fn(),
        },
      },
    ];
  }

  getControllerClass(): any {
    return MyController;
  }

  getTestProviders(): Provider[] {
    // Return additional providers if needed
    return [];
  }
}

describe('MyController', () => {
  let testInstance: MyControllerTest;

  beforeEach(async () => {
    testInstance = new MyControllerTest();
    await testInstance.setup();
  });

  afterEach(async () => {
    await testInstance.cleanup();
  });

  it('should handle GET requests', async () => {
    const mockData = [{ id: '1', name: 'Test' }];
    jest.spyOn(testInstance.service, 'findAll').mockResolvedValue(mockData);

    const response = await testInstance.get('/api/my-endpoint');

    testInstance.assertSuccessResponse(response, 200);
    testInstance.assertArrayLength(response, 1);
  });
});
```

### Type-Safe Request Methods

```typescript
// Unauthenticated requests
const getResponse = await testInstance.get('/api/endpoint');
const postResponse = await testInstance.post('/api/endpoint', {
  data: 'value',
});

// Authenticated requests
const token = testInstance.createTestJwtToken();
const authGetResponse = await testInstance.authenticatedGet(
  '/api/endpoint',
  token
);
const authPostResponse = await testInstance.authenticatedPost(
  '/api/endpoint',
  token,
  data
);
const authPutResponse = await testInstance.authenticatedPut(
  '/api/endpoint',
  token,
  data
);
const authDeleteResponse = await testInstance.authenticatedDelete(
  '/api/endpoint',
  token
);
```

### Mock Helpers

```typescript
// Create mock request/response objects
const mockReq = testInstance.createMockRequest(
  { name: 'Test' },
  { id: 'user-id', email: 'user@example.com' }
);

const mockRes = testInstance.createMockResponse();

// Create tokens for different roles
const userToken = testInstance.createTestJwtToken();
const coachToken = testInstance.createRoleToken(Role.COACH);
const expiredToken = testInstance.createExpiredToken();
```

---

## BaseServiceTest

The `BaseServiceTest` class provides a foundation for service unit tests with:

- Automatic service and repository mocking
- Built-in mock creation helpers
- Assertion utilities

### Basic Usage

```typescript
import { BaseServiceTest } from '../utils/base/base-service.test';
import { MyService } from '../../src/app/my-module/my.service';
import { PrismaService } from '../../src/app/prisma/prisma.service';

class MyServiceTest extends BaseServiceTest<MyService> {
  async setupService(): Promise<void> {
    this.service = this.module.get<MyService>(MyService);
    this.prisma = this.module.get<PrismaService>(PrismaService);
  }

  setupMocks(): any {
    const mockPrisma = this.createMockPrismaService();
    return [
      {
        provide: PrismaService,
        useValue: mockPrisma,
      },
    ];
  }

  getServiceClass(): any {
    return MyService;
  }

  getProviders(): any[] {
    return [];
  }
}

describe('MyService', () => {
  let testInstance: MyServiceTest;

  beforeEach(async () => {
    testInstance = new MyServiceTest();
    await testInstance.setup();
  });

  afterEach(async () => {
    await testInstance.cleanup();
  });

  it('should find all records', async () => {
    const mockData = testInstance.createTestDataArray(3);
    testInstance.mockMethodToReturn(
      testInstance.prisma.myModel.findMany,
      mockData
    );

    const result = await testInstance.service.findAll();

    testInstance.assertReturnsArray(result, 3);
    testInstance.assertMethodCalledTimes(
      testInstance.prisma.myModel.findMany,
      1
    );
  });
});
```

### Mock Helpers

```typescript
// Create mock repository
const mockRepo = testInstance.createMockRepository();

// Create mock Prisma service
const mockPrisma = testInstance.createMockPrismaService();

// Create test data
const testData = testInstance.createTestData();
const testDataArray = testInstance.createTestDataArray(5);

// Setup mock return values
testInstance.mockMethodToReturn(mockRepo.findMany, testDataArray);
testInstance.mockMethodToThrow(mockRepo.findOne, new Error('Not found'));

// Setup sequential returns
testInstance.mockMethodToReturnSequence(mockRepo.findMany, [
  [{ id: '1' }],
  [{ id: '1' }, { id: '2' }],
  [{ id: '1' }, { id: '2' }, { id: '3' }],
]);

// Setup fail then succeed
testInstance.mockMethodToFailThenSucceed(
  mockRepo.create,
  new Error('Temporary failure'),
  { id: '1', name: 'Success' }
);
```

### Assertion Helpers

```typescript
// Method call assertions
testInstance.assertMethodCalledWith(mockRepo.create, [{ name: 'Test' }]);
testInstance.assertMethodCalledTimes(mockRepo.findMany, 2);
testInstance.assertMethodNotCalled(mockRepo.delete);

// Return value assertions
testInstance.assertMethodReturns(result, expectedData);
testInstance.assertReturnsArray(result, 3);
testInstance.assertReturnsNull(result);
testInstance.assertReturnsUndefined(result);

// Property assertions
testInstance.assertHasProperties(result, ['id', 'name', 'email']);
testInstance.assertMatchesPartial(result, { name: 'Test' });

// Error assertions
await testInstance.assertMethodThrows(
  () => service.findOne('invalid-id'),
  'Not found'
);
```

### Query Parameter Helpers

```typescript
// Create pagination params
const pagination = testInstance.createPaginationParams(2, 20); // page 2, 20 per page
// Returns: { skip: 20, take: 20 }

// Create filter params
const filters = testInstance.createFilterParams({ status: 'ACTIVE' });
// Returns: { where: { status: 'ACTIVE' } }

// Create sort params
const sort = testInstance.createSortParams('createdAt', 'desc');
// Returns: { orderBy: { createdAt: 'desc' } }

// Create include params
const include = testInstance.createIncludeParams(['user', 'coach']);
// Returns: { include: { user: true, coach: true } }
```

---

## Best Practices

### 1. Use Type-Safe Methods

Always use the type-safe HTTP methods with the `Endpoints` type:

```typescript
// ✅ Good - Type-safe
const response = await testInstance.typeSafeGet<Endpoints>('/api/sessions');

// ❌ Avoid - Not type-safe
const response = await testInstance.get('/api/sessions');
```

### 2. Leverage Built-in Helpers

Use the built-in test data creation helpers instead of manually creating data:

```typescript
// ✅ Good - Uses helper
const user = await testInstance.createTestUser({ email: 'test@example.com' });

// ❌ Avoid - Manual creation
const user = await testInstance.prisma.account.create({
  data: {
    email: 'test@example.com',
    name: 'Test',
    passwordHash: 'hash',
    role: Role.USER,
    // ... many more fields
  },
});
```

### 3. Use Discriminated Union Pattern

Always check the `ok` property before accessing response body:

```typescript
// ✅ Good - Type-safe with discriminated union
const response = await testInstance.typeSafeGet<Endpoints>('/api/sessions');
if (response.ok) {
  // TypeScript knows response.body is the success type
  expect(response.body).toBeDefined();
} else {
  // TypeScript knows response.body is the error type
  expect(response.body.message).toBeDefined();
}

// ❌ Avoid - No type safety
expect(response.body).toBeDefined();
```

### 4. Create Custom Test Classes

Extend the base classes to create reusable test infrastructure:

```typescript
// ✅ Good - Reusable test class
class BookingSystemIntegrationTest extends BaseIntegrationTest {
  testUser!: Account;
  testCoach!: Account;

  async seedTestData(): Promise<void> {
    this.testUser = await this.createTestUser();
    this.testCoach = await this.createTestCoach();
  }
}

// Use in multiple test files
describe('Booking Tests', () => {
  let testInstance: BookingSystemIntegrationTest;
  // ...
});
```

### 5. Use Assertion Helpers

Use the built-in assertion helpers for consistent error messages:

```typescript
// ✅ Good - Clear assertion
testInstance.assertSuccessResponse(response, 200);
testInstance.assertArrayLength(response, 5);

// ❌ Avoid - Manual assertions
expect(response.status).toBe(200);
expect(response.body).toBeDefined();
expect(Array.isArray(response.body)).toBe(true);
expect(response.body.length).toBe(5);
```

### 6. Clean Up Test Data

The base classes handle cleanup automatically, but you can add custom cleanup:

```typescript
class MyIntegrationTest extends BaseIntegrationTest {
  async cleanup(): Promise<void> {
    // Custom cleanup
    await this.deleteRecords('customTable', {});

    // Call parent cleanup
    await super.cleanup();
  }
}
```

### 7. Use beforeEach for Test-Specific Data

Use `beforeEach` for data that's specific to individual tests:

```typescript
describe('Session Tests', () => {
  let testInstance: BookingSystemIntegrationTest;
  let testSession: Session;

  beforeAll(async () => {
    testInstance = new BookingSystemIntegrationTest();
    await testInstance.setup();
  });

  beforeEach(async () => {
    // Create fresh session for each test
    testSession = await testInstance.createTestSession();
  });

  afterAll(async () => {
    await testInstance.cleanup();
  });
});
```

### 8. Test Error Scenarios

Always test both success and error scenarios:

```typescript
it('should handle invalid input', async () => {
  const response = await testInstance.typeSafePost<Endpoints>('/api/sessions', {
    /* invalid data */
  });

  expect(response.ok).toBe(false);
  if (!response.ok) {
    testInstance.assertValidationError(response, ['dateTime', 'coachId']);
  }
});
```

---

## Examples

See the following files for complete examples:

- **Integration Tests**: `apps/api/test/integration/health.integration.spec.ts`
- **Integration Tests**:
  `apps/api/test/integration/booking-system.integration.spec.ts`
- **Base Classes**: `apps/api/test/utils/base/`

For more examples, check the `apps/api/test/utils/base/examples/` directory.
