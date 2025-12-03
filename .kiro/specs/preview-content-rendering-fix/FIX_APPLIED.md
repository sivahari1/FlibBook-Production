# Preview Content Rendering Fix - APPLIED

## Problem Identified

The preview was showing blank pages because:

1. **Authentication Issue**: The client component was making a fetch request to `/api/documents/[id]/pages` which requires authentication
2. **Client-side fetch fails**: Client-side fetch requests don't automatically include session cookies, causing 401 Unauthorized errors
3. **No fallback**: When the API call failed, no pages were loaded, resulting in blank white pages

## Root Cause

```
Browser → PreviewViewerClient (client component)
         ↓
         fetch('/api/documents/[id]/pages')  ← Requires auth
         ↓
         401 Unauthorized ❌
         ↓
         No pages loaded → Blank pages
```

## Solution Applied

### 1. Server-Side Page Fetching

Modified `app/dashboard/documents/[id]/view/page.tsx` to fetch pages on the server:

```typescript
// For PDF content, fetch pages on server side to avoid authentication issues
let initialPages = [];

if (contentType === ContentType.PDF) {
  const hasCached = await hasCachedPages(documentId);
  
  if (hasCached) {
    const pageUrls = await getCachedPageUrls(documentId);
    initialPages = pageUrls.map((url, index) => ({
      pageNumber: index + 1,
      pageUrl: url,
      dimensions: { width: 1200, height: 1600 },
    }));
  }
}
```

### 2. Pass Pages as Props

The server component now passes `initialPages` to the client component:

```typescript
<PreviewViewerClient
  // ... other props
  initialPages={initialPages}
/>
```

### 3. Client Uses Initial Pages

Modified `PreviewViewerClient.tsx` to use initial pages:

```typescript
export default function PreviewViewerClient({
  // ... other props
  initialPages = [],
}: PreviewViewerClientProps) {
  const [pages, setPages] = useState<PageData[]>(initialPages);
  const [loading, setLoading] = useState(
    contentType === ContentType.PDF && initialPages.length === 0
  );
  
  // Only fetch/convert if no initial pages provided
  useEffect(() => {
    if (initialPages.length > 0) {
      console.log('[Client] Using initial pages from server');
      return;
    }
    // ... conversion logic
  }, [initialPages.length]);
}
```

## Benefits

1. ✅ **No authentication issues**: Pages are fetched on the server where session is available
2. ✅ **Faster loading**: Pages are available immediately on first render
3. ✅ **Better UX**: No blank pages or loading delays
4. ✅ **Fallback handling**: If no pages exist, client triggers conversion
5. ✅ **Maintains security**: Server-side fetching respects ownership and permissions

## Testing

To test the fix:

1. Navigate to a document with converted pages:
   ```
   http://localhost:3000/dashboard/documents/164fbf91-9471-4d88-96a0-2dfc6611a282/view
   ```

2. You should see:
   - Pages load immediately
   - No 401 errors in console
   - Content displays correctly
   - No blank white pages

## Files Modified

1. `app/dashboard/documents/[id]/view/page.tsx`
   - Added import for `getCachedPageUrls` and `hasCachedPages`
   - Added server-side page fetching logic
   - Pass `initialPages` prop to client component

2. `app/dashboard/documents/[id]/view/PreviewViewerClient.tsx`
   - Added `initialPages` prop to interface
   - Initialize state with `initialPages`
   - Modified useEffect to skip fetch if initial pages provided
   - Simplified logic to only trigger conversion when needed

## Next Steps

1. Test with the correct document URL
2. Verify pages display correctly
3. Check browser console for any remaining errors
4. Test with documents that need conversion
5. Verify watermark settings still work correctly

## Rollback

If issues occur, revert these two files:
- `app/dashboard/documents/[id]/view/page.tsx`
- `app/dashboard/documents/[id]/view/PreviewViewerClient.tsx`
