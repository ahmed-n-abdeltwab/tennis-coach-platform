import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { AdminRole } from '@prisma/client';

@Injectable()
export class AdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    // Check if user is a coach and has isAdmin flag
    if (user.role in AdminRole && user.isAdmin) {
      return true;
    }

    throw new ForbiddenException('Admin access required');
  }
}
