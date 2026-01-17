import { ApiResponses } from '@common';
import { applyDecorators, Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

import { Auth } from '../iam/authentication/decorators/auth.decorator';
import { AuthType } from '../iam/authentication/enums/auth-type.enum';

import { CheckHealthDto, LivenessHealthDto, ReadinessHealthDto } from './dto/health.dto';
import { HealthService } from './health.service';

@ApiTags('health')
@Controller('health')
@Auth(AuthType.None)
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get()
  @ApiOperation({ summary: 'Health check endpoint' })
  @applyDecorators(
    ApiResponses.for(CheckHealthDto).Found('Health successfully checked'),
    ApiResponses.for(CheckHealthDto).errors.BadRequest('Invalid input data')
  )
  async check(): Promise<CheckHealthDto> {
    return this.healthService.check();
  }

  @Get('liveness')
  @ApiOperation({ summary: 'Server liveness probe' })
  @applyDecorators(
    ApiResponses.for(LivenessHealthDto).Found('Server liveness successfully checked'),
    ApiResponses.for(LivenessHealthDto).errors.BadRequest('Invalid input data')
  )
  liveness(): LivenessHealthDto {
    return this.healthService.liveness();
  }

  @Get('readiness')
  @ApiOperation({ summary: 'Database readiness probe' })
  @applyDecorators(
    ApiResponses.for(ReadinessHealthDto).Found('Database successfully checked'),
    ApiResponses.for(ReadinessHealthDto).errors.BadRequest('Invalid input data')
  )
  async readiness(): Promise<ReadinessHealthDto> {
    return this.healthService.readiness();
  }
}
