import { Global, Module } from '@nestjs/common';

import { APMService } from './apm/apm.service';
import { TelemetryProvider } from './apm/providers/telemetry.provider';
import { APMInterceptor } from './interceptors/apm.interceptor';
import { MonitoringController } from './monitoring.controller';

/**
 * APM Module for Application Performance Monitoring
 *
 * This module provides APM services globally across the application.
 * It's marked as @Global to make APMService available without explicit imports.
 */

@Global()
@Module({
  controllers: [MonitoringController],
  providers: [
    {
      provide: 'ITelemetryProvider',
      useClass: TelemetryProvider,
    },
    APMService,
    APMInterceptor,
  ],
  exports: [APMService, APMInterceptor],
})
export class APMModule {}
