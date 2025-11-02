# Base Test Classes

This directory contains abstract base classes that provide common testing patterns and utilities for the NestJS API. These classes follow OOP principles and implement the DRY (Don't Repeat Yourself) principle to reduce code duplication across test files.

## Overview

The base test classes provide a foundation for writing consistent, maintainable tests across all modules in the API. They implement common patterns such as:

- Test setup and teardown
- Mock creation and management
- HTTP request utilities
- Database operations
- Authentication helpers
- Assertion utilities

## Base Classes

### BaseControllerTest<TController, TService>

Abstract base class for testing NestJS controllers.

**Features:**
- Automatic test module setup and teardown
- HTTP request utilities (GET, POST, PUT, DELETE)
- Authentication helpers
- Mock request/response creation
- Common assertion methods

**Usage:**
```typescript
import { BaseControllerTest } from '@/test/utils/base';
import { MyController } from '@app/my-module/my.controller';
import { MyService } from '@app/my-module/my.service';

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
          remove: jest.fn(),
        },
      },
    ];
  }

  getControllerClass(): any {
    return MyController;
  }
}
```

### BaseServiceTest<TService, TRepository>

Abstract base class for testing NestJS services.

**Features:**
- Automatic test module setup and teardown
- Mock repository creation
- Mock PrismaService creation
- Test data generation utilities
- Method assertion helpers
- Error testing utilities

**Usage:**
```typescript
import { BaseServiceTest } from '@/test/utils/base';
import { MyService } from '@app/my-module/my.service';
import { PrismaService } from '../prisma/prisma.service';

class MyServiceTest extends BaseServiceTest<MyService, PrismaService> {
  async setupService(): Promise<void> {
    this.service = this.module.get<MyService>(MyService);
    this.repository = this.module.get<PrismaService>(PrismaService);
  }

  setup any {
    return [
      {
        provide: PrismaService,
        useValue: this.createMockPrismaService(),
      },
    ];
  }

  getServiceClass(): any {
    return MyService;
  }
}
```

### BaseIntegrationTest

Abstract base class for integration testing with real database operations.

**Features:**
- Automatic test application setup and teardown
- Database setup, seeding, and cleanup
- HTTP request utilities with real endpoints
- Authentication helpers
- Test data creation utilities
- Database assertion methods

**Usage:**
```typescript
import { BaseIntegrationTest } from '@/test/utils/base';
import { MyModule } from '@app/my-module/my.module';
import { PrismaModule } from '../prisma/prisma.module';

class MyIntegrationTest extends BaseIntegrationTest {
  async setupTestApp(): Promise<void> {
    // Any additional setup specific to your module
  }

  getTestModules(): any[] {
    return [
      MyModule,
      PrismaModule,
    ];
  }
}
```

## Common Patterns

### Test Setup and Teardown

All base classes provide automatic setup and teardown:

```typescript
describe('MyController', () => {
  let testInstance: MyControllerTest;

  beforeEach(async () => {
    testInstance = new MyControllerTest();
    await testInstance.setup();
  });

  afterEach(async () => {
    await testInstance.cleanup();
  });

  it('should test something', async () => {
    // Your test logic here
  });
});
```

### HTTP Requests

Base classes provide convenient HTTP request methods:

```typescript
// Unauthenticated requests
const response = await this.get('/endpoint');
const response = await this.post('/endpoint', data);

// Authenticated requests
const response = await this.authenticatedGet('/endpoint');
const response = await this.authenticatedPost('/endpoint', data);
const response = await this.authenticatedPut('/endpoint', data);
const response = await this.authenticatedDelete('/endpoint');
```

### Assertions

Common assertion methods are provided:

```typescript
// Response assertions
this.assertSuccessResponse(response, 200);
this.assertErrorResponse(response, 400, 'Validation failed');
this.assertResponseStructure(response, ['id', 'name', 'email']);

// Service method assertions
this.assertMethodCalledWith(mockMethod, [expectedArg1, expectedArg2]);
this.assertMethodCalledTimes(mockMethod, 1);
this.assertMethodReturns(result, expectedData);

// Database assertions (integration tests)
await this.assertDataExists('user', { email: 'test@example.com' });
await this.assertDataNotExists('user', { email: 'deleted@example.com' });
```

### Mock Management

Base classes provide utilities for mock management:

```typescript
// Create mocks
const mockRepository = this.createMockRepository();
const mockPrisma = this.createMockPrismaService();

// Set up mock behavior
this.mockMethodToReturn(mockMethod, returnValue);
this.mockMethodToThrow(mockMethod, new Error('Test error'));

// Reset mocks
this.resetMocks();
```

## Examples

See the `examples/` directory for complete implementation examples:

- `health-controller.example.ts` - Controller testing example
- `health-service.example.ts` - Service testing example
- `health-integration.example.ts` - Integration testing example

## Best Practices

1. **Inheritance over Composition**: Use inheritance to extend base classes and override methods as needed.

2. **Consistent Setup**: Always implement the required abstract methods (`setupController`, `setupService`, `setupTestApp`, etc.).

3. **Mock Management**: Use the provided mock utilities to maintain consistent mock behavior.

4. **Test Isolation**: Each test should be independent and not rely on the state from other tests.

5. **Descriptive Tests**: Use the assertion methods to make tests more readable and maintainable.

6. **Error Testing**: Use the error assertion methods to test error conditions properly.

## Integration with Jest

These base classes are designed to work seamlessly with Jest testing framework:

```typescript
describe('MyModule', () => {
  let testInstance: MyControllerTest;

  beforeEach(async () => {
    testInstance = new MyControllerTest();
    await testInstance.setup();
  });

  afterEach(async () => {
    await testInstance.cleanup();
  });

  describe('GET /endpoint', () => {
    it('should return success response', async () => {
      const response = await testInstance.get('/endpoint');
      testInstance.assertSuccessResponse(response);
    });
  });
});
```

This approach ensures consistent test structure across all modules while providing flexibility for module-specific testing needs.
