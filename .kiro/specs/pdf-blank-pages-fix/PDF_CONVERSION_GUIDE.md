# PDF Conversion Process Guide

This document explains how the PDF to image conversion system works, why certain design decisions were made, and how to maintain it.

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Critical Configuration](#critical-configuration)
4. [Conversion Flow](#conversion-flow)
5. [Why Workers Must Be Disabled](#why-workers-must-be-disabled)
6. [PNG → JPEG Optimization Flow](#png--jpeg-optimization-flow)
7. [Performance Optimizations](#performance-optimizations)
8. [Monitoring and Maintenance](#monitoring-and-maintenance)

---

## Overview

The PDF conversion system transforms PDF documents into optimized JPEG images for display in the flipbook viewer. The system runs server-side in Node.js and uses:

- **pdfjs-dist** (legacy build) - PDF parsing and rendering
- **node-canvas** - Server-side canvas for rendering
- **Sharp** - Image optimization and compression
- **Supabase Storage** - Cloud storage for converted images

### Key Requirements

- **No Blank Pages**: Images must contain actual PDF content
- **Reasonable File Sizes**: 50-200 KB per page (not 3-4 KB)
- **Fast Conversion**: < 2 seconds per page
- **High Quality**: Readable text and clear images
- **Scalable**: Handle PDFs up to 100 pages

---

## Architecture

### System Components

```
┌─────────────────┐
│   PDF Upload    │
│   (Next.js API) │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  PDF Converter  │
│  (Node.js)      │
├─────────────────┤
│ • pdfjs-dist    │
│ • node-canvas   │
│ • Sharp         │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Supabase Storage│
│ (document-pages)│
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Flipbook Viewer │
│ (React)         │
└─────────────────┘
```

### File Locations

- **Converter Service**: `lib/services/pdf-converter.ts`
- **API Route**: `app/api/documents/convert/route.ts`
- **Flipbook Viewer**: `components/flipbook/FlipBookViewer.tsx`
- **Storage Bucket**: `document-pages` in Supabase
- **Diagnostic Script**: `scripts/verify-pdf-conversion.ts`

---

## Critical Configuration

### 1. Worker Disabling (MOST IMPORTANT)

**Location:** Top of `lib/services/pdf-converter.ts`

```typescript
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs';

// CRITICAL: Disable web workers for Node.js environment
// This MUST be set BEFORE any PDF loading
pdfjsLib.GlobalWorkerOptions.workerSrc = '';
pdfjsLib.GlobalWorkerOptions.workerPort = null;
```

**Why this is critical:**
- pdfjs-dist was designed for browsers
- Browsers use web workers for PDF rendering
- Node.js doesn't have web workers
- Without this configuration, rendering fails silently
- Result: Blank white images

### 2. Canvas Context Configuration

```typescript
const canvas = createCanvas(
  Math.floor(viewport.width),
  Math.floor(viewport.height)
);
const context = canvas.getContext('2d');

// CRITICAL: Some versions of pdfjs expect canvas property
if (!context.canvas) {
  (context as any).canvas = canvas;
}
```

**Why this is needed:**
- pdfjs-dist expects browser Canvas API
- node-canvas has slightly different API
- Setting `context.canvas` ensures compatibility

### 3. Render Promise Awaiting

```typescript
const renderTask = page.render({
  canvasContext: context,
  viewport: viewport,
});

// CRITICAL: MUST await completely before exporting
await renderTask.promise;

// Only THEN export canvas
const pngBuffer = canvas.toBuffer('image/png');
```

**Why this is critical:**
- Rendering is asynchronous
- Canvas export is synchronous
- If you export before rendering completes, you get blank canvas
- Result: Blank white images

---

## Why Workers Must Be Disabled

### The Problem

pdfjs-dist was originally designed for browsers. In browsers, PDF rendering happens in a web worker to avoid blocking the main thread:

```
Browser Environment:
Main Thread → Web Worker → PDF Rendering → Canvas
```

In Node.js, there are no web workers:

```
Node.js Environment:
Main Thread → ??? → PDF Rendering → Canvas
```

### What Happens Without Disabling Workers

1. pdfjs-dist tries to spawn a web worker
2. Worker spawn fails silently (no error thrown)
3. Rendering "completes" but nothing was actually rendered
4. Canvas is blank
5. Blank canvas exports to blank image
6. Result: 3-4 KB white images

### The Solution

```typescript
// Tell pdfjs-dist: "Don't use workers, render directly"
pdfjsLib.GlobalWorkerOptions.workerSrc = '';
pdfjsLib.GlobalWorkerOptions.workerPort = null;
```

This forces pdfjs-dist to render directly on the main thread, which works perfectly in Node.js.

### Historical Context

- **pdfjs-dist v2.x**: Workers were optional
- **pdfjs-dist v3.x**: Workers became default
- **pdfjs-dist v4.x**: Workers are strongly encouraged
- **Our solution**: Use legacy build + disable workers

---

## PNG → JPEG Optimization Flow

### Why Two-Step Process?

We export to PNG first, then optimize to JPEG. Here's why:

#### Step 1: Canvas → PNG (Lossless)

```typescript
const pngBuffer = canvas.toBuffer('image/png');
```

**Reasons:**
- PNG is lossless - preserves all rendered content
- node-canvas PNG export is fast and reliable
- Allows verification of canvas content before compression
- Easier to debug (can inspect PNG if issues occur)

#### Step 2: PNG → JPEG (Lossy Compression)

```typescript
const optimizedBuffer = await sharp(pngBuffer)
  .jpeg({
    quality: 85,
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
```

**Reasons:**
- JPEG is much smaller (60-70% compression)
- Quality 85 is sweet spot (readable + small)
- Progressive JPEG loads faster in browsers
- mozjpeg provides better compression
- Resize ensures consistent dimensions

### Why Not Direct JPEG Export?

```typescript
// ❌ DON'T DO THIS
const jpegBuffer = canvas.toBuffer('image/jpeg', { quality: 0.85 });
```

**Problems:**
- node-canvas JPEG export is less reliable
- Can't verify content before compression
- Harder to debug blank page issues
- No resize/optimization options
- Lower quality compression algorithm

### Buffer Size Verification

```typescript
// After PNG export
if (pngBuffer.length < 10000) {
  throw new Error('Page appears to be blank');
}

// After JPEG optimization
if (optimizedBuffer.length < 10000) {
  throw new Error('JPEG is too small - likely blank');
}
```

**Why verify twice:**
- Catch blank pages early (after PNG)
- Verify compression didn't fail (after JPEG)
- Provide clear error messages
- Prevent uploading blank images

---

## Conversion Flow

### Detailed Step-by-Step

```typescript
// 1. Load PDF document
const pdfData = await fs.readFile(pdfPath);
const pdfUint8Array = new Uint8Array(pdfData);
const loadingTask = pdfjsLib.getDocument({
  data: pdfUint8Array,
  useSystemFonts: true,
});
const pdfDocument = await loadingTask.promise;

// 2. For each page (in parallel batches)
for (let pageNum = 1; pageNum <= pageCount; pageNum++) {
  
  // 3. Get page and calculate viewport
  const page = await pdfDocument.getPage(pageNum);
  const scale = dpi / 72; // Convert DPI to scale
  const viewport = page.getViewport({ scale });
  
  // 4. Create canvas with exact dimensions
  const canvas = createCanvas(
    Math.floor(viewport.width),
    Math.floor(viewport.height)
  );
  const context = canvas.getContext('2d');
  
  // 5. Render PDF to canvas
  const renderTask = page.render({
    canvasContext: context,
    viewport: viewport,
  });
  await renderTask.promise; // ✅ CRITICAL: Wait for completion
  
  // 6. Export canvas to PNG (lossless)
  const pngBuffer = canvas.toBuffer('image/png');
  
  // 7. Verify PNG has content
  if (pngBuffer.length < 10000) {
    throw new Error('Blank page detected');
  }
  
  // 8. Optimize to JPEG with Sharp
  const jpegBuffer = await sharp(pngBuffer)
    .jpeg({ quality: 85, progressive: true, mozjpeg: true })
    .resize({ width: 1200, height: 1600, fit: 'inside' })
    .toBuffer();
  
  // 9. Verify JPEG has content
  if (jpegBuffer.length < 10000) {
    throw new Error('JPEG too small');
  }
  
  // 10. Upload to Supabase Storage
  const storagePath = `${userId}/${documentId}/page-${pageNum}.jpg`;
  await supabase.storage
    .from('document-pages')
    .upload(storagePath, jpegBuffer, {
      contentType: 'image/jpeg',
      upsert: true,
    });
  
  // 11. Get public URL
  const { data } = supabase.storage
    .from('document-pages')
    .getPublicUrl(storagePath);
  
  return data.publicUrl;
}
```

### Parallel Processing

```typescript
// Process 4 pages at a time
const batchSize = Math.min(os.cpus().length, 4);

for (let i = 0; i < pageCount; i += batchSize) {
  const batch = [];
  
  for (let pageNum = i + 1; pageNum <= Math.min(i + batchSize, pageCount); pageNum++) {
    batch.push(convertAndUploadPage(pdfDocument, pageNum, ...));
  }
  
  // Process batch in parallel
  await Promise.all(batch);
}
```

**Benefits:**
- Faster conversion (4x speedup on 4-core CPU)
- Better resource utilization
- Still manageable memory usage
- Respects system capabilities

---

## Performance Optimizations

### 1. Batch Processing

**Implementation:**
```typescript
const batchSize = Math.min(os.cpus().length, 4);
```

**Impact:**
- 4-core CPU: 4x faster
- 8-core CPU: 4x faster (capped at 4)
- Single-core: No change

**Why cap at 4:**
- Memory usage grows with parallel conversions
- Diminishing returns beyond 4 concurrent
- Prevents system overload

### 2. DPI Optimization

**Default:** 150 DPI

**Calculation:**
```typescript
const scale = dpi / 72; // PDF default is 72 DPI
// 150 DPI → scale = 2.083
// Results in ~1275x1650 pixels for A4 page
```

**Trade-offs:**
- **100 DPI**: Faster, smaller files, lower quality
- **150 DPI**: Balanced (recommended)
- **200 DPI**: Slower, larger files, higher quality

### 3. JPEG Quality

**Default:** 85%

**Trade-offs:**
- **75%**: Smaller files, visible compression artifacts
- **85%**: Balanced (recommended)
- **95%**: Larger files, minimal quality improvement

### 4. Progressive JPEG

```typescript
.jpeg({
  progressive: true,
  mozjpeg: true,
})
```

**Benefits:**
- Loads faster in browsers (shows low-res first)
- Better compression with mozjpeg
- Improved user experience

### 5. Memory Management

```typescript
// Clean up after each page
canvas.width = 0;
canvas.height = 0;
```

**Benefits:**
- Prevents memory leaks
- Allows garbage collection
- Handles large PDFs better

---

## Monitoring and Maintenance

### Key Metrics to Track

1. **Average Page File Size**
   - Target: 50-200 KB
   - Alert if: < 10 KB (blank pages)
   - Alert if: > 500 KB (compression issue)

2. **Conversion Time**
   - Target: < 2 seconds per page
   - Alert if: > 5 seconds per page

3. **Success Rate**
   - Target: 100%
   - Alert if: < 95%

4. **Memory Usage**
   - Target: < 2 GB for 100-page PDF
   - Alert if: > 4 GB

### Logging

The converter logs detailed information at each step:

```
[Converter] Rendering page 1: { width: 1275, height: 1650, scale: 2.083 }
[Converter] ✅ Page 1 rendered to canvas successfully
[Converter] Canvas exported to PNG: { pageNumber: 1, bufferSize: 245678, sizeKB: '239.92' }
[Converter] Optimized to JPEG: { pageNumber: 1, originalKB: '239.92', optimizedKB: '87.45', compressionRatio: '63.5%' }
[Converter] ✅ Page 1 uploaded successfully
```

**What to look for:**
- ✅ Success indicators
- ⚠️ Warning indicators (small buffers)
- ❌ Error indicators
- Buffer sizes at each step
- Compression ratios

### Diagnostic Tools

1. **verify-pdf-conversion.ts**
   ```bash
   npm run verify-pdf -- <documentId>
   ```
   - Lists all pages
   - Shows file sizes
   - Flags suspicious pages
   - Provides URLs for inspection

2. **Supabase Dashboard**
   - Navigate to Storage → document-pages
   - Browse user folders
   - Check file sizes
   - Download and inspect images

3. **Database Queries**
   ```sql
   -- Find documents with no pages
   SELECT d.id, d.filename
   FROM documents d
   LEFT JOIN document_pages dp ON d.id = dp.documentId
   WHERE d.mimeType = 'application/pdf'
   GROUP BY d.id
   HAVING COUNT(dp.id) = 0;
   ```

### Maintenance Tasks

#### Weekly
- Review conversion logs for errors
- Check average file sizes
- Monitor storage usage

#### Monthly
- Review and clean up old conversions
- Update dependencies (carefully!)
- Performance testing with sample PDFs

#### After Updates
- Test conversion with sample PDF
- Run diagnostic script
- Visual inspection of converted pages
- Check for any new errors in logs

---

## Troubleshooting

For detailed troubleshooting steps, see [TROUBLESHOOTING.md](./TROUBLESHOOTING.md).

Quick checklist:
- [ ] Workers disabled (`workerSrc = ''`, `workerPort = null`)
- [ ] Render promise properly awaited
- [ ] Canvas context has `canvas` property
- [ ] PNG export before JPEG optimization
- [ ] Buffer size verification (> 10 KB)
- [ ] Supabase credentials configured
- [ ] `document-pages` bucket exists

---

## References

- **Requirements**: [requirements.md](./requirements.md)
- **Design**: [design.md](./design.md)
- **Tasks**: [tasks.md](./tasks.md)
- **Troubleshooting**: [TROUBLESHOOTING.md](./TROUBLESHOOTING.md)
- **Source Code**: `lib/services/pdf-converter.ts`
- **Diagnostic Script**: `scripts/verify-pdf-conversion.ts`

---

## Version History

- **v1.0** (Initial): Basic PDF conversion with blank page issues
- **v2.0** (Current): Fixed blank pages with worker disabling and proper awaiting
- **v2.1** (Current): Added PNG → JPEG optimization flow
- **v2.2** (Current): Added buffer size verification and detailed logging
