# Buffer to Uint8Array Conversion Fix

## Issue
Document preview was failing with a 500 error:
```
Error fetching pages: Error: Please provide binary data as 'Uint8Array', rather than 'Buffer'
at PDFArray/of(lib.js:36:7:1378)
```

## Root Cause
The `pdf-converter.ts` service was reading the PDF file using Node.js `fs.readFile()`, which returns a `Buffer` object. This Buffer was being passed directly to `pdfjsLib.getDocument()`, but the pdf.js library expects a `Uint8Array` instead.

## Solution
Convert the Buffer to Uint8Array before passing it to pdf.js:

```typescript
// Before (causing error):
const pdfData = await fs.readFile(pdfPath);
const loadingTask = pdfjsLib.getDocument({
  data: pdfData,  // Buffer - incompatible!
  useSystemFonts: true,
});

// After (fixed):
const pdfData = await fs.readFile(pdfPath);
const pdfUint8Array = new Uint8Array(pdfData);  // Convert to Uint8Array
const loadingTask = pdfjsLib.getDocument({
  data: pdfUint8Array,  // Uint8Array - compatible!
  useSystemFonts: true,
});
```

## Files Modified
- `lib/services/pdf-converter.ts` - Added Buffer to Uint8Array conversion on line 89

## Testing
After this fix:
1. Document preview should trigger automatic conversion
2. Conversion API should successfully process PDFs
3. Pages should be generated and displayed in the flipbook viewer

## Related Requirements
- Requirement 1.1: Document preview functionality
- Requirement 2.1: PDF to image conversion
- Requirement 3.1: Error handling with clear messages

## Troubleshooting Preview Issues

If clicking "Preview" opens the same page again or redirects to dashboard:

### Quick Checks:
1. **Check browser console** - Look for JavaScript errors or failed API calls
2. **Check Network tab** - See if the preview page is loading or redirecting
3. **Verify document exists** - Make sure the document was uploaded successfully

### Diagnostic Script:
Run the diagnostic script to identify the issue:
```bash
npx tsx scripts/diagnose-preview-issue.ts <documentId> <userId>
```

### Common Issues:

**Issue: Page redirects to dashboard**
- Cause: Document not found or ownership mismatch
- Solution: Verify document ID and user authentication

**Issue: "Failed to Load Document" error**
- Cause: PDF conversion failed (Buffer/Uint8Array issue - now fixed)
- Solution: Refresh the page to retry conversion

**Issue: Blank page or infinite loading**
- Cause: Client-side JavaScript error
- Solution: Check browser console for errors

### Manual Testing:
1. Upload a new PDF document
2. Click "Preview" button
3. Wait for watermark settings page to load
4. Configure watermark and click "Start Preview"
5. Document should convert automatically if needed
6. Flipbook viewer should display pages

## Status
✅ Fixed - Ready for testing
⚠️  If issues persist, run diagnostic script above
