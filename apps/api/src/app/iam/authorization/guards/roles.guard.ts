import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Role } from '@prisma/client';
import { JwtPayload } from './../../interfaces/jwt.types';

import { REQUEST_USER_KEY } from '../../iam.constants';
import { ROLES_KEY } from '../decorators/roles.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredRoles = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    console.log('[RolesGuard] Required roles:', requiredRoles);

    if (!requiredRoles) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user: JwtPayload = request[REQUEST_USER_KEY];

    console.log('[RolesGuard] User from request:', user);
    console.log(
      '[RolesGuard] Request keys:',
      Object.keys(request).filter(k => !k.startsWith('_'))
    );

    if (!user) {
      console.log('[RolesGuard] No user found, denying access');
      return false;
    }

    const hasRole = requiredRoles.some(role => user.role === role);
    console.log('[RolesGuard] User role:', user.role, 'Has required role:', hasRole);
    return hasRole;
  }
}
