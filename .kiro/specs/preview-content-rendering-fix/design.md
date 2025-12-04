# Preview Content Rendering Fix - Design

## Overview

This design addresses the critical issue where PDF previews show blank pages with only watermarks visible. The root causes are:

1. **Missing or failed PDF conversion** - PDFs not being converted to page images
2. **Incorrect API response handling** - Client expecting data that isn't being returned
3. **Storage/database mismatch** - Page URLs not being properly stored or retrieved
4. **Component rendering issues** - FlipBook not receiving or displaying page data correctly

## Architecture

### Current Flow (Broken)

```
User uploads PDF → Storage → Database record created
                                      ↓
User clicks Preview → Server fetches document → Generates signed URL
                                      ↓
Client component → Fetches pages API → Returns empty array
                                      ↓
FlipBook renders → No pages → Blank screen (only watermark shows)
```

### Target Flow (Fixed)

```
User uploads PDF → Storage → Database record → AUTO-TRIGGER CONVERSION
                                                        ↓
                                              Convert PDF to page images
                                                        ↓
                                              Store in "document-pages" bucket
                                                        ↓
                                              Save URLs in database
                                                        ↓
User clicks Preview → Server fetches pages → Generate signed URLs
                                      ↓
Client component → Receives page data → FlipBook renders pages
                                      ↓
Content visible with optional watermark overlay
```

## Components and Interfaces

### 1. PDF Conversion Service

**Location:** `lib/services/pdf-converter.ts`

**Purpose:** Convert uploaded PDFs into individual page images

**Key Functions:**

```typescript
export async function convertPdfToPages(document: {
  id: string;
  storagePath: string;
  title: string;
}): Promise<{
  success: boolean;
  pages: number;
  pageUrls: string[];
  error?: string;
}> {
  // 1. Download PDF from Supabase Storage
  // 2. Convert each page to PNG image
  // 3. Upload images to "document-pages" bucket
  // 4. Store URLs in database
  // 5. Return page URLs
}
```

**Implementation Strategy:**
- Use `pdf-lib` or `pdfjs-dist` for PDF parsing
- Convert each page to PNG at 1200x1600 resolution
- Upload to Supabase Storage with path: `{documentId}/page-{pageNumber}.png`
- Store URLs in database for fast retrieval

### 2. Page Cache Service

**Location:** `lib/services/page-cache.ts`

**Purpose:** Cache and retrieve converted page URLs

**Key Functions:**

```typescript
export async function getCachedPageUrls(documentId: string): Promise<string[]> {
  // Fetch page URLs from database
  // Generate signed URLs for each page
  // Return array of signed URLs
}

export async function hasCachedPages(documentId: string): Promise<boolean> {
  // Check if pages exist in database
}

export async function cachePageUrls(
  documentId: string,
  pageUrls: string[]
): Promise<void> {
  // Store page URLs in database
}
```

### 3. Document Pages API Route

**Location:** `app/api/documents/[id]/pages/route.ts`

**Current Issues:**
- Returns empty array when no pages exist
- Doesn't trigger conversion automatically
- May not be generating signed URLs correctly

**Fixed Implementation:**

```typescript
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = await params;
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'Please sign in to access this resource' },
        { status: 401 }
      );
    }

    // Verify document ownership
    const document = await prisma.document.findFirst({
      where: {
        id,
        userId: session.user.id
      }
    });

    if (!document) {
      return NextResponse.json(
        { error: 'Not Found', message: 'Document not found or access denied' },
        { status: 404 }
      );
    }

    // Check for cached pages
    const hasPages = await hasCachedPages(id);
    
    if (hasPages) {
      const pageUrls = await getCachedPageUrls(id);
      return NextResponse.json({ 
        pages: pageUrls.map((url, index) => ({
          pageNumber: index + 1,
          url
        }))
      });
    }

    // No pages exist - trigger conversion
    console.log(`[API] No pages found for document ${id}, triggering conversion`);
    
    const conversionResult = await convertPdfToPages(document);
    
    if (!conversionResult.success) {
      return NextResponse.json(
        { 
          error: 'Conversion Failed', 
          message: conversionResult.error || 'Failed to convert PDF to pages'
        },
        { status: 500 }
      );
    }

    // Return newly converted pages
    return NextResponse.json({ 
      pages: conversionResult.pageUrls.map((url, index) => ({
        pageNumber: index + 1,
        url
      }))
    });

  } catch (error) {
    console.error('Error in pages API:', error);
    return NextResponse.json(
      { error: 'Internal Server Error', message: 'Something went wrong' },
      { status: 500 }
    );
  }
}
```

### 4. Document Conversion API Route

**Location:** `app/api/documents/convert/route.ts`

**Purpose:** Manually trigger PDF conversion

**Implementation:**

```typescript
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { documentId } = await request.json();

    if (!documentId) {
      return NextResponse.json(
        { error: 'Document ID is required' },
        { status: 400 }
      );
    }

    // Verify ownership
    const document = await prisma.document.findFirst({
      where: {
        id: documentId,
        userId: session.user.id
      }
    });

    if (!document) {
      return NextResponse.json(
        { error: 'Document not found' },
        { status: 404 }
      );
    }

    // Trigger conversion
    const result = await convertPdfToPages(document);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Conversion failed' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      pages: result.pages,
      pageUrls: result.pageUrls
    });

  } catch (error) {
    console.error('Error converting document:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
```

### 5. PreviewViewerClient Component

**Location:** `app/dashboard/documents/[id]/view/PreviewViewerClient.tsx`

**Current Issues:**
- May not be handling empty page arrays correctly
- Conversion trigger logic might not be working
- FlipBook might not be receiving page data in correct format

**Key Fixes:**

```typescript
// Ensure pages are fetched on mount if not provided
useEffect(() => {
  if (contentType !== ContentType.PDF) return;
  
  // If we have initial pages, use them
  if (initialPages.length > 0) {
    console.log('[Client] Using initial pages:', initialPages.length);
    setPages(initialPages);
    setLoading(false);
    return;
  }

  // Otherwise, fetch pages (which will trigger conversion if needed)
  fetchPages();
}, [documentId, contentType, initialPages.length]);

const fetchPages = async () => {
  try {
    setLoading(true);
    setError(null);

    const response = await fetch(`/api/documents/${documentId}/pages`);
    
    if (!response.ok) {
      const data = await response.json();
      throw new Error(data.message || 'Failed to load pages');
    }

    const data = await response.json();
    
    if (data.pages && data.pages.length > 0) {
      setPages(data.pages);
    } else {
      throw new Error('No pages returned from API');
    }

    setLoading(false);
  } catch (err) {
    console.error('[Client] Error fetching pages:', err);
    setError(err instanceof Error ? err.message : 'Failed to load pages');
    setLoading(false);
  }
};
```

### 6. FlipBookContainerWithDRM Component

**Location:** `components/flipbook/FlipBookContainerWithDRM.tsx`

**Key Fixes:**

```typescript
export function FlipBookContainerWithDRM({
  documentId,
  pages,
  watermarkText,
  userEmail,
  allowTextSelection = true,
  enableScreenshotPrevention = false,
  showWatermark = false, // ✅ Default to false
}: FlipBookContainerWithDRMProps) {
  // ✅ Only use watermark when explicitly enabled
  const effectiveWatermark = showWatermark && watermarkText 
    ? watermarkText 
    : undefined;

  // ✅ Ensure pages are in correct format
  const formattedPages = pages.map(page => ({
    pageNumber: page.pageNumber,
    imageUrl: page.imageUrl || page.url, // Handle both formats
    width: page.width || 1200,
    height: page.height || 1600,
  }));

  return (
    <div className="relative w-full h-screen bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500">
      <FlipBookViewerWithDRM
        pages={formattedPages}
        watermarkText={effectiveWatermark}
        allowTextSelection={allowTextSelection}
        enableScreenshotPrevention={enableScreenshotPrevention}
      />
    </div>
  );
}
```

## Data Models

### DocumentPage Model

```prisma
model DocumentPage {
  id          String   @id @default(uuid())
  documentId  String
  pageNumber  Int
  storagePath String   // Path in Supabase Storage
  width       Int      @default(1200)
  height      Int      @default(1600)
  createdAt   DateTime @default(now())
  
  document    Document @relation(fields: [documentId], references: [id], onDelete: Cascade)
  
  @@unique([documentId, pageNumber])
  @@index([documentId])
}
```

### Supabase Storage Structure

```
Bucket: document-pages
├── {documentId}/
│   ├── page-1.png
│   ├── page-2.png
│   ├── page-3.png
│   └── ...
```

## Error Handling

### Conversion Failures

**Scenario:** PDF conversion fails due to corrupted file or unsupported format

**Handling:**
1. Log detailed error with document ID
2. Return JSON error response with user-friendly message
3. Store conversion failure in database for retry
4. Show error UI with retry button

### Missing Pages

**Scenario:** Pages API returns empty array

**Handling:**
1. Automatically trigger conversion
2. Show loading indicator during conversion
3. Display pages once conversion completes
4. If conversion fails, show error with retry

### Storage Access Errors

**Scenario:** Cannot access Supabase Storage

**Handling:**
1. Check storage bucket exists
2. Verify authentication credentials
3. Return 500 error with message
4. Log error for debugging

### Signed URL Expiration

**Scenario:** Signed URLs expire during viewing

**Handling:**
1. Detect 403 errors on image load
2. Automatically regenerate signed URLs
3. Retry image load with new URL
4. Show temporary loading indicator

## Testing Strategy

### Unit Tests

1. **PDF Conversion Service**
   - Test conversion of valid PDF
   - Test handling of corrupted PDF
   - Test page image generation
   - Test storage upload

2. **Page Cache Service**
   - Test caching page URLs
   - Test retrieving cached URLs
   - Test signed URL generation
   - Test cache invalidation

3. **API Routes**
   - Test authentication checks
   - Test document ownership verification
   - Test page retrieval
   - Test conversion triggering

### Integration Tests

1. **End-to-End Preview Flow**
   - Upload PDF → Conversion → Preview
   - Verify pages display correctly
   - Verify watermark behavior
   - Verify error handling

2. **API Integration**
   - Test pages API with/without cached pages
   - Test conversion API
   - Test error responses
   - Test authentication flow

### Manual Testing

1. **Upload and Preview**
   - Upload new PDF
   - Open preview immediately
   - Verify automatic conversion
   - Verify pages display

2. **Existing Documents**
   - Open preview for old documents
   - Verify conversion triggers if needed
   - Verify cached pages load quickly

3. **Error Scenarios**
   - Test with corrupted PDF
   - Test with very large PDF
   - Test with network interruption
   - Test with expired session

## Performance Considerations

### Conversion Optimization

- Convert pages in parallel (max 5 concurrent)
- Use appropriate image quality (80% JPEG or PNG)
- Resize images to standard dimensions (1200x1600)
- Cache conversion results in database

### Loading Optimization

- Fetch pages on server-side when possible
- Pass initial pages to client component
- Lazy load pages as user navigates
- Preload next/previous pages

### Storage Optimization

- Use Supabase CDN for fast delivery
- Set appropriate cache headers
- Use signed URLs with 1-hour expiration
- Clean up old page images periodically

## Migration Strategy

### Phase 1: Fix API Routes (Immediate)
1. Update pages API to trigger conversion
2. Fix JSON response formats
3. Add proper error handling
4. Deploy and test

### Phase 2: Implement Conversion Service (High Priority)
1. Create PDF conversion service
2. Add page cache service
3. Create database migration for DocumentPage model
4. Test conversion with sample PDFs

### Phase 3: Update Client Components (High Priority)
1. Fix PreviewViewerClient page handling
2. Update FlipBookContainerWithDRM defaults
3. Improve error UI
4. Test end-to-end flow

### Phase 4: Optimize and Polish (Medium Priority)
1. Add loading indicators
2. Implement retry logic
3. Add performance monitoring
4. Optimize image sizes

## Rollback Plan

If issues arise:

1. **Immediate Rollback:** Revert API route changes
2. **Partial Rollback:** Keep conversion service, revert client changes
3. **Data Rollback:** Clear DocumentPage table if needed
4. **Feature Flag:** Add environment variable to toggle new behavior

## Monitoring

Track these metrics:

- **Conversion Success Rate:** % of PDFs successfully converted
- **Conversion Time:** Average time to convert PDF
- **Page Load Time:** Time to display first page
- **Error Rate:** % of preview requests that fail
- **Storage Usage:** Total size of converted pages
