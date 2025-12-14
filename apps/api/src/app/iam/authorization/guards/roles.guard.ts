import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Role } from '@prisma/client';

import { REQUEST_USER_KEY } from '../../iam.constants';
import { ROLES_KEY } from '../decorators/roles.decorator';

import { JwtPayload } from './../../interfaces/jwt.types';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredRoles = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user: JwtPayload = request[REQUEST_USER_KEY];

    if (!user) {
      return false;
    }

    const hasRole = requiredRoles.some(role => user.role === role);
    return hasRole;
  }
}
