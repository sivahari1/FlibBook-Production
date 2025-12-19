# PDF Viewer Infinite Loop Prevention Guide

## Overview

This guide provides comprehensive information about preventing and troubleshooting infinite loop issues in the PDFViewerWithPDFJS component. The infinite loop fix has been successfully implemented and tested to ensure stable PDF viewing without "Maximum update depth exceeded" errors.

## What Was Fixed

### Root Cause
The infinite loop was caused by unstable dependencies in React `useEffect` hooks, particularly:
- Callback functions being recreated on every render
- State values being included in dependency arrays
- Circular dependencies between effects and state updates

### Solution Implemented
1. **Stable Dependencies**: All `useEffect` hooks now use only stable dependencies
2. **Ref-Based Callbacks**: Callback functions are stored in refs to prevent dependency changes
3. **Functional State Updates**: State updates use functional patterns to avoid circular dependencies
4. **Comprehensive Cleanup**: Proper cleanup mechanisms prevent memory leaks and stale closures

## Key Implementation Details

### 1. Effect Dependency Stabilization

**Before (Problematic):**
```typescript
useEffect(() => {
  loadDocument();
}, [pdfUrl, onLoadComplete, onError, loadingState]); // Unstable dependencies
```

**After (Fixed):**
```typescript
useEffect(() => {
  loadDocument();
}, [pdfUrl]); // Only stable pdfUrl dependency

// Callbacks stored in refs for stability
const onLoadCompleteRef = useRef(onLoadComplete);
const onErrorRef = useRef(onError);
```

### 2. Functional State Updates

**Before (Problematic):**
```typescript
setLoadingState({
  status: 'loading',
  progress: loadingState.progress + 10 // Depends on current state
});
```

**After (Fixed):**
```typescript
setLoadingState(prev => ({
  ...prev,
  status: 'loading',
  progress: prev.progress + 10 // Functional update
}));
```

### 3. Comprehensive Cleanup

```typescript
useEffect(() => {
  // Setup code
  
  return () => {
    // Comprehensive cleanup
    isMountedRef.current = false;
    clearAllTimers();
    cancelOngoingOperations();
    cleanupResources();
  };
}, []);
```

## Verification Methods

### 1. Automated Tests
The fix includes comprehensive test coverage:

- **Unit Tests**: Verify no infinite re-renders occur
- **Property Tests**: Test effect stability across various inputs
- **Integration Tests**: Ensure component interactions work correctly

### 2. Manual Testing Checklist

#### Basic Functionality
- [ ] PDF loads without infinite loop errors
- [ ] Page navigation works smoothly
- [ ] Zoom controls function properly
- [ ] Component unmounts cleanly

#### Edge Cases
- [ ] Rapid prop changes don't cause loops
- [ ] URL changes trigger exactly one reload
- [ ] Callback prop changes don't trigger document reload
- [ ] Component handles errors gracefully

#### Performance
- [ ] No memory leaks during extended usage
- [ ] Proper cleanup on component unmount
- [ ] Efficient resource management

### 3. Browser Console Monitoring

Monitor for these indicators of infinite loops:
- "Maximum update depth exceeded" errors
- Rapid, repeated console logs
- Browser freezing or high CPU usage
- Memory usage continuously increasing

## Troubleshooting Common Issues

### Issue: Component Still Re-rendering Excessively

**Symptoms:**
- High CPU usage
- Repeated console logs
- Slow UI responsiveness

**Solutions:**
1. Check for unstable dependencies in parent components
2. Verify callback props are memoized in parent
3. Use React DevTools Profiler to identify render causes

**Example Fix:**
```typescript
// In parent component
const onLoadComplete = useCallback((numPages: number) => {
  // Handle load complete
}, []); // Stable dependency array

const onError = useCallback((error: Error) => {
  // Handle error
}, []); // Stable dependency array
```

### Issue: State Updates After Unmount

**Symptoms:**
- Console warnings about state updates on unmounted components
- Memory leaks

**Solutions:**
1. Ensure `isMountedRef.current` checks are in place
2. Verify cleanup functions are properly implemented
3. Check that all timers and intervals are cleared

### Issue: PDF Loading Loops

**Symptoms:**
- PDF loads repeatedly
- Network requests keep firing
- Loading state never stabilizes

**Solutions:**
1. Verify URL prop is stable
2. Check parent component for unnecessary re-renders
3. Ensure loading flags prevent multiple simultaneous loads

## Development Mode Features

### Debug Logging
The component includes comprehensive debug logging in development mode:

```typescript
if (process.env.NODE_ENV === 'development') {
  console.log('[PDFViewerWithPDFJS] Effect execution:', effectName);
  console.log('Dependencies:', dependencies);
  console.log('Reason:', reason);
}
```

### State Consistency Checking
Automatic state consistency validation runs in development:

```typescript
// Periodic consistency checks
const consistencyCheckInterval = setInterval(() => {
  detectAndRecoverInconsistentState();
}, 10000); // Every 10 seconds
```

### Memory Monitoring
Performance metrics are tracked and displayed:

```typescript
// Memory usage tracking
const memoryUsageMB = memory.usedJSHeapSize / (1024 * 1024);
setPerformanceMetrics({
  renderTime: Date.now() - startTime,
  memoryUsage: memoryUsageMB,
  cacheHitRatio: pipeline.getCacheStats?.()?.hitRate || 0,
  lastUpdate: Date.now(),
});
```

## Error Recovery Mechanisms

### Automatic Recovery
The component includes automatic recovery for common issues:

1. **State Inconsistency Detection**: Automatically detects and fixes inconsistent states
2. **Memory Pressure Handling**: Triggers cleanup when memory usage is high
3. **Stuck Rendering Recovery**: Provides force retry options for stuck operations

### Manual Recovery Options
For development and debugging:

```typescript
// Available on window object in development
window.__pdfViewerCleanup(); // Force comprehensive cleanup
```

## Best Practices for Integration

### 1. Parent Component Guidelines

```typescript
// ✅ Good: Stable props
const MyComponent = () => {
  const [pdfUrl] = useState('https://example.com/document.pdf');
  
  const handleLoadComplete = useCallback((numPages: number) => {
    console.log('Loaded', numPages, 'pages');
  }, []);
  
  return (
    <PDFViewerWithPDFJS
      pdfUrl={pdfUrl}
      onLoadComplete={handleLoadComplete}
    />
  );
};

// ❌ Bad: Unstable props
const MyComponent = () => {
  const [pdfUrl] = useState('https://example.com/document.pdf');
  
  return (
    <PDFViewerWithPDFJS
      pdfUrl={pdfUrl}
      onLoadComplete={(numPages) => console.log('Loaded', numPages)} // New function every render
    />
  );
};
```

### 2. URL Management

```typescript
// ✅ Good: Stable URL
const [documentUrl, setDocumentUrl] = useState(initialUrl);

// ❌ Bad: URL that changes unnecessarily
const documentUrl = `${baseUrl}?timestamp=${Date.now()}`; // Changes every render
```

### 3. Conditional Rendering

```typescript
// ✅ Good: Stable conditional rendering
{pdfUrl && (
  <PDFViewerWithPDFJS pdfUrl={pdfUrl} />
)}

// ❌ Bad: Conditional rendering that causes unmount/remount cycles
{shouldShow && pdfUrl && (
  <PDFViewerWithPDFJS pdfUrl={pdfUrl} />
)}
```

## Testing Guidelines

### Unit Testing
```typescript
// Test for infinite loop prevention
it('should not cause infinite re-renders', async () => {
  const renderSpy = jest.fn();
  
  render(
    <PDFViewerWithPDFJS
      pdfUrl="https://example.com/test.pdf"
      onLoadComplete={renderSpy}
    />
  );
  
  // Wait for initial render
  await waitFor(() => {
    expect(renderSpy).toHaveBeenCalledTimes(1);
  });
  
  // Verify no additional renders
  await new Promise(resolve => setTimeout(resolve, 1000));
  expect(renderSpy).toHaveBeenCalledTimes(1);
});
```

### Property-Based Testing
```typescript
// Test effect stability across various inputs
fc.assert(
  fc.property(
    fc.webUrl(),
    fc.string(),
    (pdfUrl, documentTitle) => {
      // Test that component handles various prop combinations
      // without infinite loops
    }
  )
);
```

## Performance Monitoring

### Metrics to Track
1. **Render Count**: Number of component renders
2. **Effect Executions**: How often effects run
3. **Memory Usage**: Component memory footprint
4. **Cleanup Efficiency**: Resource cleanup effectiveness

### Monitoring Tools
1. **React DevTools Profiler**: Identify render causes
2. **Browser Performance Tab**: Monitor CPU and memory usage
3. **Component Debug Logs**: Track effect executions
4. **Custom Performance Metrics**: Built-in performance tracking

## Conclusion

The infinite loop fix provides a robust, stable PDF viewing experience with comprehensive error recovery and debugging capabilities. The implementation follows React best practices and includes extensive testing to ensure reliability across various usage scenarios.

For additional support or to report issues, refer to the component's test files and integration examples in the codebase.