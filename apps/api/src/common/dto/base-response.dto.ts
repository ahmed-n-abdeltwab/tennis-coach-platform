import { ApiProperty, OmitType } from '@nestjs/swagger';
export class BaseResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  createdAt!: Date | string;

  @ApiProperty()
  updatedAt!: Date | string;
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

  @ApiProperty({ required: false })
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
