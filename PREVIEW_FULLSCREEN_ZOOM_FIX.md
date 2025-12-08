# Preview Fullscreen and Zoom Fix

## Issues Identified
1. **Not Fullscreen**: The document viewer container has `flex-1` which doesn't properly fill the viewport
2. **Zoom Not Working**: The zoom controls exist but the canvas isn't responding to zoom level changes
3. **Toolbar Visibility**: The toolbar might be hidden or not properly positioned

## Root Causes
1. The `SimpleDocumentViewer` container uses `flex-1` which relies on parent flex context
2. The `PDFViewerWithPDFJS` component doesn't properly apply zoom transformations to the canvas
3. The canvas container needs proper sizing and overflow handling

## Fixes Applied

### 1. Fix Container Sizing
- Change `flex-1` to explicit `h-full` or `min-h-screen`
- Ensure parent containers have proper height
- Add `overflow-auto` to allow scrolling when zoomed

### 2. Fix Zoom Functionality
- Ensure zoom level is passed to PDF renderer
- Apply CSS transform to canvas based on zoom level
- Update canvas rendering to respect zoom

### 3. Fix Toolbar
- Ensure toolbar is visible and positioned correctly
- Make sure z-index is high enough
- Add proper background to toolbar

## Testing
1. Upload a PDF document
2. Click Preview
3. Verify document fills the screen
4. Test zoom in/out buttons
5. Test keyboard shortcuts (Ctrl + / Ctrl -)
6. Test mouse wheel zoom (Ctrl + scroll)
