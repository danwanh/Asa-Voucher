-- Baseline for the schema that already existed before Prisma Migrate was adopted.
-- On an existing Supabase database, mark this migration as applied with:
-- prisma migrate resolve --applied 202607190001_baseline_existing_schema

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE "users" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "email" VARCHAR(255) NOT NULL,
    "phone" VARCHAR(20),
    "password_hash" VARCHAR(255) NOT NULL,
    "full_name" VARCHAR(100) NOT NULL,
    "avatar_url" TEXT,
    "role" VARCHAR(50) NOT NULL,
    "dob" DATE,
    "gender" VARCHAR(20),
    "address" TEXT,
    "city" VARCHAR(100),
    "district" VARCHAR(100),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "is_verified" BOOLEAN NOT NULL DEFAULT false,
    "partner_branches_id" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "refresh_tokens" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "token_hash" TEXT NOT NULL,
    "expires_at" TIMESTAMPTZ(6) NOT NULL,
    "revoked_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "refresh_tokens_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "authentication_logs" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID,
    "action" VARCHAR(100) NOT NULL,
    "status" VARCHAR(50) NOT NULL,
    "ip_address" VARCHAR(45),
    "user_agent" TEXT,
    "occurred_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "authentication_logs_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "admin_logs" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "admin_id" UUID NOT NULL,
    "target_user_id" UUID,
    "target_partner_id" UUID,
    "target_voucher_id" UUID,
    "action" VARCHAR(100) NOT NULL,
    "description" TEXT,
    "occurred_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "admin_logs_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "partners" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "representative_user_id" UUID NOT NULL,
    "business_name" VARCHAR(255) NOT NULL,
    "business_code" VARCHAR(50) NOT NULL,
    "business_type" VARCHAR(100),
    "tax_number" VARCHAR(20),
    "logo_url" TEXT,
    "website_url" TEXT,
    "description" TEXT,
    "approval_status" VARCHAR(20) NOT NULL DEFAULT 'pending',
    "status" VARCHAR(20) NOT NULL DEFAULT 'active',
    "approved_by" UUID,
    "approved_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "partners_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "partner_branches" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "partner_id" UUID NOT NULL,
    "branch_name" VARCHAR(255) NOT NULL,
    "address" TEXT NOT NULL,
    "city" VARCHAR(100) NOT NULL,
    "district" VARCHAR(100),
    "phone" VARCHAR(20),
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "partner_branches_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "categories" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "parent_id" UUID,
    "name" VARCHAR(100) NOT NULL,
    "slug" VARCHAR(100) NOT NULL,
    "description" TEXT,
    "sort_order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "categories_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "voucher_products" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "partner_id" UUID NOT NULL,
    "category_id" UUID NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "thumbnail_url" TEXT,
    "original_price" DECIMAL(15,0) NOT NULL,
    "selling_price" DECIMAL(15,0) NOT NULL,
    "discount_rate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "applicable_area" VARCHAR(255),
    "total_quantity" INTEGER NOT NULL,
    "remaining_quantity" INTEGER NOT NULL,
    "terms_and_conditions" JSONB,
    "usage_instructions" JSONB,
    "sale_start_date" DATE NOT NULL,
    "sale_end_date" DATE NOT NULL,
    "validity_days" INTEGER NOT NULL,
    "status" VARCHAR(20) NOT NULL DEFAULT 'draft',
    "approval_status" VARCHAR(20) NOT NULL DEFAULT 'pending',
    "approved_by" UUID,
    "approved_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "voucher_products_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "voucher_product_images" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "voucher_product_id" UUID NOT NULL,
    "image_url" TEXT NOT NULL,
    "is_primary" BOOLEAN NOT NULL DEFAULT false,
    "sort_order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "voucher_product_images_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "voucher_product_branches" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "voucher_product_id" UUID NOT NULL,
    "branch_id" UUID NOT NULL,

    CONSTRAINT "voucher_product_branches_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "carts" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "carts_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "cart_items" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "cart_id" UUID NOT NULL,
    "voucher_product_id" UUID NOT NULL,
    "quantity" INTEGER NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cart_items_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "orders" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "order_code" VARCHAR(30) NOT NULL,
    "user_id" UUID NOT NULL,
    "subtotal" DECIMAL(15,0) NOT NULL,
    "discount_amount" DECIMAL(15,0) NOT NULL DEFAULT 0,
    "total_amount" DECIMAL(15,0) NOT NULL,
    "payment_method" VARCHAR(30) NOT NULL,
    "payment_status" VARCHAR(20) NOT NULL DEFAULT 'pending',
    "status" VARCHAR(20) NOT NULL DEFAULT 'pending',
    "note" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "orders_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "order_items" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "order_id" UUID NOT NULL,
    "voucher_product_id" UUID NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unit_price" DECIMAL(15,0) NOT NULL,
    "snapped_original_price" DECIMAL(15,0) NOT NULL,
    "snapped_selling_price" DECIMAL(15,0) NOT NULL,
    "snapped_discount_rate" DOUBLE PRECISION NOT NULL,
    "subtotal" DECIMAL(15,0) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "order_items_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "payments" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "order_id" UUID NOT NULL,
    "method" VARCHAR(30) NOT NULL,
    "amount" DECIMAL(15,0) NOT NULL,
    "status" VARCHAR(20) NOT NULL DEFAULT 'pending',
    "transaction_ref" VARCHAR(255),
    "gateway_response" TEXT,
    "paid_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "order_logs" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "order_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "action" VARCHAR(100) NOT NULL,
    "description" TEXT,
    "occurred_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "order_logs_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "payment_logs" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "payment_id" UUID NOT NULL,
    "order_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "action" VARCHAR(100) NOT NULL,
    "status" VARCHAR(50) NOT NULL,
    "amount" DECIMAL(15,0) NOT NULL,
    "occurred_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payment_logs_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "issued_vouchers" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "voucher_code" VARCHAR(50) NOT NULL,
    "qr_code_payload" VARCHAR(255) NOT NULL,
    "qr_code_image_url" TEXT,
    "order_item_id" UUID NOT NULL,
    "voucher_product_id" UUID NOT NULL,
    "owner_id" UUID NOT NULL,
    "issued_date" DATE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expired_date" DATE NOT NULL,
    "status" VARCHAR(20) NOT NULL DEFAULT 'active',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "issued_vouchers_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "users_email_key" ON "users"("email");
CREATE UNIQUE INDEX "users_phone_key" ON "users"("phone");
CREATE INDEX "users_role_idx" ON "users"("role");
CREATE UNIQUE INDEX "refresh_tokens_token_hash_key" ON "refresh_tokens"("token_hash");
CREATE UNIQUE INDEX "partners_business_code_key" ON "partners"("business_code");
CREATE UNIQUE INDEX "partners_tax_number_key" ON "partners"("tax_number");
CREATE INDEX "partners_representative_user_id_idx" ON "partners"("representative_user_id");
CREATE UNIQUE INDEX "categories_slug_key" ON "categories"("slug");
CREATE INDEX "voucher_products_partner_id_idx" ON "voucher_products"("partner_id");
CREATE INDEX "voucher_products_public_listing_idx" ON "voucher_products"("approval_status", "status", "sale_start_date", "sale_end_date");
CREATE UNIQUE INDEX "voucher_product_branches_voucher_product_id_branch_id_key" ON "voucher_product_branches"("voucher_product_id", "branch_id");
CREATE UNIQUE INDEX "carts_user_id_key" ON "carts"("user_id");
CREATE UNIQUE INDEX "cart_items_cart_id_voucher_product_id_key" ON "cart_items"("cart_id", "voucher_product_id");
CREATE INDEX "cart_items_cart_id_idx" ON "cart_items"("cart_id");
CREATE UNIQUE INDEX "orders_order_code_key" ON "orders"("order_code");
CREATE INDEX "orders_user_id_idx" ON "orders"("user_id");
CREATE INDEX "order_items_order_id_idx" ON "order_items"("order_id");
CREATE INDEX "payments_order_id_idx" ON "payments"("order_id");
CREATE UNIQUE INDEX "issued_vouchers_voucher_code_key" ON "issued_vouchers"("voucher_code");
CREATE UNIQUE INDEX "issued_vouchers_qr_code_payload_key" ON "issued_vouchers"("qr_code_payload");
CREATE INDEX "issued_vouchers_owner_id_idx" ON "issued_vouchers"("owner_id");

ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "authentication_logs" ADD CONSTRAINT "authentication_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "admin_logs" ADD CONSTRAINT "admin_logs_admin_id_fkey" FOREIGN KEY ("admin_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "admin_logs" ADD CONSTRAINT "admin_logs_target_user_id_fkey" FOREIGN KEY ("target_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "partners" ADD CONSTRAINT "partners_representative_user_id_fkey" FOREIGN KEY ("representative_user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "partners" ADD CONSTRAINT "partners_approved_by_fkey" FOREIGN KEY ("approved_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "admin_logs" ADD CONSTRAINT "admin_logs_target_partner_id_fkey" FOREIGN KEY ("target_partner_id") REFERENCES "partners"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "partner_branches" ADD CONSTRAINT "partner_branches_partner_id_fkey" FOREIGN KEY ("partner_id") REFERENCES "partners"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "users" ADD CONSTRAINT "users_partner_branches_id_fkey" FOREIGN KEY ("partner_branches_id") REFERENCES "partner_branches"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "categories" ADD CONSTRAINT "categories_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "voucher_products" ADD CONSTRAINT "voucher_products_partner_id_fkey" FOREIGN KEY ("partner_id") REFERENCES "partners"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "voucher_products" ADD CONSTRAINT "voucher_products_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "voucher_products" ADD CONSTRAINT "voucher_products_approved_by_fkey" FOREIGN KEY ("approved_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "admin_logs" ADD CONSTRAINT "admin_logs_target_voucher_id_fkey" FOREIGN KEY ("target_voucher_id") REFERENCES "voucher_products"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "voucher_product_images" ADD CONSTRAINT "voucher_product_images_voucher_product_id_fkey" FOREIGN KEY ("voucher_product_id") REFERENCES "voucher_products"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "voucher_product_branches" ADD CONSTRAINT "voucher_product_branches_voucher_product_id_fkey" FOREIGN KEY ("voucher_product_id") REFERENCES "voucher_products"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "voucher_product_branches" ADD CONSTRAINT "voucher_product_branches_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "partner_branches"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "carts" ADD CONSTRAINT "carts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "cart_items" ADD CONSTRAINT "cart_items_cart_id_fkey" FOREIGN KEY ("cart_id") REFERENCES "carts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "cart_items" ADD CONSTRAINT "cart_items_voucher_product_id_fkey" FOREIGN KEY ("voucher_product_id") REFERENCES "voucher_products"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "orders" ADD CONSTRAINT "orders_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_voucher_product_id_fkey" FOREIGN KEY ("voucher_product_id") REFERENCES "voucher_products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "payments" ADD CONSTRAINT "payments_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "order_logs" ADD CONSTRAINT "order_logs_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "order_logs" ADD CONSTRAINT "order_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "payment_logs" ADD CONSTRAINT "payment_logs_payment_id_fkey" FOREIGN KEY ("payment_id") REFERENCES "payments"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "payment_logs" ADD CONSTRAINT "payment_logs_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "payment_logs" ADD CONSTRAINT "payment_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "issued_vouchers" ADD CONSTRAINT "issued_vouchers_order_item_id_fkey" FOREIGN KEY ("order_item_id") REFERENCES "order_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "issued_vouchers" ADD CONSTRAINT "issued_vouchers_voucher_product_id_fkey" FOREIGN KEY ("voucher_product_id") REFERENCES "voucher_products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "issued_vouchers" ADD CONSTRAINT "issued_vouchers_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
