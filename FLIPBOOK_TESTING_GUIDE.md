# FlipBook Preview Testing Guide

## Quick Test Checklist

### 1. Test Image Loading ✅

**Steps:**
1. Upload a PDF document to your dashboard
2. Click "Preview" or "View" on the document
3. Open browser DevTools Console (F12)
4. Watch for these messages:

**Expected Console Output:**
```
[FlipBookContainer] Loading 7 pages for document abc123
[FlipBookContainer] Sample page URLs: [...]
[FlipBookContainer] ✅ Loaded page 1 (1/7)
[FlipBookContainer] ✅ Loaded page 2 (2/7)
...
[FlipBookContainer] Preload summary: { total: 7, successful: 7, failed: 0 }
```

**Success Criteria:**
- ✅ No 400 Bad Request errors in console
- ✅ All pages load successfully
- ✅ Images are visible in the flipbook
- ✅ Can navigate between pages

---

### 2. Test Watermark Flag ✅

**Test Case A: Watermark Disabled**

**URL:**
```
/dashboard/documents/{id}/view?watermark=false
```

**Expected Console Output:**
```
[Preview URL Parameters] { rawWatermarkParam: 'false', enableWatermark: false }
[PreviewViewerClient] Watermark Settings: { enableWatermark: false }
[FlipBookContainer] Watermark Configuration: { shouldShowWatermark: false }
```

**Success Criteria:**
- ✅ No watermark visible on pages
- ✅ Console confirms watermark is disabled
- ✅ Pages display normally

**Test Case B: Watermark Enabled**

**URL:**
```
/dashboard/documents/{id}/view?watermark=true
```

**Expected Console Output:**
```
[Preview URL Parameters] { rawWatermarkParam: 'true', enableWatermark: true }
[PreviewViewerClient] Watermark Settings: { enableWatermark: true }
[FlipBookContainer] Watermark Configuration: { shouldShowWatermark: true }
```

**Success Criteria:**
- ✅ Watermark visible on all pages
- ✅ Watermark text is readable
- ✅ Watermark doesn't obscure content
- ✅ Console confirms watermark is enabled

**Test Case C: No Parameter (Default)**

**URL:**
```
/dashboard/documents/{id}/view
```

**Success Criteria:**
- ✅ No watermark visible (default is disabled)
- ✅ Console shows enableWatermark: false

---

### 3. Test Full-Screen Layout ✅

**Desktop Test:**

**Steps:**
1. Open document preview on desktop browser
2. Observe the layout

**Success Criteria:**
- ✅ Flipbook fills most of the viewport (not a small card)
- ✅ Dark background (gray-900 gradient)
- ✅ Navigation controls at bottom center
- ✅ Zoom controls at top right
- ✅ Can see full pages clearly

**Mobile Test:**

**Steps:**
1. Open document preview on mobile device or use DevTools mobile emulation
2. Observe the layout

**Success Criteria:**
- ✅ Flipbook fills the mobile viewport
- ✅ Pages are readable
- ✅ Can swipe to navigate
- ✅ Controls are accessible
- ✅ Responsive to orientation change

**Fullscreen Test:**

**Steps:**
1. Click the fullscreen button (top right)
2. Observe the layout

**Success Criteria:**
- ✅ Enters true fullscreen mode
- ✅ Flipbook expands to fill entire screen
- ✅ Can exit with Escape key or button
- ✅ Controls remain accessible

---

### 4. Test Error Handling ✅

**Test Case A: Failed Image Load**

**Steps:**
1. Open DevTools Network tab
2. Block some image requests (right-click → Block request URL)
3. Reload the preview

**Expected Console Output:**
```
[FlipBookContainer] ❌ Failed to load page 3: { url: '...', error: ... }
[FlipBookContainer] Preload summary: { total: 7, successful: 6, failed: 1, failedPages: [3] }
```

**Success Criteria:**
- ✅ Clear error message in console
- ✅ Failed page numbers are logged
- ✅ Other pages still load and display
- ✅ Flipbook remains functional

**Test Case B: All Pages Fail**

**Steps:**
1. Block all image requests from Supabase storage
2. Try to load preview

**Success Criteria:**
- ✅ Error message displayed to user
- ✅ "All pages failed to load" message
- ✅ Retry button available
- ✅ Back to dashboard button available

---

### 5. Test Logging ✅

**Steps:**
1. Open DevTools Console
2. Load a document preview
3. Review the console output

**Expected Log Categories:**

```
[Preview URL Parameters] - URL parameter parsing
[PreviewViewerClient] - Client-side watermark config
[FlipBookContainer] - Image loading progress
[Storage URL] - URL generation (if applicable)
[Pages API] - Server-side page retrieval
[Client] - Conversion triggers
```

**Success Criteria:**
- ✅ Logs are clear and informative
- ✅ Each stage is logged
- ✅ Errors include context
- ✅ URLs are logged (truncated for security)
- ✅ Timing information is included

---

## Common Issues & Solutions

### Issue: 400 Bad Request on Images

**Symptoms:**
- Console shows 400 errors
- Images don't load
- Red X or broken image icons

**Check:**
1. Look at the URL in the error message
2. Verify it matches: `https://{project}.supabase.co/storage/v1/object/public/document-pages/{userId}/{documentId}/page-X.jpg`
3. Check if pages exist in Supabase Storage

**Solution:**
- Ensure PDF conversion completed successfully
- Check Supabase storage bucket is public
- Verify environment variables are correct

---

### Issue: Watermark Shows When It Shouldn't

**Symptoms:**
- Watermark visible with `?watermark=false`
- Console shows conflicting watermark state

**Check:**
1. Verify URL parameter: `?watermark=false` (not `?watermark=0` or other)
2. Check console logs for watermark configuration
3. Look for prop chain: page.tsx → PreviewViewerClient → FlipBookContainer → FlipBookViewer

**Solution:**
- Use exact parameter: `watermark=false`
- Clear browser cache
- Check for CSS overrides

---

### Issue: Small Card Layout

**Symptoms:**
- Flipbook appears in small box
- Lots of empty space around it
- Not using full viewport

**Check:**
1. Inspect element in DevTools
2. Look for container with `position: fixed` and `inset-0`
3. Check for parent containers with restrictive sizing

**Solution:**
- Clear browser cache
- Check for CSS conflicts
- Verify latest code is deployed

---

### Issue: No Logging in Console

**Symptoms:**
- Console is empty or minimal output
- Can't debug issues

**Check:**
1. Console filter settings (should show all levels)
2. Browser console is open before loading page
3. No console.log suppression in production

**Solution:**
- Refresh page with DevTools open
- Check console filter settings
- Look in Network tab for API calls

---

## Performance Benchmarks

### Expected Load Times

- **Page Load:** < 2 seconds
- **Image Preload:** < 5 seconds for 10 pages
- **First Page Visible:** < 1 second
- **Navigation:** < 100ms between pages

### Expected Console Output Volume

- **Successful Load:** 10-20 log messages
- **With Errors:** 15-30 log messages
- **Detailed Debug:** 30-50 log messages

---

## Browser Compatibility

### Tested Browsers

- ✅ Chrome 120+ (Desktop & Mobile)
- ✅ Firefox 120+ (Desktop & Mobile)
- ✅ Safari 17+ (Desktop & Mobile)
- ✅ Edge 120+ (Desktop)

### Known Issues

- None currently

---

## Automated Testing

### Unit Tests

Run unit tests:
```bash
npm test
```

### Integration Tests

Run integration tests:
```bash
npm run test:integration
```

### E2E Tests

Run end-to-end tests:
```bash
npm run test:e2e
```

---

## Production Verification

### After Deployment

1. **Test on Production URL:**
   ```
   https://your-domain.com/dashboard/documents/{id}/view?watermark=false
   ```

2. **Check Vercel Logs:**
   - Look for any errors
   - Verify API calls are successful
   - Check response times

3. **Test from Different Locations:**
   - Different geographic regions
   - Different network conditions
   - Different devices

4. **Monitor Error Rates:**
   - Check Vercel analytics
   - Monitor Supabase logs
   - Review user feedback

---

## Support & Debugging

### If Issues Persist

1. **Collect Information:**
   - Browser and version
   - Console logs (full output)
   - Network tab (HAR file)
   - Steps to reproduce

2. **Check Documentation:**
   - `FLIPBOOK_PREVIEW_FIX_COMPLETE.md`
   - Component documentation
   - API documentation

3. **Review Recent Changes:**
   - Git history
   - Recent deployments
   - Environment variable changes

---

**Last Updated:** December 5, 2024  
**Version:** 1.0.0
