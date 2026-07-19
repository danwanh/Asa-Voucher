create extension if not exists pgcrypto;

create table if not exists public.users (
  id uuid primary key default gen_random_uuid(),
  email varchar(255) not null unique,
  phone varchar(20) unique,
  password_hash varchar(255) not null,
  full_name varchar(100) not null,
  avatar_url text,
  role varchar(50) not null check (role in ('buyer', 'partner_owner', 'partner_voucher_staff', 'partner_store_staff', 'admin_content', 'admin_account', 'admin_security')),
  dob date,
  gender varchar(20) check (gender in ('male', 'female', 'other')),
  address text,
  city varchar(100),
  district varchar(100),
  is_active boolean not null default true,
  is_verified boolean not null default false,
  partner_branches_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.refresh_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  token_hash text not null unique,
  expires_at timestamptz not null,
  revoked_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.authentication_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.users(id) on delete set null,
  action varchar(100) not null,
  status varchar(50) not null,
  ip_address varchar(45),
  user_agent text,
  occurred_at timestamptz not null default now()
);

create table if not exists public.admin_logs (
  id uuid primary key default gen_random_uuid(),
  admin_id uuid not null references public.users(id) on delete cascade,
  target_user_id uuid references public.users(id) on delete set null,
  target_partner_id uuid,
  target_voucher_id uuid,
  action varchar(100) not null,
  description text,
  occurred_at timestamptz not null default now()
);

create table if not exists public.partners (
  id uuid primary key default gen_random_uuid(),
  representative_user_id uuid not null references public.users(id) on delete cascade,
  business_name varchar(255) not null,
  business_code varchar(50) not null unique,
  business_type varchar(100) check (business_type in ('restaurant', 'spa', 'entertainment', 'hotel', 'other')),
  tax_number varchar(20) unique,
  logo_url text,
  website_url text,
  description text,
  approval_status varchar(20) not null default 'pending' check (approval_status in ('pending', 'approved', 'rejected')),
  status varchar(20) not null default 'active' check (status in ('active', 'suspended', 'closed')),
  approved_by uuid references public.users(id) on delete set null,
  approved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.admin_logs add constraint admin_logs_target_partner_fk foreign key (target_partner_id) references public.partners(id) on delete set null;

create table if not exists public.partner_branches (
  id uuid primary key default gen_random_uuid(),
  partner_id uuid not null references public.partners(id) on delete cascade,
  branch_name varchar(255) not null,
  address text not null,
  city varchar(100) not null,
  district varchar(100),
  phone varchar(20),
  latitude double precision,
  longitude double precision,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.users add constraint users_partner_branch_fk foreign key (partner_branches_id) references public.partner_branches(id) on delete set null;

create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  parent_id uuid references public.categories(id) on delete set null,
  name varchar(100) not null,
  slug varchar(100) not null unique,
  description text,
  sort_order integer not null default 0
);

create table if not exists public.voucher_products (
  id uuid primary key default gen_random_uuid(),
  partner_id uuid not null references public.partners(id) on delete cascade,
  category_id uuid not null references public.categories(id) on delete restrict,
  name varchar(255) not null,
  description text,
  thumbnail_url text,
  original_price numeric(15, 0) not null,
  selling_price numeric(15, 0) not null,
  discount_rate double precision not null default 0,
  applicable_area varchar(255),
  total_quantity integer not null check (total_quantity >= 0),
  remaining_quantity integer not null check (remaining_quantity >= 0),
  terms_and_conditions jsonb,
  usage_instructions jsonb,
  sale_start_date date not null,
  sale_end_date date not null,
  validity_days integer not null check (validity_days > 0),
  status varchar(20) not null default 'draft' check (status in ('draft', 'active', 'paused', 'sold_out', 'expired')),
  approval_status varchar(20) not null default 'pending' check (approval_status in ('pending', 'approved', 'rejected')),
  approved_by uuid references public.users(id) on delete set null,
  approved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (selling_price <= original_price),
  check (sale_end_date >= sale_start_date)
);

alter table public.admin_logs add constraint admin_logs_target_voucher_fk foreign key (target_voucher_id) references public.voucher_products(id) on delete set null;

create table if not exists public.voucher_product_images (
  id uuid primary key default gen_random_uuid(),
  voucher_product_id uuid not null references public.voucher_products(id) on delete cascade,
  image_url text not null,
  is_primary boolean not null default false,
  sort_order integer not null default 0
);

create table if not exists public.voucher_product_branches (
  id uuid primary key default gen_random_uuid(),
  voucher_product_id uuid not null references public.voucher_products(id) on delete cascade,
  branch_id uuid not null references public.partner_branches(id) on delete cascade,
  unique (voucher_product_id, branch_id)
);

create table if not exists public.carts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references public.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.cart_items (
  id uuid primary key default gen_random_uuid(),
  cart_id uuid not null references public.carts(id) on delete cascade,
  voucher_product_id uuid not null references public.voucher_products(id) on delete cascade,
  quantity integer not null check (quantity > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (cart_id, voucher_product_id)
);

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  order_code varchar(30) not null unique,
  user_id uuid not null references public.users(id) on delete cascade,
  subtotal numeric(15, 0) not null,
  discount_amount numeric(15, 0) not null default 0,
  total_amount numeric(15, 0) not null,
  payment_method varchar(30) not null check (payment_method in ('momo', 'vnpay', 'zalopay', 'bank_transfer')),
  payment_status varchar(20) not null default 'pending' check (payment_status in ('pending', 'paid', 'failed', 'refunded')),
  status varchar(20) not null default 'pending' check (status in ('pending', 'confirmed', 'completed', 'cancelled')),
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  voucher_product_id uuid not null references public.voucher_products(id) on delete restrict,
  quantity integer not null check (quantity > 0),
  unit_price numeric(15, 0) not null,
  snapped_original_price numeric(15, 0) not null,
  snapped_selling_price numeric(15, 0) not null,
  snapped_discount_rate double precision not null,
  subtotal numeric(15, 0) not null,
  created_at timestamptz not null default now()
);

create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  method varchar(30) not null check (method in ('momo', 'vnpay', 'zalopay', 'bank_transfer')),
  amount numeric(15, 0) not null,
  status varchar(20) not null default 'pending' check (status in ('pending', 'success', 'failed', 'refunded')),
  transaction_ref varchar(255),
  gateway_response text,
  paid_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.order_logs (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  action varchar(100) not null,
  description text,
  occurred_at timestamptz not null default now()
);

create table if not exists public.payment_logs (
  id uuid primary key default gen_random_uuid(),
  payment_id uuid not null references public.payments(id) on delete cascade,
  order_id uuid not null references public.orders(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  action varchar(100) not null,
  status varchar(50) not null,
  amount numeric(15, 0) not null,
  occurred_at timestamptz not null default now()
);

create table if not exists public.issued_vouchers (
  id uuid primary key default gen_random_uuid(),
  voucher_code varchar(50) not null unique,
  qr_code_payload varchar(255) not null unique,
  qr_code_image_url text,
  order_item_id uuid not null references public.order_items(id) on delete cascade,
  voucher_product_id uuid not null references public.voucher_products(id) on delete restrict,
  owner_id uuid not null references public.users(id) on delete cascade,
  issued_date date not null default current_date,
  expired_date date not null,
  status varchar(20) not null default 'active' check (status in ('active', 'used', 'expired', 'refunded')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists users_role_idx on public.users(role);
create index if not exists partners_representative_user_id_idx on public.partners(representative_user_id);
create index if not exists voucher_products_partner_id_idx on public.voucher_products(partner_id);
create index if not exists voucher_products_public_listing_idx on public.voucher_products(approval_status, status, sale_start_date, sale_end_date);
create index if not exists cart_items_cart_id_idx on public.cart_items(cart_id);
create index if not exists orders_user_id_idx on public.orders(user_id);
create index if not exists order_items_order_id_idx on public.order_items(order_id);
create index if not exists payments_order_id_idx on public.payments(order_id);
create index if not exists issued_vouchers_owner_id_idx on public.issued_vouchers(owner_id);

alter table public.users enable row level security;
alter table public.refresh_tokens enable row level security;
alter table public.authentication_logs enable row level security;
alter table public.admin_logs enable row level security;
alter table public.partners enable row level security;
alter table public.partner_branches enable row level security;
alter table public.categories enable row level security;
alter table public.voucher_products enable row level security;
alter table public.voucher_product_images enable row level security;
alter table public.voucher_product_branches enable row level security;
alter table public.carts enable row level security;
alter table public.cart_items enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.payments enable row level security;
alter table public.order_logs enable row level security;
alter table public.payment_logs enable row level security;
alter table public.issued_vouchers enable row level security;
