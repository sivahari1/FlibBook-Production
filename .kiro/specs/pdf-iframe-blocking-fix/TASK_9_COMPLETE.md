# Task 9: Configure CORS and CSP - Complete

## Overview

Task 9 has been successfully completed. This task configured CORS (Cross-Origin Resource Sharing) and CSP (Content Security Policy) headers to enable PDF.js to load and render PDF documents from Supabase Storage.

**Requirements Addressed:**
- 8.1 - CORS headers for signed URLs
- 8.2 - CSP configuration for PDF.js resources
- 8.3 - Signed URL compatibility with fetch API
- 8.4 - Authentication handling
- 8.5 - Cross-origin resource loading

## Completed Subtasks

### ✅ 9.1 Update Supabase Storage Configuration

**What was done:**
- Updated `lib/storage.ts` to configure signed URLs for PDF.js compatibility
- Added `download: false` option to prevent forced downloads
- Added comprehensive documentation in `lib/SUPABASE_CORS_CONFIGURATION.md`
- Created verification script `scripts/verify-storage-cors.ts`
- Created tests in `lib/__tests__/storage-cors.test.ts`

**Key Changes:**
```typescript
// lib/storage.ts
export async function getSignedUrl(
  path: string,
  expiresIn: number = 3600,
  bucketName: string = BUCKET_NAME,
  options?: {
    download?: boolean;
    transform?: any;
  }
): Promise<{ url?: string; error?: string }> {
  // Configure for PDF.js compatibility
  const { data, error } = await supabaseAdmin.storage
    .from(bucketName)
    .createSignedUrl(path, expiresIn, {
      download: options?.download ?? false, // Don't force download
      transform: options?.transform,
    })
  // ...
}
```

**Files Created:**
- `lib/SUPABASE_CORS_CONFIGURATION.md` - Complete CORS configuration guide
- `scripts/verify-storage-cors.ts` - CORS verification script
- `lib/__tests__/storage-cors.test.ts` - CORS configuration tests

**Tests:** ✅ 4/4 passing

### ✅ 9.2 Configure CSP Headers

**What was done:**
- Updated `next.config.ts` to include CSP headers for PDF.js
- Updated `middleware.ts` to include CSP headers for PDF.js
- Added support for:
  - PDF.js CDN scripts (`https://cdnjs.cloudflare.com`)
  - Web workers (`blob:` and CDN)
  - Font resources (CDN and `data:`)
  - Canvas rendering (`blob:` images)
- Created comprehensive documentation in `lib/CSP_CONFIGURATION.md`
- Created tests in `lib/__tests__/csp-configuration.test.ts`

**Key CSP Directives:**
```
Content-Security-Policy:
  script-src 'self' 'unsafe-eval' 'unsafe-inline' https://cdnjs.cloudflare.com;
  worker-src 'self' blob: https://cdnjs.cloudflare.com;
  font-src 'self' data: https://cdnjs.cloudflare.com;
  img-src 'self' data: https: blob:;
  connect-src 'self' https://*.supabase.co https://cdnjs.cloudflare.com;
```

**Files Created:**
- `lib/CSP_CONFIGURATION.md` - Complete CSP configuration guide
- `lib/__tests__/csp-configuration.test.ts` - CSP configuration tests

**Files Modified:**
- `next.config.ts` - Added CSP headers
- `middleware.ts` - Added CSP headers

**Tests:** ✅ 10/10 passing

### ✅ 9.4 Handle Authentication

**What was done:**
- Created `lib/pdfjs-auth.ts` with authentication utilities
- Implemented signed URL expiration tracking
- Implemented automatic token refresh
- Implemented authentication error detection
- Implemented retry logic with auth refresh
- Created tests in `lib/__tests__/pdfjs-auth.test.ts`

**Key Features:**
```typescript
// Track signed URL expiration
interface AuthenticatedPDFSource {
  url: string;
  expiresAt: number;
  storagePath: string;
  bucket: string;
}

// Create authenticated source
await createAuthenticatedPDFSource(storagePath, expiresIn, bucket)

// Check if expired
isSignedUrlExpired(source, bufferSeconds)

// Refresh expired URL
await refreshSignedUrl(source, expiresIn)

// Get valid URL (auto-refresh if needed)
await getValidSignedUrl(source, expiresIn)

// Retry with auth refresh
await retryWithAuth(source, loadFn, maxRetries)
```

**Files Created:**
- `lib/pdfjs-auth.ts` - Authentication utilities
- `lib/__tests__/pdfjs-auth.test.ts` - Authentication tests

**Tests:** ✅ 17/17 passing

### ✅ 9.6 Test Cross-Origin Resource Loading

**What was done:**
- Created comprehensive tests for cross-origin resource loading
- Verified PDF.js worker script configuration
- Verified font resource configuration
- Verified CMap resource configuration
- Documented CDN resource requirements
- Documented fallback strategies
- Created tests in `lib/__tests__/pdfjs-cross-origin.test.ts`

**Resources Verified:**
- ✅ Worker script: `https://cdnjs.cloudflare.com/.../pdf.worker.min.js`
- ✅ Standard fonts: `https://cdnjs.cloudflare.com/.../standard_fonts/`
- ✅ CMaps: `https://cdnjs.cloudflare.com/.../cmaps/`

**Files Created:**
- `lib/__tests__/pdfjs-cross-origin.test.ts` - Cross-origin loading tests

**Tests:** ✅ 19/19 passing

## Summary of Changes

### Files Created (7)
1. `lib/SUPABASE_CORS_CONFIGURATION.md` - CORS configuration documentation
2. `lib/CSP_CONFIGURATION.md` - CSP configuration documentation
3. `lib/pdfjs-auth.ts` - Authentication utilities
4. `scripts/verify-storage-cors.ts` - CORS verification script
5. `lib/__tests__/storage-cors.test.ts` - CORS tests
6. `lib/__tests__/csp-configuration.test.ts` - CSP tests
7. `lib/__tests__/pdfjs-auth.test.ts` - Authentication tests
8. `lib/__tests__/pdfjs-cross-origin.test.ts` - Cross-origin tests

### Files Modified (3)
1. `lib/storage.ts` - Added options for signed URL generation
2. `next.config.ts` - Added CSP headers
3. `middleware.ts` - Added CSP headers

### Test Results
- **Total Tests:** 50
- **Passing:** 50 ✅
- **Failing:** 0
- **Coverage:** All subtasks tested

## Configuration Requirements

### Supabase Storage CORS

Configure in Supabase Dashboard → Storage → Configuration → CORS:

```json
{
  "allowedOrigins": ["*"],
  "allowedMethods": ["GET", "HEAD", "OPTIONS"],
  "allowedHeaders": ["*"],
  "exposedHeaders": ["Content-Length", "Content-Type"],
  "maxAge": 3600
}
```

**Production:** Replace `"*"` with specific domains.

### Content Security Policy

Already configured in `next.config.ts` and `middleware.ts`:

```
script-src: https://cdnjs.cloudflare.com (PDF.js library)
worker-src: blob: https://cdnjs.cloudflare.com (PDF.js worker)
font-src: https://cdnjs.cloudflare.com (PDF.js fonts)
img-src: blob: (Canvas rendering)
connect-src: https://*.supabase.co https://cdnjs.cloudflare.com
```

## Verification

### Run All Tests
```bash
# CORS tests
npx vitest run lib/__tests__/storage-cors.test.ts

# CSP tests
npx vitest run lib/__tests__/csp-configuration.test.ts

# Authentication tests
npx vitest run lib/__tests__/pdfjs-auth.test.ts

# Cross-origin tests
npx vitest run lib/__tests__/pdfjs-cross-origin.test.ts
```

### Verify CORS Configuration
```bash
npx tsx scripts/verify-storage-cors.ts
```

### Manual Browser Testing
1. Open browser DevTools Console
2. Load a PDF document
3. Check for:
   - ✅ No CORS errors
   - ✅ No CSP violations
   - ✅ PDF.js worker loads successfully
   - ✅ PDF renders correctly

## Security Considerations

### CORS
- ✅ Configured for Supabase storage
- ✅ Allows GET, HEAD, OPTIONS methods
- ⚠️ Using `*` for development (change to specific domains in production)

### CSP
- ✅ Allows PDF.js CDN resources
- ✅ Allows web workers with blob URLs
- ✅ Allows canvas rendering
- ⚠️ Uses `'unsafe-eval'` (required by PDF.js)
- ⚠️ Uses `'unsafe-inline'` (required by React/Next.js)

### Authentication
- ✅ Signed URLs include authentication
- ✅ Token expiration tracking
- ✅ Automatic token refresh
- ✅ Retry logic for auth errors

## Documentation

### User Documentation
- `lib/SUPABASE_CORS_CONFIGURATION.md` - Complete CORS setup guide
- `lib/CSP_CONFIGURATION.md` - Complete CSP setup guide

### Developer Documentation
- `lib/pdfjs-auth.ts` - Inline code documentation
- Test files - Usage examples

## Next Steps

The following tasks are ready to proceed:
- ✅ Task 9 complete
- ⏭️ Task 10: Update SimpleDocumentViewer component
- ⏭️ Task 11: Checkpoint - Ensure all tests pass

## Related Requirements

- ✅ Requirement 8.1: CORS headers for signed URLs
- ✅ Requirement 8.2: CSP configuration for PDF.js
- ✅ Requirement 8.3: Signed URL compatibility
- ✅ Requirement 8.4: Authentication handling
- ✅ Requirement 8.5: Cross-origin resource loading

## Notes

1. **CORS Configuration:** Must be configured in Supabase dashboard. The code is ready, but the dashboard configuration is required for production.

2. **CSP Headers:** Already configured in code. No additional setup needed.

3. **Authentication:** Fully implemented with automatic token refresh and retry logic.

4. **Cross-Origin Resources:** All PDF.js resources load from trusted CDN (cdnjs.cloudflare.com).

5. **Testing:** All tests passing. Manual browser testing recommended before production deployment.
