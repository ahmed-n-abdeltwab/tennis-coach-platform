export interface MockBookingType {
  id: string;
  name: string;
  description?: string;
  basePrice: number;
  isActive: boolean;
  coachId: string;
  createdAt: Date;
  updatedAt: Date;
}
