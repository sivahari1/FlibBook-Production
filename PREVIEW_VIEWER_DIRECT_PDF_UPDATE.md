# PreviewViewerClient Direct PDF Viewer Update

## Summary

Updated the PreviewViewerClient component to skip PDF conversion and use a direct PDF viewer instead of the FlipBook component.

## Changes Made

### 1. Removed PDF Conversion Logic
- Removed the `useEffect` hook that triggered PDF-to-image conversion
- Removed API calls to `/api/documents/convert`
- Removed page fetching and state management for converted pages

### 2. Simplified Component
- Removed unused imports: `FlipBookContainerWithDRM`
- Removed unused props: `initialPages`
- Removed unused state: `pages`, `setPages`, `retryCount`, `setRetryCount`
- Simplified error handling (removed retry functionality)

### 3. Direct PDF Viewer Implementation
For PDF content type, the component now:
- Uses a simple `<iframe>` to display the PDF directly via `pdfUrl`
- Applies watermark as an overlay div (if enabled)
- No conversion or page processing required
- Instant loading without conversion delays

### 4. Watermark Implementation
The watermark is now applied as:
- An absolute positioned overlay div
- Centered, rotated -45 degrees
- Configurable opacity, font size, and text
- Non-interactive (pointer-events-none)
- High z-index (z-50) to stay on top

## Benefits

1. **Faster Loading**: No conversion delay, PDFs load instantly
2. **Simpler Code**: Removed complex conversion logic and state management
3. **Better UX**: Users see PDFs immediately without waiting for conversion
4. **Reduced Server Load**: No server-side PDF-to-image conversion needed
5. **Native PDF Features**: Users get browser's native PDF viewer features

## Technical Details

### Before
```typescript
// Complex conversion flow
1. Check if pages exist
2. If not, call /api/documents/convert
3. Wait for conversion to complete
4. Transform pages for FlipBook
5. Render FlipBook component
```

### After
```typescript
// Direct rendering
1. Check if pdfUrl exists
2. Render iframe with pdfUrl
3. Apply watermark overlay if enabled
```

## Files Modified

- `app/dashboard/documents/[id]/view/PreviewViewerClient.tsx`

## Testing Recommendations

1. Test PDF viewing with watermark enabled/disabled
2. Verify watermark appears correctly (centered, rotated, proper opacity)
3. Test with different PDF sizes and types
4. Verify error handling when pdfUrl is missing
5. Test on different browsers (Chrome, Firefox, Safari, Edge)
6. Test on mobile devices

## Notes

- The iframe approach relies on the browser's native PDF viewer
- Some browsers may handle PDFs differently
- Watermark is a simple overlay and can be inspected in dev tools (not DRM-level protection)
- For stronger DRM, consider using the FlipBook approach with converted images
