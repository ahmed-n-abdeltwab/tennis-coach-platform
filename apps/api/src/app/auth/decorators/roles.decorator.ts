import { SetMetadata } from '@nestjs/common';

export const ROLES_KEY = 'roles';
export const Roles = (...roles: ('user' | 'coach')[]) => SetMetadata(ROLES_KEY, roles);
