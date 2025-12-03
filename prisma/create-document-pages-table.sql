-- Create document_pages table for caching converted PDF pages
-- This table stores metadata about converted PDF pages to avoid redundant processing

-- Drop table if it exists (for clean reinstall)
DROP TABLE IF EXISTS "document_pages" CASCADE;

-- Create the document_pages table
CREATE TABLE "document_pages" (
  "id" TEXT NOT NULL PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "documentId" TEXT NOT NULL,
  "pageNumber" INTEGER NOT NULL,
  "pageUrl" TEXT NOT NULL,
  "fileSize" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  
  CONSTRAINT "document_pages_documentId_fkey" 
    FOREIGN KEY ("documentId") 
    REFERENCES "documents"("id") 
    ON DELETE CASCADE 
    ON UPDATE CASCADE
);

-- Create indexes for better query performance
CREATE INDEX "document_pages_documentId_idx" ON "document_pages"("documentId");
CREATE INDEX "document_pages_expiresAt_idx" ON "document_pages"("expiresAt");
CREATE UNIQUE INDEX "document_pages_documentId_pageNumber_key" ON "document_pages"("documentId", "pageNumber");

-- Add comment to table
COMMENT ON TABLE "document_pages" IS 'Caches converted PDF page URLs to avoid redundant processing. Pages expire after 7 days.';

-- Verify table was created
SELECT 
  'document_pages table created successfully!' as message,
  COUNT(*) as initial_row_count 
FROM "document_pages";
