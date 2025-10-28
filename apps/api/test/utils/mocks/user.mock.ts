import { UserType } from '@common';

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
  role: UserType.USER;
  isActive: boolean;
  isOnline: boolean;
}
