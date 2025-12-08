# Viewer Showing Blank White Pages - Diagnosis & Fix

## Issue
When clicking "Preview" on a PDF document, the viewer shows a blank white page instead of the document content.

## Root Cause
The document has been converted to images, but the images themselves are blank/white. This is a known issue with the PDF-to-image conversion process.

## Diagnosis Steps

### 1. Check if document has pages
```bash
npx tsx scripts/check-specific-document.ts
```

### 2. Check image URLs
The document `164fbf91-9471-4d88-96a0-2dfc6611a282` has 6 pages with URLs like:
```
https://zuhrivibcgudgsejsljo.supabase.co/storage/v1/object/public/document-pages/cmi2xriym00009u9gegjddd8j/164fbf91-9471-4d88-96a0-2dfc6611a282/page-1.jpg
```

### 3. Test image accessibility
Open one of the image URLs directly in your browser. If you see:
- **404 Error**: Images were not uploaded to Supabase
- **Blank/White Image**: Images were uploaded but conversion failed
- **Actual Content**: The viewer has a rendering issue

## Solutions

### Solution 1: Reconvert the Document
If the images are blank, reconvert the PDF:

```bash
# Identify documents with blank pages
npx tsx scripts/identify-blank-page-documents.ts

# Reconvert a specific document
npx tsx scripts/reconvert-single-document.ts 164fbf91-9471-4d88-96a0-2dfc6611a282

# Or reconvert all blank documents
npx tsx scripts/reconvert-blank-documents.ts
```

### Solution 2: Check Supabase Storage
1. Go to your Supabase dashboard
2. Navigate to Storage > document-pages bucket
3. Find the folder for your user ID and document ID
4. Check if the images exist and are not blank

### Solution 3: Upload a New PDF
If reconversion doesn't work:
1. Delete the problematic document
2. Upload a new PDF file
3. The system will automatically convert it

## Prevention

### Use High-Quality PDFs
- Ensure PDFs are not password-protected
- Avoid scanned PDFs with poor quality
- Use PDFs with actual text content (not just images)

### Monitor Conversion
Check the conversion logs:
```bash
# Check recent conversions
npx tsx scripts/verify-pdf-conversion.ts
```

## Technical Details

### Why Images Are Blank
Common causes:
1. **PDF.js rendering issue**: The PDF has complex graphics that don't render correctly
2. **Memory limits**: Large PDFs may fail to convert properly
3. **Corrupted PDF**: The source PDF file is damaged
4. **Missing fonts**: PDF uses fonts not available on the server

### Viewer Architecture
The viewer works as follows:
1. PDF is uploaded → stored in Supabase
2. Conversion process → PDF pages → JPG images → stored in Supabase
3. Viewer loads → fetches page URLs from API → displays images

If step 2 produces blank images, the viewer will show blank pages.

## Quick Fix for Testing

To test if the viewer works with a good PDF:
1. Find a simple PDF (like a text document)
2. Upload it through the dashboard
3. Wait for conversion (check console logs)
4. Click "Preview" to view

## Browser Console Debugging

Open Developer Tools (F12) and check:

### Console Tab
Look for errors like:
- `Failed to load image`
- `404 Not Found`
- `CORS error`

### Network Tab
1. Filter by "Img"
2. Check if page-1.jpg, page-2.jpg, etc. are loading
3. Click on an image request to see:
   - Status: Should be 200
   - Preview: Should show the actual page content (not blank)

### Elements Tab
1. Find the `<img>` element for a page
2. Check if `src` attribute has the correct URL
3. Check computed styles to ensure image is visible

## Next Steps

1. **Test image URL directly** in browser
2. **Check browser console** for errors
3. **Reconvert the document** if images are blank
4. **Upload a new test PDF** to verify the system works

## Related Files
- `app/dashboard/documents/[id]/view/PreviewViewerClient.tsx` - Main viewer component
- `components/viewers/SimpleDocumentViewer.tsx` - PDF viewer
- `components/viewers/ContinuousScrollView.tsx` - Page rendering
- `app/api/documents/[id]/pages/route.ts` - API endpoint for page URLs
- `scripts/reconvert-single-document.ts` - Reconversion script
