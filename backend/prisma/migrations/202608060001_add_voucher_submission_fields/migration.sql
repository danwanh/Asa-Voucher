ALTER TABLE "voucher_products" ADD COLUMN "created_by" UUID;
ALTER TABLE "voucher_products" ADD COLUMN "submitted_by" UUID;
ALTER TABLE "voucher_products" ADD COLUMN "submitted_at" TIMESTAMPTZ(6);

ALTER TABLE "voucher_products" ADD CONSTRAINT "voucher_products_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "voucher_products" ADD CONSTRAINT "voucher_products_submitted_by_fkey" FOREIGN KEY ("submitted_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
