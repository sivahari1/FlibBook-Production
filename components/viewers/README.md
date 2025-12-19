# PDF Viewer Components

This directory contains PDF viewer components that have been updated to prevent infinite loop issues and ensure consistent patterns across all viewer implementations.

## Components Overview

### PDFViewerWithPDFJS
The main PDF viewer component using PDF.js library with comprehensive infinite loop prevention:
- **Fixed**: useEffect dependencies stabilized using refs and functional updates
- **Fixed**: Callback functions memoized with useCallback to prevent re-renders
- **Fixed**: State updates use functional patterns to avoid circular dependencies
- **Fixed**: Comprehensive cleanup mechanisms to prevent memory leaks
- **Fixed**: Error recovery with state validation and consistency checks

### SimplePDFViewer
A minimal PDF viewer with the same infinite loop prevention patterns:
- **Updated**: Callback dependencies replaced with refs
- **Updated**: Navigation functions use functional state updates
- **Updated**: Consistent error handling patterns

### PDFJSFallbackViewer
Fallback viewer when PDF.js is unavailable:
- **Updated**: Callback dependencies stabilized with refs
- **Updated**: Consistent with main viewer patterns

### SimpleDocumentViewer
Unified document viewer that integrates with PDF viewers:
- **Compatible**: Uses stable callback patterns when integrating with PDFViewerWithPDFJS
- **Consistent**: Follows the same dependency management patterns

## Infinite Loop Prevention Patterns

All PDF viewer components now follow these patterns to prevent infinite loops:

### 1. Stable Dependencies
```typescript
// ❌ BAD: Callback in dependency array
useEffect(() => {
  // effect logic
}, [pdfUrl, onError]);

// ✅ GOOD: Use ref for callback
const onErrorRef = useRef(onError);
useEffect(() => {
  onErrorRef.current = onError;
}, [onError]);

useEffect(() => {
  // effect logic using onErrorRef.current
}, [pdfUrl]); // Only stable dependencies
```

### 2. Functional State Updates
```typescript
// ❌ BAD: Depends on current state
const goToNextPage = () => {
  if (currentPage < numPages) {
    setCurrentPage(currentPage + 1);
  }
};

// ✅ GOOD: Functional update
const goToNextPage = useCallback(() => {
  setCurrentPage(prev => prev < numPages ? prev + 1 : prev);
}, []); // No dependencies
```

### 3. Memoized Callbacks
```typescript
// ❌ BAD: New function on every render
const handleError = (error) => {
  console.error(error);
  onError?.(error);
};

// ✅ GOOD: Memoized with stable dependencies
const handleError = useCallback((error) => {
  console.error(error);
  if (onErrorRef.current) {
    onErrorRef.current(error);
  }
}, []); // No dependencies due to ref usage
```

### 4. Cleanup Mechanisms
```typescript
useEffect(() => {
  let isMounted = true;
  
  const loadDocument = async () => {
    // loading logic
    if (!isMounted) return;
    // state updates
  };
  
  loadDocument();
  
  return () => {
    isMounted = false;
    // cleanup resources
  };
}, [stableDependencies]);
```

## Memory Management

All viewers implement consistent memory management:
- Aggressive cleanup of off-screen pages
- Memory pressure detection and handling
- Resource cleanup on unmount
- Canvas cleanup to prevent memory leaks

## Error Handling

Consistent error handling patterns:
- State validation before updates
- Error recovery mechanisms
- Development mode debugging information
- Graceful fallback options

## Testing

All components include comprehensive tests:
- Property-based tests for infinite loop prevention
- Unit tests for specific functionality
- Integration tests for component interactions
- Memory management tests

## Usage Guidelines

When using these components:

1. **Always provide stable props**: Avoid creating new objects/functions on every render
2. **Use refs for callbacks**: When passing callbacks that might change
3. **Implement proper cleanup**: Always clean up resources in useEffect cleanup functions
4. **Monitor memory usage**: Use the built-in memory monitoring in development mode
5. **Handle errors gracefully**: Implement error boundaries and fallback mechanisms

## Migration from Legacy Components

If migrating from older PDF viewer implementations:

1. Replace callback dependencies with refs
2. Update navigation functions to use functional state updates
3. Add proper cleanup mechanisms
4. Implement memory management patterns
5. Add comprehensive error handling

## Performance Considerations

- Components use React.memo for performance optimization
- Callbacks are memoized to prevent unnecessary re-renders
- Memory management prevents excessive resource usage
- Lazy loading for large documents
- Efficient canvas management

## Browser Compatibility

All components are tested and compatible with:
- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

## Security Features

DRM and security features are consistently implemented:
- Screenshot prevention
- Text selection control
- Print blocking
- Download restrictions
- Watermark overlay support