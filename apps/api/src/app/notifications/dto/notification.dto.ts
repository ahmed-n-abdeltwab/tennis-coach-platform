import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsEmail, IsOptional } from 'class-validator';

export class SendEmailDto {
  @ApiProperty()
  @IsEmail()
  to: string;

  @ApiProperty()
  @IsString()
  subject: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  text?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  html?: string;
}
