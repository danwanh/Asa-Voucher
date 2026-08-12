ALTER TABLE "orders"
  DROP CONSTRAINT IF EXISTS "orders_payment_method_check";

UPDATE "orders"
SET "status" = CASE
  WHEN "payment_status" = 'refunded' THEN 'refunded'
  WHEN "status" = 'cancelled' THEN 'cancelled'
  WHEN "payment_status" = 'failed' THEN 'payment_failed'
  WHEN "payment_status" = 'pending' THEN 'pending_payment'
  WHEN "status" = 'completed' THEN 'completed'
  WHEN "status" = 'confirmed' THEN 'confirmed'
  ELSE 'pending_payment'
END;

ALTER TABLE "orders"
  ADD CONSTRAINT "orders_payment_method_check"
  CHECK ("payment_method" IN ('vnpay', 'paypal')) NOT VALID;

ALTER TABLE "orders"
  DROP COLUMN "payment_status";
