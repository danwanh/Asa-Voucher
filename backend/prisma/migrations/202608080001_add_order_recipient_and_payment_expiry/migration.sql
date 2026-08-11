ALTER TABLE "orders"
  ADD COLUMN "recipient_id" UUID,
  ADD COLUMN "is_gift" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "payment_expires_at" TIMESTAMPTZ(6);

UPDATE "orders"
SET "recipient_id" = "user_id"
WHERE "recipient_id" IS NULL;

ALTER TABLE "orders"
  ALTER COLUMN "recipient_id" SET NOT NULL;

ALTER TABLE "orders"
  ADD CONSTRAINT "orders_recipient_id_fkey"
  FOREIGN KEY ("recipient_id") REFERENCES "users"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE INDEX "orders_recipient_id_idx" ON "orders"("recipient_id");
