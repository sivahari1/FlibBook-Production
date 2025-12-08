# PDF Viewer DOM Error - React-Native Solution

## Problem
The DOM error persists because we're mixing React's virtual DOM with manual DOM manipulation:
```
Failed to execute 'removeChild' on 'Node': The node to be removed is not a child of this node.
```

## Root Cause
The issue occurs when:
1. React tries to reconcile the DOM
2. We manually manipulate canvas elements with `appendChild` and `removeChild`
3. React's reconciliation conflicts with our manual changes
4. Next.js Turbopack's fast refresh makes this worse

## Solution: Use React Portals and Refs

Instead of manually manipulating the DOM, we need to let React control everything.

### Key Changes Needed:

1. **Remove manual DOM manipulation** - No more `appendChild`, `removeChild`, or `textContent = ''`
2. **Use React state for canvas** - Let React manage when canvas appears/disappears
3. **Use refs only for PDF.js rendering** - Not for DOM structure
4. **Use effect cleanup properly** - Let React handle unmounting

### Implementation:

```typescript
// BEFORE (Manual DOM manipulation - CAUSES ERRORS):
let canvas = canvasRef.current;
if (!canvas) {
  canvas = window.document.createElement('canvas');
  canvasRef.current = canvas;
  if (canvasContainerRef.current) {
    // THIS CAUSES THE ERROR:
    canvasContainerRef.current.textContent = '';
    canvasContainerRef.current.appendChild(canvas);
  }
}

// AFTER (React-controlled - NO ERRORS):
// 1. Create canvas in JSX, not manually
// 2. Use ref callback to get reference
// 3. Let React handle mounting/unmounting

<canvas 
  ref={(el) => {
    if (el && !canvasRendered) {
      // Render to canvas using PDF.js
      renderToCanvas(el);
      setCanvasRendered(true);
    }
  }}
  className="max-w-full h-auto"
/>
```

## Complete Fix

### Step 1: Update State Management

```typescript
// Add state for canvas rendering
const [canvasRendered, setCanvasRendered] = useState(false);
const [canvasKey, setCanvasKey] = useState(0); // Force re-render when needed
```

### Step 2: Update Render Function

```typescript
const renderCurrentPage = useCallback(async () => {
  const pdfDocument = pdfDocumentRef.current;
  if (!pdfDocument || loadingState.status !== 'loaded') return;
  
  try {
    setPageRenderState({
      pageNumber: currentPage,
      status: 'rendering',
    });
    
    // Get page
    const page = await pdfDocument.getPage(currentPage);
    currentPageRef.current = page;
    
    // Canvas will be rendered via ref callback in JSX
    // No manual DOM manipulation needed
    
  } catch (error) {
    // Handle error...
  }
}, [currentPage, loadingState.status]);
```

### Step 3: Update JSX to Use React-Controlled Canvas

```typescript
{/* Canvas container - Single page mode */}
{viewMode === 'single' && (
  <div 
    ref={containerRef}
    className="flex-1 relative bg-gray-800 flex items-center justify-center overflow-auto"
  >
    <div 
      ref={canvasContainerRef}
      className="relative"
    >
      {/* React-controlled canvas - no manual DOM manipulation */}
      {pageRenderState.status !== 'error' && (
        <canvas
          key={`canvas-${currentPage}-${canvasKey}`} // Force new canvas on page change
          ref={(el) => {
            if (el && pageRenderState.status === 'rendering') {
              // Render to canvas using PDF.js
              renderToCanvasElement(el);
            }
          }}
          className="max-w-full h-auto"
          data-testid="pdfjs-canvas"
        />
      )}
      
      {/* Watermark overlay */}
      {currentWatermark && pageRenderState.status === 'rendered' && (
        <div className="absolute inset-0" style={{ pointerEvents: 'none', zIndex: 10 }}>
          <WatermarkOverlay
            text={currentWatermark.text}
            opacity={currentWatermark.opacity}
            fontSize={currentWatermark.fontSize * zoomLevel}
          />
        </div>
      )}
    </div>
  </div>
)}
```

### Step 4: Create Helper Function for Canvas Rendering

```typescript
const renderToCanvasElement = useCallback(async (canvas: HTMLCanvasElement) => {
  const page = currentPageRef.current;
  if (!page) return;
  
  try {
    // Cancel any existing render task
    if (renderTaskRef.current) {
      try {
        renderTaskRef.current.cancel();
      } catch (e) {
        // Ignore cancellation errors
      }
      renderTaskRef.current = null;
    }
    
    // Get viewport
    const viewport = page.getViewport({ scale: zoomLevel });
    
    // Set canvas dimensions
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    
    // Get canvas context
    const context = canvas.getContext('2d');
    if (!context) {
      throw new Error('Failed to get canvas context');
    }
    
    // Render page
    const renderContext = {
      canvasContext: context,
      viewport: viewport,
    };
    
    const renderTask = page.render(renderContext);
    renderTaskRef.current = renderTask;
    
    await renderTask.promise;
    
    // Update state
    setPageRenderState({
      pageNumber: currentPage,
      status: 'rendered',
    });
    
    onRenderComplete?.(currentPage);
    
  } catch (error) {
    if (error.name !== 'RenderingCancelledException') {
      console.error('Rendering error:', error);
      setPageRenderState({
        pageNumber: currentPage,
        status: 'error',
        error: error instanceof Error ? error : new Error(String(error)),
      });
    }
  }
}, [currentPage, zoomLevel, onRenderComplete]);
```

### Step 5: Update Cleanup

```typescript
// Cleanup effect - no manual DOM manipulation
useEffect(() => {
  return () => {
    // Cancel render tasks
    if (renderTaskRef.current) {
      try {
        renderTaskRef.current.cancel();
      } catch (e) {
        // Ignore
      }
      renderTaskRef.current = null;
    }
    
    // React will handle canvas cleanup automatically
    // No need for manual removeChild
  };
}, []);
```

## Why This Works

1. **No Manual DOM Manipulation**: React controls all DOM changes
2. **Proper Reconciliation**: React's virtual DOM stays in sync
3. **Clean Unmounting**: React handles cleanup automatically
4. **No Race Conditions**: State changes trigger re-renders properly
5. **Turbopack Compatible**: Works with Next.js fast refresh

## Testing

After applying this fix:

1. Clear browser cache completely
2. Restart dev server
3. Test PDF preview
4. Check console - should see NO DOM errors
5. Test page navigation - should work smoothly
6. Test zoom - should work without errors

## Expected Result

✅ No "removeChild" errors
✅ Smooth page rendering
✅ Proper cleanup on unmount
✅ Compatible with React Strict Mode
✅ Works with Next.js Turbopack

---

**Status**: Solution documented - ready for implementation
