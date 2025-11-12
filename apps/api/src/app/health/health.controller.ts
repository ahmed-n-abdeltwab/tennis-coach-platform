import { applyDecorators, Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

import {
  CheckHealthApiResponses,
  CheckHealthDto,
  LivenessHealthApiResponses,
  LivenessHealthDto,
  ReadinessHealthApiResponses,
  ReadinessHealthDto,
} from './dto/health.dto';
import { HealthService } from './health.service';

@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get()
  @ApiOperation({ summary: 'Health check endpoint' })
  @applyDecorators(
    CheckHealthApiResponses.Found('Health successfully checked'),
    CheckHealthApiResponses.errors.BadRequest('Invalid input data')
  )
  async check(): Promise<CheckHealthDto> {
    return this.healthService.check();
  }

  @Get('liveness')
  @ApiOperation({ summary: 'Server liveness probe' })
  @applyDecorators(
    LivenessHealthApiResponses.Found('Server liveness successfully checked'),
    LivenessHealthApiResponses.errors.BadRequest('Invalid input data')
  )
  liveness(): LivenessHealthDto {
    return this.healthService.liveness();
  }

  @Get('readiness')
  @ApiOperation({ summary: 'Database readiness probe' })
  @applyDecorators(
    ReadinessHealthApiResponses.Found('Database successfully checked'),
    ReadinessHealthApiResponses.errors.BadRequest('Invalid input data')
  )
  async readiness(): Promise<ReadinessHealthDto> {
    return this.healthService.readiness();
  }
}
