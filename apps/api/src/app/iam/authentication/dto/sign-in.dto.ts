import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

import { BaseAuthDto } from './base.dto';

/**
 * Login request DTO.
 * Extends BaseAuthDto with email and password fields.
 */
export class LoginDto extends BaseAuthDto {}

/**
 * Logout response DTO.
 * Returns a success message after logout.
 */
export class LogoutResponseDto {
  @ApiProperty({
    example: 'Logged out successfully',
    description: 'Logout confirmation message',
  })
  @IsString()
  message: string;
}
