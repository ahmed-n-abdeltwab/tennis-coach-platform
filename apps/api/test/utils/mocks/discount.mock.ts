export interface MockDiscount {
  id: string;
  code: string;
  amount: number;
  expiry: Date;
  useCount: number;
  maxUsage: number;
  isActive: boolean;
  coachId: string;
  createdAt: Date;
  updatedAt: Date;
}
