import { Type } from '@nestjs/common';
import { createTypedApiDecorators, TypedApiDecorators } from '../typed-api-responses.decorator';

// Mock DTO for testing
class TestDto {
  id!: string;
  name!: string;
}

describe('TypedApiDecorators Interface', () => {
  let decorators: TypedApiDecorators<Type<TestDto>>;

  beforeEach(() => {
    decorators = createTypedApiDecorators(TestDto);
  });

  describe('Interface Structure', () => {
    it('should return an object with all required decorator methods', () => {
      // Verify all main decorator methods exist
      expect(decorators.AuthSuccess).toBeDefined();
      expect(decorators.Paginated).toBeDefined();
      expect(decorators.Created).toBeDefined();
      expect(decorators.Found).toBeDefined();
      expect(decorators.FoundMany).toBeDefined();
      expect(decorators.Updated).toBeDefined();
      expect(decorators.PartiallyUpdated).toBeDefined();
      expect(decorators.Deleted).toBeDefined();
      expect(decorators.NoContent).toBeDefined();
      expect(decorators.BulkCreated).toBeDefined();
      expect(decorators.BulkUpdated).toBeDefined();
      expect(decorators.BulkDeleted).toBeDefined();
      expect(decorators.Accepted).toBeDefined();

      // Verify all methods are functions
      expect(typeof decorators.AuthSuccess).toBe('function');
      expect(typeof decorators.Paginated).toBe('function');
      expect(typeof decorators.Created).toBe('function');
      expect(typeof decorators.Found).toBe('function');
      expect(typeof decorators.FoundMany).toBe('function');
      expect(typeof decorators.Updated).toBe('function');
      expect(typeof decorators.PartiallyUpdated).toBe('function');
      expect(typeof decorators.Deleted).toBe('function');
      expect(typeof decorators.NoContent).toBe('function');
      expect(typeof decorators.BulkCreated).toBe('function');
      expect(typeof decorators.BulkUpdated).toBe('function');
      expect(typeof decorators.BulkDeleted).toBe('function');
      expect(typeof decorators.Accepted).toBe('function');
    });

    it('should have an errors object with all error decorator methods', () => {
      expect(decorators.errors).toBeDefined();
      expect(typeof decorators.errors).toBe('object');

      // Verify all error methods exist
      expect(decorators.errors.BadRequest).toBeDefined();
      expect(decorators.errors.Unauthorized).toBeDefined();
      expect(decorators.errors.Forbidden).toBeDefined();
      expect(decorators.errors.NotFound).toBeDefined();
      expect(decorators.errors.Conflict).toBeDefined();
      expect(decorators.errors.UnprocessableEntity).toBeDefined();
      expect(decorators.errors.TooManyRequests).toBeDefined();
      expect(decorators.errors.InternalServerError).toBeDefined();
      expect(decorators.errors.ServiceUnavailable).toBeDefined();

      // Verify all error methods are functions
      expect(typeof decorators.errors.BadRequest).toBe('function');
      expect(typeof decorators.errors.Unauthorized).toBe('function');
      expect(typeof decorators.errors.Forbidden).toBe('function');
      expect(typeof decorators.errors.NotFound).toBe('function');
      expect(typeof decorators.errors.Conflict).toBe('function');
      expect(typeof decorators.errors.UnprocessableEntity).toBe('function');
      expect(typeof decorators.errors.TooManyRequests).toBe('function');
      expect(typeof decorators.errors.InternalServerError).toBe('function');
      expect(typeof decorators.errors.ServiceUnavailable).toBe('function');
    });
  });

  describe('Type Safety', () => {
    it('should enforce TypeScript type checking at compile time', () => {
      // This test verifies that the interface provides proper type safety
      // If this compiles without errors, the interface is working correctly
      const testDecorators: TypedApiDecorators<Type<TestDto>> = createTypedApiDecorators(TestDto);

      // All these should be valid according to the interface
      const authDecorator = testDecorators.AuthSuccess();
      const paginatedDecorator = testDecorators.Paginated('Custom description');
      const createdDecorator = testDecorators.Created();
      const foundDecorator = testDecorators.Found();
      const foundManyDecorator = testDecorators.FoundMany();
      const updatedDecorator = testDecorators.Updated();
      const partiallyUpdatedDecorator = testDecorators.PartiallyUpdated();
      const deletedDecorator = testDecorators.Deleted();
      const noContentDecorator = testDecorators.NoContent();
      const bulkCreatedDecorator = testDecorators.BulkCreated();
      const bulkUpdatedDecorator = testDecorators.BulkUpdated();
      const bulkDeletedDecorator = testDecorators.BulkDeleted();
      const acceptedDecorator = testDecorators.Accepted();
      const acceptedWithTypeDecorator = testDecorators.Accepted('Custom', TestDto);

      // Error decorators
      const badRequestDecorator = testDecorators.errors.BadRequest();
      const unauthorizedDecorator = testDecorators.errors.Unauthorized();
      const forbiddenDecorator = testDecorators.errors.Forbidden();
      const notFoundDecorator = testDecorators.errors.NotFound();
      const conflictDecorator = testDecorators.errors.Conflict();
      const unprocessableDecorator = testDecorators.errors.UnprocessableEntity();
      const tooManyRequestsDecorator = testDecorators.errors.TooManyRequests();
      const internalServerErrorDecorator = testDecorators.errors.InternalServerError();
      const serviceUnavailableDecorator = testDecorators.errors.ServiceUnavailable();

      // Verify all decorators are functions (runtime check)
      expect(typeof authDecorator).toBe('function');
      expect(typeof paginatedDecorator).toBe('function');
      expect(typeof createdDecorator).toBe('function');
      expect(typeof foundDecorator).toBe('function');
      expect(typeof foundManyDecorator).toBe('function');
      expect(typeof updatedDecorator).toBe('function');
      expect(typeof partiallyUpdatedDecorator).toBe('function');
      expect(typeof deletedDecorator).toBe('function');
      expect(typeof noContentDecorator).toBe('function');
      expect(typeof bulkCreatedDecorator).toBe('function');
      expect(typeof bulkUpdatedDecorator).toBe('function');
      expect(typeof bulkDeletedDecorator).toBe('function');
      expect(typeof acceptedDecorator).toBe('function');
      expect(typeof acceptedWithTypeDecorator).toBe('function');
      expect(typeof badRequestDecorator).toBe('function');
      expect(typeof unauthorizedDecorator).toBe('function');
      expect(typeof forbiddenDecorator).toBe('function');
      expect(typeof notFoundDecorator).toBe('function');
      expect(typeof conflictDecorator).toBe('function');
      expect(typeof unprocessableDecorator).toBe('function');
      expect(typeof tooManyRequestsDecorator).toBe('function');
      expect(typeof internalServerErrorDecorator).toBe('function');
      expect(typeof serviceUnavailableDecorator).toBe('function');
    });
  });

  describe('Method Signatures', () => {
    it('should accept optional description parameter for all main decorators', () => {
      // Test with no description
      expect(() => decorators.AuthSuccess()).not.toThrow();
      expect(() => decorators.Paginated()).not.toThrow();
      expect(() => decorators.Created()).not.toThrow();
      expect(() => decorators.Found()).not.toThrow();
      expect(() => decorators.FoundMany()).not.toThrow();
      expect(() => decorators.Updated()).not.toThrow();
      expect(() => decorators.PartiallyUpdated()).not.toThrow();
      expect(() => decorators.Deleted()).not.toThrow();
      expect(() => decorators.NoContent()).not.toThrow();
      expect(() => decorators.BulkCreated()).not.toThrow();
      expect(() => decorators.BulkUpdated()).not.toThrow();
      expect(() => decorators.BulkDeleted()).not.toThrow();
      expect(() => decorators.Accepted()).not.toThrow();

      // Test with description
      expect(() => decorators.AuthSuccess('Custom')).not.toThrow();
      expect(() => decorators.Paginated('Custom')).not.toThrow();
      expect(() => decorators.Created('Custom')).not.toThrow();
      expect(() => decorators.Found('Custom')).not.toThrow();
      expect(() => decorators.FoundMany('Custom')).not.toThrow();
      expect(() => decorators.Updated('Custom')).not.toThrow();
      expect(() => decorators.PartiallyUpdated('Custom')).not.toThrow();
      expect(() => decorators.Deleted('Custom')).not.toThrow();
      expect(() => decorators.NoContent('Custom')).not.toThrow();
      expect(() => decorators.BulkCreated('Custom')).not.toThrow();
      expect(() => decorators.BulkUpdated('Custom')).not.toThrow();
      expect(() => decorators.BulkDeleted('Custom')).not.toThrow();
      expect(() => decorators.Accepted('Custom')).not.toThrow();
    });

    it('should accept optional description parameter for all error decorators', () => {
      // Test with no description
      expect(() => decorators.errors.BadRequest()).not.toThrow();
      expect(() => decorators.errors.Unauthorized()).not.toThrow();
      expect(() => decorators.errors.Forbidden()).not.toThrow();
      expect(() => decorators.errors.NotFound()).not.toThrow();
      expect(() => decorators.errors.Conflict()).not.toThrow();
      expect(() => decorators.errors.UnprocessableEntity()).not.toThrow();
      expect(() => decorators.errors.TooManyRequests()).not.toThrow();
      expect(() => decorators.errors.InternalServerError()).not.toThrow();
      expect(() => decorators.errors.ServiceUnavailable()).not.toThrow();

      // Test with description
      expect(() => decorators.errors.BadRequest('Custom')).not.toThrow();
      expect(() => decorators.errors.Unauthorized('Custom')).not.toThrow();
      expect(() => decorators.errors.Forbidden('Custom')).not.toThrow();
      expect(() => decorators.errors.NotFound('Custom')).not.toThrow();
      expect(() => decorators.errors.Conflict('Custom')).not.toThrow();
      expect(() => decorators.errors.UnprocessableEntity('Custom')).not.toThrow();
      expect(() => decorators.errors.TooManyRequests('Custom')).not.toThrow();
      expect(() => decorators.errors.InternalServerError('Custom')).not.toThrow();
      expect(() => decorators.errors.ServiceUnavailable('Custom')).not.toThrow();
    });

    it('should accept optional statusType parameter for Accepted decorator', () => {
      class CustomStatusDto {
        id!: string;
        status!: string;
      }

      // Test with no parameters
      expect(() => decorators.Accepted()).not.toThrow();

      // Test with description only
      expect(() => decorators.Accepted('Custom description')).not.toThrow();

      // Test with both description and statusType
      expect(() => decorators.Accepted('Custom description', CustomStatusDto)).not.toThrow();

      // Test with undefined description and statusType
      expect(() => decorators.Accepted(undefined, CustomStatusDto)).not.toThrow();
    });
  });
});
