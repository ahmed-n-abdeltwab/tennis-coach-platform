import { ApiProperty, ApiPropertyOptional, OmitType } from '@nestjs/swagger';
import { IsNumber, IsString } from 'class-validator';

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

/**
 * Generic message response DTO for simple success messages
 */
export class SuccessMessageDto {
  @ApiProperty({ description: 'Success message', example: 'Operation completed successfully' })
  @IsString()
  message: string;
}

/**
 * Response DTO for operations that return a count
 */
export class CountResponseDto {
  @ApiProperty({ description: 'Count of affected items', example: 5 })
  @IsNumber()
  count: number;
}

/**
 * Response DTO for marking items as read
 */
export class MarkedCountResponseDto {
  @ApiProperty({ description: 'Number of items marked', example: 10 })
  @IsNumber()
  markedCount: number;
}
