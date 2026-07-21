export interface AuthenticationLogRow {
  id: string;
  user_id: string | null;
  action: string;
  status: string;
  ip_address: string | null;
  user_agent: string | null;
  occurred_at: string;
}

export interface AdminLogRow {
  id: string;
  admin_id: string;
  target_user_id: string | null;
  target_partner_id: string | null;
  target_voucher_id: string | null;
  action: string;
  description: string | null;
  occurred_at: string;
}

export interface OrderLogRow {
  id: string;
  order_id: string;
  user_id: string;
  action: string;
  description: string | null;
  occurred_at: string;
}

export interface PaymentLogRow {
  id: string;
  payment_id: string;
  order_id: string;
  user_id: string;
  action: string;
  status: string;
  amount: number;
  occurred_at: string;
}
