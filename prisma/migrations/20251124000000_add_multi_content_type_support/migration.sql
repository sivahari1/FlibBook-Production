-- Add multi-content type support to Document table
ALTER TABLE "documents" ADD COLUMN IF NOT EXISTS "contentType" TEXT NOT NULL DEFAULT 'PDF';
ALTER TABLE "documents" ADD COLUMN IF NOT EXISTS "metadata" JSONB DEFAULT '{}'::jsonb;
ALTER TABLE "documents" ADD COLUMN IF NOT EXISTS "thumbnailUrl" TEXT;
ALTER TABLE "documents" ADD COLUMN IF NOT EXISTS "linkUrl" TEXT;

-- Add check constraint for Document content types
ALTER TABLE "documents" ADD CONSTRAINT "documents_contentType_check" 
  CHECK ("contentType" IN ('PDF', 'IMAGE', 'VIDEO', 'LINK'));

-- Add indexes for Document content type filtering and metadata
CREATE INDEX IF NOT EXISTS "documents_contentType_idx" ON "documents"("contentType");
CREATE INDEX IF NOT EXISTS "documents_metadata_idx" ON "documents" USING GIN("metadata");

-- Add multi-content type support to BookShopItem table
ALTER TABLE "book_shop_items" ADD COLUMN IF NOT EXISTS "contentType" TEXT NOT NULL DEFAULT 'PDF';
ALTER TABLE "book_shop_items" ADD COLUMN IF NOT EXISTS "metadata" JSONB DEFAULT '{}'::jsonb;
ALTER TABLE "book_shop_items" ADD COLUMN IF NOT EXISTS "previewUrl" TEXT;
ALTER TABLE "book_shop_items" ADD COLUMN IF NOT EXISTS "linkUrl" TEXT;

-- Add check constraint for BookShopItem content types
ALTER TABLE "book_shop_items" ADD CONSTRAINT "book_shop_items_contentType_check" 
  CHECK ("contentType" IN ('PDF', 'IMAGE', 'VIDEO', 'LINK'));

-- Add indexes for BookShopItem content type filtering and metadata
CREATE INDEX IF NOT EXISTS "book_shop_items_contentType_idx" ON "book_shop_items"("contentType");
CREATE INDEX IF NOT EXISTS "book_shop_items_metadata_idx" ON "book_shop_items" USING GIN("metadata");
