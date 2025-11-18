import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsBoolean, IsEmail, IsOptional, IsString } from 'class-validator';
import { createTypedApiDecorators } from '../../../common';

export class SendBookingConfirmationDto {
  @ApiProperty()
  @IsString()
  sessionId: string;
}
export class SendEmailDto {
  @ApiProperty()
  @IsEmail()
  to: string;

  @ApiProperty()
  @IsString()
  subject: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  text?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  html?: string;
}
export class MailResponse {
  @ApiProperty()
  @IsBoolean()
  success: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsArray()
  errors?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsArray()
  message_ids?: string[];
}

export const MailApiResponse = createTypedApiDecorators(MailResponse);
