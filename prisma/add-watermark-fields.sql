-- Migration: Add watermark fields to sharing tables
-- Date: 2025-11-18
-- Description: Adds optional watermarkText field to share_links and document_shares tables

-- Add watermarkText to share_links table
ALTER TABLE share_links
ADD COLUMN IF NOT EXISTS "watermarkText" TEXT;

-- Add watermarkText to document_shares table  
ALTER TABLE document_shares
ADD COLUMN IF NOT EXISTS "watermarkText" TEXT;

-- Verify the changes
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'share_links' AND column_name = 'watermarkText';

SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'document_shares' AND column_name = 'watermarkText';
