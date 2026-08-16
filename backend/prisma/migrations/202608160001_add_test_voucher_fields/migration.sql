ALTER TABLE "issued_vouchers" ADD COLUMN "is_test" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "issued_vouchers" ALTER COLUMN "order_item_id" DROP NOT NULL;
ALTER TABLE "issued_vouchers" ALTER COLUMN "owner_id" DROP NOT NULL;
