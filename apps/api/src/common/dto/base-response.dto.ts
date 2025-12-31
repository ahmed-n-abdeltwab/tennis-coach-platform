import { ApiProperty, ApiPropertyOptional, OmitType } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsDate, IsString } from 'class-validator';
export class BaseResponseDto {
  @ApiProperty()
  @IsString()
  id!: string;

  @ApiProperty({ type: Date, format: 'date-time' })
  @IsDate()
  @Type(() => Date)
  createdAt!: Date;

  @ApiProperty({ type: Date, format: 'date-time' })
  @IsDate()
  @Type(() => Date)
  updatedAt!: Date;
}

export class PaginationMetaDto {
  @ApiProperty()
  page!: number;

  @ApiProperty()
  limit!: number;

  @ApiProperty()
  total!: number;

  @ApiProperty()
  totalPages!: number;

  @ApiProperty()
  hasNext!: boolean;

  @ApiProperty()
  hasPrev!: boolean;
}

export class PaginatedResponseDto<T> {
  @ApiProperty({ isArray: true })
  data!: T[];

  @ApiProperty({ type: PaginationMetaDto })
  meta!: PaginationMetaDto;
}

export class ErrorResponseDto {
  @ApiProperty()
  statusCode!: number;

  @ApiProperty()
  message!: string;

  @ApiPropertyOptional()
  error?: string;

  @ApiProperty()
  timestamp!: string;

  @ApiProperty()
  path!: string;
}

export class ValidationErrorResponseDto extends OmitType(ErrorResponseDto, ['message']) {
  @ApiProperty({ type: [String] })
  message: string[] = [];
}

export class OperationStatusDto {
  @ApiProperty({ description: 'Unique identifier for the operation' })
  @IsString()
  operationId!: string;

  @ApiProperty({
    enum: ['pending', 'processing', 'completed', 'failed'],
    description: 'Current status of the operation',
  })
  @IsString()
  status!: 'pending' | 'processing' | 'completed' | 'failed';

  @ApiPropertyOptional({
    description: 'URL to check operation status',
  })
  @IsString()
  statusUrl?: string;

  @ApiPropertyOptional({
    type: String,
    format: 'date-time',
    description: 'Estimated completion time',
  })
  @IsDate()
  @Type(() => Date)
  estimatedCompletion?: Date;
}

export class BulkOperationErrorDto {
  @ApiProperty({ description: 'Identifier of the failed item' })
  @IsString()
  id!: string;

  @ApiProperty({ description: 'Error message' })
  @IsString()
  error!: string;

  @ApiPropertyOptional({ description: 'Error code' })
  @IsString()
  code?: string;
}

export class BulkOperationResultDto {
  @ApiProperty({ description: 'Number of successfully processed items' })
  success!: number;

  @ApiProperty({ description: 'Number of failed items' })
  failed!: number;

  @ApiPropertyOptional({
    type: [BulkOperationErrorDto],
    description: 'Details of failed operations',
  })
  @Type(() => BulkOperationErrorDto)
  errors?: BulkOperationErrorDto[];
}
