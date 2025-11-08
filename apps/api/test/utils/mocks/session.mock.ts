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
  createdAt: Date;
  updatedAt: Date;

  // Relations
  userId: string;
  coachId: string;
  bookingTypeId: string;
  timeSlotId: string;
  discountId?: string;
}
