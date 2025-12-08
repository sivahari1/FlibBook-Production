# PDF.js Integration Guide

## Overview

This guide explains how to integrate and use the PDF.js rendering system to avoid iframe blocking issues in Chrome and other browsers. The PDF.js integration provides full control over PDF display, supports all modern browsers, and maintains DRM protections and watermark functionality.

## Table of Contents

1. [Setup and Installation](#setup-and-installation)
2. [Architecture Overview](#architecture-overview)
3. [Rendering Pipeline](#rendering-pipeline)
4. [Usage Examples](#usage-examples)
5. [Configuration](#configuration)
6. [Performance Optimization](#performance-optimization)
7. [Troubleshooting](#troubleshooting)

---

## Setup and Installation

### Prerequisites

- Node.js 18+ and npm
- Next.js 14+
- React 18+

### Installation

The PDF.js library is already installed as part of the project dependencies:

```bash
npm install pdfjs-dist
```

### Configuration

PDF.js is automatically configured when the application loads. The configuration is located in `lib/pdfjs-config.ts`:

```typescript
import { initializePDFJS } from '@/lib/pdfjs-config';

// Initialize PDF.js (happens automatically on import)
initializePDFJS();
```

The default configuration uses CDN resources for:
- PDF.js worker script
- Character maps (CMaps) for non-Latin text
- Standard fonts

---

## Architecture Overview

The PDF.js integration consists of several layers:

### 1. Configuration Layer (`lib/pdfjs-config.ts`)
- Initializes PDF.js library
- Configures worker source and resources
- Provides availability checks

### 2. Integration Layer (`lib/pdfjs-integration.ts`)
- Wraps PDF.js API with error handling
- Provides `loadPDFDocument()` for loading PDFs
- Provides `renderPageToCanvas()` for rendering pages
- Handles timeouts and progress tracking

### 3. Network Layer (`lib/pdfjs-network.ts`)
- Implements request caching using Cache API
- Provides retry with exponential backoff
- Supports HTTP/2 parallel requests
- Tracks loading progress

### 4. Memory Management (`lib/pdfjs-memory.ts`)
- Limits rendered pages in memory
- Manages PDF page object lifecycle
- Prevents memory leaks
- Monitors memory usage

### 5. Render Pipeline (`lib/pdfjs-render-pipeline.ts`)
- Caches rendered canvases
- Throttles rendering using requestAnimationFrame
- Manages render queue with priorities
- Supports concurrent rendering

### 6. Component Layer (`components/viewers/PDFViewerWithPDFJS.tsx`)
- React component for PDF viewing
- Handles user interactions
- Manages view modes (single page, continuous scroll)
- Applies DRM protections and watermarks

---

## Rendering Pipeline

### How PDF Rendering Works

1. **Document Loading**
   ```typescript
   const result = await loadPDFDocument({
     source: pdfUrl,
     onProgress: (progress) => {
       console.log(`${progress.loaded} / ${progress.total}`);
     },
     timeout: 30000,
   });
   ```

2. **Page Retrieval**
   ```typescript
   const page = await pdfDocument.getPage(pageNumber);
   ```

3. **Canvas Rendering**
   ```typescript
   const result = await renderPageToCanvas({
     page,
     canvas,
     scale: 1.0,
   });
   ```

4. **Caching and Optimization**
   - Rendered canvases are cached for reuse
   - Off-screen pages are unloaded to save memory
   - Visible pages are prioritized for rendering

### Rendering Flow Diagram

```
User Request
    ↓
Check Cache → [Cache Hit] → Copy to Canvas → Done
    ↓ [Cache Miss]
Queue Render
    ↓
Render Pipeline
    ↓
- Priority Sorting
- Throttling (60fps)
- Concurrent Control (max 2)
    ↓
PDF.js Render
    ↓
Cache Result
    ↓
Display Canvas
```

---

## Usage Examples

### Basic Usage

```typescript
import PDFViewerWithPDFJS from '@/components/viewers/PDFViewerWithPDFJS';

function MyComponent() {
  return (
    <PDFViewerWithPDFJS
      pdfUrl="https://example.com/document.pdf"
      documentTitle="My Document"
      onLoadComplete={(numPages) => {
        console.log(`Loaded ${numPages} pages`);
      }}
      onError={(error) => {
        console.error('PDF error:', error);
      }}
    />
  );
}
```

### With Watermark

```typescript
<PDFViewerWithPDFJS
  pdfUrl={pdfUrl}
  documentTitle="Protected Document"
  watermark={{
    text: "Confidential",
    opacity: 0.3,
    fontSize: 48,
  }}
  enableDRM={true}
/>
```

### With Page Change Tracking

```typescript
<PDFViewerWithPDFJS
  pdfUrl={pdfUrl}
  documentTitle="My Document"
  onPageChange={(page) => {
    console.log(`User is on page ${page}`);
    // Track analytics, save reading position, etc.
  }}
  onRenderComplete={(pageNumber) => {
    console.log(`Page ${pageNumber} rendered`);
  }}
/>
```

### Continuous Scroll Mode

```typescript
<PDFViewerWithPDFJS
  pdfUrl={pdfUrl}
  documentTitle="Long Document"
  viewMode="continuous"
  onPageChange={(page) => {
    console.log(`Scrolled to page ${page}`);
  }}
/>
```

### Integration with SimpleDocumentViewer

The `SimpleDocumentViewer` component automatically uses PDF.js when the `usePDFJS` prop is enabled:

```typescript
import SimpleDocumentViewer from '@/components/viewers/SimpleDocumentViewer';

function ViewerPage() {
  return (
    <SimpleDocumentViewer
      documentId="doc-123"
      documentTitle="My Document"
      pdfUrl={signedPdfUrl}
      usePDFJS={true}  // Enable PDF.js rendering
      watermark={watermarkSettings}
      enableScreenshotPrevention={true}
    />
  );
}
```

---

## Configuration

### PDF.js Configuration

Customize PDF.js behavior in `lib/pdfjs-config.ts`:

```typescript
initializePDFJS({
  workerSrc: 'https://cdn.example.com/pdf.worker.js',
  cMapUrl: 'https://cdn.example.com/cmaps/',
  cMapPacked: true,
  standardFontDataUrl: 'https://cdn.example.com/fonts/',
  disableWorker: false,
  verbosity: PDFJSVerbosity.ERRORS,
});
```

### Memory Management Configuration

Configure memory limits in your component:

```typescript
import { createMemoryManager } from '@/lib/pdfjs-memory';

const memoryManager = createMemoryManager({
  maxRenderedPages: 5,      // Keep 5 rendered pages in memory
  maxPageObjects: 10,       // Keep 10 page objects in memory
  enableMonitoring: true,   // Log memory warnings
  warningThreshold: 100,    // Warn at 100MB
});
```

### Render Pipeline Configuration

Configure rendering behavior:

```typescript
import { getGlobalRenderPipeline } from '@/lib/pdfjs-render-pipeline';

const pipeline = getGlobalRenderPipeline({
  maxCacheSize: 10,              // Cache 10 rendered pages
  cacheTTL: 5 * 60 * 1000,       // 5 minute cache TTL
  maxConcurrentRenders: 2,       // Render 2 pages concurrently
  throttleDelay: 16,             // 60fps throttling
});
```

### Network Configuration

Configure network optimizations:

```typescript
import { optimizedFetch } from '@/lib/pdfjs-network';

const response = await optimizedFetch(pdfUrl, {
  cache: {
    enabled: true,
    cacheName: 'pdfjs-network-cache',
    cacheTTL: 60 * 60 * 1000,  // 1 hour
  },
  retry: {
    enabled: true,
    maxRetries: 3,
    initialDelay: 1000,
    maxDelay: 10000,
    backoffMultiplier: 2,
  },
  timeout: 30000,
});
```

---

## Performance Optimization

### 1. Canvas Caching

Rendered pages are automatically cached to avoid re-rendering:

```typescript
// First render - slow
await renderPageToCanvas({ page, canvas, scale: 1.0 });

// Second render - fast (from cache)
await renderPageToCanvas({ page, canvas, scale: 1.0 });
```

### 2. Lazy Loading

Pages are loaded on-demand as they become visible:

```typescript
// In continuous scroll mode:
// - Visible pages are rendered immediately
// - Adjacent pages are pre-rendered
// - Off-screen pages are unloaded
```

### 3. Memory Management

Automatic memory management prevents leaks:

```typescript
// Automatically limits memory usage
// - Keeps only 5 rendered pages in memory
// - Unloads off-screen pages
// - Cleans up canvas contexts
```

### 4. Network Optimization

Network requests are optimized:

```typescript
// - Requests are cached using Cache API
// - Failed requests are retried with exponential backoff
// - HTTP/2 is used for parallel requests
// - Progress is tracked for user feedback
```

### 5. Render Throttling

Rendering is throttled to maintain 60fps:

```typescript
// - Uses requestAnimationFrame for smooth rendering
// - Limits concurrent renders to 2
// - Prioritizes visible pages
```

### Performance Tips

1. **Use continuous scroll mode for long documents** - Better memory management
2. **Enable caching** - Reduces network requests
3. **Set appropriate memory limits** - Balance between performance and memory usage
4. **Monitor memory usage** - Enable monitoring in development
5. **Use signed URLs with long expiration** - Reduces authentication overhead

---

## Troubleshooting

### Common Issues

#### 1. PDF Not Loading

**Symptoms:** Loading spinner never completes, error message displayed

**Possible Causes:**
- Invalid PDF URL
- Network connectivity issues
- CORS restrictions
- PDF file is corrupted

**Solutions:**
```typescript
// Check if PDF.js is available
import { isPDFJSAvailable } from '@/lib/pdfjs-config';

if (!isPDFJSAvailable()) {
  console.error('PDF.js is not available');
}

// Check network connectivity
try {
  const response = await fetch(pdfUrl, { method: 'HEAD' });
  console.log('PDF accessible:', response.ok);
} catch (error) {
  console.error('Network error:', error);
}

// Verify CORS headers
// Ensure your storage service returns appropriate CORS headers
```

#### 2. Slow Rendering

**Symptoms:** Pages take a long time to render

**Possible Causes:**
- Large PDF file
- Slow network connection
- Insufficient memory
- Too many concurrent renders

**Solutions:**
```typescript
// Increase timeout
await loadPDFDocument({
  source: pdfUrl,
  timeout: 60000, // 60 seconds
});

// Reduce concurrent renders
const pipeline = getGlobalRenderPipeline({
  maxConcurrentRenders: 1,
});

// Enable network caching
const response = await optimizedFetch(pdfUrl, {
  cache: { enabled: true },
});
```

#### 3. Memory Issues

**Symptoms:** Browser becomes slow or crashes

**Possible Causes:**
- Too many pages in memory
- Memory leaks
- Large page dimensions

**Solutions:**
```typescript
// Reduce memory limits
const memoryManager = createMemoryManager({
  maxRenderedPages: 3,
  maxPageObjects: 5,
});

// Monitor memory usage
const stats = memoryManager.getMemoryStats();
console.log('Memory usage:', stats.totalMemoryMB, 'MB');

// Clear cache periodically
memoryManager.clearAllPages();
```

#### 4. Watermark Not Visible

**Symptoms:** Watermark doesn't appear on PDF

**Possible Causes:**
- Watermark opacity too low
- Z-index issues
- Watermark container not positioned correctly

**Solutions:**
```typescript
// Increase opacity
<PDFViewerWithPDFJS
  watermark={{
    text: "Confidential",
    opacity: 0.5,  // Increase from 0.3
    fontSize: 48,
  }}
/>

// Check watermark container in DevTools
// Ensure it has position: absolute and z-index: 10
```

#### 5. DRM Protections Not Working

**Symptoms:** Users can right-click, print, or save PDF

**Possible Causes:**
- DRM not enabled
- Event listeners not attached
- Browser extensions bypassing protections

**Solutions:**
```typescript
// Ensure DRM is enabled
<PDFViewerWithPDFJS
  enableDRM={true}
/>

// Note: DRM protections are not foolproof
// They prevent casual copying but can be bypassed by determined users
```

### Debugging Tips

1. **Enable verbose logging:**
   ```typescript
   // In pdfjs-config.ts
   verbosity: PDFJSVerbosity.INFOS
   ```

2. **Check browser console:**
   - Look for PDF.js errors
   - Check network requests
   - Monitor memory usage

3. **Use React DevTools:**
   - Inspect component state
   - Check prop values
   - Monitor re-renders

4. **Test in different browsers:**
   - Chrome, Firefox, Safari, Edge
   - Check for browser-specific issues

5. **Monitor network:**
   - Use browser DevTools Network tab
   - Check request timing
   - Verify CORS headers

### Getting Help

If you encounter issues not covered here:

1. Check the [PDF.js documentation](https://mozilla.github.io/pdf.js/)
2. Review the [design document](.kiro/specs/pdf-iframe-blocking-fix/design.md)
3. Check the [requirements document](.kiro/specs/pdf-iframe-blocking-fix/requirements.md)
4. Review existing tests in `components/viewers/__tests__/`
5. Contact the development team

---

## Next Steps

- Read the [Component Documentation](./COMPONENT_DOCUMENTATION.md) for detailed API reference
- Read the [User Guide](./USER_GUIDE.md) for end-user documentation
- Review the [design document](./design.md) for architecture details
- Check the [tasks document](./tasks.md) for implementation status
