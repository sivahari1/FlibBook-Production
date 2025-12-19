-- Optimize document pages schema
-- Add cache metadata columns, versioning, and performance indexes

-- Add cache metadata columns
ALTER TABLE "document_pages" ADD COLUMN "cache_key" TEXT;
ALTER TABLE "document_pages" ADD COLUMN "cache_expires_at" TIMESTAMP(3);
ALTER TABLE "document_pages" ADD COLUMN "cache_hit_count" INTEGER DEFAULT 0;
ALTER TABLE "document_pages" ADD COLUMN "last_accessed_at" TIMESTAMP(3);

-- Add versioning for page regeneration
ALTER TABLE "document_pages" ADD COLUMN "version" INTEGER DEFAULT 1;
ALTER TABLE "document_pages" ADD COLUMN "generation_method" TEXT DEFAULT 'standard';
ALTER TABLE "document_pages" ADD COLUMN "quality_level" TEXT DEFAULT 'standard';

-- Add performance metadata
ALTER TABLE "document_pages" ADD COLUMN "processing_time_ms" INTEGER;
ALTER TABLE "document_pages" ADD COLUMN "optimization_applied" BOOLEAN DEFAULT false;
ALTER TABLE "document_pages" ADD COLUMN "format" TEXT DEFAULT 'jpeg';

-- Create performance indexes
CREATE INDEX "document_pages_cache_key_idx" ON "document_pages"("cache_key");
CREATE INDEX "document_pages_cache_expires_at_idx" ON "document_pages"("cache_expires_at");
CREATE INDEX "document_pages_last_accessed_at_idx" ON "document_pages"("last_accessed_at");
CREATE INDEX "document_pages_version_idx" ON "document_pages"("version");
CREATE INDEX "document_pages_quality_level_idx" ON "document_pages"("quality_level");

-- Create composite indexes for common queries
CREATE INDEX "document_pages_document_version_idx" ON "document_pages"("documentId", "version");
CREATE INDEX "document_pages_cache_performance_idx" ON "document_pages"("cache_expires_at", "cache_hit_count");
CREATE INDEX "document_pages_access_pattern_idx" ON "document_pages"("last_accessed_at", "cache_hit_count");

-- Add check constraints for data integrity
ALTER TABLE "document_pages" ADD CONSTRAINT "document_pages_version_check" CHECK ("version" > 0);
ALTER TABLE "document_pages" ADD CONSTRAINT "document_pages_cache_hit_count_check" CHECK ("cache_hit_count" >= 0);
ALTER TABLE "document_pages" ADD CONSTRAINT "document_pages_processing_time_check" CHECK ("processing_time_ms" >= 0);