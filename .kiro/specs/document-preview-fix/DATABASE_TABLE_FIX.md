# Database Table Fix - DocumentPage

## Issue
Preview was failing because the `DocumentPage` table doesn't exist in the database. The page caching system requires this table to store converted PDF page metadata.

## Root Cause
The code in `lib/services/page-cache.ts` references a `DocumentPage` table that was never created in the database schema. This table is needed to:
1. Cache converted PDF page URLs
2. Avoid redundant PDF-to-image conversions
3. Track page expiration (7-day TTL)
4. Improve performance

## Solution
Create the `DocumentPage` table in Supabase.

### Steps to Fix

1. **Go to Supabase Dashboard**
   - Navigate to: https://supabase.com/dashboard
   - Select your project: `zuhrivibcgudgsejsljo`

2. **Open SQL Editor**
   - Click on "SQL Editor" in the left sidebar
   - Click "New Query"

3. **Run the SQL Script**
   - Copy the contents of `prisma/create-document-pages-table.sql`
   - Paste into the SQL editor
   - Click "Run" or press Ctrl+Enter

### Table Structure

```sql
CREATE TABLE "DocumentPage" (
  "id" TEXT PRIMARY KEY,
  "documentId" TEXT NOT NULL,
  "pageNumber" INTEGER NOT NULL,
  "pageUrl" TEXT NOT NULL,
  "fileSize" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  
  FOREIGN KEY ("documentId") REFERENCES "Document"("id") ON DELETE CASCADE
);
```

### Indexes Created

1. `DocumentPage_documentId_idx` - Fast lookups by document
2. `DocumentPage_expiresAt_idx` - Efficient cleanup of expired pages
3. `DocumentPage_documentId_pageNumber_key` - Unique constraint on document+page

## How It Works

When a PDF is previewed:
1. System checks if pages exist in `DocumentPage` table
2. If yes: Returns cached URLs (fast!)
3. If no: Converts PDF to images, uploads to storage, caches URLs in table
4. Pages expire after 7 days and are cleaned up automatically

## Benefits

- **Performance**: Avoids re-converting PDFs that were already processed
- **Cost**: Reduces storage API calls and processing time
- **User Experience**: Instant preview for previously viewed documents

## Files Created

- `prisma/create-document-pages-table.sql` - SQL script to create the table
- `scripts/create-document-pages-table.ts` - TypeScript version (requires DB connection)

## Next Steps

After running the SQL script:
1. Verify the table exists in Supabase Dashboard > Table Editor
2. Try the preview feature again
3. The first preview will convert the PDF and cache the pages
4. Subsequent previews will be instant!

## Status

⚠️ **ACTION REQUIRED** - You need to run the SQL script in Supabase Dashboard

## Date
December 2, 2025
