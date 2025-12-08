# PDF.js Configuration Module

This module provides configuration and initialization for PDF.js library, enabling PDF rendering without iframe blocking issues.

## Overview

PDF.js is Mozilla's JavaScript library for rendering PDF documents in web browsers. This configuration module:

- Configures PDF.js worker source from CDN
- Sets up character maps (CMaps) for non-Latin text
- Provides TypeScript type definitions
- Handles initialization automatically

## Installation

PDF.js is already installed as a dependency:

```bash
npm install pdfjs-dist
```

Current version: **4.10.38**

## Usage

### Basic Usage

The module auto-initializes when imported:

```typescript
import { getPDFJS } from '@/lib/pdfjs-config';

const pdfjsLib = getPDFJS();

// Load a PDF document
const loadingTask = pdfjsLib.getDocument(pdfUrl);
const pdf = await loadingTask.promise;

console.log(`PDF has ${pdf.numPages} pages`);
```

### Custom Configuration

You can customize the configuration:

```typescript
import { initializePDFJS } from '@/lib/pdfjs-config';

initializePDFJS({
  workerSrc: 'https://custom-cdn.com/pdf.worker.js',
  disableWorker: false,
  cMapPacked: true,
});
```

### Type Definitions

Use the provided TypeScript types for type safety:

```typescript
import type { 
  PDFDocument, 
  PDFPage, 
  PDFViewport,
  PDFRenderParams 
} from '@/lib/types/pdfjs';

async function renderPage(page: PDFPage, scale: number) {
  const viewport: PDFViewport = page.getViewport({ scale });
  
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d')!;
  
  canvas.width = viewport.width;
  canvas.height = viewport.height;
  
  const renderParams: PDFRenderParams = {
    canvasContext: context,
    viewport: viewport,
  };
  
  await page.render(renderParams).promise;
}
```

## Configuration Options

### PDFJSConfig Interface

```typescript
interface PDFJSConfig {
  workerSrc: string;              // Path to PDF.js worker
  cMapUrl: string;                // Character map URL
  cMapPacked: boolean;            // Use packed CMaps
  standardFontDataUrl: string;    // Standard fonts URL
  disableWorker: boolean;         // Disable web worker
  verbosity: number;              // Logging level
}
```

### Default Configuration

```typescript
{
  workerSrc: 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.10.38/pdf.worker.min.js',
  cMapUrl: 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.10.38/cmaps/',
  cMapPacked: true,
  standardFontDataUrl: 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.10.38/standard_fonts/',
  disableWorker: false,
  verbosity: process.env.NODE_ENV === 'production' ? 0 : 1,
}
```

## API Reference

### Functions

#### `initializePDFJS(config?: Partial<PDFJSConfig>): void`

Initialize PDF.js with optional custom configuration.

```typescript
initializePDFJS({
  workerSrc: 'https://custom-cdn.com/pdf.worker.js',
});
```

#### `getPDFJS()`

Get the configured PDF.js library instance.

```typescript
const pdfjsLib = getPDFJS();
const loadingTask = pdfjsLib.getDocument(url);
```

#### `getPDFJSConfig(): PDFJSConfig`

Get the current PDF.js configuration.

```typescript
const config = getPDFJSConfig();
console.log(config.workerSrc);
```

#### `isPDFJSAvailable(): boolean`

Check if PDF.js is available and properly configured.

```typescript
if (isPDFJSAvailable()) {
  // PDF.js is ready to use
}
```

## TypeScript Types

The module provides comprehensive TypeScript types in `lib/types/pdfjs.ts`:

- `PDFDocument` - Loaded PDF document
- `PDFPage` - Single page in a document
- `PDFViewport` - Rendering viewport
- `PDFRenderParams` - Render parameters
- `PDFRenderTask` - Ongoing render operation
- `PDFLoadingTask` - Document loading task
- `PDFMetadata` - Document metadata
- And many more...

## CDN Configuration

The module uses Cloudflare CDN for PDF.js resources:

- **Worker**: `cdnjs.cloudflare.com/ajax/libs/pdf.js/4.10.38/pdf.worker.min.js`
- **CMaps**: `cdnjs.cloudflare.com/ajax/libs/pdf.js/4.10.38/cmaps/`
- **Fonts**: `cdnjs.cloudflare.com/ajax/libs/pdf.js/4.10.38/standard_fonts/`

This approach:
- Avoids bundling large worker files
- Leverages CDN caching
- Reduces build size
- Improves loading performance

## Browser Compatibility

PDF.js works in all modern browsers:

- Chrome/Edge 90+
- Firefox 88+
- Safari 14+
- Opera 76+

## Troubleshooting

### Worker Not Loading

If the worker fails to load, check:

1. CSP headers allow the CDN
2. Network connectivity to CDN
3. CORS configuration

### Memory Issues

For large PDFs:

1. Enable range requests
2. Use streaming mode
3. Limit rendered pages
4. Clean up unused pages

### Performance Issues

To improve performance:

1. Use web workers (enabled by default)
2. Enable caching
3. Use packed CMaps
4. Optimize viewport scale

## Related Files

- `lib/pdfjs-config.ts` - Configuration module
- `lib/types/pdfjs.ts` - TypeScript type definitions
- `lib/__tests__/pdfjs-config.test.ts` - Unit tests

## Requirements

This module satisfies:

- **Requirement 2.1**: Use PDF.js library for rendering
- Configures PDF.js worker source
- Sets up TypeScript types
- Provides initialization utilities

## Next Steps

After configuration, you can:

1. Create PDF.js integration layer (`lib/pdfjs-integration.ts`)
2. Build PDF viewer component (`components/viewers/PDFViewerWithPDFJS.tsx`)
3. Implement page rendering
4. Add navigation controls
5. Integrate with existing viewers

## References

- [PDF.js Documentation](https://mozilla.github.io/pdf.js/)
- [PDF.js API](https://mozilla.github.io/pdf.js/api/)
- [PDF.js Examples](https://mozilla.github.io/pdf.js/examples/)
