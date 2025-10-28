export interface MockSession {
  id: string;
  dateTime: Date;
  durationMin: number;
  price: number;
  isPaid: boolean;
  status: string;
  notes?: string;
  paymentId?: string;
  discountCode?: string;
  calendarEventId?: string;
  userId: string;
  coachId: string;
  bookingTypeId: string;
  timeSlotId: string;
  discountId?: string;
  createdAt: Date;
  updatedAt: Date;
}
