import { applyDecorators, Type } from '@nestjs/common';
import { ApiResponse, getSchemaPath } from '@nestjs/swagger';

import { ErrorResponseDto, ValidationErrorResponseDto } from '../dto/base-response.dto';

/**
 * BETTER APPROACH: Type-safe decorator factories
 *
 * Instead of runtime reflection, we use TypeScript's compile-time generics
 * to create strongly-typed decorators that are bound to specific DTOs.
 *
 * Benefits:
 * 1. No runtime dependencies
 * 2. Compile-time type safety
 * 3. Better IDE support and autocomplete
 * 4. No need to pass types manually
 * 5. Impossible to use wrong DTO types
 */

/**
 * TypeScript interface defining all decorator methods returned by createTypedApiDecorators
 * Provides compile-time type safety and IDE autocomplete for all decorator methods
 *
 * @template _T - The response DTO type that decorators will be bound to
 */

export interface TypedApiDecorators<_T extends Type<any>> {
  /**
   * Composable error decorator methods
   * Use these to add specific error responses to endpoints
   */
  errors: {
    /**
     * 400 Bad Request - Validation failed
     * @param description - Optional custom description
     */
    BadRequest: (description?: string) => MethodDecorator;

    /**
     * 401 Unauthorized - Invalid or missing authentication
     * @param description - Optional custom description
     */
    Unauthorized: (description?: string) => MethodDecorator;

    /**
     * 403 Forbidden - Insufficient permissions
     * @param description - Optional custom description
     */
    Forbidden: (description?: string) => MethodDecorator;

    /**
     * 404 Not Found - Resource not found
     * @param description - Optional custom description
     */
    NotFound: (description?: string) => MethodDecorator;

    /**
     * 409 Conflict - Resource conflict
     * @param description - Optional custom description
     */
    Conflict: (description?: string) => MethodDecorator;

    /**
     * 422 Unprocessable Entity - Validation failed on well-formed request
     * @param description - Optional custom description
     */
    UnprocessableEntity: (description?: string) => MethodDecorator;

    /**
     * 429 Too Many Requests - Rate limit exceeded
     * @param description - Optional custom description
     */
    TooManyRequests: (description?: string) => MethodDecorator;

    /**
     * 500 Internal Server Error - Unexpected server error
     * @param description - Optional custom description
     */
    InternalServerError: (description?: string) => MethodDecorator;

    /**
     * 503 Service Unavailable - Service temporarily unavailable
     * @param description - Optional custom description
     */
    ServiceUnavailable: (description?: string) => MethodDecorator;
  };

  /**
   * Authentication success response decorator
   * Returns HTTP 200 with authentication token/user data
   * Includes error responses for: 400 Bad Request, 401 Unauthorized, 409 Conflict
   * @param description - Optional custom description
   */
  AuthSuccess: (description?: string) => MethodDecorator;

  /**
   * Paginated response decorator
   * Returns HTTP 200 with paginated data and metadata
   * Includes error responses for: 400 Bad Request, 401 Unauthorized
   * @param description - Optional custom description
   */
  Paginated: (description?: string) => MethodDecorator;

  /**
   * Resource created response decorator
   * Returns HTTP 201 with created resource
   * Includes error responses for: 400 Bad Request, 401 Unauthorized
   * @param description - Optional custom description
   */
  Created: (description?: string) => MethodDecorator;

  /**
   * Single resource found response decorator
   * Returns HTTP 200 with single resource
   * Includes error responses for: 404 Not Found
   * @param description - Optional custom description
   */
  Found: (description?: string) => MethodDecorator;

  /**
   * Multiple resources found response decorator
   * Returns HTTP 200 with array of resources
   * Includes error responses for: 400 Bad Request
   * @param description - Optional custom description
   */
  FoundMany: (description?: string) => MethodDecorator;

  /**
   * Resource updated response decorator (PUT semantics)
   * Returns HTTP 200 with updated resource
   * Includes error responses for: 400 Bad Request, 401 Unauthorized, 404 Not Found
   * @param description - Optional custom description
   */
  Updated: (description?: string) => MethodDecorator;

  /**
   * Resource partially updated response decorator (PATCH semantics)
   * Returns HTTP 200 with updated resource
   * Includes error responses for: 400 Bad Request, 401 Unauthorized, 404 Not Found, 422 Unprocessable Entity
   * @param description - Optional custom description
   */
  PartiallyUpdated: (description?: string) => MethodDecorator;

  /**
   * Resource deleted response decorator
   * Returns HTTP 200 with deletion confirmation
   * Includes error responses for: 401 Unauthorized, 404 Not Found, 409 Conflict
   * @param description - Optional custom description
   */
  Deleted: (description?: string) => MethodDecorator;

  /**
   * No content response decorator
   * Returns HTTP 204 with no response body
   * Includes error responses for: 401 Unauthorized, 404 Not Found, 409 Conflict
   * @param description - Optional custom description
   */
  NoContent: (description?: string) => MethodDecorator;
}

/**
 * Factory function that creates type-safe API response decorators for a specific DTO
 *
 * This function generates a complete set of OpenAPI/Swagger response decorators that are
 * strongly typed to a specific response DTO. It provides compile-time type safety and
 * eliminates the need to manually specify response types in each controller method.
 *
 * ## Benefits
 * - **Type Safety**: Compile-time verification that response types match the DTO
 * - **DRY Principle**: Define response type once, reuse across all endpoints
 * - **Consistency**: Standardized error responses across all endpoints
 * - **Composability**: Mix and match error decorators for custom combinations
 * - **IDE Support**: Full autocomplete and type hints for all decorator methods
 * - **No Runtime Overhead**: All type checking happens at compile-time
 *
 * ## Usage Pattern
 *
 * 1. Create typed decorators for your DTO (typically in the DTO file or controller):
 * ```typescript
 * export const UserApiResponses = createTypedApiDecorators(UserResponseDto);
 * ```
 *
 * 2. Use the decorators in your controller methods:
 * ```typescript
 * @Get(':id')
 * @UserApiResponses.Found('User retrieved successfully')
 * async getUser(@Param('id') id: string) {
 *   return this.usersService.findOne(id);
 * }
 * ```
 *
 * ## Available Decorators
 *
 * ### CRUD Operations
 * - `Created`: POST endpoints that create a single resource (201)
 * - `Found`: GET endpoints that retrieve a single resource (200)
 * - `FoundMany`: GET endpoints that retrieve multiple resources (200)
 * - `Updated`: PUT endpoints that fully update a resource (200)
 * - `PartiallyUpdated`: PATCH endpoints that partially update a resource (200)
 * - `Deleted`: DELETE endpoints that delete a resource (200)
 * - `NoContent`: Operations that complete with no response body (204)
 *
 * ### Special Operations
 * - `AuthSuccess`: Authentication endpoints (200)
 * - `Paginated`: List endpoints with pagination metadata (200)
 *
 * ### Error Decorators (Composable)
 * - `errors.BadRequest`: 400 - Malformed request
 * - `errors.Unauthorized`: 401 - Missing/invalid authentication
 * - `errors.Forbidden`: 403 - Insufficient permissions
 * - `errors.NotFound`: 404 - Resource not found
 * - `errors.Conflict`: 409 - Resource conflict
 * - `errors.UnprocessableEntity`: 422 - Validation failed
 * - `errors.TooManyRequests`: 429 - Rate limit exceeded
 * - `errors.InternalServerError`: 500 - Server error
 * - `errors.ServiceUnavailable`: 503 - Service unavailable
 *
 * @template T - The response DTO type that all decorators will be bound to
 * @param responseType - The NestJS DTO class to use for response documentation
 * @returns An object containing all typed decorator methods
 *
 * @example
 * ```typescript
 * // Create typed decorators for a Session DTO
 * export const SessionApiResponses = createTypedApiDecorators(SessionResponseDto);
 *
 * // Use in controller for standard CRUD
 * @Controller('sessions')
 * export class SessionsController {
 *   @Get(':id')
 *   @SessionApiResponses.Found('Session retrieved')
 *   async findOne(@Param('id') id: string) {
 *     return this.sessionsService.findOne(id);
 *   }
 *
 *   @Post()
 *   @SessionApiResponses.Created('Session created')
 *   async create(@Body() createDto: CreateSessionDto) {
 *     return this.sessionsService.create(createDto);
 *   }
 *
 *   @Patch(':id')
 *   @SessionApiResponses.PartiallyUpdated('Session updated')
 *   async update(@Param('id') id: string, @Body() updateDto: UpdateSessionDto) {
 *     return this.sessionsService.update(id, updateDto);
 *   }
 * }
 * ```
 *
 * @example
 * ```typescript
 * // Use pagination for list endpoints
 * @Get()
 * @SessionApiResponses.Paginated('Sessions retrieved with pagination')
 * async findAll(@Query() query: PaginationQuery) {
 *   return this.sessionsService.findAllPaginated(query);
 * }
 * ```
 *
 * @example
 * ```typescript
 * // Compose custom error combinations
 * @Get(':id/sensitive')
 * @Roles(Role.ADMIN)
 * @applyDecorators(
 *   UserApiResponses.Found('Sensitive data retrieved'),
 *   UserApiResponses.errors.Forbidden('Only admins can access sensitive data'),
 *   UserApiResponses.errors.TooManyRequests('Rate limit for sensitive endpoints')
 * )
 * async getSensitiveData(@Param('id') id: string) {
 *   return this.usersService.getSensitiveData(id);
 * }
 * ```
 */
export function createTypedApiDecorators<T extends Type<any>>(
  responseType: T
): TypedApiDecorators<T> {
  // Composable error decorator methods
  const errors = {
    /**
     * 400 Bad Request - Validation failed
     * Use for malformed requests or invalid syntax
     */
    BadRequest: (description?: string) =>
      ApiResponse({
        status: 400,
        description: description ?? 'Bad Request - Validation failed',
        type: ValidationErrorResponseDto,
      }),

    /**
     * 401 Unauthorized - Invalid or missing authentication
     *
     * Use when:
     * - Authentication credentials are missing (no token provided)
     * - Authentication credentials are invalid (expired/malformed token)
     * - User needs to authenticate before accessing the resource
     *
     * Note: Use 403 Forbidden instead when the user IS authenticated but lacks permissions
     */
    Unauthorized: (description?: string) =>
      ApiResponse({
        status: 401,
        description: description ?? 'Unauthorized - Invalid or missing token',
        type: ErrorResponseDto,
      }),

    /**
     * 403 Forbidden - Insufficient permissions
     *
     * Use when:
     * - User is authenticated but lacks required role/permissions
     * - User is trying to access a resource they don't own
     * - User is trying to perform an action they're not authorized for
     *
     * Note: Use 401 Unauthorized instead when the user is NOT authenticated
     *
     * @example
     * ```typescript
     * // Role-protected endpoint
     * @Get('admin/users')
     * @Roles(Role.ADMIN)
     * @ApiBearerAuth('JWT-auth')
     * @applyDecorators(
     *   UserApiResponses.FoundMany('All users retrieved'),
     *   UserApiResponses.errors.Forbidden('Only admins can access this endpoint')
     * )
     * async getAllUsers() { ... }
     * ```
     */
    Forbidden: (description?: string) =>
      ApiResponse({
        status: 403,
        description: description ?? 'Forbidden - Insufficient permissions',
        type: ErrorResponseDto,
      }),

    /**
     * 404 Not Found - Resource not found
     * Use when the requested resource does not exist
     */
    NotFound: (description?: string) =>
      ApiResponse({
        status: 404,
        description: description ?? 'Resource not found',
        type: ErrorResponseDto,
      }),

    /**
     * 409 Conflict - Resource conflict
     * Use when the request conflicts with current state (e.g., duplicate resource)
     */
    Conflict: (description?: string) =>
      ApiResponse({
        status: 409,
        description: description ?? 'Conflict - Resource already exists or cannot be modified',
        type: ErrorResponseDto,
      }),

    /**
     * 422 Unprocessable Entity - Validation failed on well-formed request
     * Use for semantic validation errors on syntactically correct requests
     */
    UnprocessableEntity: (description?: string) =>
      ApiResponse({
        status: 422,
        description: description ?? 'Unprocessable Entity - Validation failed',
        type: ValidationErrorResponseDto,
      }),

    /**
     * 429 Too Many Requests - Rate limit exceeded
     * Use when the client has exceeded rate limiting thresholds
     */
    TooManyRequests: (description?: string) =>
      ApiResponse({
        status: 429,
        description: description ?? 'Too Many Requests - Rate limit exceeded',
        type: ErrorResponseDto,
      }),

    /**
     * 500 Internal Server Error - Unexpected server error
     * Use for unexpected server-side errors
     */
    InternalServerError: (description?: string) =>
      ApiResponse({
        status: 500,
        description: description ?? 'Internal Server Error',
        type: ErrorResponseDto,
      }),

    /**
     * 503 Service Unavailable - Service temporarily unavailable
     * Use when the service is temporarily unavailable (maintenance, overload)
     */
    ServiceUnavailable: (description?: string) =>
      ApiResponse({
        status: 503,
        description: description ?? 'Service Unavailable - Temporarily unavailable',
        type: ErrorResponseDto,
      }),
  };

  return {
    // Composable error decorators
    errors,

    // Auth endpoints
    AuthSuccess: (description?: string) =>
      applyDecorators(
        ApiResponse({
          status: 200,
          description: description ?? 'Authentication successful',
          type: responseType,
        }),
        errors.Unauthorized('Invalid credentials'),
        errors.Conflict('User already exists'),
        errors.BadRequest()
      ),

    /**
     * Paginated response decorator
     * Use for list endpoints that return paginated results
     * Includes pagination metadata (page, limit, total, totalPages, hasNext, hasPrev)
     *
     * @example
     * ```typescript
     * @Get()
     * @SessionApiResponses.Paginated('Sessions retrieved with pagination')
     * async findAll(@Query() query: PaginationQueryDto) {
     *   return this.sessionsService.findAllPaginated(query);
     * }
     * ```
     */
    Paginated: (description?: string) =>
      applyDecorators(
        ApiResponse({
          status: 200,
          description: description ?? 'Paginated resources retrieved successfully',
          schema: {
            properties: {
              data: {
                type: 'array',
                items: { $ref: getSchemaPath(responseType) },
              },
              meta: {
                type: 'object',
                properties: {
                  page: { type: 'number' },
                  limit: { type: 'number' },
                  total: { type: 'number' },
                  totalPages: { type: 'number' },
                  hasNext: { type: 'boolean' },
                  hasPrev: { type: 'boolean' },
                },
              },
            },
          },
        }),
        errors.BadRequest('Invalid query parameters'),
        errors.Unauthorized()
      ),

    // CRUD operations
    Created: (description?: string) =>
      applyDecorators(
        ApiResponse({
          status: 201,
          description: description ?? 'Resource created successfully',
          type: responseType,
        }),
        errors.BadRequest(),
        errors.Unauthorized()
      ),

    Found: (description?: string) =>
      applyDecorators(
        ApiResponse({
          status: 200,
          description: description ?? 'Resource retrieved successfully',
          type: responseType,
        }),
        errors.NotFound()
      ),

    FoundMany: (description?: string) =>
      applyDecorators(
        ApiResponse({
          status: 200,
          description: description ?? 'Resources retrieved successfully',
          type: [responseType], // Array type
        }),
        errors.BadRequest('Invalid query parameters')
      ),

    Updated: (description?: string) =>
      applyDecorators(
        ApiResponse({
          status: 200,
          description: description ?? 'Resource updated successfully',
          type: responseType,
        }),
        errors.BadRequest(),
        errors.Unauthorized(),
        errors.NotFound()
      ),

    /**
     * Partially Updated response decorator
     * Use for PATCH endpoints that perform partial updates on resources
     *
     * Difference from Updated decorator:
     * - Updated: Used for PUT requests (full resource replacement)
     * - PartiallyUpdated: Used for PATCH requests (partial resource modification)
     *
     * Returns HTTP 200 with the updated resource
     * Includes error responses for:
     * - 400 Bad Request (malformed request)
     * - 401 Unauthorized (authentication required)
     * - 404 Not Found (resource doesn't exist)
     * - 422 Unprocessable Entity (validation failed on partial data)
     *
     * @example
     * ```typescript
     * @Patch(':id')
     * @Roles(Role.COACH)
     * @ApiBearerAuth('JWT-auth')
     * @BookingTypeApiResponses.PartiallyUpdated('Booking type updated')
     * async partialUpdate(
     *   @Param('id') id: string,
     *   @Body() updateDto: PartialUpdateBookingTypeDto
     * ) {
     *   return this.bookingTypesService.partialUpdate(id, updateDto);
     * }
     * ```
     */
    PartiallyUpdated: (description?: string) =>
      applyDecorators(
        ApiResponse({
          status: 200,
          description: description ?? 'Resource partially updated successfully',
          type: responseType,
        }),
        errors.BadRequest(),
        errors.Unauthorized(),
        errors.NotFound(),
        errors.UnprocessableEntity()
      ),

    Deleted: (description?: string) =>
      applyDecorators(
        ApiResponse({
          status: 200,
          description: description ?? 'Resource deleted successfully',
        }),
        errors.Unauthorized(),
        errors.NotFound(),
        errors.Conflict('Resource cannot be deleted')
      ),

    /**
     * No Content response decorator
     * Use for operations that complete successfully but return no content body
     * Commonly used for DELETE operations or idempotent operations
     *
     * Returns HTTP 204 with no response body
     * Includes error responses for: 401 Unauthorized, 404 Not Found, 409 Conflict
     *
     * @example
     * ```typescript
     * @Delete(':id')
     * @Roles(Role.ADMIN)
     * @ApiBearerAuth('JWT-auth')
     * @TimeSlotApiResponses.NoContent('Time slot deleted')
     * async remove(@Param('id') id: string): Promise<void> {
     *   await this.timeSlotsService.remove(id);
     * }
     * ```
     */
    NoContent: (description?: string) =>
      applyDecorators(
        ApiResponse({
          status: 204,
          description: description ?? 'Operation completed successfully with no content',
        }),
        errors.Unauthorized(),
        errors.NotFound(),
        errors.Conflict('Operation cannot be completed due to conflict')
      ),
  };
}

/**
 * Singleton API Response Decorator Factory
 *
 * A cached factory that creates typed API response decorators on-demand.
 * This eliminates the need to export decorator objects from each DTO file.
 *
 * Benefits:
 * - Reduces boilerplate in DTO files
 * - Keeps API response concerns in controllers where they're used
 * - Caches decorators for performance (same DTO returns same decorator instance)
 * - Cleaner separation of concerns
 *
 * @example
 * ```typescript
 * // In controller file - no need to import pre-created decorators
 * import { ApiResponses } from '@common';
 * import { UserResponseDto } from './dto/user.dto';
 *
 * @Controller('users')
 * export class UsersController {
 *   @Get(':id')
 *   @ApiResponses.for(UserResponseDto).Found('User retrieved successfully')
 *   async findOne(@Param('id') id: string) {
 *     return this.usersService.findOne(id);
 *   }
 *
 *   @Get()
 *   @ApiResponses.for(UserResponseDto).FoundMany('Users retrieved successfully')
 *   async findAll() {
 *     return this.usersService.findAll();
 *   }
 * }
 * ```
 */
class ApiResponsesFactory {
  private cache = new Map<Type<unknown>, TypedApiDecorators<Type<unknown>>>();

  /**
   * Get or create typed API decorators for a DTO class
   * Results are cached for performance
   *
   * @param dtoClass - The DTO class to create decorators for
   * @returns TypedApiDecorators bound to the DTO type
   */
  for<T extends Type<unknown>>(dtoClass: T): TypedApiDecorators<T> {
    if (!this.cache.has(dtoClass)) {
      this.cache.set(dtoClass, createTypedApiDecorators(dtoClass));
    }
    return this.cache.get(dtoClass) as TypedApiDecorators<T>;
  }

  /**
   * Clear the cache (useful for testing)
   */
  clearCache(): void {
    this.cache.clear();
  }
}

/**
 * Singleton instance of the API Response Decorator Factory
 *
 * Use this to create typed API response decorators on-demand in controllers
 * without needing to export decorator objects from DTO files.
 *
 * @example
 * ```typescript
 * import { ApiResponses } from '@common';
 * import { SessionResponseDto } from './dto/session.dto';
 *
 * @Get(':id')
 * @ApiResponses.for(SessionResponseDto).Found('Session retrieved')
 * async findOne(@Param('id') id: string) { ... }
 * ```
 */
export const ApiResponses = new ApiResponsesFactory();
