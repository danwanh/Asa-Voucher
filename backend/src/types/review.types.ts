export interface ReviewRow {
  id: string;
  voucher_product_id: string;
  user_id: string;
  issued_voucher_id: string;
  rating: number;
  comment: string | null;
  media_urls: string[] | null;
  is_published: boolean;
  created_at: string;
  updated_at: string;
}

export interface ReviewListFilter {
  voucherProductId?: string;
  onlyPublished: boolean;
  page: number;
  limit: number;
}
