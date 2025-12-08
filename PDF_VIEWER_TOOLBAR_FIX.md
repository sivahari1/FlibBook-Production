# PDF Viewer Toolbar and Scrolling Fix

## Issues Fixed

### 1. Duplicate Toolbars
**Problem**: Both `SimpleDocumentViewer` and `PDFViewerWithPDFJS` were rendering their own toolbars, resulting in two toolbars with two file names displayed.

**Solution**: 
- Added a `hideToolbar` prop to `PDFViewerWithPDFJS` component
- When `SimpleDocumentViewer` uses `PDFViewerWithPDFJS`, it now passes `hideToolbar={true}`
- This ensures only the parent component's toolbar is displayed

### 2. Page Count Showing "1 of 0"
**Problem**: The toolbar was showing "1 of 0" because the total page count wasn't being communicated from `PDFViewerWithPDFJS` to `SimpleDocumentViewer`.

**Solution**:
- Added `onTotalPagesChange` callback prop to `PDFViewerWithPDFJS`
- Added `pdfTotalPages` state to `SimpleDocumentViewer` to track PDF page count
- Updated `totalPages` calculation to use `pdfTotalPages` when rendering PDFs
- Both `onLoadComplete` and `onTotalPagesChange` now update the parent's page count

### 3. Scrolling Not Working
**Problem**: The container setup wasn't allowing proper scrolling.

**Solution**: The existing `overflow: 'auto'` style on the canvas container should enable scrolling. The main issue was the duplicate toolbars consuming space incorrectly.

## Changes Made

### PDFViewerWithPDFJS.tsx
1. Added `hideToolbar?: boolean` prop to interface
2. Added `onTotalPagesChange?: (total: number) => void` callback prop
3. Wrapped toolbar rendering in conditional: `{!hideToolbar && ( ... )}`
4. Added `onTotalPagesChange?.(result.numPages)` call after PDF loads
5. Updated dependency array to include `onTotalPagesChange`

### SimpleDocumentViewer.tsx
1. Added `pdfTotalPages` state to track PDF page count
2. Updated `totalPages` calculation: `const totalPages = usePdfRendering ? pdfTotalPages : pages.length`
3. Passed `hideToolbar={true}` to `PDFViewerWithPDFJS`
4. Added `onTotalPagesChange={setPdfTotalPages}` callback
5. Updated `onLoadComplete` to also call `setPdfTotalPages(numPages)`

## Testing

To verify the fixes:
1. Open a PDF document in the viewer
2. Confirm only ONE toolbar is displayed
3. Confirm the page count shows correctly (e.g., "1 of 5" instead of "1 of 0")
4. Confirm scrolling works properly when zoomed in or in continuous mode

## Technical Details

The fix maintains backward compatibility - `PDFViewerWithPDFJS` can still be used standalone with its own toolbar by not passing the `hideToolbar` prop (defaults to `false`).

The dual callback approach (`onLoadComplete` and `onTotalPagesChange`) ensures the page count is communicated reliably, with `onTotalPagesChange` being the primary mechanism for ongoing updates.
