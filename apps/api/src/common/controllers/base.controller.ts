import { applyDecorators } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

export function ApiController(tag: string) {
  return applyDecorators(ApiTags(tag));
}

export function ApiProtectedEndpoint() {
  return applyDecorators(ApiBearerAuth());
}

// Common query parameters
export class PaginationQueryDto {
  page?: number = 1;
  limit?: number = 10;
}

export class DateRangeQueryDto {
  startDate?: string;
  endDate?: string;
}
