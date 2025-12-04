# Browser Image Loading Fix

## Problem
PDF preview shows blank pages even though:
- ✅ Images exist in Supabase storage
- ✅ URLs are correct and accessible via direct fetch
- ✅ FlipBookContainer successfully preloads all images
- ❌ Browser shows 400 errors when rendering

## Root Cause Analysis

The issue is likely one of:

1. **Browser Cache**: Browser has cached 400 responses from previous failed attempts
2. **CORS Preflight**: Browser OPTIONS requests failing before GET requests
3. **Timing**: Images loading before proper initialization

## Solution

### Step 1: Clear Browser Cache
Users need to hard refresh:
- Chrome/Edge: `Ctrl + Shift + R` or `Ctrl + F5`
- Firefox: `Ctrl + Shift + R`
- Safari: `Cmd + Option + R`

### Step 2: Add Cache Busting
Add timestamp or version parameter to image URLs to bypass cache.

### Step 3: Verify CORS Headers
Ensure Supabase storage bucket has proper CORS configuration.

### Step 4: Add Better Error Handling
Improve error messages to help diagnose issues.

## Implementation

### 1. Add Cache Busting to Image URLs

Update `lib/services/pdf-converter.ts` to add cache-busting parameter:

```typescript
// When generating page URLs, add timestamp
const timestamp = Date.now();
const pageUrl = `${publicUrl}?v=${timestamp}`;
```

### 2. Add Retry Logic with Exponential Backoff

Update `components/flipbook/FlipBookViewer.tsx` Page component:

```typescript
const [retryCount, setRetryCount] = useState(0);
const [imageError, setImageError] = useState(false);

const handleImageError = useCallback((e: React.SyntheticEvent<HTMLImageElement>) => {
  const img = e.currentTarget;
  
  if (retryCount < 3) {
    // Exponential backoff: 1s, 2s, 4s
    const delay = Math.pow(2, retryCount) * 1000;
    
    setTimeout(() => {
      // Add cache-busting parameter
      const url = new URL(img.src);
      url.searchParams.set('retry', String(retryCount + 1));
      url.searchParams.set('t', String(Date.now()));
      img.src = url.toString();
      setRetryCount(prev => prev + 1);
    }, delay);
  } else {
    setImageError(true);
    console.error(`Failed to load page ${pageNumber} after 3 retries:`, imageUrl);
  }
}, [retryCount, pageNumber, imageUrl]);
```

### 3. Add Loading State Indicator

Show which pages are loading vs loaded:

```typescript
const [loadedPages, setLoadedPages] = useState<Set<number>>(new Set());

const handleImageLoad = useCallback(() => {
  setLoadedPages(prev => new Set(prev).add(pageNumber));
}, [pageNumber]);
```

### 4. Verify Supabase CORS Configuration

Run this SQL in Supabase SQL Editor:

```sql
-- Check bucket configuration
SELECT * FROM storage.buckets WHERE name = 'document-pages';

-- Ensure bucket is public
UPDATE storage.buckets 
SET public = true 
WHERE name = 'document-pages';
```

### 5. Add Diagnostic Logging

Add detailed logging to help debug:

```typescript
useEffect(() => {
  console.log('[FlipBookViewer] Rendering pages:', {
    totalPages: pages.length,
    firstPageUrl: pages[0]?.imageUrl?.substring(0, 100),
    dimensions,
    watermarkEnabled: !!watermarkText,
  });
}, [pages, dimensions, watermarkText]);
```

## Testing

1. Clear browser cache completely
2. Open DevTools Network tab
3. Navigate to document preview
4. Check:
   - All image requests return 200 OK
   - No 400 or 404 errors
   - Images display correctly
   - No CORS errors in console

## Immediate Action

**For users experiencing blank pages:**

1. **Hard refresh the page**: `Ctrl + Shift + R`
2. **Clear browser cache**: Settings → Privacy → Clear browsing data
3. **Try incognito/private mode**: This bypasses cache entirely
4. **Check browser console**: Look for specific error messages

## Prevention

1. Add cache-busting to all image URLs
2. Implement proper retry logic
3. Add better error messages
4. Monitor Supabase storage metrics
5. Set up proper CORS headers

## Status

- [x] Diagnosed issue
- [ ] Implement cache busting
- [ ] Add retry logic
- [ ] Update error handling
- [ ] Test in production
- [ ] Document for users
