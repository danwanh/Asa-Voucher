import { api } from "./api";
import type { CartItem } from "@/types";
import type { VoucherProduct } from "@/types";

export interface CartItemWithVoucher extends CartItem {
  voucher_products: VoucherProduct;
}

export interface CartResponse {
  id: string;
  user_id: string;
  items: CartItemWithVoucher[];
}

interface ApiEnvelope<T> {
  success: boolean;
  data: T;
  message: string;
}

export async function getCart() {
  const { data } = await api.get<ApiEnvelope<CartResponse>>("/cart");
  return data.data;
}

export async function addCartItem(voucher_product_id: string, quantity = 1) {
  const { data } = await api.post<ApiEnvelope<CartItemWithVoucher>>("/cart/items", {
    voucher_product_id,
    quantity
  });
  return data.data;
}

export async function updateCartItem(id: string, quantity: number) {
  const { data } = await api.patch<ApiEnvelope<CartItemWithVoucher>>(`/cart/items/${id}`, { quantity });
  return data.data;
}

export async function removeCartItem(id: string) {
  await api.delete(`/cart/items/${id}`);
}

export async function clearCart() {
  await api.delete("/cart/items");
}

export interface CheckoutInput {
  cart_item_ids?: string[];
  payment_method: "momo" | "vnpay" | "zalopay" | "bank_transfer";
  note?: string;
}

export async function checkout(input: CheckoutInput) {
  const { data } = await api.post<ApiEnvelope<{ id: string; order_code: string }>>("/cart/checkout", input);
  return data.data;
}
