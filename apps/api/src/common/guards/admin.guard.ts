import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { UserType } from '../enums/auth.enums';

@Injectable()
export class AdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    // Check if user is a coach and has isAdmin flag
    if (user.userType === UserType.COACH && user.isAdmin) {
      return true;
    }

    throw new ForbiddenException('Admin access required');
  }
}
