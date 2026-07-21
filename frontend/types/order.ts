export type OrderStatus = "pending" | "completed" | "cancelled" | "used";
export type PaymentStatus = "pending" | "paid" | "failed" | "refunded";

export interface OrderItem {
  id: string;
  order_id: string;
  voucher_product_id: string;
  quantity: number;
  unit_price: number;
  snapped_original_price: number;
  snapped_selling_price: number;
  snapped_discount_rate: number;
  subtotal: number;
  created_at: string;
}

export interface Order {
  id: string;
  order_code: string;
  user_id: string;
  subtotal: number;
  discount_amount: number;
  total_amount: number;
  payment_method: string;
  payment_status: PaymentStatus;
  status: OrderStatus;
  note?: string | null;
  created_at: string;
  updated_at: string;
  order_items?: OrderItem[];
}

export interface Payment {
  id: string;
  order_id: string;
  method: string;
  amount: number;
  status: PaymentStatus;
  transaction_ref?: string | null;
  gateway_response?: string | null;
  paid_at?: string | null;
  created_at: string;
}
