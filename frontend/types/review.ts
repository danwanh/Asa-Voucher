export interface Review {
  id: string;
  voucher_product_id: string;
  user_id: string;
  issued_voucher_id: string;
  rating: number;
  comment?: string | null;
  media_urls?: unknown;
  is_published: boolean;
  created_at: string;
  updated_at: string;
}

export interface ReviewResponse {
  id: string;
  review_id: string;
  responded_by: string;
  content: string;
  created_at: string;
}
