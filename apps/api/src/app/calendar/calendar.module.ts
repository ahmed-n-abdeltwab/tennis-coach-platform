import { Module } from '@nestjs/common';

import { SessionsModule } from '../sessions/sessions.module';

import { CalendarController } from './calendar.controller';
import { CalendarService } from './calendar.service';

@Module({
  imports: [SessionsModule],
  controllers: [CalendarController],
  providers: [CalendarService],
  exports: [CalendarService],
})
export class CalendarModule {}
