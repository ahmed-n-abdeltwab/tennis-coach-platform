import { applyDecorators, Type } from '@nestjs/common';
import { ApiResponse } from '@nestjs/swagger';
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

// Factory function that creates typed decorators for a specific DTO
/**
 * @deprecated Use {@link userLogin} instead. This will be removed in a future release.
 */
export function createTypedApiDecorators<T extends Type<any>>(responseType: T) {
  return {
    // Auth endpoints
    AuthSuccess: (description?: string) =>
      applyDecorators(
        ApiResponse({
          status: 200,
          description: description || 'Authentication successful',
          type: responseType,
        }),
        ApiResponse({
          status: 401,
          description: 'Invalid credentials',
          type: ErrorResponseDto,
        }),
        ApiResponse({
          status: 409,
          description: 'User already exists',
          type: ErrorResponseDto,
        }),
        ApiResponse({
          status: 400,
          description: 'Bad Request - Validation failed',
          type: ValidationErrorResponseDto,
        })
      ),

    // CRUD operations
    Created: (description?: string) =>
      applyDecorators(
        ApiResponse({
          status: 201,
          description: description || 'Resource created successfully',
          type: responseType,
        }),
        ApiResponse({
          status: 400,
          description: 'Bad Request - Validation failed',
          type: ValidationErrorResponseDto,
        }),
        ApiResponse({
          status: 401,
          description: 'Unauthorized',
          type: ErrorResponseDto,
        })
      ),

    Found: (description?: string) =>
      applyDecorators(
        ApiResponse({
          status: 200,
          description: description || 'Resource retrieved successfully',
          type: responseType,
        }),
        ApiResponse({
          status: 404,
          description: 'Resource not found',
          type: ErrorResponseDto,
        })
      ),

    FoundMany: (description?: string) =>
      applyDecorators(
        ApiResponse({
          status: 200,
          description: description || 'Resources retrieved successfully',
          type: [responseType], // Array type
        }),
        ApiResponse({
          status: 400,
          description: 'Bad Request - Invalid query parameters',
          type: ValidationErrorResponseDto,
        })
      ),

    Updated: (description?: string) =>
      applyDecorators(
        ApiResponse({
          status: 200,
          description: description || 'Resource updated successfully',
          type: responseType,
        }),
        ApiResponse({
          status: 400,
          description: 'Bad Request - Validation failed',
          type: ValidationErrorResponseDto,
        }),
        ApiResponse({
          status: 401,
          description: 'Unauthorized',
          type: ErrorResponseDto,
        }),
        ApiResponse({
          status: 404,
          description: 'Resource not found',
          type: ErrorResponseDto,
        })
      ),

    Deleted: (description?: string) =>
      applyDecorators(
        ApiResponse({
          status: 200,
          description: description || 'Resource deleted successfully',
        }),
        ApiResponse({
          status: 401,
          description: 'Unauthorized',
          type: ErrorResponseDto,
        }),
        ApiResponse({
          status: 404,
          description: 'Resource not found',
          type: ErrorResponseDto,
        }),
        ApiResponse({
          status: 409,
          description: 'Conflict - Resource cannot be deleted',
          type: ErrorResponseDto,
        })
      ),
  };
}

// Example usage - create typed decorators for specific DTOs
// This would be done in each module's DTO file or controller file

/*
// In auth.dto.ts or auth.controller.ts
export const AuthApiResponses = createTypedApiDecorators(AuthResponseDto);

// In user.dto.ts or users.controller.ts
export const UserApiResponses = createTypedApiDecorators(UserResponseDto);

// In time-slot.dto.ts or time-slots.controller.ts
export const TimeSlotApiResponses = createTypedApiDecorators(TimeSlotResponseDto);

// Usage in controllers:
@Post('login')
@AuthApiResponses.AuthSuccess('User logged in successfully')
async login(@Body() loginDto: LoginDto) {
  return this.authService.login(loginDto);
}

@Get(':id')
@UserApiResponses.Found('User profile retrieved')
async getUser(@Param('id') id: string) {
  return this.userService.findOne(id);
}

@Get()
@TimeSlotApiResponses.FoundMany('Available time slots')
async getTimeSlots(@Query() query: GetTimeSlotsQuery) {
  return this.timeSlotsService.findAvailable(query);
}
*/
