import { Role } from '@prisma/client';

export interface MockAccount {
  id: string;
  email: string;
  name: string;
  passwordHash: string;

  // Profile details
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

  // State
  createdAt: Date;
  updatedAt: Date;
  role: Role;
  isActive: boolean;
  isOnline: boolean;
}
