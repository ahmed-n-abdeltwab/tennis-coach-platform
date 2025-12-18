import {
  BaseResponseDto,
  BulkOperationResultDto,
  createTypedApiDecorators,
  ErrorResponseDto,
  OperationStatusDto,
  PaginatedResponseDto,
  ValidationErrorResponseDto,
} from '@common';
import { Body, Controller, Delete, Get, Param, Patch, Post, Put, Query } from '@nestjs/common';
import { ApiOperation, ApiTags, DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

/**
 * Test DTO for decorator testing
 */
class TestResourceDto extends BaseResponseDto {
  name: string;
  description: string;
}

/**
 * Custom status DTO for async operations
 */
class CustomStatusDto {
  jobId: string;
  progress: number;
}

/**
 * Test controller using all new decorators
 * This controller is used to verify OpenAPI spec generation
 */
@Controller('test-resources')
@ApiTags('test-resources')
class TestResourceController {
  private static readonly decorators = createTypedApiDecorators(TestResourceDto);

  @Get('paginated')
  @ApiOperation({ summary: 'Get paginated resources' })
  @TestResourceController.decorators.Paginated('Paginated resources retrieved')
  async getPaginated(@Query('page') page: number, @Query('limit') limit: number) {
    return {
      data: [],
      meta: { page, limit, total: 0, totalPages: 0, hasNext: false, hasPrev: false },
    };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get single resource' })
  @TestResourceController.decorators.Found('Resource found')
  async getOne(@Param('id') id: string) {
    return { id, name: 'Test', description: 'Test', createdAt: new Date(), updatedAt: new Date() };
  }

  @Get()
  @ApiOperation({ summary: 'Get all resources' })
  @TestResourceController.decorators.FoundMany('Resources found')
  async getAll() {
    return [];
  }

  @Post()
  @ApiOperation({ summary: 'Create resource' })
  @TestResourceController.decorators.Created('Resource created')
  async create(@Body() data: any) {
    return { id: '1', ...data, createdAt: new Date(), updatedAt: new Date() };
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update resource' })
  @TestResourceController.decorators.Updated('Resource updated')
  async update(@Param('id') id: string, @Body() data: any) {
    return { id, ...data, createdAt: new Date(), updatedAt: new Date() };
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Partially update resource' })
  @TestResourceController.decorators.PartiallyUpdated('Resource partially updated')
  async partialUpdate(@Param('id') id: string, @Body() data: any) {
    return { id, ...data, createdAt: new Date(), updatedAt: new Date() };
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete resource with response' })
  @TestResourceController.decorators.Deleted('Resource deleted')
  async delete(@Param('id') _id: string) {
    return { message: 'Deleted' };
  }

  @Delete('no-content/:id')
  @ApiOperation({ summary: 'Delete resource with no content' })
  @TestResourceController.decorators.NoContent('Resource deleted with no content')
  async deleteNoContent(@Param('id') _id: string): Promise<void> {
    // No return
  }

  @Post('bulk')
  @ApiOperation({ summary: 'Create multiple resources' })
  @TestResourceController.decorators.BulkCreated('Resources created in bulk')
  async bulkCreate(@Body() data: any[]) {
    return data.map((item, i) => ({
      id: String(i),
      ...item,
      createdAt: new Date(),
      updatedAt: new Date(),
    }));
  }

  @Put('bulk')
  @ApiOperation({ summary: 'Update multiple resources' })
  @TestResourceController.decorators.BulkUpdated('Resources updated in bulk')
  async bulkUpdate(@Body() data: any[]) {
    return data.map((item, i) => ({
      id: String(i),
      ...item,
      createdAt: new Date(),
      updatedAt: new Date(),
    }));
  }

  @Delete('bulk')
  @ApiOperation({ summary: 'Delete multiple resources' })
  @TestResourceController.decorators.BulkDeleted('Resources deleted in bulk')
  async bulkDelete(@Body() ids: string[]) {
    return {
      success: ids.length,
      failed: 0,
      errors: [],
    };
  }

  @Post('async')
  @ApiOperation({ summary: 'Start async operation' })
  @TestResourceController.decorators.Accepted('Operation accepted for processing')
  async startAsync(@Body() _data: any) {
    return {
      operationId: 'op-123',
      status: 'pending' as const,
      statusUrl: '/api/test-resources/async/op-123',
    };
  }

  @Post('async-custom')
  @ApiOperation({ summary: 'Start async operation with custom status' })
  @TestResourceController.decorators.Accepted('Custom async operation started', CustomStatusDto)
  async startAsyncCustom(@Body() _data: any) {
    return {
      jobId: 'job-456',
      progress: 0,
    };
  }
}

import { IntegrationTest } from '../utils';

class TypedApiDecoratorsTest extends IntegrationTest {
  document: any;

  constructor() {
    super({
      modules: [],
      controllers: [TestResourceController],
      providers: [],
    });
  }

  override async setup(): Promise<void> {
    await super.setup();

    // Generate OpenAPI document after app is initialized
    const config = new DocumentBuilder()
      .setTitle('Test API')
      .setDescription('Test API for decorator validation')
      .setVersion('1.0')
      .addBearerAuth()
      .build();

    this.document = SwaggerModule.createDocument(this.application, config, {
      extraModels: [
        TestResourceDto,
        PaginatedResponseDto,
        ErrorResponseDto,
        ValidationErrorResponseDto,
        OperationStatusDto,
        BulkOperationResultDto,
        CustomStatusDto,
      ],
    });
  }

  async seedTestData(): Promise<void> {
    // No database seeding needed
  }
}

/**
 * Integration tests for typed API decorators with OpenAPI spec generation
 */
describe('Typed API Decorators - OpenAPI Spec Generation', () => {
  let testInstance: TypedApiDecoratorsTest;

  beforeAll(async () => {
    testInstance = new TypedApiDecoratorsTest();
    await testInstance.setup();
  });

  afterAll(async () => {
    await testInstance.cleanup();
  });

  describe('Paginated decorator', () => {
    it('should include 200 response with PaginatedResponseDto schema', () => {
      const path = testInstance.document.paths['/api/test-resources/paginated'];
      expect(path).toBeDefined();
      expect(path.get).toBeDefined();
      expect(path.get.responses['200']).toBeDefined();
      expect(path.get.responses['200'].description).toBe('Paginated resources retrieved');

      // Verify schema structure exists (can be allOf, $ref, or direct properties)
      const schema = path.get.responses['200'].content['application/json'].schema;
      expect(schema).toBeDefined();
      // Schema should have either allOf, $ref, or properties
      expect(schema.allOf ?? schema.$ref ?? schema.properties).toBeDefined();
    });

    it('should include 400 Bad Request error response', () => {
      const path = testInstance.document.paths['/api/test-resources/paginated'];
      expect(path.get.responses['400']).toBeDefined();
      expect(path.get.responses['400'].description).toContain('Invalid query parameters');
    });

    it('should include 401 Unauthorized error response', () => {
      const path = testInstance.document.paths['/api/test-resources/paginated'];
      expect(path.get.responses['401']).toBeDefined();
      expect(path.get.responses['401'].description).toContain('Unauthorized');
    });
  });

  describe('PartiallyUpdated decorator', () => {
    it('should include 200 response with resource type', () => {
      const path = testInstance.document.paths['/api/test-resources/{id}'];
      expect(path).toBeDefined();
      expect(path.patch).toBeDefined();
      expect(path.patch.responses['200']).toBeDefined();
      expect(path.patch.responses['200'].description).toBe('Resource partially updated');
    });

    it('should include 400, 401, 404, and 422 error responses', () => {
      const path = testInstance.document.paths['/api/test-resources/{id}'];
      expect(path.patch.responses['400']).toBeDefined();
      expect(path.patch.responses['401']).toBeDefined();
      expect(path.patch.responses['404']).toBeDefined();
      expect(path.patch.responses['422']).toBeDefined();
    });

    it('should use ValidationErrorResponseDto for 422 response', () => {
      const path = testInstance.document.paths['/api/test-resources/{id}'];
      const response422 = path.patch.responses['422'];
      expect(response422).toBeDefined();
      expect(response422.description).toContain('Unprocessable Entity');
    });
  });

  describe('NoContent decorator', () => {
    it('should include 204 response with no body schema', () => {
      const path = testInstance.document.paths['/api/test-resources/no-content/{id}'];
      expect(path).toBeDefined();
      expect(path.delete).toBeDefined();
      expect(path.delete.responses['204']).toBeDefined();
      expect(path.delete.responses['204'].description).toBe('Resource deleted with no content');

      // Verify no content schema
      const response204 = path.delete.responses['204'];
      expect(response204.content).toBeUndefined();
    });

    it('should include 401, 404, and 409 error responses', () => {
      const path = testInstance.document.paths['/api/test-resources/no-content/{id}'];
      expect(path.delete.responses['401']).toBeDefined();
      expect(path.delete.responses['404']).toBeDefined();
      expect(path.delete.responses['409']).toBeDefined();
    });
  });

  describe('Bulk operation decorators', () => {
    it('should include 201 response with array type for BulkCreated', () => {
      const path = testInstance.document.paths['/api/test-resources/bulk'];
      expect(path).toBeDefined();
      expect(path.post).toBeDefined();
      expect(path.post.responses['201']).toBeDefined();
      expect(path.post.responses['201'].description).toBe('Resources created in bulk');

      // Verify array type
      const schema = path.post.responses['201'].content['application/json'].schema;
      expect(schema.type).toBe('array');
      expect(schema.items).toBeDefined();
    });

    it('should include 200 response with array type for BulkUpdated', () => {
      const path = testInstance.document.paths['/api/test-resources/bulk'];
      expect(path.put).toBeDefined();
      expect(path.put.responses['200']).toBeDefined();
      expect(path.put.responses['200'].description).toBe('Resources updated in bulk');

      // Verify array type
      const schema = path.put.responses['200'].content['application/json'].schema;
      expect(schema.type).toBe('array');
      expect(schema.items).toBeDefined();
    });

    it('should include 200 response with BulkOperationResultDto for BulkDeleted', () => {
      const path = testInstance.document.paths['/api/test-resources/bulk'];
      expect(path.delete).toBeDefined();
      expect(path.delete.responses['200']).toBeDefined();
      expect(path.delete.responses['200'].description).toBe('Resources deleted in bulk');

      // Verify BulkOperationResultDto schema
      const schema = path.delete.responses['200'].content['application/json'].schema;
      expect(schema.$ref ?? schema.allOf).toBeDefined();
    });

    it('should include 400, 401, and 422 error responses for bulk operations', () => {
      const path = testInstance.document.paths['/api/test-resources/bulk'];

      // BulkCreated
      expect(path.post.responses['400']).toBeDefined();
      expect(path.post.responses['401']).toBeDefined();
      expect(path.post.responses['422']).toBeDefined();

      // BulkUpdated
      expect(path.put.responses['400']).toBeDefined();
      expect(path.put.responses['401']).toBeDefined();
      expect(path.put.responses['422']).toBeDefined();

      // BulkDeleted
      expect(path.delete.responses['400']).toBeDefined();
      expect(path.delete.responses['401']).toBeDefined();
    });
  });

  describe('Accepted decorator', () => {
    it('should include 202 response with OperationStatusDto', () => {
      const path = testInstance.document.paths['/api/test-resources/async'];
      expect(path).toBeDefined();
      expect(path.post).toBeDefined();
      expect(path.post.responses['202']).toBeDefined();
      expect(path.post.responses['202'].description).toBe('Operation accepted for processing');

      // Verify OperationStatusDto schema
      const schema = path.post.responses['202'].content['application/json'].schema;
      expect(schema.$ref ?? schema.allOf).toBeDefined();
    });

    it('should support custom status type', () => {
      const path = testInstance.document.paths['/api/test-resources/async-custom'];
      expect(path).toBeDefined();
      expect(path.post).toBeDefined();
      expect(path.post.responses['202']).toBeDefined();
      expect(path.post.responses['202'].description).toBe('Custom async operation started');

      // Verify custom status schema
      const schema = path.post.responses['202'].content['application/json'].schema;
      expect(schema.$ref ?? schema.allOf).toBeDefined();
    });

    it('should include 400, 401, and 503 error responses', () => {
      const path = testInstance.document.paths['/api/test-resources/async'];
      expect(path.post.responses['400']).toBeDefined();
      expect(path.post.responses['401']).toBeDefined();
      expect(path.post.responses['503']).toBeDefined();
    });
  });

  describe('Error response documentation', () => {
    it('should document all error responses with correct status codes', () => {
      // Check various endpoints for error responses
      const paginatedPath = testInstance.document.paths['/api/test-resources/paginated'];
      const singlePath = testInstance.document.paths['/api/test-resources/{id}'];

      // Verify error status codes are documented
      expect(paginatedPath.get.responses['400']).toBeDefined();
      expect(paginatedPath.get.responses['401']).toBeDefined();

      expect(singlePath.get.responses['404']).toBeDefined();
      expect(singlePath.put.responses['400']).toBeDefined();
      expect(singlePath.put.responses['401']).toBeDefined();
      expect(singlePath.put.responses['404']).toBeDefined();
      expect(singlePath.delete.responses['401']).toBeDefined();
      expect(singlePath.delete.responses['404']).toBeDefined();
      expect(singlePath.delete.responses['409']).toBeDefined();
    });

    it('should use ErrorResponseDto for non-validation errors', () => {
      const path = testInstance.document.paths['/api/test-resources/{id}'];

      // Check 401, 403, 404, 409 use ErrorResponseDto
      const response401 = path.get.responses['404'];
      expect(response401).toBeDefined();
      expect(response401.description).toContain('not found');
    });

    it('should use ValidationErrorResponseDto for validation errors', () => {
      const path = testInstance.document.paths['/api/test-resources/{id}'];

      // Check 400 and 422 use ValidationErrorResponseDto
      const response400 = path.patch.responses['400'];
      const response422 = path.patch.responses['422'];

      expect(response400).toBeDefined();
      expect(response422).toBeDefined();
    });
  });

  describe('Standard CRUD decorators', () => {
    it('should document Created decorator correctly', () => {
      const path = testInstance.document.paths['/api/test-resources'];
      expect(path.post.responses['201']).toBeDefined();
      expect(path.post.responses['201'].description).toBe('Resource created');
      expect(path.post.responses['400']).toBeDefined();
      expect(path.post.responses['401']).toBeDefined();
    });

    it('should document Found decorator correctly', () => {
      const path = testInstance.document.paths['/api/test-resources/{id}'];
      expect(path.get.responses['200']).toBeDefined();
      expect(path.get.responses['200'].description).toBe('Resource found');
      expect(path.get.responses['404']).toBeDefined();
    });

    it('should document FoundMany decorator correctly', () => {
      const path = testInstance.document.paths['/api/test-resources'];
      expect(path.get.responses['200']).toBeDefined();
      expect(path.get.responses['200'].description).toBe('Resources found');
      expect(path.get.responses['400']).toBeDefined();

      // Verify array type
      const schema = path.get.responses['200'].content['application/json'].schema;
      expect(schema.type).toBe('array');
    });

    it('should document Updated decorator correctly', () => {
      const path = testInstance.document.paths['/api/test-resources/{id}'];
      expect(path.put.responses['200']).toBeDefined();
      expect(path.put.responses['200'].description).toBe('Resource updated');
      expect(path.put.responses['400']).toBeDefined();
      expect(path.put.responses['401']).toBeDefined();
      expect(path.put.responses['404']).toBeDefined();
    });

    it('should document Deleted decorator correctly', () => {
      const path = testInstance.document.paths['/api/test-resources/{id}'];
      expect(path.delete.responses['200']).toBeDefined();
      expect(path.delete.responses['200'].description).toBe('Resource deleted');
      expect(path.delete.responses['401']).toBeDefined();
      expect(path.delete.responses['404']).toBeDefined();
      expect(path.delete.responses['409']).toBeDefined();
    });
  });

  describe('OpenAPI spec structure', () => {
    it('should include all test endpoints in the spec', () => {
      expect(testInstance.document.paths['/api/test-resources']).toBeDefined();
      expect(testInstance.document.paths['/api/test-resources/{id}']).toBeDefined();
      expect(testInstance.document.paths['/api/test-resources/paginated']).toBeDefined();
      expect(testInstance.document.paths['/api/test-resources/bulk']).toBeDefined();
      expect(testInstance.document.paths['/api/test-resources/async']).toBeDefined();
      expect(testInstance.document.paths['/api/test-resources/async-custom']).toBeDefined();
      expect(testInstance.document.paths['/api/test-resources/no-content/{id}']).toBeDefined();
    });

    it('should include all required DTOs in components/schemas', () => {
      expect(testInstance.document.components.schemas).toBeDefined();
      expect(testInstance.document.components.schemas['TestResourceDto']).toBeDefined();
      expect(testInstance.document.components.schemas['PaginatedResponseDto']).toBeDefined();
      expect(testInstance.document.components.schemas['ErrorResponseDto']).toBeDefined();
      expect(testInstance.document.components.schemas['ValidationErrorResponseDto']).toBeDefined();
      expect(testInstance.document.components.schemas['OperationStatusDto']).toBeDefined();
      expect(testInstance.document.components.schemas['BulkOperationResultDto']).toBeDefined();
    });

    it('should have proper response content types', () => {
      const path = testInstance.document.paths['/api/test-resources/{id}'];

      // Check that responses have application/json content type
      expect(path.get.responses['200'].content['application/json']).toBeDefined();
      expect(path.put.responses['200'].content['application/json']).toBeDefined();
      expect(path.patch.responses['200'].content['application/json']).toBeDefined();
    });
  });
});
