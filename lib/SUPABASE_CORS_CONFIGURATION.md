# Supabase Storage CORS Configuration

## Overview

This document describes the CORS (Cross-Origin Resource Sharing) configuration required for PDF.js to fetch PDF documents from Supabase Storage.

**Requirements:** 8.1, 8.3 - CORS headers and signed URL compatibility

## Why CORS Configuration is Needed

PDF.js uses the Fetch API to load PDF documents. When the PDF is hosted on Supabase Storage (a different origin), the browser enforces CORS policies. Without proper CORS configuration, the browser will block the request with errors like:

```
Access to fetch at 'https://xxx.supabase.co/storage/v1/...' from origin 'https://your-app.com' 
has been blocked by CORS policy: No 'Access-Control-Allow-Origin' header is present.
```

## Supabase Storage CORS Configuration

### Method 1: Supabase Dashboard (Recommended)

1. Go to your Supabase project dashboard
2. Navigate to **Storage** → **Configuration** → **CORS**
3. Add the following CORS configuration:

```json
{
  "allowedOrigins": ["*"],
  "allowedMethods": ["GET", "HEAD", "OPTIONS"],
  "allowedHeaders": ["*"],
  "exposedHeaders": ["Content-Length", "Content-Type"],
  "maxAge": 3600
}
```

**For Production:** Replace `"*"` with your specific domain(s):
```json
{
  "allowedOrigins": ["https://your-domain.com", "https://www.your-domain.com"],
  "allowedMethods": ["GET", "HEAD", "OPTIONS"],
  "allowedHeaders": ["*"],
  "exposedHeaders": ["Content-Length", "Content-Type"],
  "maxAge": 3600
}
```

### Method 2: Supabase CLI

If you're using Supabase CLI, add this to your `supabase/config.toml`:

```toml
[storage]
  [storage.cors]
    allowed_origins = ["*"]
    allowed_methods = ["GET", "HEAD", "OPTIONS"]
    allowed_headers = ["*"]
    exposed_headers = ["Content-Length", "Content-Type"]
    max_age = 3600
```

## Bucket-Specific Configuration

Each storage bucket can have its own CORS configuration. For the `documents` bucket used for PDFs:

1. Go to **Storage** → **Buckets** → **documents**
2. Click **Settings** → **CORS**
3. Apply the same configuration as above

## Signed URL Configuration

Our `getSignedUrl` function is configured to work with PDF.js:

```typescript
const { data, error } = await supabaseAdmin.storage
  .from(bucketName)
  .createSignedUrl(path, expiresIn, {
    download: false,  // Critical: Don't force download
    transform: undefined,  // No transformations
  })
```

**Key Points:**
- `download: false` - Allows fetch API to access the file without triggering a download
- Signed URLs automatically include authentication tokens
- CORS headers are applied by Supabase based on bucket configuration

## Testing CORS Configuration

### Test 1: Browser Console

Open your browser console and run:

```javascript
fetch('YOUR_SIGNED_URL')
  .then(response => {
    console.log('Status:', response.status);
    console.log('CORS Headers:', {
      'Access-Control-Allow-Origin': response.headers.get('access-control-allow-origin'),
      'Access-Control-Allow-Methods': response.headers.get('access-control-allow-methods'),
    });
  })
  .catch(error => console.error('CORS Error:', error));
```

### Test 2: cURL

```bash
curl -I "YOUR_SIGNED_URL"
```

Look for these headers in the response:
```
access-control-allow-origin: *
access-control-allow-methods: GET, HEAD, OPTIONS
```

### Test 3: Automated Test Script

Run the verification script:

```bash
npx tsx scripts/verify-storage-cors.ts
```

## Common Issues and Solutions

### Issue 1: "No 'Access-Control-Allow-Origin' header"

**Solution:** Verify CORS is configured in Supabase dashboard for the specific bucket.

### Issue 2: "Method not allowed"

**Solution:** Ensure `GET` and `OPTIONS` methods are in the `allowedMethods` array.

### Issue 3: Signed URLs expire too quickly

**Solution:** Increase the `expiresIn` parameter when calling `getSignedUrl()`:
```typescript
const { url } = await getSignedUrl(path, 7200); // 2 hours
```

### Issue 4: CORS works in development but not production

**Solution:** Update `allowedOrigins` to include your production domain instead of `"*"`.

## Security Considerations

### Development
- Using `"*"` for `allowedOrigins` is acceptable for development
- Allows testing from localhost and any domain

### Production
- **Always** specify exact domains in `allowedOrigins`
- Never use `"*"` in production
- Example:
  ```json
  {
    "allowedOrigins": [
      "https://your-domain.com",
      "https://www.your-domain.com"
    ]
  }
  ```

## Verification Checklist

- [ ] CORS configured in Supabase dashboard
- [ ] `allowedOrigins` includes your domain (or `"*"` for dev)
- [ ] `allowedMethods` includes `GET`, `HEAD`, `OPTIONS`
- [ ] Bucket is public or uses signed URLs
- [ ] `download: false` in `getSignedUrl` options
- [ ] Tested with browser fetch API
- [ ] Tested with PDF.js document loading

## Related Files

- `lib/storage.ts` - Signed URL generation
- `lib/pdfjs-integration.ts` - PDF.js document loading
- `components/viewers/PDFViewerWithPDFJS.tsx` - PDF viewer component
- `scripts/verify-storage-cors.ts` - CORS verification script

## References

- [Supabase Storage CORS Documentation](https://supabase.com/docs/guides/storage/cors)
- [MDN CORS Guide](https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS)
- [PDF.js Documentation](https://mozilla.github.io/pdf.js/)
