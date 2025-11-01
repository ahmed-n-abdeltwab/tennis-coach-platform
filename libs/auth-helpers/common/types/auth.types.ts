import { AdminRole, UserRole } from '@prisma/client';

export const Role = { ...UserRole, ...AdminRole } as const;

export type Role = (typeof Role)[keyof typeof Role];
