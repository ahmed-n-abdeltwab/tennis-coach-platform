import { Role } from '@prisma/client';

export interface MockAccount {
  id: string;
  email: string;
  name: string;
  passwordHash: string;
  gender?: string;
  age?: number;
  height?: number;
  weight?: number;
  bio?: string;
  credentials?: string;
  philosophy?: string;
  profileImage?: string;
  disability: boolean;
  disabilityCause?: string;
  country?: string;
  address?: string;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
  role: Role;
  isActive: boolean;
  isOnline: boolean;
}

// Legacy alias for backward compatibility
export type MockUser = MockAccount;
