import { ApiResponse } from '@nestjs/swagger';

import { ErrorResponseDto, ValidationErrorResponseDto } from '../dto/base-response.dto';

// Individual error response decorators for reuse across modules
export const ApiForbiddenResponse = (description?: string) => {
  return ApiResponse({
    status: 403,
    description: description ?? 'Forbidden - Insufficient permissions',
    type: ErrorResponseDto,
  });
};

export const ApiNotFoundResponse = (description?: string) => {
  return ApiResponse({
    status: 404,
    description: description ?? 'Resource not found',
    type: ErrorResponseDto,
  });
};

export const ApiConflictResponse = (description?: string) => {
  return ApiResponse({
    status: 409,
    description: description ?? 'Conflict - Resource already exists or cannot be modified',
    type: ErrorResponseDto,
  });
};

export const ApiUnauthorizedResponse = (description?: string) => {
  return ApiResponse({
    status: 401,
    description: description ?? 'Unauthorized - Invalid or missing token',
    type: ErrorResponseDto,
  });
};

export const ApiBadRequestResponse = (description?: string) => {
  return ApiResponse({
    status: 400,
    description: description ?? 'Bad Request - Validation failed',
    type: ValidationErrorResponseDto,
  });
};
