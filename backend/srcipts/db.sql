-- Tables are ordered by foreign-key dependency.

BEGIN;

CREATE TABLE public.users (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  email character varying NOT NULL,
  phone character varying,
  password_hash character varying NOT NULL,
  full_name character varying NOT NULL,
  avatar_url text,
  role character varying NOT NULL CHECK (role::text = ANY (ARRAY['buyer'::character varying, 'partner_owner'::character varying, 'partner_voucher_staff'::character varying, 'partner_store_staff'::character varying, 'admin_content'::character varying, 'admin_operations'::character varying, 'admin_security'::character varying]::text[])),
  dob date,
  gender character varying CHECK (gender::text = ANY (ARRAY['male'::character varying, 'female'::character varying, 'other'::character varying]::text[])),
  address text,
  city character varying,
  district character varying,
  is_active boolean NOT NULL DEFAULT true,
  is_verified boolean NOT NULL DEFAULT false,
  partner_branches_id uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  failed_login_attempts integer NOT NULL DEFAULT 0,
  locked_until timestamp with time zone,
  auth_version integer NOT NULL DEFAULT 0,
  partner_id uuid,
  CONSTRAINT users_pkey PRIMARY KEY (id)
);
CREATE TABLE public.refresh_tokens (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  token_hash text NOT NULL UNIQUE,
  expires_at timestamp with time zone NOT NULL,
  revoked_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT refresh_tokens_pkey PRIMARY KEY (id),
  CONSTRAINT refresh_tokens_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id)
);
CREATE TABLE public.authentication_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid,
  action character varying NOT NULL,
  status character varying NOT NULL,
  ip_address character varying,
  user_agent text,
  occurred_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT authentication_logs_pkey PRIMARY KEY (id),
  CONSTRAINT authentication_logs_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id)
);
CREATE TABLE public.partners (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  representative_user_id uuid NOT NULL,
  business_name character varying NOT NULL,
  business_code character varying NOT NULL UNIQUE,
  business_type character varying CHECK (business_type::text = ANY (ARRAY['restaurant'::character varying, 'spa'::character varying, 'entertainment'::character varying, 'hotel'::character varying, 'other'::character varying]::text[])),
  tax_number character varying UNIQUE,
  logo_url text,
  website_url text,
  description text,
  approval_status character varying NOT NULL DEFAULT 'pending'::character varying CHECK (approval_status::text = ANY (ARRAY['pending'::character varying, 'approved'::character varying, 'rejected'::character varying]::text[])),
  status character varying NOT NULL DEFAULT 'active'::character varying CHECK (status::text = ANY (ARRAY['active'::character varying, 'suspended'::character varying, 'closed'::character varying]::text[])),
  approved_by uuid,
  approved_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT partners_pkey PRIMARY KEY (id),
  CONSTRAINT partners_representative_user_id_fkey FOREIGN KEY (representative_user_id) REFERENCES public.users(id),
  CONSTRAINT partners_approved_by_fkey FOREIGN KEY (approved_by) REFERENCES public.users(id)
);
CREATE TABLE public.partner_branches (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  partner_id uuid NOT NULL,
  branch_name character varying NOT NULL,
  address text NOT NULL,
  city character varying NOT NULL,
  district character varying,
  phone character varying,
  latitude double precision,
  longitude double precision,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  ward character varying,
  CONSTRAINT partner_branches_pkey PRIMARY KEY (id),
  CONSTRAINT partner_branches_partner_id_fkey FOREIGN KEY (partner_id) REFERENCES public.partners(id)
);
CREATE TABLE public.categories (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  parent_id uuid,
  name character varying NOT NULL,
  slug character varying NOT NULL UNIQUE,
  description text,
  sort_order integer NOT NULL DEFAULT 0,
  CONSTRAINT categories_pkey PRIMARY KEY (id),
  CONSTRAINT categories_parent_id_fkey FOREIGN KEY (parent_id) REFERENCES public.categories(id)
);
CREATE TABLE public.voucher_products (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  partner_id uuid NOT NULL,
  category_id uuid NOT NULL,
  name character varying NOT NULL,
  description text,
  thumbnail_url text,
  original_price numeric NOT NULL,
  selling_price numeric NOT NULL,
  discount_rate double precision NOT NULL DEFAULT 0,
  applicable_area character varying,
  total_quantity integer NOT NULL CHECK (total_quantity >= 0),
  remaining_quantity integer NOT NULL CHECK (remaining_quantity >= 0),
  terms_and_conditions jsonb,
  usage_instructions jsonb,
  sale_start_date date NOT NULL,
  sale_end_date date NOT NULL,
  validity_days integer NOT NULL CHECK (validity_days > 0),
  status character varying NOT NULL DEFAULT 'draft'::character varying CHECK (status::text = ANY (ARRAY['draft'::character varying, 'active'::character varying, 'paused'::character varying, 'sold_out'::character varying, 'expired'::character varying]::text[])),
  approval_status character varying NOT NULL DEFAULT 'pending'::character varying CHECK (approval_status::text = ANY (ARRAY['pending'::character varying, 'approved'::character varying, 'rejected'::character varying]::text[])),
  approved_by uuid,
  approved_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  created_by uuid,
  submitted_by uuid,
  submitted_at timestamp with time zone,
  CONSTRAINT voucher_products_pkey PRIMARY KEY (id),
  CONSTRAINT voucher_products_partner_id_fkey FOREIGN KEY (partner_id) REFERENCES public.partners(id),
  CONSTRAINT voucher_products_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.categories(id),
  CONSTRAINT voucher_products_approved_by_fkey FOREIGN KEY (approved_by) REFERENCES public.users(id),
  CONSTRAINT voucher_products_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id),
  CONSTRAINT voucher_products_submitted_by_fkey FOREIGN KEY (submitted_by) REFERENCES public.users(id)
);
CREATE TABLE public.voucher_product_images (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  voucher_product_id uuid NOT NULL,
  image_url text NOT NULL,
  is_primary boolean NOT NULL DEFAULT false,
  sort_order integer NOT NULL DEFAULT 0,
  CONSTRAINT voucher_product_images_pkey PRIMARY KEY (id),
  CONSTRAINT voucher_product_images_voucher_product_id_fkey FOREIGN KEY (voucher_product_id) REFERENCES public.voucher_products(id)
);
CREATE TABLE public.voucher_product_branches (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  voucher_product_id uuid NOT NULL,
  branch_id uuid NOT NULL,
  CONSTRAINT voucher_product_branches_pkey PRIMARY KEY (id),
  CONSTRAINT voucher_product_branches_voucher_product_id_fkey FOREIGN KEY (voucher_product_id) REFERENCES public.voucher_products(id),
  CONSTRAINT voucher_product_branches_branch_id_fkey FOREIGN KEY (branch_id) REFERENCES public.partner_branches(id)
);
CREATE TABLE public.carts (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT carts_pkey PRIMARY KEY (id),
  CONSTRAINT carts_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id)
);
CREATE TABLE public.cart_items (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  cart_id uuid NOT NULL,
  voucher_product_id uuid NOT NULL,
  quantity integer NOT NULL CHECK (quantity > 0),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT cart_items_pkey PRIMARY KEY (id),
  CONSTRAINT cart_items_cart_id_fkey FOREIGN KEY (cart_id) REFERENCES public.carts(id),
  CONSTRAINT cart_items_voucher_product_id_fkey FOREIGN KEY (voucher_product_id) REFERENCES public.voucher_products(id)
);
CREATE TABLE public.orders (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  order_code character varying NOT NULL UNIQUE,
  user_id uuid NOT NULL,
  subtotal numeric NOT NULL,
  discount_amount numeric NOT NULL DEFAULT 0,
  total_amount numeric NOT NULL,
  payment_method character varying NOT NULL CHECK (payment_method::text = ANY (ARRAY['vnpay'::character varying, 'paypal'::character varying]::text[])),
  status character varying NOT NULL DEFAULT 'pending'::character varying,
  note text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  recipient_id uuid NOT NULL,
  is_gift boolean NOT NULL DEFAULT false,
  payment_expires_at timestamp with time zone,
  payment_status character varying NOT NULL DEFAULT 'pending'::character varying,
  refund_amount numeric NOT NULL DEFAULT 0,
  CONSTRAINT orders_pkey PRIMARY KEY (id),
  CONSTRAINT orders_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id),
  CONSTRAINT orders_recipient_id_fkey FOREIGN KEY (recipient_id) REFERENCES public.users(id)
);
CREATE TABLE public.order_items (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL,
  voucher_product_id uuid NOT NULL,
  quantity integer NOT NULL CHECK (quantity > 0),
  unit_price numeric NOT NULL,
  snapped_original_price numeric NOT NULL,
  snapped_selling_price numeric NOT NULL,
  snapped_discount_rate double precision NOT NULL,
  subtotal numeric NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT order_items_pkey PRIMARY KEY (id),
  CONSTRAINT order_items_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id),
  CONSTRAINT order_items_voucher_product_id_fkey FOREIGN KEY (voucher_product_id) REFERENCES public.voucher_products(id)
);
CREATE TABLE public.payments (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL,
  method character varying NOT NULL CHECK (method::text = ANY (ARRAY['vnpay'::character varying, 'paypal'::character varying]::text[])),
  amount numeric NOT NULL,
  status character varying NOT NULL DEFAULT 'pending'::character varying CHECK (status::text = ANY (ARRAY['pending'::character varying, 'processing'::character varying, 'success'::character varying, 'failed'::character varying, 'refunded'::character varying]::text[])),
  transaction_ref character varying,
  gateway_response text,
  paid_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  refund_ref character varying,
  refunded_at timestamp with time zone,
  CONSTRAINT payments_pkey PRIMARY KEY (id),
  CONSTRAINT payments_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id)
);
CREATE TABLE public.order_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL,
  user_id uuid NOT NULL,
  action character varying NOT NULL,
  description text,
  occurred_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT order_logs_pkey PRIMARY KEY (id),
  CONSTRAINT order_logs_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id),
  CONSTRAINT order_logs_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id)
);
CREATE TABLE public.payment_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  payment_id uuid NOT NULL,
  order_id uuid NOT NULL,
  user_id uuid NOT NULL,
  action character varying NOT NULL,
  status character varying NOT NULL,
  amount numeric NOT NULL,
  occurred_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT payment_logs_pkey PRIMARY KEY (id),
  CONSTRAINT payment_logs_payment_id_fkey FOREIGN KEY (payment_id) REFERENCES public.payments(id),
  CONSTRAINT payment_logs_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id),
  CONSTRAINT payment_logs_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id)
);
CREATE TABLE public.issued_vouchers (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  voucher_code character varying NOT NULL UNIQUE,
  qr_code_payload character varying NOT NULL UNIQUE,
  qr_code_image_url text,
  order_item_id uuid,
  voucher_product_id uuid NOT NULL,
  owner_id uuid,
  issued_date date NOT NULL DEFAULT CURRENT_DATE,
  expired_date date NOT NULL,
  status character varying NOT NULL DEFAULT 'active'::character varying CHECK (status::text = ANY (ARRAY['active'::character varying, 'used'::character varying, 'expired'::character varying, 'revoked'::character varying, 'cancelled'::character varying]::text[])),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  is_test boolean NOT NULL DEFAULT false,
  branch_id uuid,
  redeemed_by uuid,
  used_at timestamp with time zone,
  note text,
  CONSTRAINT issued_vouchers_pkey PRIMARY KEY (id),
  CONSTRAINT issued_vouchers_order_item_id_fkey FOREIGN KEY (order_item_id) REFERENCES public.order_items(id),
  CONSTRAINT issued_vouchers_voucher_product_id_fkey FOREIGN KEY (voucher_product_id) REFERENCES public.voucher_products(id),
  CONSTRAINT issued_vouchers_owner_id_fkey FOREIGN KEY (owner_id) REFERENCES public.users(id),
  CONSTRAINT issued_vouchers_branch_id_fkey FOREIGN KEY (branch_id) REFERENCES public.partner_branches(id),
  CONSTRAINT issued_vouchers_redeemed_by_fkey FOREIGN KEY (redeemed_by) REFERENCES public.users(id)
);

CREATE TABLE public.reviews (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  voucher_product_id uuid NOT NULL,
  user_id uuid NOT NULL,
  issued_voucher_id uuid NOT NULL,
  rating integer NOT NULL,
  comment text,
  media_urls jsonb,
  is_published boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT reviews_pkey PRIMARY KEY (id),
  CONSTRAINT reviews_voucher_product_id_fkey FOREIGN KEY (voucher_product_id) REFERENCES public.voucher_products(id),
  CONSTRAINT reviews_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id),
  CONSTRAINT reviews_issued_voucher_id_fkey FOREIGN KEY (issued_voucher_id) REFERENCES public.issued_vouchers(id)
);
CREATE TABLE public.complaints (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  order_id uuid,
  issued_voucher_id uuid,
  user_id uuid NOT NULL,
  reason character varying NOT NULL,
  description text NOT NULL,
  evidence_urls jsonb,
  status character varying NOT NULL DEFAULT 'open'::character varying,
  assigned_to uuid,
  resolution_note text,
  created_at timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  resolved_at timestamp with time zone,
  resolution_types json,
  CONSTRAINT complaints_pkey PRIMARY KEY (id),
  CONSTRAINT complaints_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id),
  CONSTRAINT complaints_issued_voucher_id_fkey FOREIGN KEY (issued_voucher_id) REFERENCES public.issued_vouchers(id),
  CONSTRAINT complaints_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id),
  CONSTRAINT complaints_assigned_to_fkey FOREIGN KEY (assigned_to) REFERENCES public.users(id)
);
CREATE TABLE public.complaint_responses (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  complaint_id uuid NOT NULL,
  responded_by uuid NOT NULL,
  responder_role character varying NOT NULL,
  content text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT complaint_responses_pkey PRIMARY KEY (id),
  CONSTRAINT complaint_responses_complaint_id_fkey FOREIGN KEY (complaint_id) REFERENCES public.complaints(id),
  CONSTRAINT complaint_responses_responded_by_fkey FOREIGN KEY (responded_by) REFERENCES public.users(id)
);
CREATE TABLE public.auth_tokens (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  token_hash text NOT NULL,
  type character varying NOT NULL,
  expires_at timestamp with time zone NOT NULL,
  used_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT auth_tokens_pkey PRIMARY KEY (id),
  CONSTRAINT auth_tokens_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id)
);
CREATE TABLE public.security_alerts (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  alert_type character varying NOT NULL,
  detail text,
  ip_address character varying,
  status character varying NOT NULL DEFAULT 'open'::character varying,
  reviewed_by uuid,
  reviewed_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT security_alerts_pkey PRIMARY KEY (id),
  CONSTRAINT security_alerts_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id),
  CONSTRAINT security_alerts_reviewed_by_fkey FOREIGN KEY (reviewed_by) REFERENCES public.users(id)
);
CREATE TABLE public.cms_contents (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  content_type character varying NOT NULL,
  title character varying NOT NULL,
  content text,
  image_url character varying,
  status character varying NOT NULL DEFAULT 'active'::character varying,
  sort_order integer NOT NULL DEFAULT 0,
  created_by uuid,
  created_at timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT cms_contents_pkey PRIMARY KEY (id),
  CONSTRAINT cms_contents_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id)
);
CREATE TABLE public.voucher_check_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  voucher_code character varying,
  status character varying NOT NULL,
  reason text,
  created_at timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT voucher_check_logs_pkey PRIMARY KEY (id),
  CONSTRAINT voucher_check_logs_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id)
);

-- Complete the users <-> partners/partner_branches dependency cycle after both tables exist.
ALTER TABLE public.users
  ADD CONSTRAINT users_partner_fk FOREIGN KEY (partner_id) REFERENCES public.partners(id),
  ADD CONSTRAINT users_partner_branch_fk FOREIGN KEY (partner_branches_id) REFERENCES public.partner_branches(id);

CREATE TABLE public.admin_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  admin_id uuid NOT NULL,
  target_user_id uuid,
  target_partner_id uuid,
  target_voucher_id uuid,
  action character varying NOT NULL,
  description text,
  occurred_at timestamp with time zone NOT NULL DEFAULT now(),
  target_order_id uuid,
  content_type character varying,
  CONSTRAINT admin_logs_pkey PRIMARY KEY (id),
  CONSTRAINT admin_logs_admin_id_fkey FOREIGN KEY (admin_id) REFERENCES public.users(id),
  CONSTRAINT admin_logs_target_user_id_fkey FOREIGN KEY (target_user_id) REFERENCES public.users(id),
  CONSTRAINT admin_logs_target_partner_fk FOREIGN KEY (target_partner_id) REFERENCES public.partners(id),
  CONSTRAINT admin_logs_target_voucher_fk FOREIGN KEY (target_voucher_id) REFERENCES public.voucher_products(id),
  CONSTRAINT admin_logs_target_order_id_fkey FOREIGN KEY (target_order_id) REFERENCES public.orders(id)
);

COMMIT;
