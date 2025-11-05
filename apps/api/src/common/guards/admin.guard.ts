import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Role } from '@prisma/client';

@Injectable()
export class AdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    // Check if user has ADMIN or COACH role with isAdmin flag
    if (user.role === Role.ADMIN || (user.role === Role.COACH && user.isAdmin)) {
      return true;
    }

    throw new ForbiddenException('Admin access required');
  }
}
