# Component Documentation

## Overview

This document provides detailed API documentation for all PDF.js-related components and utilities. Use this as a reference when integrating PDF rendering into your application.

## Table of Contents

1. [PDFViewerWithPDFJS Component](#pdfviewerwithpdfjs-component)
2. [SimpleDocumentViewer Component](#simpledocumentviewer-component)
3. [PDF.js Integration Functions](#pdfjs-integration-functions)
4. [Memory Management](#memory-management)
5. [Render Pipeline](#render-pipeline)
6. [Network Utilities](#network-utilities)
7. [Error Handling](#error-handling)
8. [Migration Guide](#migration-guide)

---

## PDFViewerWithPDFJS Component

### Location
`components/viewers/PDFViewerWithPDFJS.tsx`

### Description
A React component that renders PDF documents using PDF.js library. Provides full control over PDF display, supports watermarks, DRM protections, and multiple view modes.

### Props

```typescript
interface PDFViewerWithPDFJSProps {
  /** PDF URL (signed URL from storage) */
  pdfUrl: string;
  
  /** Document title for display */
  documentTitle: string;
  
  /** Watermark settings (optional) */
  watermark?: WatermarkSettings;
  
  /** Enable DRM protections (default: false) */
  enableDRM?: boolean;
  
  /** View mode: single page or continuous scroll (default: 'single') */
  viewMode?: 'single' | 'continuous';
  
  /** Callback when page changes */
  onPageChange?: (page: number) => void;
  
  /** Callback when loading completes */
  onLoadComplete?: (numPages: number) => void;
  
  /** Callback when error occurs */
  onError?: (error: Error) => void;
  
  /** Callback when page render completes */
  onRenderComplete?: (pageNumber: number) => void;
}

interface WatermarkSettings {
  text: string;
  opacity: number;      // 0.0 to 1.0
  fontSize: number;     // in pixels
}
```

### Usage Examples

#### Basic Usage

```typescript
import PDFViewerWithPDFJS from '@/components/viewers/PDFViewerWithPDFJS';

function MyPDFViewer() {
  return (
    <PDFViewerWithPDFJS
      pdfUrl="https://storage.example.com/document.pdf"
      documentTitle="Annual Report 2024"
    />
  );
}
```

#### With Watermark and DRM

```typescript
<PDFViewerWithPDFJS
  pdfUrl={signedUrl}
  documentTitle="Confidential Document"
  watermark={{
    text: "CONFIDENTIAL - John Doe",
    opacity: 0.3,
    fontSize: 48,
  }}
  enableDRM={true}
  onPageChange={(page) => {
    console.log(`User viewing page ${page}`);
  }}
/>
```

#### With Error Handling

```typescript
<PDFViewerWithPDFJS
  pdfUrl={pdfUrl}
  documentTitle="My Document"
  onLoadComplete={(numPages) => {
    console.log(`Successfully loaded ${numPages} pages`);
  }}
  onError={(error) => {
    console.error('Failed to load PDF:', error);
    // Show error notification to user
  }}
  onRenderComplete={(pageNumber) => {
    console.log(`Page ${pageNumber} rendered successfully`);
  }}
/>
```

#### Continuous Scroll Mode

```typescript
<PDFViewerWithPDFJS
  pdfUrl={pdfUrl}
  documentTitle="Long Document"
  viewMode="continuous"
  onPageChange={(page) => {
    // Track reading progress
    saveReadingPosition(documentId, page);
  }}
/>
```

### Features

- **Single Page Mode**: Display one page at a time with navigation controls
- **Continuous Scroll Mode**: Display all pages vertically with lazy loading
- **Zoom Controls**: Zoom in/out with bounds (0.5x - 3.0x)
- **Keyboard Shortcuts**: Arrow keys, Page Up/Down, Home/End, Ctrl+Scroll
- **Watermark Overlay**: Customizable watermark that scales with zoom
- **DRM Protections**: Prevent right-click, print, save, text selection
- **Progress Tracking**: Loading progress indicator
- **Error Handling**: User-friendly error messages with retry option
- **Memory Management**: Automatic cleanup of off-screen pages
- **Performance Optimization**: Canvas caching, render throttling, lazy loading

### Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| Arrow Left/Up | Previous page |
| Arrow Right/Down | Next page |
| Page Up | Previous page |
| Page Down | Next page |
| Home | First page |
| End | Last page |
| Ctrl + Scroll Up | Zoom in |
| Ctrl + Scroll Down | Zoom out |

### Accessibility

- ARIA labels for all interactive elements
- Screen reader announcements for page changes
- Keyboard navigation support
- Focus management
- Minimum touch target size (44x44px)

---

## SimpleDocumentViewer Component

### Location
`components/viewers/SimpleDocumentViewer.tsx`

### Description
A full-screen document viewer that supports both PDF.js rendering and legacy page-based rendering. Provides a unified interface for viewing documents with watermarks and DRM protections.

### Props

```typescript
interface SimpleDocumentViewerProps {
  documentId: string;
  documentTitle: string;
  pdfUrl?: string;                          // Direct PDF URL for PDF.js rendering
  pages?: PageData[];                       // Legacy: pre-converted page images
  watermark?: WatermarkSettings;
  enableScreenshotPrevention?: boolean;
  onClose?: () => void;
}

interface PageData {
  pageNumber: number;
  pageUrl: string;
  dimensions: { width: number; height: number };
}
```

**Note**: The `usePDFJS` prop has been removed. PDF.js rendering is now the default and only method for PDF documents.

### Usage Examples

#### PDF Rendering (Default)

```typescript
import SimpleDocumentViewer from '@/components/viewers/SimpleDocumentViewer';

function ViewerPage() {
  return (
    <SimpleDocumentViewer
      documentId="doc-123"
      documentTitle="My Document"
      pdfUrl={signedPdfUrl}
      watermark={watermarkSettings}
      enableScreenshotPrevention={true}
      onClose={() => router.back()}
    />
  );
}
```

**Note**: PDF.js rendering is now the default and only method. No additional props needed.

#### Legacy Page-Based Rendering

```typescript
<SimpleDocumentViewer
  documentId="doc-123"
  documentTitle="My Document"
  pages={pageDataArray}
  watermark={watermarkSettings}
  enableScreenshotPrevention={true}
/>
```

**Note**: Page-based rendering is deprecated and only maintained for backward compatibility.

---

## PDF.js Integration Functions

### Location
`lib/pdfjs-integration.ts`

### loadPDFDocument

Load a PDF document with progress tracking and error handling.

```typescript
async function loadPDFDocument(
  options: LoadPDFDocumentOptions
): Promise<LoadPDFDocumentResult>

interface LoadPDFDocumentOptions {
  source: string | PDFDocumentSource;
  onProgress?: (progress: PDFLoadingProgress) => void;
  timeout?: number;                    // default: 30000ms
  httpHeaders?: Record<string, string>;
  password?: string;
}

interface LoadPDFDocumentResult {
  document: PDFDocument;
  numPages: number;
  loadTime: number;
}
```

**Example:**

```typescript
import { loadPDFDocument } from '@/lib/pdfjs-integration';

const result = await loadPDFDocument({
  source: 'https://example.com/document.pdf',
  onProgress: (progress) => {
    const percent = progress.total 
      ? Math.round((progress.loaded / progress.total) * 100)
      : 0;
    console.log(`Loading: ${percent}%`);
  },
  timeout: 30000,
});

console.log(`Loaded ${result.numPages} pages in ${result.loadTime}ms`);
```

### renderPageToCanvas

Render a PDF page to a canvas element.

```typescript
async function renderPageToCanvas(
  options: RenderPageToCanvasOptions
): Promise<RenderPageToCanvasResult>

interface RenderPageToCanvasOptions {
  page: PDFPage;
  canvas: HTMLCanvasElement;
  scale?: number;                      // default: 1.0
  rotation?: number;                   // default: 0
  intent?: 'display' | 'print';        // default: 'display'
  background?: string;
}

interface RenderPageToCanvasResult {
  canvas: HTMLCanvasElement;
  viewport: PDFViewport;
  renderTime: number;
}
```

**Example:**

```typescript
import { renderPageToCanvas } from '@/lib/pdfjs-integration';

const page = await pdfDocument.getPage(1);
const canvas = document.createElement('canvas');

const result = await renderPageToCanvas({
  page,
  canvas,
  scale: 1.5,
  background: '#ffffff',
});

console.log(`Rendered in ${result.renderTime}ms`);
document.body.appendChild(result.canvas);
```

### cleanupCanvas

Clean up canvas resources to free memory.

```typescript
function cleanupCanvas(canvas: HTMLCanvasElement): void
```

**Example:**

```typescript
import { cleanupCanvas } from '@/lib/pdfjs-integration';

// When done with canvas
cleanupCanvas(canvas);
```

### destroyPDFDocument

Destroy a PDF document and free resources.

```typescript
function destroyPDFDocument(document: PDFDocument): void
```

**Example:**

```typescript
import { destroyPDFDocument } from '@/lib/pdfjs-integration';

// When done with document
destroyPDFDocument(pdfDocument);
```

---

## Memory Management

### Location
`lib/pdfjs-memory.ts`

### PDFMemoryManager

Manages memory usage by limiting rendered pages and PDF page objects in memory.

```typescript
class PDFMemoryManager {
  constructor(config?: Partial<MemoryConfig>);
  
  setPDFDocument(document: PDFDocument | null): void;
  addRenderedPage(pageNumber: number, canvas: HTMLCanvasElement): void;
  getRenderedPage(pageNumber: number): HTMLCanvasElement | null;
  addPageObject(pageNumber: number, page: PDFPage): void;
  getPageObject(pageNumber: number): PDFPage | null;
  clearPage(pageNumber: number): void;
  clearAllPages(): void;
  destroy(): void;
  getMemoryStats(): MemoryStats;
  updateConfig(config: Partial<MemoryConfig>): void;
  prioritizePages(visiblePages: number[], totalPages: number): number[];
  removeNonPriorityPages(priorityPages: number[]): void;
}

interface MemoryConfig {
  maxRenderedPages: number;      // default: 5
  maxPageObjects: number;        // default: 10
  enableMonitoring: boolean;     // default: true
  warningThreshold: number;      // default: 100 (MB)
}
```

**Example:**

```typescript
import { createMemoryManager } from '@/lib/pdfjs-memory';

const memoryManager = createMemoryManager({
  maxRenderedPages: 5,
  maxPageObjects: 10,
  enableMonitoring: true,
});

// Set PDF document
memoryManager.setPDFDocument(pdfDocument);

// Add rendered page
memoryManager.addRenderedPage(1, canvas);

// Get memory stats
const stats = memoryManager.getMemoryStats();
console.log(`Memory usage: ${stats.totalMemoryMB.toFixed(2)}MB`);
console.log(`Cached pages: ${stats.cachedPages}`);

// Cleanup
memoryManager.destroy();
```

---

## Render Pipeline

### Location
`lib/pdfjs-render-pipeline.ts`

### PDFRenderPipeline

Optimizes rendering with canvas caching, throttling, and priority queuing.

```typescript
class PDFRenderPipeline {
  constructor(options?: RenderPipelineOptions);
  
  getCachedCanvas(pageNumber: number, scale: number): HTMLCanvasElement | null;
  queueRender(
    page: PDFPage,
    pageNumber: number,
    canvas: HTMLCanvasElement,
    scale: number,
    priority?: number,
    callback?: (error?: Error) => void
  ): void;
  cancelAll(): void;
  cancelPage(pageNumber: number): void;
  clearCache(): void;
  clearPageCache(pageNumber: number): void;
  getCacheStats(): CacheStats;
  getQueueStats(): QueueStats;
  destroy(): void;
}

interface RenderPipelineOptions {
  maxCacheSize?: number;           // default: 10
  cacheTTL?: number;               // default: 5 minutes
  maxConcurrentRenders?: number;   // default: 2
  throttleDelay?: number;          // default: 16ms (~60fps)
}
```

**Example:**

```typescript
import { getGlobalRenderPipeline } from '@/lib/pdfjs-render-pipeline';

const pipeline = getGlobalRenderPipeline({
  maxCacheSize: 10,
  maxConcurrentRenders: 2,
});

// Queue render with priority
pipeline.queueRender(
  page,
  pageNumber,
  canvas,
  1.0,
  100,  // High priority
  (error) => {
    if (error) {
      console.error('Render failed:', error);
    } else {
      console.log('Render complete');
    }
  }
);

// Get stats
const stats = pipeline.getCacheStats();
console.log(`Cache: ${stats.size}/${stats.maxSize}`);
```

---

## Network Utilities

### Location
`lib/pdfjs-network.ts`

### optimizedFetch

Fetch with caching, retry, and progress tracking.

```typescript
async function optimizedFetch(
  url: string,
  options?: OptimizedFetchOptions
): Promise<Response>

interface OptimizedFetchOptions extends RequestInit {
  cache?: NetworkCacheOptions;
  retry?: RetryOptions;
  onProgress?: (loaded: number, total?: number) => void;
  timeout?: number;
}
```

**Example:**

```typescript
import { optimizedFetch } from '@/lib/pdfjs-network';

const response = await optimizedFetch(pdfUrl, {
  cache: {
    enabled: true,
    cacheTTL: 60 * 60 * 1000,  // 1 hour
  },
  retry: {
    enabled: true,
    maxRetries: 3,
  },
  onProgress: (loaded, total) => {
    if (total) {
      const percent = Math.round((loaded / total) * 100);
      console.log(`Downloaded: ${percent}%`);
    }
  },
  timeout: 30000,
});

const arrayBuffer = await response.arrayBuffer();
```

---

## Error Handling

### Location
`lib/errors/pdfjs-errors.ts`

### Error Types

```typescript
enum PDFJSErrorCode {
  TIMEOUT = 'TIMEOUT',
  INVALID_PDF = 'INVALID_PDF',
  MISSING_PDF = 'MISSING_PDF',
  NETWORK_ERROR = 'NETWORK_ERROR',
  PASSWORD_REQUIRED = 'PASSWORD_REQUIRED',
  CANCELLED = 'CANCELLED',
  RENDER_ERROR = 'RENDER_ERROR',
  CANVAS_CONTEXT_ERROR = 'CANVAS_CONTEXT_ERROR',
  // ... more error codes
}

interface PDFJSError {
  code: PDFJSErrorCode;
  category: PDFJSErrorCategory;
  message: string;
  userMessage: string;
  suggestion: string;
  recoverable: boolean;
  retryable: boolean;
  originalError?: Error;
}
```

### Error Handling Functions

```typescript
function parsePDFJSError(error: unknown): PDFJSError;
function createPDFJSError(code: PDFJSErrorCode, message?: string): PDFJSError;
function isRecoverable(code: PDFJSErrorCode): boolean;
function isRetryable(code: PDFJSErrorCode): boolean;
function getRetryDelay(code: PDFJSErrorCode, attemptNumber: number): number;
function getMaxRetryAttempts(code: PDFJSErrorCode): number;
```

**Example:**

```typescript
import { parsePDFJSError } from '@/lib/errors/pdfjs-errors';

try {
  await loadPDFDocument({ source: pdfUrl });
} catch (error) {
  const pdfError = parsePDFJSError(error);
  
  console.error('Error:', pdfError.userMessage);
  console.log('Suggestion:', pdfError.suggestion);
  
  if (pdfError.retryable) {
    console.log('This error can be retried');
  }
}
```

---

## Migration Guide

### Migration Complete

**Note**: The iframe fallback has been removed. All PDF documents now use PDF.js rendering automatically. No code changes are required.

#### Component Usage

```typescript
<SimpleDocumentViewer
  documentId="doc-123"
  documentTitle="My Document"
  pdfUrl={pdfUrl}
  // PDF.js rendering is automatic
/>
```

#### Server-Side Code

Ensure your server provides signed URLs that work with fetch API:

```typescript
// server-side
import { getSignedUrl } from '@/lib/supabase-storage';

const signedUrl = await getSignedUrl(
  filePath,
  3600,  // 1 hour expiration
  'documents',
  {
    download: false,  // Don't force download
  }
);
```

#### Step 3: Update CORS Configuration

Ensure your storage service returns appropriate CORS headers:

```typescript
// Supabase storage CORS configuration
{
  "allowedOrigins": ["https://yourdomain.com"],
  "allowedMethods": ["GET", "HEAD"],
  "allowedHeaders": ["*"],
  "maxAgeSeconds": 3600
}
```

#### Testing Checklist

- [ ] PDF loads without errors
- [ ] Navigation controls work
- [ ] Zoom controls work
- [ ] Keyboard shortcuts work
- [ ] Watermark displays correctly
- [ ] DRM protections work
- [ ] Error handling works
- [ ] Performance is acceptable

### Breaking Changes

None. The PDF.js integration is backward compatible with the iframe approach.

### Deprecation Notice

The iframe-based rendering approach is deprecated and will be removed in a future version. Please migrate to PDF.js rendering.

---

## Best Practices

1. **Always provide error handlers:**
   ```typescript
   <PDFViewerWithPDFJS
     onError={(error) => {
       // Handle error appropriately
     }}
   />
   ```

2. **Use signed URLs with appropriate expiration:**
   ```typescript
   const signedUrl = await getSignedUrl(path, 3600); // 1 hour
   ```

3. **Enable DRM for sensitive documents:**
   ```typescript
   <PDFViewerWithPDFJS enableDRM={true} />
   ```

4. **Monitor memory usage in development:**
   ```typescript
   const memoryManager = createMemoryManager({
     enableMonitoring: true,
   });
   ```

5. **Use continuous scroll for long documents:**
   ```typescript
   <PDFViewerWithPDFJS viewMode="continuous" />
   ```

6. **Provide loading feedback:**
   ```typescript
   <PDFViewerWithPDFJS
     onLoadComplete={(numPages) => {
       showNotification(`Loaded ${numPages} pages`);
     }}
   />
   ```

---

## API Reference Summary

### Components
- `PDFViewerWithPDFJS` - Main PDF viewer component
- `SimpleDocumentViewer` - Unified document viewer

### Functions
- `loadPDFDocument()` - Load PDF with progress tracking
- `renderPageToCanvas()` - Render page to canvas
- `cleanupCanvas()` - Clean up canvas resources
- `destroyPDFDocument()` - Destroy PDF document

### Classes
- `PDFMemoryManager` - Memory management
- `PDFRenderPipeline` - Render optimization

### Utilities
- `optimizedFetch()` - Network optimization
- `parsePDFJSError()` - Error handling

---

## Next Steps

- Read the [Integration Guide](./PDFJS_INTEGRATION_GUIDE.md) for setup instructions
- Read the [User Guide](./USER_GUIDE.md) for end-user documentation
- Review the [design document](./design.md) for architecture details
