-- Move the one-time redemption data onto the issued voucher itself.
ALTER TABLE "issued_vouchers"
    ADD COLUMN "branch_id" UUID,
    ADD COLUMN "redeemed_by" UUID,
    ADD COLUMN "used_at" TIMESTAMPTZ(6),
    ADD COLUMN "note" TEXT;

UPDATE "issued_vouchers" AS iv
SET
    "branch_id" = vu."branch_id",
    "redeemed_by" = vu."redeemed_by",
    "used_at" = vu."used_at",
    "note" = vu."note"
FROM "voucher_usages" AS vu
WHERE vu."issued_voucher_id" = iv."id";

ALTER TABLE "issued_vouchers"
    ADD CONSTRAINT "issued_vouchers_branch_id_fkey"
        FOREIGN KEY ("branch_id") REFERENCES "partner_branches"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    ADD CONSTRAINT "issued_vouchers_redeemed_by_fkey"
        FOREIGN KEY ("redeemed_by") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE INDEX "issued_vouchers_branch_id_idx" ON "issued_vouchers"("branch_id");
CREATE INDEX "issued_vouchers_redeemed_by_idx" ON "issued_vouchers"("redeemed_by");
CREATE INDEX "issued_vouchers_used_at_idx" ON "issued_vouchers"("used_at");

DROP TABLE "voucher_usages";
