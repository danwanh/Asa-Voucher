-- AlterTable: Rename 'refunded' → 'revoked' for issued_vouchers.status
-- 1. Backfill existing data
UPDATE "issued_vouchers" SET "status" = 'revoked' WHERE "status" = 'refunded';

-- 2. Drop old CHECK constraint
ALTER TABLE "issued_vouchers" DROP CONSTRAINT IF EXISTS "issued_vouchers_status_check";

-- 3. Add new CHECK constraint with 'revoked' instead of 'refunded'
ALTER TABLE "issued_vouchers" ADD CONSTRAINT "issued_vouchers_status_check"
  CHECK ("status" IN ('active', 'used', 'expired', 'revoked', 'cancelled'));
