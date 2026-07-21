import { api } from "./api";
import type { VoucherProduct } from "@/types";

export interface VoucherListItem extends VoucherProduct {
  partner_name?: string;
  category_name?: string;
  rating?: number;
  review_count?: number;
}

interface ApiEnvelope<T> {
  success: boolean;
  data: T;
  message: string;
}

interface PaginatedResult<T> {
  items: T[];
  count: number;
  page: number;
  limit: number;
}

export async function listVoucherProducts(params?: Record<string, string | number>) {
  const { data } = await api.get<ApiEnvelope<PaginatedResult<VoucherListItem>>>("/voucher-products", { params });
  return data.data;
}

export async function getVoucherProduct(id: string) {
  const { data } = await api.get<ApiEnvelope<VoucherListItem>>(`/voucher-products/${id}`);
  return data.data;
}

