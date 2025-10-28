export interface MockTimeSlot {
  id: string;
  dateTime: Date;
  durationMin: number;
  isAvailable: boolean;
  coachId: string;
  createdAt: Date;
  updatedAt: Date;
}
