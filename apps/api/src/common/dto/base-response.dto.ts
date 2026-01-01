import { ApiProperty, ApiPropertyOptional, OmitType } from '@nestjs/swagger';

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
