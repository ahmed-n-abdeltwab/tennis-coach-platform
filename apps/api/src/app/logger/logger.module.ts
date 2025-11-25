import { Global, Module } from '@nestjs/common';

import { AppLoggerService } from './app-logger.service';

/**
 * Logger module that provides AppLoggerService globally
 */
@Global()
@Module({
  providers: [AppLoggerService],
  exports: [AppLoggerService],
})
export class LoggerModule {}
