-- Catch-up migration: brings a fresh database in line with schema.prisma.
-- These changes were applied to production outside Prisma Migrate, so this
-- migration is marked as applied there (prisma migrate resolve --applied).

-- DropForeignKey
ALTER TABLE "admin_logs" DROP CONSTRAINT "admin_logs_admin_id_fkey";

-- DropForeignKey
ALTER TABLE "admin_logs" DROP CONSTRAINT "admin_logs_target_partner_id_fkey";

-- DropForeignKey
ALTER TABLE "admin_logs" DROP CONSTRAINT "admin_logs_target_user_id_fkey";

-- DropForeignKey
ALTER TABLE "admin_logs" DROP CONSTRAINT "admin_logs_target_voucher_id_fkey";

-- DropForeignKey
ALTER TABLE "authentication_logs" DROP CONSTRAINT "authentication_logs_user_id_fkey";

-- DropForeignKey
ALTER TABLE "cart_items" DROP CONSTRAINT "cart_items_cart_id_fkey";

-- DropForeignKey
ALTER TABLE "cart_items" DROP CONSTRAINT "cart_items_voucher_product_id_fkey";

-- DropForeignKey
ALTER TABLE "carts" DROP CONSTRAINT "carts_user_id_fkey";

-- DropForeignKey
ALTER TABLE "categories" DROP CONSTRAINT "categories_parent_id_fkey";

-- DropForeignKey
ALTER TABLE "cms_contents" DROP CONSTRAINT "cms_contents_created_by_fkey";

-- DropForeignKey
ALTER TABLE "issued_vouchers" DROP CONSTRAINT "issued_vouchers_order_item_id_fkey";

-- DropForeignKey
ALTER TABLE "issued_vouchers" DROP CONSTRAINT "issued_vouchers_owner_id_fkey";

-- DropForeignKey
ALTER TABLE "issued_vouchers" DROP CONSTRAINT "issued_vouchers_voucher_product_id_fkey";

-- DropForeignKey
ALTER TABLE "order_items" DROP CONSTRAINT "order_items_order_id_fkey";

-- DropForeignKey
ALTER TABLE "order_items" DROP CONSTRAINT "order_items_voucher_product_id_fkey";

-- DropForeignKey
ALTER TABLE "order_logs" DROP CONSTRAINT "order_logs_order_id_fkey";

-- DropForeignKey
ALTER TABLE "order_logs" DROP CONSTRAINT "order_logs_user_id_fkey";

-- DropForeignKey
ALTER TABLE "orders" DROP CONSTRAINT "orders_user_id_fkey";

-- DropForeignKey
ALTER TABLE "partner_branches" DROP CONSTRAINT "partner_branches_partner_id_fkey";

-- DropForeignKey
ALTER TABLE "partners" DROP CONSTRAINT "partners_approved_by_fkey";

-- DropForeignKey
ALTER TABLE "partners" DROP CONSTRAINT "partners_representative_user_id_fkey";

-- DropForeignKey
ALTER TABLE "payment_logs" DROP CONSTRAINT "payment_logs_order_id_fkey";

-- DropForeignKey
ALTER TABLE "payment_logs" DROP CONSTRAINT "payment_logs_payment_id_fkey";

-- DropForeignKey
ALTER TABLE "payment_logs" DROP CONSTRAINT "payment_logs_user_id_fkey";

-- DropForeignKey
ALTER TABLE "payments" DROP CONSTRAINT "payments_order_id_fkey";

-- DropForeignKey
ALTER TABLE "refresh_tokens" DROP CONSTRAINT "refresh_tokens_user_id_fkey";

-- DropForeignKey
ALTER TABLE "users" DROP CONSTRAINT "users_partner_branches_id_fkey";

-- DropForeignKey
ALTER TABLE "voucher_product_branches" DROP CONSTRAINT "voucher_product_branches_branch_id_fkey";

-- DropForeignKey
ALTER TABLE "voucher_product_branches" DROP CONSTRAINT "voucher_product_branches_voucher_product_id_fkey";

-- DropForeignKey
ALTER TABLE "voucher_product_images" DROP CONSTRAINT "voucher_product_images_voucher_product_id_fkey";

-- DropForeignKey
ALTER TABLE "voucher_products" DROP CONSTRAINT "voucher_products_approved_by_fkey";

-- DropForeignKey
ALTER TABLE "voucher_products" DROP CONSTRAINT "voucher_products_category_id_fkey";

-- DropForeignKey
ALTER TABLE "voucher_products" DROP CONSTRAINT "voucher_products_partner_id_fkey";

-- AlterTable
ALTER TABLE "admin_logs" ADD COLUMN     "content_type" VARCHAR(50),
ADD COLUMN     "target_order_id" UUID;

-- AlterTable: resolution_type (single value) -> resolution_types (JSON array), keeping existing data
ALTER TABLE "complaints" ADD COLUMN     "resolution_types" JSON;
UPDATE "complaints" SET "resolution_types" = json_build_array("resolution_type") WHERE "resolution_type" IS NOT NULL;
ALTER TABLE "complaints" DROP COLUMN "resolution_type";

-- AlterTable
ALTER TABLE "issued_vouchers" ALTER COLUMN "issued_date" SET DEFAULT CURRENT_DATE;

-- AlterTable
ALTER TABLE "orders" ADD COLUMN     "payment_status" VARCHAR(20) NOT NULL DEFAULT 'pending',
ADD COLUMN     "refund_amount" DECIMAL(15,0) NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "partner_branches" ADD COLUMN     "ward" VARCHAR(100);

-- AlterTable
ALTER TABLE "payments" ADD COLUMN     "refund_ref" VARCHAR(255),
ADD COLUMN     "refunded_at" TIMESTAMPTZ(6);

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "partner_id" UUID;

-- CreateTable
CREATE TABLE "security_alerts" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "alert_type" VARCHAR(50) NOT NULL,
    "detail" TEXT,
    "ip_address" VARCHAR(50),
    "status" VARCHAR(20) NOT NULL DEFAULT 'open',
    "reviewed_by" UUID,
    "reviewed_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "security_alerts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "voucher_check_logs" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "voucher_code" VARCHAR(50),
    "status" VARCHAR(20) NOT NULL,
    "reason" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "voucher_check_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "security_alerts_user_id_idx" ON "security_alerts"("user_id");

-- CreateIndex
CREATE INDEX "security_alerts_status_idx" ON "security_alerts"("status");

-- CreateIndex
CREATE INDEX "voucher_check_logs_user_id_created_at_idx" ON "voucher_check_logs"("user_id", "created_at");

-- CreateIndex
CREATE INDEX "voucher_check_logs_status_idx" ON "voucher_check_logs"("status");

-- CreateIndex
CREATE INDEX "authentication_logs_user_id_occurred_at_idx" ON "authentication_logs"("user_id", "occurred_at");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_partner_branch_fk" FOREIGN KEY ("partner_branches_id") REFERENCES "partner_branches"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_partner_fk" FOREIGN KEY ("partner_id") REFERENCES "partners"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "authentication_logs" ADD CONSTRAINT "authentication_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "admin_logs" ADD CONSTRAINT "admin_logs_admin_id_fkey" FOREIGN KEY ("admin_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "admin_logs" ADD CONSTRAINT "admin_logs_target_order_id_fkey" FOREIGN KEY ("target_order_id") REFERENCES "orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "admin_logs" ADD CONSTRAINT "admin_logs_target_partner_fk" FOREIGN KEY ("target_partner_id") REFERENCES "partners"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "admin_logs" ADD CONSTRAINT "admin_logs_target_user_id_fkey" FOREIGN KEY ("target_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "admin_logs" ADD CONSTRAINT "admin_logs_target_voucher_fk" FOREIGN KEY ("target_voucher_id") REFERENCES "voucher_products"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "partners" ADD CONSTRAINT "partners_approved_by_fkey" FOREIGN KEY ("approved_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "partners" ADD CONSTRAINT "partners_representative_user_id_fkey" FOREIGN KEY ("representative_user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "partner_branches" ADD CONSTRAINT "partner_branches_partner_id_fkey" FOREIGN KEY ("partner_id") REFERENCES "partners"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "categories" ADD CONSTRAINT "categories_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "categories"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "voucher_products" ADD CONSTRAINT "voucher_products_approved_by_fkey" FOREIGN KEY ("approved_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "voucher_products" ADD CONSTRAINT "voucher_products_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "voucher_products" ADD CONSTRAINT "voucher_products_partner_id_fkey" FOREIGN KEY ("partner_id") REFERENCES "partners"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "voucher_product_images" ADD CONSTRAINT "voucher_product_images_voucher_product_id_fkey" FOREIGN KEY ("voucher_product_id") REFERENCES "voucher_products"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "voucher_product_branches" ADD CONSTRAINT "voucher_product_branches_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "partner_branches"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "voucher_product_branches" ADD CONSTRAINT "voucher_product_branches_voucher_product_id_fkey" FOREIGN KEY ("voucher_product_id") REFERENCES "voucher_products"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "carts" ADD CONSTRAINT "carts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "cart_items" ADD CONSTRAINT "cart_items_cart_id_fkey" FOREIGN KEY ("cart_id") REFERENCES "carts"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "cart_items" ADD CONSTRAINT "cart_items_voucher_product_id_fkey" FOREIGN KEY ("voucher_product_id") REFERENCES "voucher_products"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_voucher_product_id_fkey" FOREIGN KEY ("voucher_product_id") REFERENCES "voucher_products"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "order_logs" ADD CONSTRAINT "order_logs_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "order_logs" ADD CONSTRAINT "order_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "payment_logs" ADD CONSTRAINT "payment_logs_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "payment_logs" ADD CONSTRAINT "payment_logs_payment_id_fkey" FOREIGN KEY ("payment_id") REFERENCES "payments"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "payment_logs" ADD CONSTRAINT "payment_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "issued_vouchers" ADD CONSTRAINT "issued_vouchers_order_item_id_fkey" FOREIGN KEY ("order_item_id") REFERENCES "order_items"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "issued_vouchers" ADD CONSTRAINT "issued_vouchers_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "issued_vouchers" ADD CONSTRAINT "issued_vouchers_voucher_product_id_fkey" FOREIGN KEY ("voucher_product_id") REFERENCES "voucher_products"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "security_alerts" ADD CONSTRAINT "security_alerts_reviewed_by_fkey" FOREIGN KEY ("reviewed_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "security_alerts" ADD CONSTRAINT "security_alerts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "voucher_check_logs" ADD CONSTRAINT "voucher_check_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cms_contents" ADD CONSTRAINT "cms_contents_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

