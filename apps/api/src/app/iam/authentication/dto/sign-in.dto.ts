import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

import { BaseAuthDto } from './base.dto';

export class LoginDto extends BaseAuthDto {}

export class LogoutResponseDto {
  @ApiProperty({ example: 'Logged out successfully' })
  @IsString()
  message: string;
}
