import { api } from "./api";
import { useAuthStore } from "@/stores/authStore";
import type {
  CheckVoucherResult,
  Complaint,
  IssuedVoucher,
  Order,
  Review,
} from "@/types";

type ApiData<T> = { data: T };

function data<T>(response: { data: ApiData<T> }) {
  return response.data.data;
}

type BackendRecord = Record<string, any>;

function strings(value: unknown) {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
}

function mapFeedback(value: BackendRecord): {
  review?: Review;
  complaint?: Complaint;
} {
  const reviewValue = Array.isArray(value.reviews) ? value.reviews[0] : value.reviews;
  const complaintValue = value.complaints?.[0];
  return {
    review: reviewValue
      ? {
          id: String(reviewValue.id),
          issuedVoucherId: String(value.id),
          rating: Number(reviewValue.rating),
          comment: reviewValue.comment ?? null,
          mediaUrls: strings(reviewValue.media_urls),
          createdAt: reviewValue.created_at,
        }
      : undefined,
    complaint: complaintValue
      ? {
          id: String(complaintValue.id),
          issuedVoucherId: String(value.id),
          reason: String(complaintValue.reason),
          description: String(complaintValue.description ?? ""),
          evidenceUrls: strings(complaintValue.evidence_urls),
          status: complaintValue.status,
          resolutionNote: complaintValue.resolution_note,
          resolutionTypes: strings(complaintValue.resolution_types),
          createdAt: complaintValue.created_at,
          resolvedAt: complaintValue.resolved_at,
        }
      : undefined,
  };
}

function mapMineVoucher(value: BackendRecord): Order {
  const item = value.order_items ?? {};
  const order = item.orders ?? {};
  const product = value.voucher_products ?? {};
  const feedback = mapFeedback(value);
  const issuedVoucher: IssuedVoucher = {
    id: String(value.id),
    code: String(value.voucher_code ?? ""),
    qrPayload: String(value.qr_code_payload ?? ""),
    status: value.status,
    expiredDate: value.expired_date,
    ...feedback,
  };
  const orderId = String(order.id ?? item.order_id ?? value.id);
  return {
    id: orderId,
    userId: String(order.user_id ?? value.owner_id),
    voucherId: String(value.voucher_product_id),
    voucherTitle: String(product.name ?? "Voucher"),
    partnerName: String(
      product.partners?.business_name ?? product.partner_id ?? "",
    ),
    amount: Number(item.subtotal ?? order.total_amount ?? 0),
    status: order.status,
    paymentStatus: order.status === "refunded" ? "refunded" : "paid",
    paymentMethod: String(order.payment_method ?? ""),
    createdAt: order.created_at ?? value.issued_date,
    code: issuedVoucher.code,
    qrPayload: issuedVoucher.qrPayload,
    recipientId: String(order.recipient_id ?? value.owner_id),
    isGift: Boolean(order.is_gift),
    giverName: order.users?.full_name,
    items: [
      {
        id: String(item.id ?? `${orderId}-item`),
        voucherId: String(value.voucher_product_id),
        quantity: Number(item.quantity ?? 1),
        unitPrice: Number(item.unit_price ?? 0),
        subtotal: Number(item.subtotal ?? 0),
        voucherTitle: String(product.name ?? "Voucher"),
        partnerName: String(
          product.partners?.business_name ?? product.partner_id ?? "",
        ),
        issuedVouchers: [issuedVoucher],
      },
    ],
  };
}

type MineVoucherPage = { items: Order[]; page: number; limit: number; total: number; totalPages: number };
const mineCache = new Map<string, { value: MineVoucherPage; expiresAt: number }>();
let mineCacheVersion = 0;

export const issuedVoucherService = {
  async listMine(params?: { page?: number; limit?: number; status?: string }) {
    const requestParams = { page: params?.page ?? 1, limit: params?.limit ?? 20, status: params?.status };
    const key = `${useAuthStore.getState().user?.id ?? "anonymous"}:${JSON.stringify(requestParams)}`;
    const cached = mineCache.get(key);
    if (cached && cached.expiresAt > Date.now()) return cached.value;
    if (cached) mineCache.delete(key);
    const requestVersion = mineCacheVersion;
    const response = await api.get<ApiData<{ items: BackendRecord[]; pagination: { page: number; limit: number; total: number; total_pages: number } }>>(
      "/issued-vouchers",
      { params: requestParams },
    );
    const result = data<{ items: BackendRecord[]; pagination: { page: number; limit: number; total: number; total_pages: number } }>(response)
    const value = {
      items: result.items.map(mapMineVoucher),
      page: result.pagination.page,
      limit: result.pagination.limit,
      total: result.pagination.total,
      totalPages: result.pagination.total_pages,
    }
    if (requestVersion === mineCacheVersion) mineCache.set(key, { value, expiresAt: Date.now() + 15_000 });
    return value;
  },

  invalidateMine() {
    mineCacheVersion += 1;
    mineCache.clear();
  },

  async check(codeOrPayload: string) {
    let payload: { voucher_code?: string; qr_code_payload?: string } = {
      voucher_code: codeOrPayload,
    };
    try {
      const url = new URL(codeOrPayload);
      const voucherCode = url.searchParams.get("code");
      payload = voucherCode
        ? { voucher_code: voucherCode }
        : { qr_code_payload: codeOrPayload };
    } catch {
      // Manual input is a voucher code
    }
    const response = await api.post<ApiData<CheckVoucherResult>>(
      "/issued-vouchers/check",
      payload,
    );
    return data<CheckVoucherResult>(response);
  },

  async confirm(voucherCode: string, note?: string) {
    const response = await api.post<
      ApiData<{ message: string; issued_voucher: any; usage: any }>
    >("/issued-vouchers/confirm", { voucher_code: voucherCode, note });
    return data(response);
  },

  async generateTestCode(voucherId: string) {
    const response = await api.post<ApiData<{ test_code: string; qr_code_payload: string }>>(
      `/voucher-products/${voucherId}/test-code`,
    );
    return data(response);
  },
};

export type VoucherUsageItem = {
  id: string
  voucherCode: string
  voucherTitle: string
  customerName: string
  branchName: string
  staffName: string
  verifiedAt: string
  status: string
}

export type VoucherUsagePage = {
  items: VoucherUsageItem[]
  page: number
  limit: number
  total: number
  totalPages: number
}

export const voucherUsageService = {
  async list(params?: { page?: number; limit?: number }): Promise<VoucherUsagePage> {
    const response = await api.get<ApiData<{ items: VoucherUsageItem[]; pagination: { page: number; limit: number; total: number; total_pages: number } }>>(
      "/voucher-usages",
      { params: { page: params?.page ?? 1, limit: params?.limit ?? 100 } },
    )
    const result = data<{ items: VoucherUsageItem[]; pagination: { page: number; limit: number; total: number; total_pages: number } }>(response)
    return {
      items: result.items,
      page: result.pagination.page,
      limit: result.pagination.limit,
      total: result.pagination.total,
      totalPages: result.pagination.total_pages,
    }
  },
};
