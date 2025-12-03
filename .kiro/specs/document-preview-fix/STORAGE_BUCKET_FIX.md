# Storage Bucket Fix - Document Preview

## Issue
Preview was failing with error: "Upload failed for page 4: Bucket not found"

## Root Cause
The PDF converter service (`lib/services/pdf-converter.ts`) was trying to upload converted PDF pages to a Supabase storage bucket called `document-pages`, but this bucket didn't exist in the Supabase project.

## Solution
Created the missing `document-pages` storage bucket using a setup script.

### What Was Done

1. **Created Setup Script**: `scripts/create-document-pages-bucket.ts`
   - Loads environment variables from `.env.local`
   - Checks if bucket exists
   - Creates bucket with appropriate settings:
     - Public access (for image URLs)
     - 10MB file size limit per page
     - Allowed MIME types: JPEG, JPG, PNG

2. **Executed Script**: Successfully created the bucket
   - Existing buckets: documents, images, videos
   - New bucket: document-pages

## Bucket Configuration

```typescript
{
  name: 'document-pages',
  public: true,
  fileSizeLimit: 10 * 1024 * 1024, // 10MB
  allowedMimeTypes: ['image/jpeg', 'image/jpg', 'image/png']
}
```

## How It Works

When a PDF is previewed:
1. PDF is converted to individual page images
2. Each page is uploaded to: `document-pages/{userId}/{documentId}/page-{pageNumber}.jpg`
3. Public URLs are generated for each page
4. FlipBook viewer displays the pages

## Testing

The preview should now work correctly. Try:
1. Navigate to a document in the dashboard
2. Click "Preview"
3. The PDF should convert and display as a flipbook

## Files Modified

- Created: `scripts/create-document-pages-bucket.ts`
- No code changes needed - the bucket was the missing piece

## Status

✅ **RESOLVED** - The `document-pages` bucket now exists and preview should work.

## Date
December 2, 2025
