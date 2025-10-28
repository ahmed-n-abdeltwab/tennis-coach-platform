export interface MockPayment {
  id: string;
  sessionId: string;
  orderId: string;
  amount: number;
  status: 'pending' | 'completed' | 'failed' | 'cancelled';
  paypalOrderId?: string;
  captureId?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface MockPayPalOrder {
  id: string;
  status: string;
  links: Array<{
    href: string;
    rel: string;
    method: string;
  }>;
}

export interface MockPayPalCapture {
  id: string;
  status: string;
  amount: {
    currency_code: string;
    value: string;
  };
}
