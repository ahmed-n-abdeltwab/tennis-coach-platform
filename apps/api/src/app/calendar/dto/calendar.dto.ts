import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class CreateCalendarEventDto {
  @ApiProperty()
  @IsString()
  sessionId: string;
}
