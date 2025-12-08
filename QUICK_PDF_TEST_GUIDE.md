# Quick PDF Loading Test Guide

## 🚀 Fastest Way to Test

### Method 1: Browser Test Page (30 seconds)
```bash
# 1. Start dev server
npm run dev

# 2. Open browser to:
http://localhost:3000/test-pdf-loading

# 3. Select a PDF and click "Run Test"
# 4. Watch for all green checkmarks ✅
```

### Method 2: Test Real PDF Viewer (1 minute)
```bash
# 1. Start dev server
npm run dev

# 2. Login to your app
# 3. Upload a PDF or open existing one
# 4. Click to view the PDF
# 5. Should load smoothly with progress bar
```

## ✅ What Success Looks Like

### In Test Page:
```
✅ Database Query - Found: Your Document.pdf
✅ Signed URL - Generated signed URL
✅ PDF Fetch - Fetched in 234ms
✅ ArrayBuffer - Converted to ArrayBuffer
✅ Uint8Array - Converted to Uint8Array
✅ PDF Validation - Valid PDF header detected
✅ PDF.js Loading - Loaded in 456ms
✅ Page Rendering - Page loaded successfully
✅ Complete - All tests passed!
```

### In Real Viewer:
- Progress bar: 0% → 100%
- PDF loads in 2-10 seconds
- Pages render clearly
- No errors in console
- Zoom/navigation works

## ❌ What Failure Looks Like

### Common Issues:

**1. "PDF file not found"**
```
❌ Signed URL - Failed to create signed URL
```
**Fix**: Check Supabase storage permissions

**2. "Invalid PDF header"**
```
❌ PDF Validation - Invalid PDF header
```
**Fix**: File is corrupted or not a PDF

**3. "Network error"**
```
❌ PDF Fetch - HTTP 403: Forbidden
```
**Fix**: Check Supabase RLS policies

**4. "Loading timed out"**
```
❌ PDF.js Loading - Timeout after 30000ms
```
**Fix**: Check network connection or file size

## 🔍 Quick Debugging

### Check Browser Console:
```javascript
// Look for these logs:
[loadPDFDocument] Starting PDF load
[loadPDFDocument] PDF document loaded successfully
[loadPDFDocument] Number of pages: X

// If you see errors:
[loadPDFDocument] Error occurred: ...
// Read the error message for specific issue
```

### Check Network Tab:
1. Open DevTools → Network
2. Look for PDF request
3. Check:
   - Status: Should be 200
   - Size: Should match file size
   - Time: Should be reasonable

## 🎯 Quick Fixes

### Issue: PDF not loading
```bash
# 1. Check environment variables
cat .env.local | grep SUPABASE

# 2. Verify Supabase connection
# Open: http://localhost:3000/test-pdf-loading

# 3. Check storage bucket
# Login to Supabase dashboard → Storage → documents
```

### Issue: Slow loading
```bash
# Check file size
# Large PDFs (>10MB) take longer

# Solution: Pre-convert to images
npm run convert-document <documentId>
```

### Issue: Blank pages
```bash
# Check if converted
# Look in Supabase: document_pages bucket

# If empty, convert:
npm run convert-document <documentId>
```

## 📊 Performance Benchmarks

| File Size | Expected Load Time |
|-----------|-------------------|
| < 1 MB    | 1-2 seconds      |
| 1-5 MB    | 2-5 seconds      |
| 5-10 MB   | 5-10 seconds     |
| 10-50 MB  | 10-20 seconds    |
| > 50 MB   | 20-30 seconds    |

## 🛠️ Troubleshooting Commands

```bash
# Test Supabase connection
npm run test:supabase

# Check document in database
npm run check-document <documentId>

# Convert PDF to pages
npm run convert-document <documentId>

# View all documents
npm run list-documents
```

## 📞 Still Having Issues?

1. **Check the logs**:
   - Browser console (F12)
   - Look for red errors
   - Read error messages

2. **Run the test page**:
   - `/test-pdf-loading`
   - See which step fails
   - Check the details

3. **Verify the file**:
   - Is it a valid PDF?
   - Can you open it locally?
   - Is it corrupted?

4. **Check permissions**:
   - Supabase RLS policies
   - Storage bucket permissions
   - User authentication

## ✨ Success Checklist

- [ ] Test page shows all green checkmarks
- [ ] Real PDF loads with progress bar
- [ ] Pages render clearly
- [ ] No console errors
- [ ] Zoom works
- [ ] Navigation works
- [ ] Multiple PDFs work

## 🎉 You're Done!

If all tests pass, your PDF loading is working perfectly!

**Next**: Try uploading and viewing different PDFs to ensure everything works smoothly.

---

**Need Help?** Check `PDF_LOADING_FIX_SUMMARY.md` for detailed information.
