BEGIN;

CREATE UNIQUE INDEX "reviews_user_id_issued_voucher_id_key"
ON "reviews"("user_id", "issued_voucher_id");

-- The old constraint guaranteed there are no duplicate voucher rows, so all
-- existing reviews are valid under the less restrictive per-user constraint.
DROP INDEX IF EXISTS "reviews_issued_voucher_id_key";

COMMIT;
