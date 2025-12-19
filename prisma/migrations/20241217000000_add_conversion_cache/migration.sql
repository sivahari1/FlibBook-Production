-- CreateTable
CREATE TABLE "conversion_cache" (
    "id" TEXT NOT NULL,
    "document_id" TEXT NOT NULL,
    "result" TEXT NOT NULL,
    "document_version" TEXT NOT NULL DEFAULT 'unknown',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_accessed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "access_count" INTEGER NOT NULL DEFAULT 1,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "size_bytes" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "conversion_cache_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "conversion_cache_document_id_key" ON "conversion_cache"("document_id");

-- CreateIndex
CREATE INDEX "conversion_cache_expires_at_idx" ON "conversion_cache"("expires_at");

-- CreateIndex
CREATE INDEX "conversion_cache_last_accessed_at_idx" ON "conversion_cache"("last_accessed_at");

-- CreateIndex
CREATE INDEX "conversion_cache_access_count_idx" ON "conversion_cache"("access_count");

-- Add foreign key constraint to documents table if it exists
-- This will be ignored if the documents table doesn't exist
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'documents') THEN
        ALTER TABLE "conversion_cache" ADD CONSTRAINT "conversion_cache_document_id_fkey" 
        FOREIGN KEY ("document_id") REFERENCES "documents"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;