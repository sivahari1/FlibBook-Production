-- Optimize annotation query performance
-- Add composite indexes for common query patterns

-- Index for filtering by document, page, and visibility
CREATE INDEX IF NOT EXISTS "document_annotations_documentId_pageNumber_visibility_idx" 
ON "document_annotations"("documentId", "pageNumber", "visibility");

-- Index for filtering by document, visibility, and sorting by creation date
CREATE INDEX IF NOT EXISTS "document_annotations_documentId_visibility_createdAt_idx" 
ON "document_annotations"("documentId", "visibility", "createdAt");

-- Add comment explaining the optimization
COMMENT ON INDEX "document_annotations_documentId_pageNumber_visibility_idx" IS 
'Optimizes queries filtering by document and page with visibility checks';

COMMENT ON INDEX "document_annotations_documentId_visibility_createdAt_idx" IS 
'Optimizes queries filtering by document with visibility and sorting by date';
