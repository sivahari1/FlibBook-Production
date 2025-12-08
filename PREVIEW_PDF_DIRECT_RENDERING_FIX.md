# Preview/View PDF Direct Rendering Fix

## Problem
The preview/view functionality was still converting PDFs to images instead of using the already-implemented `SimpleDocumentViewer` that can render PDFs directly.

## Root Cause
The system was using an old image-based approach where:
1. PDFs were converted to individual page images
2. These images were stored in Supabase storage
3. The viewer would fetch and display these pre-converted images

This was unnecessary because we already have `SimpleDocumentViewer` that can render PDFs directly using the browser's native PDF viewer.

## Solution
Updated the preview/view flow to use direct PDF rendering:

### Changes Made

1. **PreviewViewerClient.tsx**
   - Removed the page fetching logic that called `/api/documents/[id]/pages`
   - Updated to pass `pdfUrl` directly to `SimpleDocumentViewer`
   - Fixed watermark config type mismatch

2. **SimpleDocumentViewer.tsx**
   - Added `pdfUrl` prop to accept direct PDF URLs
   - Made `pages` prop optional (for backward compatibility)
   - Added logic to render PDF directly in an iframe when `pdfUrl` is provided
   - Falls back to legacy page-based rendering if `pages` are provided instead

3. **page.tsx (Server Component)**
   - Removed the page fetching logic
   - Removed unused imports (`getCachedPageUrls`, `hasCachedPages`)
   - Simplified to just generate the signed PDF URL and pass it to the client

## Benefits

1. **No More Conversion**: PDFs are displayed directly without any conversion process
2. **Faster Loading**: No need to wait for PDF-to-image conversion
3. **Better Quality**: Native PDF rendering provides better quality than converted images
4. **Less Storage**: No need to store converted page images
5. **Simpler Architecture**: Removed unnecessary conversion pipeline

## How It Works Now

```
User clicks Preview/View
    ↓
Server generates signed PDF URL from Supabase
    ↓
Client receives PDF URL
    ↓
SimpleDocumentViewer renders PDF directly in iframe
    ↓
Browser's native PDF viewer displays the document
```

## Testing

To test the fix:
1. Upload a PDF document
2. Click "Preview" or "View" on the document
3. The PDF should load directly without any conversion
4. Zoom, navigation, and watermark features should work

## Backward Compatibility

The system still supports the legacy page-based rendering:
- If `pdfUrl` is provided → Direct PDF rendering
- If `pages` array is provided → Legacy image-based rendering

This ensures existing functionality continues to work while new documents use the improved direct rendering.

## Next Steps

Consider removing the old PDF-to-image conversion code entirely:
- `/api/documents/[id]/pages` endpoint
- `lib/services/pdf-converter.ts`
- `lib/services/page-cache.ts`
- Related conversion scripts

These are no longer needed with direct PDF rendering.
