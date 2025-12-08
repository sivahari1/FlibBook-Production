# PDF DOM Error - Immediate Fix

## Quick Solution

The error occurs because we're manually creating and appending canvas elements outside of React's control. The immediate fix is to render the canvas in JSX and use a ref callback.

## Apply This Fix Now:

Find the section around line 550-600 where canvas is created and replace with this approach:

### Current Problem Code:
```typescript
// Create or get canvas
let canvas = canvasRef.current;
if (!canvas) {
  canvas = window.document.createElement('canvas'); // ❌ Manual creation
  canvasRef.current = canvas;
  if (canvasContainerRef.current) {
    container.textContent = ''; // ❌ Manual DOM manipulation
    container.appendChild(canvas); // ❌ Manual DOM manipulation
  }
}
```

### Fixed Code:
```typescript
// Don't create canvas manually - let React do it via JSX
// Just get the ref when React mounts it
const canvas = canvasRef.current;
if (!canvas) {
  console.warn('Canvas not yet mounted');
  return;
}
```

### Update JSX (around line 1350):
```typescript
<div 
  ref={canvasContainerRef}
  className="relative"
>
  {/* Let React control the canvas */}
  <canvas
    ref={canvasRef}
    className="max-w-full h-auto"
    data-testid="pdfjs-canvas"
  />
  
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
```

## Why This Works

- Canvas is created by React in JSX
- No manual `createElement` or `appendChild`
- React manages the entire lifecycle
- No conflicts with React's reconciliation

## Implementation Steps

1. Remove manual canvas creation code
2. Add `<canvas ref={canvasRef} />` to JSX
3. Update render function to just use the ref
4. Test

This is the minimal change needed to fix the DOM error.
