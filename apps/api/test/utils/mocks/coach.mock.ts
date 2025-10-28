export interface MockCoach {
  id: string;
  email: string;
  name: string;
  passwordHash: string;
  isAdmin: boolean;
  isOnline: boolean;
  isActive: boolean;
  bio?: string;
  credentials?: string;
  philosophy?: string;
  profileImage?: string;
  createdAt: Date;
  updatedAt: Date;
}
