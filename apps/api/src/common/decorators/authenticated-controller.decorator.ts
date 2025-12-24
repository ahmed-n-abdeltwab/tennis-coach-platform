import { applyDecorators, SetMetadata } from '@nestjs/common';
import { ApiBearerAuth } from '@nestjs/swagger';
import { Role } from '@prisma/client';

import { ROLES_KEY } from '../../app/iam/authorization/decorators/roles.decorator';

export interface AuthenticatedControllerOptions {
  roles?: Role[];
}

/**
 * Decorator that marks a controller as requiring authentication.
 * Applies ApiBearerAuth for Swagger documentation and optionally sets default roles.
 *
 * Note: JwtAuthGuard and RolesGuard are already applied globally via APP_GUARD in IamModule.
 * This decorator provides:
 * 1. Swagger documentation (ApiBearerAuth)
 * 2. Optional default roles for all endpoints in the controller
 *
 * @param options - Optional configuration with default roles
 * @returns Combined decorators
 *
 * @example
 * // Basic usage - just adds Swagger auth documentation
 * @AuthenticatedController()
 * @Controller('sessions')
 * export class SessionsController {}
 *
 * @example
 * // With default roles for all endpoints
 * @AuthenticatedController({ roles: [Role.COACH] })
 * @Controller('coach-settings')
 * export class CoachSettingsController {}
 */
export function AuthenticatedController(options?: AuthenticatedControllerOptions) {
  const decorators = [ApiBearerAuth('JWT-auth')];

  if (options?.roles?.length) {
    decorators.push(SetMetadata(ROLES_KEY, options.roles));
  }

  return applyDecorators(...decorators);
}
