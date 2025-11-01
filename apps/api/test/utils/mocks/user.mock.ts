import { UserRole } from '@prisma/client';

export interface MockUser {
  id: string;
  email: string;
  name: string;
  passwordHash: string;
  gender?: string;
  age?: number;
  height?: number;
  weight?: number;
  disability: boolean;
  disabilityCause?: string;
  country?: string;
  address?: string;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
  role: UserRole;
  isActive: boolean;
  isOnline: boolean;
}
