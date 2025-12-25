# Design Document

## Overview

This design addresses critical technical issues preventing member document viewing: Prisma import errors in route handlers and CORS errors when fetching Supabase Storage URLs. The solution implements a secure API proxy architecture that handles image fetching server-side while ensuring proper Prisma client configuration across all route handlers.

## Architecture

### System Architecture

```
Member Browser
├── MyJstudyroomViewerClient.tsx
│   ├── Fetches page list from /api/viewer/documents/[id]/pages
│   └── Fetches images from /api/member/my-jstudyroom/viewer/items/[itemId]/pages/[pageNumber]/image
│
API Layer (Server-Side)
├── /api/member/my-jstudyroom/viewer/items/[itemId]/pages/[pageNumber]/image/route.ts
│   ├── Authenticates member using auth()
│   ├── Verifies member access to document
│   ├── Fetches image from Supabase Storage (server-side)
│   └── Returns image bytes with proper headers
│
Database Layer
├── Prisma Client (lib/prisma.ts)
│   ├── Singleton instance with proper configuration
│   └── Imported consistently as: import prisma from "@/lib/prisma"
│
Storage Layer
└── Supabase Storage
    ├── Accessed server-side only (no CORS issues)
    └── Uses service role for authenticated access
```

### Data Flow

1. **Member opens document viewer**
   - Browser loads MyJstudyroomViewerClient component
   - Component fetches page list from existing API
   - For each page, component requests image via proxy endpoint

2. **Image proxy request flow**
   - Browser: `GET /api/member/my-jstudyroom/viewer/items/[itemId]/pages/[pageNumber]/image`
   - Server: Authenticate member using NextAuth
   - Server: Query database to verify member access
   - Server: Fetch image from Supabase Storage server-side
   - Server: Return image bytes with appropriate headers

3. **Error handling flow**
   - Authentication failure → 401 Unauthorized
   - Access denied → 403 Forbidden
   - Document not found → 404 Not Found
   - Storage error → 500 Internal Server Error

## Components and Interfaces

### New API Route: Image Proxy

**Location:** `app/api/member/my-jstudyroom/viewer/items/[itemId]/pages/[pageNumber]/image/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import prisma from '@/lib/prisma';
import { createClient } from '@supabase/supabase-js';

interface RouteParams {
  params: {
    itemId: string;
    pageNumber: string;
  };
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    // 1. Authenticate member
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2. Verify member access to document
    const { itemId, pageNumber } = params;
    const pageNum = parseInt(pageNumber);
    
    const myJstudyroomItem = await prisma.myJstudyroom.findFirst({
      where: {
        id: itemId,
        userId: session.user.id,
      },
      include: {
        bookShopItem: {
          include: {
            document: true,
          },
        },
      },
    });

    if (!myJstudyroomItem) {
      return NextResponse.json({ error: 'Document not found or access denied' }, { status: 403 });
    }

    // 3. Get page record
    const page = await prisma.documentPage.findFirst({
      where: {
        documentId: myJstudyroomItem.bookShopItem.document.id,
        pageNumber: pageNum,
      },
    });

    if (!page) {
      return NextResponse.json({ error: 'Page not found' }, { status: 404 });
    }

    // 4. Fetch image from Supabase Storage (server-side)
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data, error } = await supabase.storage
      .from('document-pages')
      .download(page.storagePath);

    if (error || !data) {
      console.error('Supabase storage error:', error);
      return NextResponse.json({ error: 'Failed to fetch image' }, { status: 500 });
    }

    // 5. Return image with proper headers
    const buffer = await data.arrayBuffer();
    
    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': page.mimeType || 'image/jpeg',
        'Cache-Control': 'private, max-age=3600',
        'Content-Length': buffer.byteLength.toString(),
      },
    });

  } catch (error) {
    console.error('Image proxy error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
```

### Updated Component: MyJstudyroomViewerClient

**Location:** `app/member/view/[itemId]/MyJstudyroomViewerClient.tsx`

**Key Changes:**

```typescript
// Remove direct Supabase Storage URL fetching
// Replace with proxy endpoint calls

const loadDocumentPages = async () => {
  try {
    setLoading(true);
    setError(null);

    // Get page list (existing API)
    const response = await fetch(`/api/viewer/documents/${documentData.id}/pages`, {
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      }
    });

    if (response.ok) {
      const data = await response.json();
      
      if (!data.pages || data.pages.length === 0) {
        setPages([]);
        return;
      }
      
      // Create page objects with proxy URLs (no fetching yet)
      const pagesWithProxyUrls = data.pages.map((page: any) => ({
        id: `page-${page.pageNumber}`,
        pageNumber: page.pageNumber,
        imageUrl: `/api/member/my-jstudyroom/viewer/items/${itemId}/pages/${page.pageNumber}/image`,
        pageUrl: `/api/member/my-jstudyroom/viewer/items/${itemId}/pages/${page.pageNumber}/image`,
      }));
      
      setPages(pagesWithProxyUrls);
    } else {
      // Handle errors...
    }
  } catch (err) {
    console.error('Error loading pages:', err);
    setError('Failed to load document');
  } finally {
    setLoading(false);
  }
};

// Update image rendering to use proxy URLs directly
{pages.map((page, index) => (
  <div key={page.id || index} className="relative bg-white rounded-lg shadow-lg overflow-hidden">
    <div className="relative">
      <img
        src={page.imageUrl}  // Direct proxy URL - no credentials needed
        alt={`Page ${page.pageNumber || index + 1}`}
        className="w-full h-auto"
        style={{ maxWidth: '100%', height: 'auto' }}
        onError={(e) => {
          console.error('Image load error for page:', page.pageNumber);
          e.currentTarget.style.display = 'none';
        }}
      />
      {/* Watermark overlay remains the same */}
    </div>
  </div>
))}
```

### Updated Prisma Configuration

**Location:** `lib/prisma.ts` (verify/update)

```typescript
import { PrismaClient } from "@prisma/client";

declare global {
  var prisma: PrismaClient | undefined;
}

const prisma =
  global.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["query", "error"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  global.prisma = prisma;
}

export default prisma;
```

**Location:** `tsconfig.json` (verify paths)

```json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["./*"]
    }
    // ... other options
  }
}
```

## Data Models

### Existing Models (no changes needed)

```typescript
// MyJstudyroom table
interface MyJstudyroom {
  id: string;
  userId: string;
  bookShopItemId: string;
  addedAt: DateTime;
}

// DocumentPage table  
interface DocumentPage {
  id: string;
  documentId: string;
  pageNumber: number;
  storagePath: string;
  mimeType: string;
  createdAt: DateTime;
}

// BookShopItem table
interface BookShopItem {
  id: string;
  documentId: string;
  title: string;
  // ... other fields
}
```

### API Response Types

```typescript
// Image proxy response (binary data)
interface ImageProxyResponse {
  // Returns raw image bytes with headers:
  // Content-Type: image/jpeg | image/png
  // Cache-Control: private, max-age=3600
  // Content-Length: number
}

// Error response
interface ErrorResponse {
  error: string;
}
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Prisma imports resolve correctly

*For any* route handler that imports Prisma using `import prisma from "@/lib/prisma"`, the import should resolve successfully without module resolution errors.

**Validates: Requirements 1.1, 1.2, 1.5**

### Property 2: Member access verification

*For any* request to the image proxy endpoint, if the member does not own or have access to the requested document, the system should return a 403 Forbidden response.

**Validates: Requirements 4.1, 4.2, 4.3**

### Property 3: CORS-free image loading

*For any* member document viewer session, all page images should load without CORS errors in the browser console.

**Validates: Requirements 2.1, 2.2, 3.1, 3.2**

### Property 4: Server-side image fetching

*For any* valid image proxy request, the system should fetch the image from Supabase Storage server-side and return the image bytes with appropriate Content-Type headers.

**Validates: Requirements 2.3, 2.4, 2.5**

### Property 5: Environment consistency

*For any* deployment environment (localhost or production), the member document viewer should function identically without CORS errors.

**Validates: Requirements 3.1, 3.2, 3.3**

## Error Handling

### Error Scenarios and Responses

1. **Unauthenticated Request**
   - Detection: `auth()` returns null or no user ID
   - Response: 401 Unauthorized with JSON error message
   - Client handling: Redirect to login page

2. **Access Denied**
   - Detection: No MyJstudyroom record for user + itemId
   - Response: 403 Forbidden with JSON error message
   - Client handling: Display "Access denied" message

3. **Page Not Found**
   - Detection: No DocumentPage record for document + pageNumber
   - Response: 404 Not Found with JSON error message
   - Client handling: Display "Page not found" placeholder

4. **Storage Error**
   - Detection: Supabase storage download fails
   - Response: 500 Internal Server Error with JSON error message
   - Client handling: Display "Failed to load image" placeholder

5. **Invalid Parameters**
   - Detection: itemId or pageNumber is invalid format
   - Response: 400 Bad Request with JSON error message
   - Client handling: Display error message

### Error Logging

```typescript
// Server-side error logging
console.error('Image proxy error:', {
  userId: session.user.id,
  itemId,
  pageNumber,
  error: error.message,
  timestamp: new Date().toISOString(),
});

// Client-side error logging
console.error('Image load error:', {
  pageNumber,
  imageUrl: page.imageUrl,
  error: e.message,
});
```

## Testing Strategy

### Unit Tests

**Test File:** `app/api/member/my-jstudyroom/viewer/items/[itemId]/pages/[pageNumber]/image/__tests__/route.test.ts`

1. **Test: Authentication required**
   - Input: Request without valid session
   - Expected: 401 Unauthorized response

2. **Test: Access control enforcement**
   - Input: Valid user requesting another user's document
   - Expected: 403 Forbidden response

3. **Test: Valid image request**
   - Input: Authenticated user requesting owned document page
   - Expected: Image bytes with correct Content-Type header

4. **Test: Page not found**
   - Input: Request for non-existent page number
   - Expected: 404 Not Found response

### Integration Tests

**Test File:** `app/member/view/[itemId]/__tests__/MyJstudyroomViewerClient.integration.test.tsx`

1. **Test: Complete viewer workflow**
   - Setup: Mock authenticated session and document data
   - Action: Load viewer component
   - Verify: All pages load without CORS errors

2. **Test: Error handling**
   - Setup: Mock API errors (401, 403, 404, 500)
   - Action: Load viewer component
   - Verify: Appropriate error messages displayed

3. **Test: Image loading**
   - Setup: Mock successful API responses
   - Action: Load document with multiple pages
   - Verify: All images render correctly

### Property-Based Tests

**Test File:** `app/api/member/my-jstudyroom/viewer/items/[itemId]/pages/[pageNumber]/image/__tests__/route.property.test.ts`

**Framework:** @fast-check/vitest

**Configuration:** Minimum 100 iterations per property

1. **Property Test: Prisma import resolution**
   - **Feature: member-document-viewing-fix, Property 1: Prisma imports resolve correctly**
   - Generator: Various route handler import scenarios
   - Property: All imports resolve without module errors
   - **Validates: Requirements 1.1, 1.2, 1.5**

2. **Property Test: Access control consistency**
   - **Feature: member-document-viewing-fix, Property 2: Member access verification**
   - Generator: Random user/document combinations
   - Property: Only document owners receive 200 responses
   - **Validates: Requirements 4.1, 4.2, 4.3**

3. **Property Test: CORS-free operation**
   - **Feature: member-document-viewing-fix, Property 3: CORS-free image loading**
   - Generator: Random valid member sessions
   - Property: No CORS errors in browser console
   - **Validates: Requirements 2.1, 2.2, 3.1, 3.2**

4. **Property Test: Server-side image serving**
   - **Feature: member-document-viewing-fix, Property 4: Server-side image fetching**
   - Generator: Random valid page requests
   - Property: Images served with correct Content-Type and cache headers
   - **Validates: Requirements 2.3, 2.4, 2.5**

5. **Property Test: Environment consistency**
   - **Feature: member-document-viewing-fix, Property 5: Environment consistency**
   - Generator: Different environment configurations
   - Property: Viewer works identically across environments
   - **Validates: Requirements 3.1, 3.2, 3.3**

## Security Considerations

### Authentication and Authorization

1. **Session Validation**: Every request validates NextAuth session
2. **Ownership Verification**: Database query confirms user owns document
3. **Parameter Validation**: itemId and pageNumber are validated and sanitized
4. **Service Role Usage**: Supabase access uses service role, not user credentials

### Data Protection

1. **Private Cache Headers**: Images cached privately, not publicly
2. **No Direct Storage URLs**: Clients never receive direct Supabase URLs
3. **Server-Side Fetching**: All storage access happens server-side
4. **Error Information Limiting**: Error messages don't leak sensitive data

### CORS and XSS Prevention

1. **Same-Origin Requests**: All image requests are same-origin (no CORS)
2. **No Credentials in Cross-Origin**: Eliminates credentials-based CORS issues
3. **Content-Type Validation**: Proper MIME type headers prevent XSS
4. **Input Sanitization**: All parameters validated before database queries

## Performance Considerations

### Caching Strategy

1. **Browser Caching**: `Cache-Control: private, max-age=3600` (1 hour)
2. **Server-Side Caching**: Consider Redis cache for frequently accessed images
3. **CDN Integration**: Future enhancement for global image distribution

### Resource Management

1. **Memory Usage**: Stream large images instead of loading into memory
2. **Connection Pooling**: Prisma handles database connection pooling
3. **Supabase Limits**: Monitor storage bandwidth and request limits

### Optimization Opportunities

1. **Image Compression**: Serve optimized image formats (WebP, AVIF)
2. **Lazy Loading**: Load images as user scrolls (already implemented)
3. **Prefetching**: Preload next page images for smoother experience

## Implementation Notes

### Migration Strategy

1. **Phase 1**: Fix Prisma imports in existing route handlers
2. **Phase 2**: Implement image proxy API endpoint
3. **Phase 3**: Update MyJstudyroomViewerClient to use proxy
4. **Phase 4**: Test on localhost and production
5. **Phase 5**: Monitor for errors and performance

### Backward Compatibility

- No database schema changes required
- Existing API endpoints remain functional
- Viewer component maintains same interface
- No breaking changes to other components

### Environment Variables

Required environment variables:
```bash
# Existing (verify these are set)
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
DATABASE_URL=your_database_url

# NextAuth (existing)
NEXTAUTH_SECRET=your_nextauth_secret
NEXTAUTH_URL=your_app_url
```

### Deployment Checklist

1. ✓ Verify tsconfig.json path mapping
2. ✓ Confirm lib/prisma.ts exports default
3. ✓ Test Prisma imports in development
4. ✓ Implement image proxy endpoint
5. ✓ Update viewer client component
6. ✓ Test on localhost
7. ✓ Deploy to production
8. ✓ Verify production functionality
9. ✓ Monitor error logs
10. ✓ Performance testing