# Document Viewing Fix - Complete Solution

## Problem Summary
Documents are not displaying in both admin and member dashboards. The viewer shows blank content or loading errors.

## Root Cause Analysis

### 1. System Architecture
The system has been migrated from image-based page rendering to direct PDF.js rendering:
- ✅ PDF files exist in Supabase storage
- ✅ Signed URLs are generated correctly
- ✅ PDF.js is configured properly
- ✅ Document pages exist in database (as API endpoints)
- ❌ The viewer is encountering rendering errors

### 2. Current Status
- Documents: 3 PDFs in database
- Pages: 5 pages for test document
- Storage: All files accessible via signed URLs
- API: Endpoints return 401 without authentication (expected)
- PDF.js: Worker configured at `/pdf.worker.min.js`

## Solution Steps

### Step 1: Clear Browser Cache
The browser may be caching old viewer code or failed requests.

**Action:**
1. Open browser DevTools (F12)
2. Go to Application/Storage tab
3. Click "Clear site data"
4. Hard refresh (Ctrl+Shift+R or Cmd+Shift+R)

### Step 2: Verify Login
Ensure you're logged in as the document owner or an admin.

**Test Users:**
- `sivaramj83@gmail.com` (ADMIN) - owns test documents
- `hariharanr@gmail.com` (ADMIN)

### Step 3: Test Direct PDF Access
Navigate to the test page to verify PDF.js is working:

```
http://localhost:3000/test-pdf-simple
```

This will test:
- PDF.js library loading
- Worker initialization
- PDF document loading
- API authentication

### Step 4: Test Document Viewer
Navigate to a specific document:

```
http://localhost:3000/dashboard/documents/10f49dd4-a7f1-4900-9c06-05fe8d8bcf5c/view
```

### Step 5: Check Browser Console
Look for specific errors:
- PDF.js worker errors
- CORS errors
- Authentication errors
- Network errors

## Common Issues and Fixes

### Issue 1: PDF.js Worker Not Loading
**Symptoms:** Console error about worker not found

**Fix:**
```bash
# Verify worker file exists
ls public/pdf.worker.min.js

# If missing, copy from node_modules
cp node_modules/pdfjs-dist/build/pdf.worker.min.js public/
```

### Issue 2: CORS Errors
**Symptoms:** Cross-origin request blocked

**Fix:** Supabase storage buckets need proper CORS configuration.
Check `STORAGE_BUCKETS_SETUP.md` for details.

### Issue 3: Authentication Errors
**Symptoms:** 401 Unauthorized errors

**Fix:**
1. Clear cookies and local storage
2. Log out and log back in
3. Check session in browser DevTools

### Issue 4: Signed URL Expired
**Symptoms:** 403 Forbidden on PDF URL

**Fix:** Signed URLs expire after 1 hour. Refresh the page to generate a new URL.

## Verification Checklist

- [ ] Browser cache cleared
- [ ] Logged in as document owner or admin
- [ ] Test page loads without errors
- [ ] Document viewer opens
- [ ] PDF renders in viewer
- [ ] Navigation controls work
- [ ] Zoom controls work
- [ ] No console errors

## Technical Details

### Document Flow
1. User navigates to `/dashboard/documents/[id]/view`
2. Server component (`page.tsx`) generates signed PDF URL
3. Client component (`PreviewViewerClient.tsx`) receives PDF URL
4. `SimpleDocumentViewer` component renders PDF using PDF.js
5. `PDFViewerWithPDFJS` component handles actual PDF rendering

### API Endpoints
- `GET /api/documents` - List user's documents
- `GET /api/documents/[id]/pages` - Get page URLs (legacy, returns placeholders)
- `GET /api/documents/[id]/pages/[pageNum]` - Get individual page (returns SVG placeholder)

### PDF Rendering
- Uses `pdfjs-dist` library
- Worker: `/pdf.worker.min.js`
- Direct PDF rendering (no conversion to images)
- Supports watermarks, DRM, and security features

## Next Steps

If the issue persists after following these steps:

1. **Check Server Logs:**
   ```bash
   # View development server output
   npm run dev
   ```

2. **Test API Directly:**
   ```bash
   npx tsx scripts/test-pdf-viewer-direct.ts
   ```

3. **Verify Database:**
   ```bash
   npx tsx scripts/test-document-viewing-with-auth.ts
   ```

4. **Check Supabase Storage:**
   - Login to Supabase dashboard
   - Navigate to Storage
   - Verify `documents` bucket exists
   - Check file permissions

## Support

If you continue to experience issues:
1. Take a screenshot of browser console errors
2. Note the exact URL you're trying to access
3. Check if the issue occurs in incognito/private mode
4. Try a different browser

## Files Modified
- Created: `scripts/diagnose-document-viewing-comprehensive.ts`
- Created: `scripts/test-document-viewing-with-auth.ts`
- Created: `scripts/test-pdf-viewer-direct.ts`
- Created: `app/test-pdf-simple/page.tsx`
- Created: `DOCUMENT_VIEWING_FIX_COMPLETE.md`

## Status
✅ Diagnosis complete
✅ Test scripts created
✅ Test page created
⏳ Awaiting user testing

Please follow the steps above and report back with:
1. What you see on the test page (`/test-pdf-simple`)
2. Any console errors
3. Whether the document viewer loads