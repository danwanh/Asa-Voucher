import { api } from "./api";
import type { Order, OrderItem } from "@/types";
import type { VoucherProduct } from "@/types";

export interface OrderItemWithVoucher extends OrderItem {
  voucher_products?: Pick<VoucherProduct, "partner_id"> & Partial<VoucherProduct>;
}

export interface OrderWithItems extends Order {
  order_items: OrderItemWithVoucher[];
}

interface ApiEnvelope<T> {
  success: boolean;
  data: T;
  message: string;
}

export async function listOrders() {
  const { data } = await api.get<ApiEnvelope<OrderWithItems[]>>("/orders");
  return data.data;
}

export async function getOrder(id: string) {
  const { data } = await api.get<ApiEnvelope<OrderWithItems>>(`/orders/${id}`);
  return data.data;
}

export async function cancelOrder(id: string) {
  const { data } = await api.patch<ApiEnvelope<OrderWithItems>>(`/orders/${id}/cancel`);
  return data.data;
}
