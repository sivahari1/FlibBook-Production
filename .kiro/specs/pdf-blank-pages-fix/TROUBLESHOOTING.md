# PDF Conversion Troubleshooting Guide

This guide helps diagnose and fix common issues with PDF to image conversion.

## Table of Contents

1. [Blank Pages Issue](#blank-pages-issue)
2. [Conversion Timeouts](#conversion-timeouts)
3. [Memory Issues](#memory-issues)
4. [Storage Upload Failures](#storage-upload-failures)
5. [Diagnostic Tools](#diagnostic-tools)
6. [Common Error Messages](#common-error-messages)

---

## Blank Pages Issue

### Symptoms
- Converted images are completely white
- File sizes are very small (~3-4 KB instead of 50-200 KB)
- Flipbook viewer loads but shows blank pages
- Console shows successful conversion but no visible content

### Root Causes

#### 1. Workers Not Disabled (MOST COMMON)
**Problem:** pdfjs-dist tries to use web workers in Node.js environment

**Solution:** Ensure these lines are at the TOP of `pdf-converter.ts`:
```typescript
pdfjsLib.GlobalWorkerOptions.workerSrc = '';
pdfjsLib.GlobalWorkerOptions.workerPort = null;
```

**Verification:**
```bash
# Check if workers are disabled
grep -A 2 "GlobalWorkerOptions" lib/services/pdf-converter.ts
```

#### 2. Render Promise Not Awaited
**Problem:** Canvas exported before rendering completes

**Solution:** Ensure render promise is properly awaited:
```typescript
const renderTask = page.render({
  canvasContext: context,
  viewport: viewport,
});

// CRITICAL: Must await completely
await renderTask.promise;

// Only THEN export canvas
const pngBuffer = canvas.toBuffer('image/png');
```

**Verification:** Check logs for "rendered to canvas successfully" message

#### 3. Canvas Context Issues
**Problem:** pdfjs-dist can't access canvas properly

**Solution:** Ensure canvas property is set on context:
```typescript
const context = canvas.getContext('2d');
if (!context.canvas) {
  (context as any).canvas = canvas;
}
```

### Diagnostic Steps

1. **Check Worker Configuration**
   ```bash
   # Should show workerSrc = '' and workerPort = null
   head -30 lib/services/pdf-converter.ts | grep -A 5 "GlobalWorkerOptions"
   ```

2. **Run Test Conversion**
   ```bash
   # Upload a test PDF and check logs
   npm run dev
   # Upload PDF via UI
   # Check terminal for detailed logs
   ```

3. **Verify Buffer Sizes**
   ```bash
   # Run diagnostic script
   npm run verify-pdf -- <documentId>
   # All pages should be > 50 KB
   ```

4. **Visual Inspection**
   - Download first page image from Supabase storage
   - Open in image viewer
   - Should show actual PDF content, not blank white

### Example Log Output (Successful)

```
[Converter] Rendering page 1: { width: 1275, height: 1650, scale: 2.083 }
[Converter] ✅ Page 1 rendered to canvas successfully
[Converter] Canvas exported to PNG: { pageNumber: 1, bufferSize: 245678, sizeKB: '239.92' }
[Converter] Optimized to JPEG: { pageNumber: 1, originalKB: '239.92', optimizedKB: '87.45', compressionRatio: '63.5%' }
[Converter] ✅ Page 1 uploaded successfully to user123/doc456/page-1.jpg
```

### Example Log Output (Blank Page)

```
[Converter] Rendering page 1: { width: 1275, height: 1650, scale: 2.083 }
[Converter] ✅ Page 1 rendered to canvas successfully
[Converter] Canvas exported to PNG: { pageNumber: 1, bufferSize: 3456, sizeKB: '3.38' }
[Converter] ⚠️ Page 1 PNG is suspiciously small (3456 bytes) - may be blank
Error: Page 1 appears to be blank (PNG buffer only 3456 bytes)
```

---

## Conversion Timeouts

### Symptoms
- Conversion hangs indefinitely
- No progress after "Rendering page X" message
- API request times out after 30 seconds

### Root Causes

#### 1. Large/Complex PDF
**Problem:** PDF has very large pages or complex graphics

**Solution:** Increase timeout or reduce DPI:
```typescript
// In convertAndUploadPage function
const timeoutPromise = new Promise((_, reject) => {
  setTimeout(() => reject(new Error('Render timeout')), 60000); // Increase to 60s
});

await Promise.race([renderTask.promise, timeoutPromise]);
```

#### 2. Memory Exhaustion
**Problem:** Node.js runs out of memory during rendering

**Solution:** Process fewer pages in parallel:
```typescript
// In convertPdfToImages function
const batchSize = Math.min(os.cpus().length, 2); // Reduce from 4 to 2
```

### Diagnostic Steps

1. **Check PDF Complexity**
   ```bash
   # Check file size
   ls -lh uploads/document.pdf
   # Large files (> 10 MB) may need more time
   ```

2. **Monitor Memory Usage**
   ```bash
   # While conversion is running
   node --max-old-space-size=4096 # Increase Node.js memory limit
   ```

3. **Test with Simple PDF**
   - Try converting a simple 1-page PDF
   - If it works, issue is PDF complexity

---

## Memory Issues

### Symptoms
- "JavaScript heap out of memory" error
- Node.js process crashes during conversion
- System becomes unresponsive

### Solutions

#### 1. Increase Node.js Memory Limit
```bash
# In package.json scripts
"convert": "node --max-old-space-size=4096 ..."
```

#### 2. Reduce Batch Size
```typescript
const batchSize = Math.min(os.cpus().length, 2); // Process 2 pages at a time
```

#### 3. Lower DPI
```typescript
const dpi = 100; // Reduce from 150 to 100
```

#### 4. Clean Up Resources
```typescript
// After each page
canvas.width = 0;
canvas.height = 0;
```

---

## Storage Upload Failures

### Symptoms
- "Upload failed for page X" error
- Pages convert successfully but don't appear in storage
- Supabase errors in logs

### Root Causes

#### 1. Invalid Credentials
**Problem:** Supabase service role key is missing or invalid

**Solution:** Check environment variables:
```bash
# Verify these are set
echo $NEXT_PUBLIC_SUPABASE_URL
echo $SUPABASE_SERVICE_ROLE_KEY
```

#### 2. Storage Bucket Doesn't Exist
**Problem:** `document-pages` bucket not created

**Solution:** Create bucket in Supabase dashboard:
1. Go to Storage section
2. Create bucket named `document-pages`
3. Set to public access
4. Configure RLS policies

#### 3. File Size Limits
**Problem:** Image exceeds storage limits

**Solution:** Check Supabase plan limits and reduce image quality:
```typescript
const quality = 75; // Reduce from 85 to 75
```

---

## Diagnostic Tools

### 1. Verify PDF Conversion Script

**Usage:**
```bash
npm run verify-pdf -- <documentId>
```

**What it checks:**
- Lists all converted pages
- Shows file size for each page
- Flags pages < 10 KB as suspicious
- Provides public URLs for inspection

**Example output:**
```
🔍 Verifying PDF conversion for document: abc123

📄 Document: { filename: 'sample.pdf', mimeType: 'application/pdf' }

📊 Found 5 page files:

✅ page-1.jpg: 87.45 KB
   URL: https://...

✅ page-2.jpg: 92.31 KB
   URL: https://...

⚠️  SUSPICIOUS page-3.jpg: 3.45 KB
   URL: https://...

📈 Summary:
   Total pages: 5
   Total size: 356.78 KB
   Average size: 71.36 KB
   Suspicious pages (< 10 KB): 1

⚠️  WARNING: 1 pages are suspiciously small and may be blank!
```

### 2. Manual Inspection

**Steps:**
1. Get document ID from database
2. Run verify script
3. Copy suspicious page URL
4. Open in browser
5. Visually confirm if blank

### 3. Database Query

**Find documents with blank pages:**
```sql
-- In Supabase SQL editor
SELECT 
  d.id,
  d.filename,
  d.userId,
  COUNT(dp.id) as page_count
FROM documents d
LEFT JOIN document_pages dp ON d.id = dp.documentId
WHERE d.mimeType = 'application/pdf'
GROUP BY d.id
HAVING COUNT(dp.id) = 0 OR COUNT(dp.id) < 5;
```

---

## Common Error Messages

### "Page X appears to be blank (PNG buffer only Y bytes)"

**Meaning:** Canvas export produced very small file, indicating no content

**Fix:** Check worker configuration and render await

**Code location:** `lib/services/pdf-converter.ts:convertAndUploadPage()`

### "Upload failed for page X: [error message]"

**Meaning:** Supabase storage upload failed

**Fix:** Check Supabase credentials and bucket configuration

**Code location:** `lib/services/pdf-converter.ts:convertAndUploadPage()`

### "JavaScript heap out of memory"

**Meaning:** Node.js ran out of memory

**Fix:** Increase memory limit or reduce batch size

**Code location:** Node.js runtime

### "Render timeout"

**Meaning:** Page rendering took too long

**Fix:** Increase timeout or reduce PDF complexity

**Code location:** `lib/services/pdf-converter.ts:convertAndUploadPage()`

---

## Quick Reference

### Critical Configuration Checklist

- [ ] Workers disabled (`workerSrc = ''`, `workerPort = null`)
- [ ] Render promise properly awaited
- [ ] Canvas context has `canvas` property
- [ ] PNG export before JPEG optimization
- [ ] Buffer size verification (> 10 KB)
- [ ] Supabase credentials configured
- [ ] `document-pages` bucket exists
- [ ] Batch size appropriate for system resources

### Performance Targets

- **Conversion time:** < 2 seconds per page
- **File size:** 50-200 KB per page (typical)
- **Memory usage:** < 2 GB for 100-page PDF
- **Success rate:** 100% (no blank pages)

### Support Resources

- **Design Document:** `.kiro/specs/pdf-blank-pages-fix/design.md`
- **Requirements:** `.kiro/specs/pdf-blank-pages-fix/requirements.md`
- **Source Code:** `lib/services/pdf-converter.ts`
- **Diagnostic Script:** `scripts/verify-pdf-conversion.ts`

---

## Still Having Issues?

1. **Check Recent Changes**
   ```bash
   git log --oneline lib/services/pdf-converter.ts
   ```

2. **Compare with Working Version**
   ```bash
   git diff HEAD~1 lib/services/pdf-converter.ts
   ```

3. **Test Locally**
   ```bash
   npm run dev
   # Upload test PDF
   # Check terminal logs
   ```

4. **Enable Debug Logging**
   ```typescript
   // Add to pdf-converter.ts
   logger.setLevel('debug');
   ```

5. **Contact Support**
   - Include document ID
   - Include error logs
   - Include diagnostic script output
   - Include PDF file (if possible)
