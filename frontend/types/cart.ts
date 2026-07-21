export interface CartItem {
  id: string;
  cart_id: string;
  voucher_product_id: string;
  quantity: number;
  created_at: string;
  updated_at: string;
}

export interface Cart {
  id: string;
  user_id: string;
  created_at: string;
  updated_at: string;
  cart_items?: CartItem[];
}
