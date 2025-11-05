import { Role } from '@prisma/client';

// MockCoach is now an alias for MockAccount with COACH role
// Import MockAccount from user.mock.ts for the full interface
export interface MockCoach {
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
