# Design Document

## Overview

This design addresses the critical issue where Chrome blocks PDF documents from displaying in iframes, showing "This page has been blocked by Chrome" error. The solution replaces iframe-based PDF rendering with PDF.js, Mozilla's JavaScript library that renders PDFs directly on canvas elements, providing full control over display and avoiding browser security restrictions.

### Current Problem

The existing implementation uses an iframe with sandbox restrictions to display PDFs:
```tsx
<iframe
  src={`${pdfUrl}#toolbar=0&navpanes=0&scrollbar=0`}
  sandbox="allow-same-origin allow-scripts"
  ...
/>
```

Chrome blocks this approach due to:
1. Sandbox attribute restrictions conflicting with PDF viewer requirements
2. CORS/CSP policy violations with Supabase signed URLs
3. X-Frame-Options headers preventing iframe embedding
4. Browser security policies blocking cross-origin PDF loading

### Proposed Solution

Replace iframe rendering with PDF.js library that:
- Renders PDFs directly to canvas elements
- Provides full control over display and interactions
- Works reliably across all modern browsers
- Maintains all DRM and watermark protections
- Supports all existing navigation features

## Architecture

### Component Structure

```
PDFViewerWithPDFJS (new)
├── PDF.js Document Loader
├── Canvas Renderer
├── Page Manager
├── Watermark Overlay (existing)
├── ViewerToolbar (existing)
└── DRM Protection Layer (existing)
```

### Data Flow

1. User requests document view
2. Server generates signed URL for PDF
3. Client component loads PDF.js library
4. PDF.js fetches PDF via signed URL
5. PDF.js parses PDF structure
6. Pages rendered to canvas elements
7. Watermarks overlaid on canvas
8. DRM protections applied to container
9. Navigation controls update page display


## Components and Interfaces

### 1. PDFViewerWithPDFJS Component

New React component that replaces iframe-based rendering:

```typescript
interface PDFViewerWithPDFJSProps {
  pdfUrl: string;
  documentTitle: string;
  watermark?: WatermarkSettings;
  enableDRM?: boolean;
  onPageChange?: (page: number) => void;
  onLoadComplete?: (numPages: number) => void;
  onError?: (error: Error) => void;
}
```

**Responsibilities:**
- Load PDF.js library dynamically
- Fetch PDF document from signed URL
- Manage PDF document lifecycle
- Render pages to canvas elements
- Handle page navigation
- Apply watermarks and DRM protections

### 2. PDF.js Integration Layer

Wrapper around PDF.js API for type safety and error handling:

```typescript
interface PDFDocument {
  numPages: number;
  getPage(pageNumber: number): Promise<PDFPage>;
  destroy(): void;
}

interface PDFPage {
  pageNumber: number;
  getViewport(params: { scale: number }): PDFViewport;
  render(params: RenderParams): RenderTask;
}

interface PDFViewport {
  width: number;
  height: number;
  scale: number;
}
```

### 3. Canvas Page Renderer

Renders individual PDF pages to canvas:

```typescript
interface CanvasPageRendererProps {
  page: PDFPage;
  scale: number;
  onRenderComplete?: () => void;
  onRenderError?: (error: Error) => void;
}
```

### 4. Modified SimpleDocumentViewer

Update existing component to use PDF.js when available:

```typescript
// Add new prop
interface SimpleDocumentViewerProps {
  // ... existing props
  usePDFJS?: boolean; // Enable PDF.js rendering
}
```


## Data Models

### PDF.js Configuration

```typescript
interface PDFJSConfig {
  workerSrc: string; // Path to PDF.js worker
  cMapUrl: string; // Character map URL
  cMapPacked: boolean; // Use packed CMaps
  standardFontDataUrl: string; // Standard fonts URL
  disableWorker: boolean; // Disable web worker
  verbosity: number; // Logging level
}
```

### PDF Loading State

```typescript
interface PDFLoadingState {
  status: 'idle' | 'loading' | 'loaded' | 'error';
  progress: number; // 0-100
  error?: Error;
  numPages?: number;
}
```

### Page Render State

```typescript
interface PageRenderState {
  pageNumber: number;
  status: 'pending' | 'rendering' | 'rendered' | 'error';
  canvas?: HTMLCanvasElement;
  error?: Error;
}
```


## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Rendering Properties

**Property 1: PDF rendering without blocking**
*For any* valid PDF document, when rendered using PDF.js, the system should complete rendering without browser blocking errors
**Validates: Requirements 1.1**

**Property 2: PDF.js library usage**
*For any* PDF rendering request, the system should use PDF.js library and create canvas elements instead of iframe elements
**Validates: Requirements 2.1, 2.3**

**Property 3: PDF fetch success**
*For any* valid signed URL, when PDF.js attempts to fetch the document, the fetch should complete successfully
**Validates: Requirements 2.2**

**Property 4: Error message clarity**
*For any* PDF.js error, the system should display a user-friendly error message that explains the issue
**Validates: Requirements 2.4, 7.1**

**Property 5: Fallback rendering**
*For any* scenario where PDF.js is unavailable, the system should fall back to an alternative rendering method
**Validates: Requirements 2.5**

### Watermark Properties

**Property 6: Watermark overlay presence**
*For any* PDF rendered with watermarks enabled, the watermark overlay should be visible on the rendered content
**Validates: Requirements 3.1, 3.2**

**Property 7: Watermark zoom persistence**
*For any* zoom level change, watermarks should remain properly positioned and scaled relative to the content
**Validates: Requirements 3.3**

**Property 8: Watermark navigation persistence**
*For any* page navigation action, watermarks should remain visible on all pages
**Validates: Requirements 3.4**

**Property 9: Watermark dynamic updates**
*For any* watermark setting change, the display should update to reflect the new settings immediately
**Validates: Requirements 3.5**


### DRM Protection Properties

**Property 10: Context menu prevention**
*For any* right-click event on PDF.js rendered content, the context menu should be prevented from appearing
**Validates: Requirements 4.1**

**Property 11: Print shortcut blocking**
*For any* print keyboard shortcut (Ctrl+P, Cmd+P), the print dialog should be prevented from opening
**Validates: Requirements 4.2**

**Property 12: Text selection prevention**
*For any* attempt to select text in PDF.js rendered content, the selection should be prevented
**Validates: Requirements 4.3**

**Property 13: Save shortcut blocking**
*For any* save keyboard shortcut (Ctrl+S, Cmd+S), the save dialog should be prevented from opening
**Validates: Requirements 4.4**

### Navigation Properties

**Property 14: Page navigation support**
*For any* page navigation action (next/previous), the system should display the correct page
**Validates: Requirements 5.1**

**Property 15: Continuous scroll support**
*For any* PDF in continuous scroll mode, pages should flow vertically without gaps
**Validates: Requirements 5.2**

**Property 16: Page indicator accuracy**
*For any* page change, the page indicator should update to show the correct current page number
**Validates: Requirements 5.3**

**Property 17: Zoom control functionality**
*For any* zoom action (in/out), the PDF scale should change by the specified amount
**Validates: Requirements 5.4**

**Property 18: Keyboard shortcut response**
*For any* navigation keyboard shortcut, the system should perform the corresponding navigation action
**Validates: Requirements 5.5**

### Performance Properties

**Property 19: Loading indicator display**
*For any* PDF loading operation, a loading indicator should be visible until loading completes
**Validates: Requirements 6.1**

**Property 20: Progressive rendering**
*For any* multi-page PDF, pages should render progressively as they become available
**Validates: Requirements 6.2**

**Property 21: Lazy page loading**
*For any* page that becomes visible through scrolling, the page should load on-demand
**Validates: Requirements 6.3**

**Property 22: Visible page priority**
*For any* large PDF, visible pages should render before non-visible pages
**Validates: Requirements 6.4**

**Property 23: Progress feedback**
*For any* PDF loading operation, progress updates should be provided to the user
**Validates: Requirements 6.5**


### Error Handling Properties

**Property 24: Retry option availability**
*For any* error state, a retry option should be available to the user
**Validates: Requirements 7.5**

### CORS/CSP Properties

**Property 25: CORS header presence**
*For any* PDF URL request, appropriate CORS headers should be included in the response
**Validates: Requirements 8.1**

**Property 26: CSP configuration**
*For any* PDF.js resource request, CSP headers should allow the necessary resources to load
**Validates: Requirements 8.2**

**Property 27: Signed URL compatibility**
*For any* generated signed URL, PDF.js should be able to fetch the PDF successfully
**Validates: Requirements 8.3**

**Property 28: Authentication handling**
*For any* authenticated PDF.js request, the authentication should be handled correctly
**Validates: Requirements 8.4**

**Property 29: Cross-origin resource loading**
*For any* cross-origin resource required by PDF.js, the resource should load successfully
**Validates: Requirements 8.5**

## Error Handling

### Error Types

1. **PDF Loading Errors**
   - Network failures
   - Invalid PDF format
   - Corrupted PDF data
   - Authentication failures
   - Timeout errors

2. **Rendering Errors**
   - Canvas creation failures
   - Memory exhaustion
   - Invalid page numbers
   - Rendering timeout

3. **PDF.js Library Errors**
   - Library load failure
   - Worker initialization failure
   - Unsupported PDF features

### Error Recovery Strategies

1. **Automatic Retry**: Retry failed operations with exponential backoff
2. **Fallback Rendering**: Use alternative rendering method if PDF.js fails
3. **Partial Rendering**: Display successfully rendered pages even if some fail
4. **User Notification**: Show clear error messages with actionable steps
5. **Graceful Degradation**: Provide basic functionality even with errors


## Testing Strategy

### Unit Testing

Unit tests will verify individual components and functions:

- PDF.js integration layer functions
- Canvas rendering logic
- Error handling functions
- Watermark overlay positioning
- DRM protection event handlers
- Navigation control logic

**Testing Framework**: Vitest with React Testing Library

**Key Test Scenarios**:
- PDF.js library loading
- Document fetching and parsing
- Page rendering to canvas
- Error state handling
- Watermark overlay rendering
- DRM event prevention

### Property-Based Testing

Property-based tests will verify universal behaviors across many inputs using **fast-check** library.

**Configuration**: Each property test will run a minimum of 100 iterations.

**Test Annotation Format**: Each property-based test will be tagged with:
```typescript
// Feature: pdf-iframe-blocking-fix, Property X: [property description]
```

**Property Test Coverage**:
- Property 1: PDF rendering without blocking (Requirements 1.1)
- Property 2: PDF.js library usage (Requirements 2.1, 2.3)
- Property 3: PDF fetch success (Requirements 2.2)
- Property 6: Watermark overlay presence (Requirements 3.1, 3.2)
- Property 7: Watermark zoom persistence (Requirements 3.3)
- Property 14: Page navigation support (Requirements 5.1)
- Property 17: Zoom control functionality (Requirements 5.4)
- Property 25: CORS header presence (Requirements 8.1)
- Property 27: Signed URL compatibility (Requirements 8.3)

### Integration Testing

Integration tests will verify component interactions:

- PDF.js + Canvas rendering pipeline
- Watermark overlay + PDF rendering
- DRM protection + PDF.js events
- Navigation controls + page rendering
- Error handling + user feedback

### Browser Compatibility Testing

Manual testing across browsers to verify:
- Chrome: PDF rendering without blocking
- Firefox: PDF rendering functionality
- Safari: PDF rendering functionality
- Edge: PDF rendering functionality

### Performance Testing

Performance tests will measure:
- PDF loading time
- Page rendering speed
- Memory usage
- Scroll performance
- Zoom responsiveness

**Performance Targets**:
- Initial page render: < 1 second
- Page navigation: < 200ms
- Zoom operation: < 100ms
- Memory usage: < 100MB for 50-page PDF


## Implementation Details

### PDF.js Library Integration

**Library Version**: pdfjs-dist@3.11.174 (latest stable)

**Installation**:
```bash
npm install pdfjs-dist
```

**Worker Configuration**:
```typescript
import * as pdfjsLib from 'pdfjs-dist';

// Set worker source
pdfjsLib.GlobalWorkerOptions.workerSrc = 
  `//cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js`;
```

### Canvas Rendering Pipeline

1. **Document Loading**:
   ```typescript
   const loadingTask = pdfjsLib.getDocument(pdfUrl);
   const pdf = await loadingTask.promise;
   ```

2. **Page Rendering**:
   ```typescript
   const page = await pdf.getPage(pageNumber);
   const viewport = page.getViewport({ scale });
   const canvas = document.createElement('canvas');
   const context = canvas.getContext('2d');
   
   canvas.width = viewport.width;
   canvas.height = viewport.height;
   
   await page.render({
     canvasContext: context,
     viewport: viewport
   }).promise;
   ```

3. **Watermark Overlay**:
   - Render PDF to canvas
   - Create watermark overlay div
   - Position overlay absolutely over canvas
   - Apply CSS for watermark styling

### DRM Protection Implementation

**Event Prevention**:
```typescript
useEffect(() => {
  const preventEvent = (e: Event) => {
    e.preventDefault();
    e.stopPropagation();
    return false;
  };
  
  document.addEventListener('contextmenu', preventEvent);
  document.addEventListener('selectstart', preventEvent);
  document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && (e.key === 'p' || e.key === 's')) {
      preventEvent(e);
    }
  });
  
  return () => {
    // Cleanup
  };
}, []);
```

### Progressive Loading Strategy

1. **Priority Queue**: Maintain queue of pages to render
2. **Visible Pages First**: Prioritize currently visible pages
3. **Adjacent Pages**: Pre-render pages adjacent to current page
4. **Lazy Loading**: Load remaining pages on-demand
5. **Memory Management**: Unload off-screen pages to conserve memory

### CORS Configuration

**Supabase Storage Configuration**:
```typescript
// Ensure signed URLs include CORS headers
const { url } = await getSignedUrl(path, expiresIn, bucket, {
  download: false, // Don't force download
  transform: undefined // No transformations
});
```

**Next.js API Route Headers**:
```typescript
export async function GET(request: Request) {
  return new Response(data, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Content-Type': 'application/pdf',
    },
  });
}
```


## Migration Strategy

### Phase 1: Add PDF.js Support (Parallel)

- Install PDF.js library
- Create PDFViewerWithPDFJS component
- Implement basic rendering
- Add to SimpleDocumentViewer as option
- Test with feature flag

### Phase 2: Enable PDF.js by Default

- Set PDF.js as default rendering method
- Keep iframe as fallback
- Monitor for issues
- Gather user feedback

### Phase 3: Remove Iframe Rendering

- Remove iframe-based code
- Clean up unused components
- Update documentation
- Final testing

### Rollback Plan

If PDF.js causes issues:
1. Disable PDF.js via feature flag
2. Revert to iframe rendering
3. Investigate and fix issues
4. Re-enable PDF.js

### Backward Compatibility

- Existing documents continue to work
- No database migrations required
- No API changes required
- Transparent to users

## Security Considerations

### PDF.js Security

- Use official PDF.js CDN for worker
- Validate PDF content before rendering
- Sanitize PDF metadata
- Limit PDF file size (max 50MB)
- Timeout long-running operations

### DRM Protection

- Prevent right-click context menu
- Block print shortcuts
- Disable text selection
- Prevent save shortcuts
- Watermark overlay always visible
- Canvas-based rendering prevents easy extraction

### CORS/CSP

- Restrict CORS to known origins
- Configure CSP to allow only necessary resources
- Use signed URLs with expiration
- Validate authentication on every request

## Performance Optimization

### Rendering Optimization

- Use web workers for PDF parsing
- Render visible pages first
- Cache rendered canvases
- Unload off-screen pages
- Use requestAnimationFrame for smooth scrolling

### Memory Management

- Limit number of rendered pages in memory
- Destroy unused PDF.js objects
- Clear canvas contexts when not needed
- Monitor memory usage
- Implement garbage collection triggers

### Network Optimization

- Use HTTP/2 for parallel requests
- Implement request caching
- Compress PDF data
- Use CDN for PDF.js library
- Implement retry with exponential backoff

