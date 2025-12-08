# Task 6: Test with Sample PDF - Testing Guide

## Overview

This guide provides step-by-step instructions for testing the PDF conversion fixes with sample PDFs to ensure blank pages are resolved.

## Prerequisites

- Development environment running (`npm run dev`)
- Database connection configured
- Supabase storage configured
- At least one PDF document uploaded to the system

## Task 6.1: Prepare Test PDF

### Requirements
- Use a PDF with visible text and images
- Ensure PDF is not corrupted
- Keep file size reasonable (< 5 MB)
- Upload to test environment

### Steps

1. **Find or Create a Test PDF**
   - Use a PDF with clear, visible content (text, images, graphics)
   - Avoid blank or mostly-white PDFs
   - Recommended: Use a document with 2-5 pages for quick testing
   - File size should be under 5 MB

2. **Upload the PDF**
   ```bash
   # Start the development server if not running
   npm run dev
   ```

3. **Upload via Web Interface**
   - Navigate to: `http://localhost:3000/dashboard`
   - Click "Upload Document"
   - Select your test PDF
   - Wait for upload to complete

4. **Note the Document ID**
   - After upload, note the document ID from the URL or database

## Task 6.2: Run Conversion with Updated Code

### Requirements
- Trigger conversion via API
- Monitor console logs for detailed output
- Check for "render complete" messages
- Verify buffer sizes are logged

### Steps

1. **List Available PDF Documents**
   ```bash
   npx tsx scripts/test-pdf-conversion-with-sample.ts
   ```

   This will show all PDF documents with their IDs.

2. **Trigger Conversion**
   ```bash
   npx tsx scripts/test-pdf-conversion-with-sample.ts <document-id>
   ```

   Replace `<document-id>` with your actual document ID.

3. **Monitor Console Output**

   Look for these key indicators:

   ✅ **Good Signs:**
   ```
   [PDF Converter] Viewport dimensions: { width: 1200, height: 1600 }
   [PDF Converter] ✅ Render complete for page 1
   [PDF Converter] PNG buffer size: 245.67 KB
   [PDF Converter] JPEG buffer size: 156.23 KB
   [PDF Converter] Compression ratio: 63.6%
   ```

   ❌ **Bad Signs:**
   ```
   [PDF Converter] PNG buffer size: 3.45 KB  ← TOO SMALL!
   [PDF Converter] ❌ Blank page detected
   Error: Buffer size too small
   ```

4. **Check Conversion Results**

   The script will display:
   - Success/failure status
   - Number of pages converted
   - Total duration
   - Average time per page

   **Expected Results:**
   - Success: ✅ YES
   - Duration: < 2 seconds per page
   - No errors about blank pages or small buffers

## Task 6.3: Verify Converted Images

### Requirements
- Run verify-pdf-conversion.ts script
- Check all pages are > 50 KB
- Download and visually inspect first page
- Verify content is visible, not blank

### Steps

1. **Run Verification Script**
   ```bash
   npx tsx scripts/verify-pdf-conversion.ts <document-id>
   ```

2. **Check File Sizes**

   Expected output:
   ```
   ✅ Page 1: 156.23 KB - Good size
   ✅ Page 2: 142.87 KB - Good size
   ✅ Page 3: 168.45 KB - Good size
   
   Total size: 0.46 MB
   Average page size: 155.85 KB
   ```

   **Pass Criteria:**
   - All pages > 50 KB
   - Average page size > 100 KB
   - No pages flagged as "LIKELY BLANK"

3. **Visual Inspection**

   a. **Get Page URL:**
   ```bash
   # The verification script will show URLs
   # Or check Supabase storage directly
   ```

   b. **Download First Page:**
   - Copy the URL for page 1
   - Open in browser or download
   - Open the image file

   c. **Verify Content:**
   - ✅ Text is visible and readable
   - ✅ Images/graphics are present
   - ✅ Page is not blank or mostly white
   - ✅ Content matches the original PDF

## Task 6.4: Test in Flipbook Viewer

### Requirements
- Open preview in browser
- Verify pages display actual content
- Check that pages are not blank white
- Test navigation between pages

### Steps

1. **Open Preview**
   ```
   http://localhost:3000/dashboard/documents/<document-id>/view
   ```

2. **Visual Checks**

   ✅ **Content Visibility:**
   - Pages show actual PDF content
   - Text is readable
   - Images are visible
   - No blank white pages

   ✅ **Navigation:**
   - Can flip to next page
   - Can flip to previous page
   - Page numbers are correct
   - All pages load successfully

3. **Browser Console Checks**

   Open DevTools (F12) and check:

   ✅ **No Errors:**
   ```
   ✅ No 404 errors for images
   ✅ No CORS errors
   ✅ No "Failed to load resource" errors
   ```

   ✅ **Successful Loads:**
   ```
   [FlipBookContainer] ✅ Loaded page 1 (1/3)
   [FlipBookContainer] ✅ Loaded page 2 (2/3)
   [FlipBookContainer] ✅ Loaded page 3 (3/3)
   [FlipBookContainer] ✅ All images preloaded successfully
   ```

4. **Performance Checks**

   - Pages load within 2 seconds
   - Smooth page transitions
   - No lag or freezing
   - Memory usage is reasonable

## Success Criteria

### ✅ Task 6.1: Prepare Test PDF
- [ ] Test PDF uploaded successfully
- [ ] PDF has visible content (not blank)
- [ ] File size is reasonable (< 5 MB)
- [ ] Document ID obtained

### ✅ Task 6.2: Run Conversion
- [ ] Conversion triggered successfully
- [ ] Console shows "render complete" messages
- [ ] Buffer sizes are logged (> 50 KB)
- [ ] No blank page errors
- [ ] Conversion time < 2 seconds per page

### ✅ Task 6.3: Verify Images
- [ ] All pages > 50 KB
- [ ] Average page size > 100 KB
- [ ] Visual inspection shows content
- [ ] No blank or corrupted images

### ✅ Task 6.4: Test in Flipbook
- [ ] Preview opens successfully
- [ ] All pages display content
- [ ] Navigation works smoothly
- [ ] No console errors
- [ ] Performance is acceptable

## Troubleshooting

### Issue: Blank Pages Still Appearing

**Symptoms:**
- Page file sizes < 10 KB
- Visual inspection shows blank images
- Console shows small buffer sizes

**Solutions:**
1. Check that Task 1 fixes are applied (worker configuration)
2. Check that Task 2 fixes are applied (canvas rendering)
3. Verify PDF is not corrupted
4. Try a different test PDF

### Issue: Conversion Fails

**Symptoms:**
- Error messages in console
- Conversion script exits with error
- No pages created

**Solutions:**
1. Check Supabase connection
2. Verify storage bucket exists
3. Check PDF file is accessible
4. Review error logs for specific issues

### Issue: Slow Conversion

**Symptoms:**
- Conversion takes > 5 seconds per page
- Script times out

**Solutions:**
1. Check PDF complexity (high-resolution images)
2. Verify system resources
3. Try a simpler PDF
4. Check network connection to Supabase

## Next Steps

After completing Task 6:

1. **If all tests pass:**
   - Mark Task 6 as complete
   - Proceed to Task 7 (Reconvert Existing Documents)
   - Consider deploying fixes to production

2. **If tests fail:**
   - Review error messages
   - Check which specific test failed
   - Revisit Tasks 1-3 to verify fixes
   - Debug specific issues

3. **Document Results:**
   - Note any issues encountered
   - Record conversion times
   - Save sample images for reference
   - Update task completion status

## Additional Testing

### Test with Different PDF Types

1. **Text-heavy PDF:**
   - Academic papers
   - Reports
   - Documentation

2. **Image-heavy PDF:**
   - Presentations
   - Brochures
   - Photo albums

3. **Mixed Content PDF:**
   - Forms
   - Invoices
   - Magazines

### Test Edge Cases

1. **Single-page PDF**
2. **Large PDF (50+ pages)**
3. **PDF with special fonts**
4. **PDF with transparency**
5. **Scanned PDF (images of pages)**

## Reporting

After testing, document:

1. **Test Environment:**
   - OS and version
   - Node.js version
   - Browser used

2. **Test Results:**
   - Number of PDFs tested
   - Success rate
   - Average conversion time
   - Any issues encountered

3. **Sample Data:**
   - Document IDs tested
   - File sizes before/after
   - Screenshots of successful conversions

## Conclusion

Task 6 is complete when:
- ✅ Test PDF is prepared and uploaded
- ✅ Conversion runs successfully with proper logging
- ✅ All converted images are verified (> 50 KB)
- ✅ Flipbook viewer displays content correctly
- ✅ No blank pages are detected
- ✅ Performance is acceptable (< 2s per page)

Once all criteria are met, update the task status and proceed to Task 7.
