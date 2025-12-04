# Image Loading Fix - 400 Errors from Supabase Storage

## Problem
Images are loading successfully from Node.js (200 OK) but failing in the browser with 400 Bad Request errors. This indicates a browser-specific issue, likely related to:

1. **Referrer Policy**: Supabase may be rejecting requests with certain referrer headers
2. **CORS Configuration**: Browser security policies blocking cross-origin image requests
3. **Image Attributes**: Missing or incorrect attributes on `<img>` tags

## Root Cause
The FlipBook viewer is using `referrerPolicy="no-referrer"` which may be causing Supabase to reject the requests. Additionally, the images may need proper CORS attributes.

## Solution

### 1. Update Image Loading Attributes
Remove `referrerPolicy="no-referrer"` and use proper CORS settings:

```tsx
<img
  src={imageUrl}
  alt={`Page ${pageNumber}`}
  className="w-full h-full object-contain"
  draggable={false}
  loading="eager"
  decoding="async"
  crossOrigin="anonymous"  // Keep this for CORS
  // Remove: referrerPolicy="no-referrer"  // This causes 400 errors!
  style={{
    imageRendering: 'auto',
    transform: 'translateZ(0)',
    zIndex: 0,
    position: 'relative',
  }}
/>
```

### 2. Verify Supabase Storage Configuration
Ensure the `document-pages` bucket has proper CORS settings:

```sql
-- Check bucket configuration
SELECT * FROM storage.buckets WHERE name = 'document-pages';

-- Ensure bucket is public
UPDATE storage.buckets 
SET public = true 
WHERE name = 'document-pages';
```

### 3. Add Proper Cache Headers
Update the page URLs API to include proper cache and CORS headers.

## Testing
1. Clear browser cache completely
2. Open DevTools Network tab
3. Navigate to document preview
4. Verify images load with 200 OK status
5. Check that no CORS errors appear in console

## Files to Update
- `components/flipbook/FlipBookViewer.tsx` - Remove referrerPolicy
- `components/flipbook/SimpleFlipBookViewer.tsx` - If it exists, update there too
- Supabase storage bucket configuration

## Expected Outcome
- All images load successfully with 200 OK
- No 400 Bad Request errors
- No CORS errors in console
- Full-screen flipbook displays content properly
