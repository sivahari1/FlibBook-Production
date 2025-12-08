# Content Security Policy (CSP) Configuration for PDF.js

## Overview

This document describes the Content Security Policy (CSP) configuration required for PDF.js to function properly in the application.

**Requirements:** 8.2 - CSP configuration for PDF.js

## Why CSP Configuration is Needed

Content Security Policy (CSP) is a security feature that helps prevent cross-site scripting (XSS) and other code injection attacks. However, PDF.js requires specific CSP directives to function:

1. **Script execution** - PDF.js needs to load from CDN and execute JavaScript
2. **Web Workers** - PDF.js uses web workers for PDF parsing
3. **Font loading** - PDF.js loads fonts and character maps
4. **Canvas rendering** - PDF.js renders to canvas elements
5. **Network requests** - PDF.js fetches PDF documents and resources

## CSP Directives for PDF.js

### Complete CSP Configuration

```
Content-Security-Policy:
  default-src 'self';
  script-src 'self' 'unsafe-eval' 'unsafe-inline' https://cdnjs.cloudflare.com;
  worker-src 'self' blob: https://cdnjs.cloudflare.com;
  style-src 'self' 'unsafe-inline';
  img-src 'self' data: https: blob:;
  font-src 'self' data: https://cdnjs.cloudflare.com;
  connect-src 'self' https://*.supabase.co https://cdnjs.cloudflare.com;
  object-src 'none';
  base-uri 'self';
  form-action 'self';
  frame-ancestors 'none';
```

### Directive Breakdown

#### 1. script-src

```
script-src 'self' 'unsafe-eval' 'unsafe-inline' https://cdnjs.cloudflare.com
```

**Purpose:** Allow PDF.js library to load and execute

**Components:**
- `'self'` - Allow scripts from same origin
- `'unsafe-eval'` - **Required by PDF.js** for dynamic code execution during PDF parsing
- `'unsafe-inline'` - Allow inline scripts (for React/Next.js)
- `https://cdnjs.cloudflare.com` - PDF.js CDN

**Security Note:** `'unsafe-eval'` is required by PDF.js. This is a known requirement of the library and cannot be avoided. The risk is mitigated by:
- Only loading PDF.js from trusted CDN
- Using Subresource Integrity (SRI) hashes when possible
- Limiting eval usage to PDF.js context

#### 2. worker-src

```
worker-src 'self' blob: https://cdnjs.cloudflare.com
```

**Purpose:** Allow PDF.js web workers

**Components:**
- `'self'` - Allow workers from same origin
- `blob:` - **Required** - PDF.js creates workers using blob URLs
- `https://cdnjs.cloudflare.com` - PDF.js worker script from CDN

**Why blob: is needed:**
PDF.js creates web workers dynamically using blob URLs. This is a standard practice for web workers and is required for PDF.js to function.

#### 3. font-src

```
font-src 'self' data: https://cdnjs.cloudflare.com
```

**Purpose:** Allow PDF.js to load fonts and character maps

**Components:**
- `'self'` - Allow fonts from same origin
- `data:` - Allow data URIs for embedded fonts
- `https://cdnjs.cloudflare.com` - PDF.js standard fonts and CMaps

**What are CMaps?**
Character Maps (CMaps) are used by PDF.js to correctly render non-Latin text (Chinese, Japanese, Korean, etc.). They are loaded from the CDN as needed.

#### 4. img-src

```
img-src 'self' data: https: blob:
```

**Purpose:** Allow canvas rendering and image loading

**Components:**
- `'self'` - Allow images from same origin
- `data:` - Allow data URIs
- `https:` - Allow images from any HTTPS source (for Supabase storage)
- `blob:` - **Required** - Canvas rendering creates blob URLs

#### 5. connect-src

```
connect-src 'self' https://*.supabase.co https://cdnjs.cloudflare.com
```

**Purpose:** Allow fetch/XHR requests

**Components:**
- `'self'` - Allow requests to same origin
- `https://*.supabase.co` - Supabase storage for PDF documents
- `https://cdnjs.cloudflare.com` - PDF.js resources

## Implementation

### Next.js Configuration (next.config.ts)

```typescript
async headers() {
  return [
    {
      source: '/:path*',
      headers: [
        {
          key: 'Content-Security-Policy',
          value: [
            "default-src 'self'",
            "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://cdnjs.cloudflare.com",
            "worker-src 'self' blob: https://cdnjs.cloudflare.com",
            "style-src 'self' 'unsafe-inline'",
            "img-src 'self' data: https: blob:",
            "font-src 'self' data: https://cdnjs.cloudflare.com",
            "connect-src 'self' https://*.supabase.co https://cdnjs.cloudflare.com",
            "object-src 'none'",
            "base-uri 'self'",
            "form-action 'self'",
            "frame-ancestors 'none'",
          ].join('; ')
        }
      ],
    },
  ];
}
```

### Middleware Configuration (middleware.ts)

```typescript
if (process.env.NODE_ENV === 'production') {
  response.headers.set(
    'Content-Security-Policy',
    "default-src 'self'; " +
    "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://cdnjs.cloudflare.com; " +
    "worker-src 'self' blob: https://cdnjs.cloudflare.com; " +
    "style-src 'self' 'unsafe-inline'; " +
    "img-src 'self' data: https: blob:; " +
    "font-src 'self' data: https://cdnjs.cloudflare.com; " +
    "connect-src 'self' https://*.supabase.co https://cdnjs.cloudflare.com; " +
    "object-src 'none'; " +
    "base-uri 'self'; " +
    "form-action 'self'; " +
    "frame-ancestors 'none';"
  );
}
```

## Testing CSP Configuration

### Test 1: Browser Console

Open browser DevTools Console and check for CSP violations:

```javascript
// Should see no CSP errors when loading PDF.js
// Look for messages like:
// "Refused to load the script 'https://...' because it violates the CSP directive"
```

### Test 2: Network Tab

1. Open DevTools Network tab
2. Load a PDF document
3. Verify these resources load successfully:
   - `pdf.worker.min.js` from cdnjs.cloudflare.com
   - Font files (if needed)
   - CMap files (if rendering non-Latin text)

### Test 3: Automated Test

Run the CSP configuration test:

```bash
npx vitest run lib/__tests__/csp-configuration.test.ts
```

## Common Issues and Solutions

### Issue 1: "Refused to load the script because it violates CSP"

**Solution:** Verify `script-src` includes `https://cdnjs.cloudflare.com`

### Issue 2: "Refused to create a worker because it violates CSP"

**Solution:** Verify `worker-src` includes both `blob:` and `https://cdnjs.cloudflare.com`

### Issue 3: "Refused to load the font because it violates CSP"

**Solution:** Verify `font-src` includes `https://cdnjs.cloudflare.com` and `data:`

### Issue 4: "Refused to connect to ... because it violates CSP"

**Solution:** Verify `connect-src` includes:
- `https://*.supabase.co` (for PDF documents)
- `https://cdnjs.cloudflare.com` (for PDF.js resources)

### Issue 5: Canvas rendering fails

**Solution:** Verify `img-src` includes `blob:` for canvas output

## Security Considerations

### Development vs Production

**Development:**
- CSP can be more relaxed for easier debugging
- Consider using `report-only` mode initially

**Production:**
- Always enforce strict CSP
- Monitor CSP violation reports
- Use specific domains instead of wildcards where possible

### Unsafe Directives

The configuration uses two "unsafe" directives:

1. **'unsafe-eval'** (script-src)
   - Required by PDF.js
   - Cannot be avoided
   - Risk mitigated by using trusted CDN

2. **'unsafe-inline'** (script-src, style-src)
   - Required by React/Next.js
   - Consider using nonces in future for better security

### CDN Security

- We use `cdnjs.cloudflare.com` which is a trusted CDN
- Consider adding Subresource Integrity (SRI) hashes:
  ```html
  <script 
    src="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.10.38/pdf.min.js"
    integrity="sha384-..."
    crossorigin="anonymous">
  </script>
  ```

## Monitoring

### CSP Violation Reports

Consider adding CSP reporting:

```
Content-Security-Policy: 
  ... 
  report-uri /api/csp-report;
```

Then create an endpoint to log violations:

```typescript
// app/api/csp-report/route.ts
export async function POST(request: Request) {
  const report = await request.json();
  console.error('CSP Violation:', report);
  return new Response('OK', { status: 200 });
}
```

## Verification Checklist

- [ ] CSP configured in next.config.ts
- [ ] CSP configured in middleware.ts
- [ ] script-src includes cdnjs.cloudflare.com
- [ ] script-src includes 'unsafe-eval'
- [ ] worker-src includes blob:
- [ ] worker-src includes cdnjs.cloudflare.com
- [ ] font-src includes cdnjs.cloudflare.com
- [ ] img-src includes blob:
- [ ] connect-src includes *.supabase.co
- [ ] connect-src includes cdnjs.cloudflare.com
- [ ] No CSP violations in browser console
- [ ] PDF.js loads successfully
- [ ] PDF.js worker loads successfully
- [ ] PDFs render correctly

## Related Files

- `next.config.ts` - Next.js CSP configuration
- `middleware.ts` - Middleware CSP configuration
- `lib/pdfjs-config.ts` - PDF.js configuration
- `lib/__tests__/csp-configuration.test.ts` - CSP tests

## References

- [MDN CSP Guide](https://developer.mozilla.org/en-US/docs/Web/HTTP/CSP)
- [PDF.js CSP Requirements](https://github.com/mozilla/pdf.js/wiki/Frequently-Asked-Questions#csp)
- [Next.js Security Headers](https://nextjs.org/docs/advanced-features/security-headers)
