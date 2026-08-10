-- A voucher can have at most one customer review and one customer complaint.
CREATE UNIQUE INDEX "reviews_issued_voucher_id_key"
ON "reviews"("issued_voucher_id");

CREATE UNIQUE INDEX "complaints_user_id_issued_voucher_id_key"
ON "complaints"("user_id", "issued_voucher_id");

CREATE UNIQUE INDEX "complaints_user_id_order_id_order_level_key"
ON "complaints"("user_id", "order_id")
WHERE "issued_voucher_id" IS NULL AND "order_id" IS NOT NULL;
