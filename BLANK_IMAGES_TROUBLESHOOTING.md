# Blank Images in Supabase Storage - Troubleshooting Guide

## Problem

You're seeing blank/white images in Supabase storage (around 3-4 KB in size) instead of actual PDF page content.

## Root Cause

The PDF to image conversion process was not properly awaiting the rendering completion before exporting the canvas. This has been fixed in the codebase, but existing documents still have blank pages.

## Solution Overview

1. **Diagnose** - Identify which documents have blank pages
2. **Reconvert** - Regenerate the images for affected documents
3. **Verify** - Confirm the images now have content

## Step 1: Diagnose Blank Images

Run the diagnostic script to see which documents have blank pages:

```bash
# Check all documents
npm run diagnose-blank-images

# Check a specific document
npm run diagnose-blank-images <documentId>
```

This will show you:
- Which documents have blank pages
- Average file size per document
- Specific page numbers that are blank
- Public URLs to manually inspect images

### Example Output

```
🔍 Analyzing all documents for blank images...

Found 5 PDF documents

📊 SUMMARY
================================================================================

Total documents analyzed: 5
✅ OK: 2 documents
⚠️  WARNING: 1 documents (some blank pages)
🚨 CRITICAL: 2 documents (all pages blank)

🚨 CRITICAL DOCUMENTS (All pages blank):
--------------------------------------------------------------------------------

📄 sample-document.pdf
   ID: 1e4d5f91-3e74-4d8b-9d6a-0b1c2d3e4f5a
   Pages: 6
   Avg size: 3.54 KB
   Status: ALL PAGES BLANK
```

## Step 2: Reconvert Documents

### Option A: Reconvert a Specific Document

If you know which document has blank pages:

```bash
npm run reconvert-document <documentId>
```

Example:
```bash
npm run reconvert-document 1e4d5f91-3e74-4d8b-9d6a-0b1c2d3e4f5a
```

### Option B: Reconvert All Blank Documents

To automatically find and reconvert all documents with blank pages:

```bash
npm run reconvert-document
```

This will:
1. Scan all PDF documents
2. Identify those with blank pages (avg size < 10 KB)
3. Download the original PDF from storage
4. Delete the blank images
5. Reconvert with the fixed code
6. Verify the new images have content

### What Happens During Reconversion

```
🔄 Reconverting document: 1e4d5f91-3e74-4d8b-9d6a-0b1c2d3e4f5a
================================================================================
📄 Document: sample-document.pdf
👤 User: user-123
📊 Current avg page size: 3.54 KB
⚠️  Document has blank pages, reconverting...
📥 Downloading PDF from storage...
🗑️  Deleting existing pages...
🔄 Starting conversion...
[Converter] Rendering page 1: { width: 1200, height: 1600, scale: 2.08 }
[Converter] ✅ Page 1 rendered to canvas successfully
[Converter] Canvas exported to PNG: { pageNumber: 1, bufferSize: 245678, sizeKB: '239.92' }
[Converter] Optimized to JPEG: { pageNumber: 1, originalKB: '239.92', optimizedKB: '87.45', compressionRatio: '63.5%' }
[Converter] ✅ Page 1 uploaded successfully
...
✅ Conversion completed in 8543ms
📄 Converted 6 pages
📊 New avg page size: 92.34 KB
✅ SUCCESS: Pages now have content
```

## Step 3: Verify the Fix

After reconversion, verify the images are no longer blank:

```bash
# Check the specific document
npm run diagnose-blank-images <documentId>

# Or check all documents again
npm run diagnose-blank-images
```

You should see:
- Average page size > 50 KB (typically 80-150 KB)
- No pages flagged as "BLANK"
- Status changed from "CRITICAL" to "OK"

### Manual Verification

You can also manually check the images:

1. Go to Supabase Dashboard → Storage → document-pages bucket
2. Navigate to `<userId>/<documentId>/`
3. Download a page image (e.g., `page-1.jpg`)
4. Open it - you should see actual PDF content, not a blank white page

## Understanding the Fix

The code has been updated with these critical fixes:

### 1. Disabled Web Workers
```typescript
// Workers don't work in Node.js
pdfjsLib.GlobalWorkerOptions.workerSrc = '';
pdfjsLib.GlobalWorkerOptions.workerPort = null;
```

### 2. Proper Render Await
```typescript
// MUST await the render promise completely
const renderTask = page.render({ canvasContext, viewport });
await renderTask.promise; // ✅ Wait for rendering to complete
```

### 3. PNG Export Before JPEG
```typescript
// Export to lossless PNG first
const pngBuffer = canvas.toBuffer('image/png');

// Then optimize to JPEG
const jpegBuffer = await sharp(pngBuffer)
  .jpeg({ quality: 85 })
  .toBuffer();
```

### 4. Blank Page Detection
```typescript
// Verify we have actual content
if (pngBuffer.length < 10000) {
  throw new Error('Page appears to be blank');
}
```

## Troubleshooting

### Issue: Reconversion Still Produces Blank Pages

If pages are still blank after reconversion:

1. **Check the logs** - Look for error messages during conversion
2. **Verify PDF is valid** - Try opening the PDF locally
3. **Check dependencies** - Ensure `canvas` and `pdfjs-dist` are installed correctly
4. **Test locally** - Run conversion on your local machine first

```bash
# Test locally with a sample PDF
npm run test-pdf-complete
```

### Issue: "Failed to download PDF from storage"

The original PDF might not be in Supabase storage. Check:

1. Is the PDF in the `documents` bucket?
2. Is the storage path correct: `<userId>/<documentId>/<filename>`?
3. Do you have the correct Supabase credentials?

### Issue: Conversion is Slow

Large PDFs or many pages can take time:

- Expected: ~1-2 seconds per page
- For a 50-page PDF: ~60-100 seconds
- The script processes pages in parallel (4 at a time)

## Prevention

To prevent blank pages in the future:

1. **The fix is already in the code** - New conversions will work correctly
2. **Monitor new uploads** - Check file sizes after conversion
3. **Set up alerts** - Alert if average page size < 10 KB

## Quick Reference

```bash
# Diagnose all documents
npm run diagnose-blank-images

# Diagnose specific document
npm run diagnose-blank-images <documentId>

# Reconvert specific document
npm run reconvert-document <documentId>

# Reconvert all blank documents
npm run reconvert-document

# Verify a document's pages
npm run verify-pdf <documentId>
```

## Need Help?

If you're still seeing blank images after following this guide:

1. Check the console logs for error messages
2. Verify the PDF file is valid and not corrupted
3. Try converting a different PDF to isolate the issue
4. Check that all dependencies are installed: `npm install`

## Technical Details

For more technical information about the fix, see:
- `.kiro/specs/pdf-blank-pages-fix/requirements.md` - Problem description
- `.kiro/specs/pdf-blank-pages-fix/design.md` - Technical solution
- `.kiro/specs/pdf-blank-pages-fix/tasks.md` - Implementation tasks
- `lib/services/pdf-converter.ts` - Fixed converter code
