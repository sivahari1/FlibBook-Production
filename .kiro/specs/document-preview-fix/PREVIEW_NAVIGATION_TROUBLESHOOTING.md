# Preview Navigation Troubleshooting Guide

## Issue Description
When clicking the "Preview" button on a document card, the page either:
- Opens the same page again
- Redirects back to the dashboard
- Shows a blank page

## Root Causes Fixed

### 1. Buffer to Uint8Array Conversion (✅ FIXED)
**Problem**: PDF conversion was failing with error:
```
Error: Please provide binary data as 'Uint8Array', rather than 'Buffer'
```

**Solution**: Added conversion in `lib/services/pdf-converter.ts`:
```typescript
const pdfData = await fs.readFile(pdfPath);
const pdfUint8Array = new Uint8Array(pdfData);  // ← Added this line
const loadingTask = pdfjsLib.getDocument({
  data: pdfUint8Array,  // ← Now uses Uint8Array
  useSystemFonts: true,
});
```

### 2. Automatic Conversion Trigger (✅ IMPLEMENTED)
**Feature**: PreviewClient now automatically triggers PDF conversion if no pages exist
- Eliminates manual conversion step
- Shows clear loading messages
- Handles conversion errors gracefully

## Debugging Steps

### Step 1: Check Browser Console
1. Open the document preview page
2. Press F12 to open Developer Tools
3. Go to the "Console" tab
4. Look for any red error messages

**Common errors to look for:**
- `Failed to fetch` - Network/API issue
- `Unauthorized` - Authentication problem
- `Document not found` - Document ID issue

### Step 2: Check Network Tab
1. In Developer Tools, go to "Network" tab
2. Click the "Preview" button
3. Watch for:
   - `/dashboard/documents/[id]/preview` - Should load successfully (200 status)
   - `/api/documents/[id]/pages` - Should return page data or trigger conversion
   - `/api/documents/convert` - Should run if no pages exist

**Red flags:**
- 401/403 status - Authentication issue
- 404 status - Document not found
- 500 status - Server error (check error message)
- 302/307 status - Redirect (indicates page is redirecting away)

### Step 3: Run Diagnostic Script
```bash
npx tsx scripts/diagnose-preview-issue.ts <documentId> <userId>
```

**How to get the IDs:**
1. Go to your dashboard
2. Open browser console (F12)
3. Type: `document.querySelector('[data-document-id]')?.dataset.documentId`
4. Or look at the URL when you click Preview: `/dashboard/documents/[THIS-IS-THE-ID]/preview`

### Step 4: Check Server Logs
If running locally:
1. Look at your terminal where `npm run dev` is running
2. Check for errors when you click Preview
3. Look for:
   - Database connection errors
   - Supabase storage errors
   - PDF conversion errors

## Expected Flow

### Successful Preview Flow:
1. **Click Preview** → Opens `/dashboard/documents/[id]/preview` in new tab
2. **Server-side** → Authenticates user, fetches document, generates signed URL
3. **Client loads** → Shows watermark settings page
4. **Click "Start Preview"** → Calls `/api/documents/[id]/pages`
5. **If no pages** → Automatically calls `/api/documents/convert`
6. **Conversion runs** → Converts PDF to images (using fixed Uint8Array code)
7. **Pages load** → FlipBook viewer displays document

### Where It Can Fail:
- **Step 2**: Document not found → Redirects to dashboard
- **Step 2**: User not authenticated → Redirects to login
- **Step 2**: Signed URL fails → Redirects to dashboard
- **Step 4**: API call fails → Shows error message
- **Step 5**: Conversion fails → Shows error message (was failing before fix)

## Quick Fixes

### If Preview Button Does Nothing:
```javascript
// Check if button click is working
// In browser console:
document.querySelector('button:has-text("Preview")')?.addEventListener('click', (e) => {
  console.log('Preview clicked!', e);
});
```

### If Page Redirects Immediately:
1. Check if you're logged in
2. Verify document belongs to your account
3. Check server logs for redirect reason

### If Conversion Fails:
1. Verify Supabase storage is configured
2. Check `document-pages` bucket exists
3. Ensure service role key is set in `.env`
4. Try uploading a different PDF

### If Pages Don't Load:
1. Check browser console for errors
2. Verify `/api/documents/[id]/pages` returns data
3. Check if conversion completed successfully
4. Look for CORS or network errors

## Testing Checklist

- [ ] Upload a new PDF document
- [ ] Click "Preview" button
- [ ] Verify new tab opens with preview URL
- [ ] Check watermark settings page loads
- [ ] Configure watermark settings
- [ ] Click "Start Preview"
- [ ] Verify loading message appears
- [ ] Wait for conversion (if needed)
- [ ] Confirm flipbook viewer displays pages
- [ ] Test page navigation
- [ ] Verify watermark is visible

## Still Having Issues?

### Collect This Information:
1. **Browser console errors** (screenshot or copy text)
2. **Network tab** (filter by "documents" and "api")
3. **Document ID** (from URL or console)
4. **User ID** (from session or database)
5. **Server logs** (if running locally)

### Common Solutions:
- **Clear browser cache** and try again
- **Re-upload the document** if it's corrupted
- **Check environment variables** are set correctly
- **Restart development server** to pick up code changes
- **Verify database connection** is working

## Related Files
- `lib/services/pdf-converter.ts` - PDF conversion logic (Buffer fix applied here)
- `app/dashboard/documents/[id]/preview/page.tsx` - Server-side preview page
- `app/dashboard/documents/[id]/preview/PreviewClient.tsx` - Client-side preview logic
- `app/api/documents/[id]/pages/route.ts` - Pages API endpoint
- `app/api/documents/convert/route.ts` - Conversion API endpoint
- `components/dashboard/DocumentCard.tsx` - Preview button implementation
