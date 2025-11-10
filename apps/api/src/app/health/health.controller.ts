import { Controller, Get } from '@nestjs/common';
import { ApiBadRequestResponse, ApiCreatedResponse, ApiOperation, ApiTags } from '@nestjs/swagger';

import { ErrorResponseDto } from '../../common';

import { CheckHealthDto, LivenessHealthDto, ReadinessHealthDto } from './dto/health.dto';
import { HealthService } from './health.service';

@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get()
  @ApiOperation({ summary: 'Health check endpoint' })
  @ApiCreatedResponse({
    description: 'Health successfully checked',
    type: CheckHealthDto,
  })
  @ApiBadRequestResponse({
    description: 'Invalid input data',
    type: ErrorResponseDto,
  })
  async check(): Promise<CheckHealthDto> {
    return this.healthService.check();
  }

  @Get('liveness')
  @ApiOperation({ summary: 'Server liveness probe' })
  @ApiCreatedResponse({
    description: 'Server liveness',
    type: LivenessHealthDto,
  })
  @ApiBadRequestResponse({
    description: 'Invalid input data',
    type: ErrorResponseDto,
  })
  liveness(): LivenessHealthDto {
    return this.healthService.liveness();
  }

  @Get('readiness')
  @ApiOperation({ summary: 'Database readiness probe' })
  @ApiCreatedResponse({
    description: 'Database is ready',
    type: ReadinessHealthDto,
  })
  @ApiBadRequestResponse({
    description: 'Invalid input data',
    type: ErrorResponseDto,
  })
  async readiness(): Promise<ReadinessHealthDto> {
    return this.healthService.readiness();
  }
}
