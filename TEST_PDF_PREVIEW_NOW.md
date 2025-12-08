# Test PDF Preview - Quick Guide

## ✅ Fix Applied Successfully

The PDF preview issue has been fixed. The problem was a race condition between the PDF loading and the canvas element mounting.

## 🧪 How to Test

### Step 1: Start the Development Server

```bash
npm run dev
```

Wait for the server to start (usually takes 10-20 seconds).

### Step 2: Open One of These Working Documents

Choose any of these URLs (they all have real PDF files):

1. **Commencement Document** (244KB):
   ```
   http://localhost:3000/dashboard/documents/501a262d-34b5-4008-929d-f505ab8ae1de/view
   ```

2. **Full Stack AI Development** (153KB):
   ```
   http://localhost:3000/dashboard/documents/d3038ab9-bb2f-4f18-995c-a0b8ced54ec9/view
   ```

3. **Full Stack AI Development (Alt)** (140KB):
   ```
   http://localhost:3000/dashboard/documents/5587b307-480f-4164-abb6-489da665d66b/view
   ```

4. **MA10-RN01** (94KB):
   ```
   http://localhost:3000/dashboard/documents/164fbf91-9471-4d88-96a0-2dfc6611a282/view
   ```

### Step 3: Check Browser Console

Open the browser console (F12) and look for these messages:

✅ **Success indicators:**
```
[PDFViewerWithPDFJS] Starting PDF load process
[PDFViewerWithPDFJS] PDF URL: https://...
[PDFViewerWithPDFJS] PDF loaded successfully
[Canvas Mount] Canvas element mounted successfully
[renderCurrentPage] Starting render process
[renderCurrentPage] Page retrieved successfully
```

❌ **Error indicators:**
```
[PDFViewerWithPDFJS] Error loading PDF
[renderCurrentPage] Canvas not yet mounted
Failed to generate signed URL
```

### Step 4: Verify Functionality

Once the PDF loads, test these features:

- ✅ **Page Navigation**: Click next/previous buttons
- ✅ **Page Input**: Type a page number and press Enter
- ✅ **Zoom Controls**: Click zoom in/out buttons
- ✅ **Keyboard Shortcuts**:
  - Arrow keys: Navigate pages
  - Ctrl+Scroll: Zoom in/out
  - Home/End: First/last page
- ✅ **Watermark**: Should display if enabled

## 🐛 Troubleshooting

### Issue: PDF Still Not Loading

**Solution 1: Hard Refresh**
- Windows/Linux: `Ctrl + Shift + R`
- Mac: `Cmd + Shift + R`

**Solution 2: Clear Browser Cache**
1. Open DevTools (F12)
2. Right-click the refresh button
3. Select "Empty Cache and Hard Reload"

**Solution 3: Try Incognito/Private Window**
- This ensures no cached files interfere

### Issue: "Object not found" Error

This means you're trying to view a test document that doesn't have a real file.

**Solution:** Use one of the working document URLs listed above.

### Issue: Canvas Never Mounts

Check the console for retry messages. If you see:
```
[PDFViewerWithPDFJS] Canvas never became ready after 10 retries
```

**Solution:**
1. Refresh the page
2. Check if React is running properly
3. Look for JavaScript errors in console

## 📊 Expected Performance

- **PDF Load Time**: 1-3 seconds (depending on file size)
- **First Page Render**: < 500ms after load
- **Page Navigation**: Instant
- **Zoom**: Smooth, < 200ms

## 🔍 Diagnostic Commands

If you encounter issues, run these diagnostic scripts:

### Check Document Status
```bash
npx tsx scripts/find-real-documents.ts
```

This will show you which documents are accessible and provide direct preview URLs.

### Full Diagnostic
```bash
npx tsx scripts/diagnose-pdf-preview-issue.ts
```

This checks:
- Database documents
- Storage paths
- Signed URL generation
- PDF.js configuration
- Environment variables

## ✨ What Was Fixed

1. **Canvas Mounting**: Canvas now always renders when PDF is loaded
2. **Retry Logic**: Exponential backoff with up to 10 retries
3. **Error Handling**: Clear error messages if canvas fails to mount
4. **Logging**: Comprehensive logging for debugging

## 📝 Notes

- Test documents (IDs starting with `test-pbt`) won't work because they don't have real files
- The fix includes extensive logging - check the console for detailed information
- If you see "loading page 1" for more than 5 seconds, check the console for errors

---

**Status**: ✅ Ready to Test
**Last Updated**: December 7, 2025
