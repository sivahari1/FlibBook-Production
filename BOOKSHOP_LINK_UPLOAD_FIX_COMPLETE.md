# BookShop Link Upload Fix - Complete

## Issue Summary
The BookShop link upload feature was failing with a 403 Forbidden error when trying to fetch metadata from URLs. Additionally, error messages were being displayed as `[object Object]` instead of meaningful error text.

## Root Causes

### 1. HTTP 403 Forbidden Errors
- The link processor was making requests without proper browser headers
- Many websites block automated requests that don't look like real browsers
- The User-Agent header alone wasn't sufficient

### 2. Error Message Display Issues
- The logger's `error()` method signature was being misused
- Error objects were being passed as context instead of as the error parameter
- This caused errors to be serialized as `[object Object]`

### 3. BigInt Serialization Error
- Prisma's `fileSize` field is defined as `BigInt` in the schema
- JavaScript's `JSON.stringify()` cannot serialize BigInt values natively
- The API was returning document data with BigInt values without conversion
- This caused "Do not know how to serialize a BigInt" errors

### 4. CORS / Client-Side Fetch Error
- The `LinkUploader` component was trying to fetch external URLs directly from the browser
- Browsers block cross-origin requests due to CORS (Cross-Origin Resource Sharing) restrictions
- Most websites don't allow fetching their content from other domains
- This caused "Failed to fetch" errors when trying to get link metadata

## Fixes Applied

### 1. Enhanced Link Processor (`lib/link-processor.ts`)

**Added comprehensive browser headers:**
```typescript
headers: {
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.5',
  'Accept-Encoding': 'gzip, deflate, br',
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
  'Cache-Control': 'no-cache',
  'Pragma': 'no-cache',
}
```

**Graceful handling of 403/401 errors:**
```typescript
if (response.status === 403 || response.status === 401) {
  console.warn(`Access denied for URL ${url}, returning basic metadata`);
  return {
    title: this.extractDomain(url),
    description: `Link to ${this.extractDomain(url)}`
  };
}
```

**Increased timeout:**
- Changed from 10 seconds to 15 seconds to handle slower websites

### 2. Fixed Logger Usage (`app/api/admin/bookshop/route.ts`)

**Before:**
```typescript
logger.error('Error creating Book Shop item', {
  error: error instanceof Error ? error.message : 'Unknown error',
  stack: error instanceof Error ? error.stack : undefined
})
```

**After:**
```typescript
logger.error('Error creating Book Shop item', error)
```

### 3. Improved Error Messages (`app/admin/bookshop/page.tsx`)

**Added better error handling:**
```typescript
const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred'
console.error('BookShop creation error:', errorMessage)
throw new Error(errorMessage)
```

### 4. Fixed BigInt Serialization (`app/api/admin/bookshop/route.ts`)

**Convert BigInt to string before JSON response:**
```typescript
// For POST endpoint
const response = {
  ...bookShopItem,
  document: bookShopItem.document ? {
    ...bookShopItem.document,
    fileSize: bookShopItem.document.fileSize.toString()
  } : null
}

// For GET endpoint
const itemsResponse = items.map(item => ({
  ...item,
  document: item.document ? {
    ...item.document,
    fileSize: item.document.fileSize.toString()
  } : null
}))
```

### 5. Fixed CORS Issue - Server-Side Metadata Fetching

**Created API route** (`app/api/link-metadata/route.ts`):
```typescript
export async function POST(request: NextRequest) {
  const { url } = await request.json()
  const linkProcessor = new LinkProcessor()
  const metadata = await linkProcessor.processLink(url)
  return NextResponse.json({ success: true, metadata })
}
```

**Updated LinkUploader** (`components/upload/LinkUploader.tsx`):
```typescript
// Now calls API route instead of fetching directly
const response = await fetch('/api/link-metadata', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ url: urlString }),
});
```

## Benefits

1. **Better Success Rate**: Requests now look like real browsers, reducing 403 errors
2. **Graceful Degradation**: When metadata fetching fails, basic metadata is created instead of complete failure
3. **Clear Error Messages**: Users now see meaningful error messages instead of `[object Object]`
4. **Better Debugging**: Console logs now show actual error messages for troubleshooting
5. **Longer Timeout**: Handles slower websites better with 15-second timeout
6. **Proper JSON Serialization**: BigInt values are now converted to strings, preventing serialization errors
7. **No CORS Issues**: Metadata fetching happens server-side, bypassing browser CORS restrictions

## Testing

To test the fix:

1. Navigate to `/admin/bookshop`
2. Click "Create New Item"
3. Select "Link" as content type
4. Enter a URL (try various websites)
5. Fill in other required fields
6. Submit the form

**Expected behavior:**
- Most URLs should now work without 403 errors
- If a website still blocks the request, you'll see basic metadata instead of an error
- Any errors will show meaningful messages instead of `[object Object]`

## Files Modified

1. `lib/link-processor.ts` - Enhanced HTTP headers and error handling
2. `app/api/admin/bookshop/route.ts` - BigInt serialization + logger fixes
3. `app/api/admin/bookshop/[id]/route.ts` - BigInt serialization + logger fixes
4. `app/admin/bookshop/page.tsx` - Improved error message display
5. `app/api/link-metadata/route.ts` - **NEW** Server-side metadata fetching API
6. `components/upload/LinkUploader.tsx` - Updated to use server-side API

## Status

✅ **COMPLETE** - All fixes have been applied and tested.

The BookShop link upload feature now handles various websites more reliably and provides better error feedback to users.
