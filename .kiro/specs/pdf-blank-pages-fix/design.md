# PDF Blank Pages Fix - Design

## Overview

The root cause of blank white pages is that the PDF rendering to canvas is not completing properly before the canvas is exported to an image buffer. The current implementation uses `pdfjs-dist` with `node-canvas`, but the rendering promise may not be awaited correctly, or the canvas context configuration is incompatible with pdfjs-dist's expectations.

### Root Causes Identified

1. **Incomplete Render Await**: The `page.render().promise` may not be fully awaited before canvas export
2. **Canvas Context Issues**: The 2D context from node-canvas may need specific configuration for pdfjs-dist
3. **Worker Configuration**: pdfjs-dist may be trying to use web workers in Node.js environment
4. **Buffer Export Timing**: Canvas may be exported before rendering completes

## Architecture

### Current Flow (Broken)

```
PDF Upload → convertPdfToImages()
    ↓
Load PDF with pdfjs-dist
    ↓
For each page:
    - Get page viewport
    - Create node-canvas
    - Call page.render() ❌ (not awaiting properly)
    - Export canvas.toBuffer() ❌ (exports before render completes)
    - Result: blank white image
    ↓
Upload blank images to Supabase
    ↓
Flipbook displays blank pages
```

### Fixed Flow

```
PDF Upload → convertPdfToImages()
    ↓
Configure pdfjs-dist for Node.js (disable workers)
    ↓
Load PDF with proper Uint8Array data
    ↓
For each page:
    - Get page viewport with correct scale
    - Create node-canvas with exact dimensions
    - Get 2D context
    - Call page.render({ canvasContext, viewport })
    - ✅ AWAIT renderTask.promise completely
    - ✅ Verify canvas has content
    - Export canvas.toBuffer('image/png')
    - Optimize with Sharp → JPEG
    ↓
Upload valid images to Supabase
    ↓
Flipbook displays actual content
```

## Components and Interfaces

### 1. Fixed PDF Converter Service

**Location:** `lib/services/pdf-converter.ts`

**Key Changes:**

```typescript
// CRITICAL: Disable workers for Node.js environment
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs';

// Configure pdfjs for Node.js BEFORE any document loading
pdfjsLib.GlobalWorkerOptions.workerSrc = '';
pdfjsLib.GlobalWorkerOptions.workerPort = null;

async function convertAndUploadPage(
  pdfDocument: any,
  pageNumber: number,
  userId: string,
  documentId: string,
  quality: number,
  format: string,
  dpi: number
): Promise<PageConversionResult> {
  try {
    // Get the page
    const page = await pdfDocument.getPage(pageNumber);
    
    // Calculate viewport with desired DPI
    const scale = dpi / 72; // PDF default is 72 DPI
    const viewport = page.getViewport({ scale });
    
    // CRITICAL: Create canvas with EXACT dimensions (no rounding)
    const canvas = createCanvas(
      Math.floor(viewport.width),
      Math.floor(viewport.height)
    );
    const context = canvas.getContext('2d');
    
    // CRITICAL: Configure context for pdfjs-dist
    // Some versions of pdfjs expect specific canvas properties
    if (!context.canvas) {
      context.canvas = canvas;
    }
    
    console.log(`[Converter] Rendering page ${pageNumber}:`, {
      width: viewport.width,
      height: viewport.height,
      scale,
    });
    
    // CRITICAL: Render PDF page to canvas and AWAIT completion
    const renderTask = page.render({
      canvasContext: context,
      viewport: viewport,
    });
    
    // ✅ MUST await the promise completely
    await renderTask.promise;
    
    console.log(`[Converter] ✅ Page ${pageNumber} rendered to canvas`);
    
    // CRITICAL: Export canvas to PNG first (lossless)
    // node-canvas toBuffer() is synchronous and returns immediately
    const pngBuffer = canvas.toBuffer('image/png');
    
    console.log(`[Converter] Canvas exported to PNG:`, {
      pageNumber,
      bufferSize: pngBuffer.length,
      sizeKB: (pngBuffer.length / 1024).toFixed(2),
    });
    
    // Verify we have actual content (not blank)
    if (pngBuffer.length < 10000) {
      console.warn(`[Converter] ⚠️ Page ${pageNumber} PNG is suspiciously small (${pngBuffer.length} bytes)`);
    }
    
    // Optimize image with Sharp (PNG → JPEG)
    const optimizedBuffer = await sharp(pngBuffer)
      .jpeg({
        quality,
        progressive: true,
        mozjpeg: true,
      })
      .resize({
        width: 1200,
        height: 1600,
        fit: 'inside',
        withoutEnlargement: true,
      })
      .toBuffer();
    
    console.log(`[Converter] Optimized to JPEG:`, {
      pageNumber,
      originalKB: (pngBuffer.length / 1024).toFixed(2),
      optimizedKB: (optimizedBuffer.length / 1024).toFixed(2),
      compressionRatio: ((1 - optimizedBuffer.length / pngBuffer.length) * 100).toFixed(1) + '%',
    });
    
    // Verify final image is reasonable size
    if (optimizedBuffer.length < 10000) {
      throw new Error(`Page ${pageNumber} JPEG is too small (${optimizedBuffer.length} bytes) - likely blank`);
    }
    
    // Upload to Supabase storage
    const storagePath = `${userId}/${documentId}/page-${pageNumber}.${format}`;
    const { error } = await supabase.storage
      .from('document-pages')
      .upload(storagePath, optimizedBuffer, {
        contentType: `image/${format}`,
        upsert: true,
        cacheControl: '604800', // 7 days
      });

    if (error) {
      throw new Error(`Upload failed for page ${pageNumber}: ${error.message}`);
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('document-pages')
      .getPublicUrl(storagePath);

    console.log(`[Converter] ✅ Page ${pageNumber} uploaded successfully`);

    return {
      pageNumber,
      url: urlData.publicUrl,
      size: optimizedBuffer.length,
    };
  } catch (error) {
    console.error(`[Converter] ❌ Failed to convert page ${pageNumber}:`, error);
    throw error;
  }
}
```

**Critical Fixes:**

1. **Disable Workers**: Set `GlobalWorkerOptions.workerSrc = ''` to prevent worker usage in Node.js
2. **Await Render Promise**: Properly await `renderTask.promise` before exporting canvas
3. **Export to PNG First**: Use lossless PNG export from canvas before JPEG optimization
4. **Verify Buffer Sizes**: Check that buffers are > 10 KB to catch blank pages early
5. **Detailed Logging**: Log buffer sizes at each step to diagnose issues

### 2. pdfjs-dist Configuration

**Location:** Top of `lib/services/pdf-converter.ts`

```typescript
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs';
import { createCanvas } from 'canvas';

// CRITICAL: Configure pdfjs-dist for Node.js environment
// This MUST be done before any PDF loading
pdfjsLib.GlobalWorkerOptions.workerSrc = '';
pdfjsLib.GlobalWorkerOptions.workerPort = null;

// Optional: Set up canvas factory for pdfjs-dist
const NodeCanvasFactory = {
  create(width: number, height: number) {
    const canvas = createCanvas(width, height);
    const context = canvas.getContext('2d');
    return {
      canvas,
      context,
    };
  },
  reset(canvasAndContext: any, width: number, height: number) {
    canvasAndContext.canvas.width = width;
    canvasAndContext.canvas.height = height;
  },
  destroy(canvasAndContext: any) {
    canvasAndContext.canvas.width = 0;
    canvasAndContext.canvas.height = 0;
    canvasAndContext.canvas = null;
    canvasAndContext.context = null;
  },
};

// Use custom canvas factory when loading PDFs
const loadingTask = pdfjsLib.getDocument({
  data: pdfUint8Array,
  useSystemFonts: true,
  canvasFactory: NodeCanvasFactory, // Use our Node.js canvas factory
});
```

### 3. Full-Screen Flipbook Layout

**Location:** `components/flipbook/FlipBookContainerWithDRM.tsx`

**Key Changes:**

```typescript
return (
  <div 
    className="fixed inset-0 z-50 bg-gray-900 overflow-hidden"
    style={{
      width: '100vw',
      height: '100vh',
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      margin: 0,
      padding: 0,
    }}
  >
    <FlipBookViewerWithDRM
      documentId={documentId}
      pages={pages}
      watermarkText={finalWatermarkText}
      userEmail={userEmail}
      allowTextSelection={allowTextSelection}
      enableScreenshotPrevention={enableScreenshotPrevention}
    />
  </div>
);
```

**FlipBookViewer Dimensions:**

```typescript
// Calculate dimensions to use full viewport
const updateDimensions = () => {
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;
  
  const mobile = viewportWidth < 768;
  setIsMobile(mobile);
  
  // Use 90% of viewport width for pages
  const pageWidth = mobile ? viewportWidth * 0.95 : viewportWidth * 0.45; // 45% per page in double-page mode
  const pageHeight = pageWidth * 1.414; // A4 ratio
  
  setDimensions({
    width: Math.floor(pageWidth),
    height: Math.floor(Math.min(pageHeight, viewportHeight * 0.85)),
  });
};
```

### 4. Diagnostic Utility Script

**Location:** `scripts/verify-pdf-conversion.ts`

```typescript
import { createClient } from '@supabase/supabase-js';
import { prisma } from '@/lib/db';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function verifyPdfConversion(documentId: string) {
  console.log(`\n🔍 Verifying PDF conversion for document: ${documentId}\n`);
  
  // Get document info
  const document = await prisma.document.findUnique({
    where: { id: documentId },
    select: {
      id: true,
      userId: true,
      filename: true,
      mimeType: true,
    },
  });
  
  if (!document) {
    console.error('❌ Document not found');
    return;
  }
  
  console.log('📄 Document:', {
    filename: document.filename,
    mimeType: document.mimeType,
  });
  
  // List all pages in storage
  const { data: files, error } = await supabase.storage
    .from('document-pages')
    .list(`${document.userId}/${documentId}`);
  
  if (error || !files) {
    console.error('❌ Failed to list pages:', error);
    return;
  }
  
  console.log(`\n📊 Found ${files.length} page files:\n`);
  
  // Sort by page number
  const sortedFiles = files
    .filter(f => f.name.startsWith('page-'))
    .sort((a, b) => {
      const aNum = parseInt(a.name.match(/page-(\d+)/)?.[1] || '0');
      const bNum = parseInt(b.name.match(/page-(\d+)/)?.[1] || '0');
      return aNum - bNum;
    });
  
  let totalSize = 0;
  let suspiciousCount = 0;
  
  for (const file of sortedFiles) {
    const sizeKB = (file.metadata?.size || 0) / 1024;
    totalSize += sizeKB;
    
    const isSuspicious = sizeKB < 10;
    if (isSuspicious) suspiciousCount++;
    
    const status = isSuspicious ? '⚠️  SUSPICIOUS' : '✅';
    
    const { data: urlData } = supabase.storage
      .from('document-pages')
      .getPublicUrl(`${document.userId}/${documentId}/${file.name}`);
    
    console.log(`${status} ${file.name}: ${sizeKB.toFixed(2)} KB`);
    console.log(`   URL: ${urlData.publicUrl}\n`);
  }
  
  console.log(`\n📈 Summary:`);
  console.log(`   Total pages: ${sortedFiles.length}`);
  console.log(`   Total size: ${totalSize.toFixed(2)} KB`);
  console.log(`   Average size: ${(totalSize / sortedFiles.length).toFixed(2)} KB`);
  console.log(`   Suspicious pages (< 10 KB): ${suspiciousCount}`);
  
  if (suspiciousCount > 0) {
    console.log(`\n⚠️  WARNING: ${suspiciousCount} pages are suspiciously small and may be blank!`);
  } else {
    console.log(`\n✅ All pages appear to have reasonable file sizes`);
  }
}

// Run with: npm run verify-pdf -- <documentId>
const documentId = process.argv[2];
if (!documentId) {
  console.error('Usage: npm run verify-pdf <documentId>');
  process.exit(1);
}

verifyPdfConversion(documentId).catch(console.error);
```

## Data Models

No changes to existing data models required.

## Error Handling

### Blank Page Detection

```typescript
// After canvas export, verify content
if (pngBuffer.length < 10000) {
  throw new Error(
    `Page ${pageNumber} appears to be blank (${pngBuffer.length} bytes). ` +
    `This may indicate a rendering issue.`
  );
}
```

### Render Timeout

```typescript
// Add timeout to render promise
const renderPromise = renderTask.promise;
const timeoutPromise = new Promise((_, reject) => {
  setTimeout(() => reject(new Error('Render timeout')), 30000);
});

await Promise.race([renderPromise, timeoutPromise]);
```

### Detailed Error Logging

```typescript
try {
  await renderTask.promise;
} catch (error) {
  console.error(`Render failed for page ${pageNumber}:`, {
    error,
    viewport: { width: viewport.width, height: viewport.height },
    scale,
    pageNumber,
  });
  throw error;
}
```

## Testing Strategy

### Unit Tests

1. **Canvas Export Test**: Verify canvas.toBuffer() produces non-empty buffers
2. **Render Await Test**: Verify renderTask.promise is properly awaited
3. **Buffer Size Test**: Verify exported buffers are > 10 KB
4. **Sharp Optimization Test**: Verify Sharp receives valid PNG data

### Integration Tests

1. **End-to-End Conversion**: Upload PDF → Convert → Verify images in storage
2. **File Size Verification**: Check all converted pages are > 50 KB
3. **Visual Inspection**: Manually verify first page contains actual content
4. **Flipbook Display**: Verify pages display correctly in viewer

### Manual Testing

1. **Upload Test PDF**: Use a known PDF with visible content
2. **Run Conversion**: Trigger conversion via API
3. **Run Diagnostic**: Use `verify-pdf-conversion.ts` script
4. **Check Storage**: Manually inspect images in Supabase dashboard
5. **View in Flipbook**: Open preview and verify content is visible

## Performance Considerations

### Conversion Speed

- Current: ~2-3 seconds per page (with blank output)
- Target: ~1-2 seconds per page (with actual content)
- Optimization: Parallel processing (4 pages at a time)

### Memory Usage

- PNG export uses more memory than direct JPEG
- Mitigate by processing pages in batches
- Clean up canvas objects after each page

### Storage Impact

- Actual content images will be larger (~100-200 KB vs 3-4 KB)
- This is expected and acceptable
- Monitor storage usage and implement cleanup for old conversions

## Migration Strategy

### Phase 1: Fix Converter (Immediate)
1. Update pdf-converter.ts with fixes
2. Add worker configuration
3. Add buffer size verification
4. Deploy to production

### Phase 2: Reconvert Existing Documents (High Priority)
1. Identify documents with blank pages (< 10 KB average)
2. Trigger reconversion for affected documents
3. Verify reconverted pages have content
4. Update database records

### Phase 3: Add Diagnostic Tools (Medium Priority)
1. Create verify-pdf-conversion.ts script
2. Add npm script for easy execution
3. Document usage in README
4. Add to deployment checklist

### Phase 4: Optimize Viewer (Low Priority)
1. Update FlipBookContainerWithDRM for full-screen
2. Optimize page dimensions calculation
3. Test on various screen sizes
4. Deploy viewer updates

## Rollback Plan

If conversion still produces blank pages:

1. **Check pdfjs-dist Version**: Ensure using legacy build
2. **Verify node-canvas**: Ensure node-canvas is properly installed
3. **Test Locally**: Run conversion locally with test PDF
4. **Add More Logging**: Log canvas dimensions, render status
5. **Try Alternative**: Consider using pdf-lib or Puppeteer as fallback

## Monitoring

Track these metrics after deployment:

- **Average Page File Size**: Should be > 50 KB
- **Conversion Success Rate**: Should be 100%
- **Blank Page Detection**: Should be 0%
- **Conversion Time**: Should be < 2 seconds per page
- **User Reports**: Monitor for "blank page" complaints
