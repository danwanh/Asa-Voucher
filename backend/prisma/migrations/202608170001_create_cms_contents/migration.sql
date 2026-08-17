CREATE TABLE "cms_contents" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "content_type" VARCHAR(50) NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "content" TEXT,
    "image_url" VARCHAR(500),
    "status" VARCHAR(20) NOT NULL DEFAULT 'active',
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_by" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "cms_contents_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "cms_contents_content_type_idx" ON "cms_contents"("content_type");
CREATE INDEX "cms_contents_status_idx" ON "cms_contents"("status");

ALTER TABLE "cms_contents" ADD CONSTRAINT "cms_contents_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION;