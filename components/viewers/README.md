# SimpleDocumentViewer

A modern, full-screen document viewer with intuitive navigation controls, designed to replace traditional flipbook viewers with a more user-friendly interface.

> **New here?** Start with the [Getting Started Guide](./GETTING_STARTED.md) for a quick 5-minute tutorial!

## Features

- **Full-screen viewing**: Utilizes entire browser viewport for maximum content visibility
- **Dual view modes**: Continuous scroll and paged viewing
- **Navigation controls**: Arrow buttons, page input, and keyboard shortcuts
- **Zoom controls**: Zoom in/out with bounds (0.5x to 3.0x)
- **Mobile support**: Touch gestures and responsive design
- **Accessibility**: Full keyboard navigation and screen reader support
- **Watermark overlay**: Optional watermark support without interfering with navigation
- **Performance optimized**: Progressive loading, virtual scrolling, and React optimizations

## Quick Start

```tsx
import SimpleDocumentViewer from '@/components/viewers/SimpleDocumentViewer';

function MyDocumentViewer() {
  const pages = [
    {
      pageNumber: 1,
      pageUrl: '/api/documents/123/pages/1',
      dimensions: { width: 800, height: 1200 }
    },
    // ... more pages
  ];

  return (
    <SimpleDocumentViewer
      documentId="123"
      documentTitle="My Document"
      pages={pages}
      watermark={{
        text: "CONFIDENTIAL",
        opacity: 0.3,
        fontSize: 24
      }}
      onClose={() => window.close()}
    />
  );
}
```

## Components

### SimpleDocumentViewer

Main viewer component that provides full-screen document viewing.

**Props:**
- `documentId: string` - Unique identifier for the document
- `documentTitle: string` - Display title for the document
- `pages: PageData[]` - Array of page data objects
- `watermark?: WatermarkSettings` - Optional watermark configuration
- `enableScreenshotPrevention?: boolean` - Enable DRM screenshot prevention
- `onClose?: () => void` - Callback when viewer is closed

### ViewerToolbar

Navigation toolbar with page controls, zoom controls, and view mode toggle.

**Props:**
- `documentTitle: string` - Document title to display
- `currentPage: number` - Current page number (1-based)
- `totalPages: number` - Total number of pages
- `viewMode: ViewMode` - Current view mode ('continuous' | 'paged')
- `zoomLevel: number` - Current zoom level (0.5 to 3.0)
- `onPageChange: (page: number) => void` - Page change handler
- `onViewModeChange: (mode: ViewMode) => void` - View mode change handler
- `onZoomChange: (zoom: number) => void` - Zoom change handler
- `onClose?: () => void` - Close button handler

### ContinuousScrollView

Renders pages in a vertical scrolling layout with progressive loading.

### PagedView

Renders one page at a time with discrete navigation.

### WatermarkOverlay

Overlays watermark text or image without interfering with navigation.

## Hooks

### useKeyboardNavigation

Handles keyboard shortcuts for navigation and zoom.

**Keyboard Shortcuts:**
- `↓` / `Page Down` - Next page
- `↑` / `Page Up` - Previous page
- `Home` - First page
- `End` - Last page
- `Ctrl/Cmd + +` - Zoom in
- `Ctrl/Cmd + -` - Zoom out

### useTouchGestures

Handles touch gestures for mobile devices.

**Touch Gestures:**
- Swipe left - Next page
- Swipe right - Previous page
- Pinch - Zoom in/out

## Types

```typescript
interface PageData {
  pageNumber: number;
  pageUrl: string;
  dimensions: { width: number; height: number };
}

interface WatermarkSettings {
  text: string;
  opacity: number;
  fontSize: number;
}

type ViewMode = 'continuous' | 'paged';
```

## Browser Support

- Chrome/Edge: Full support
- Firefox: Full support
- Safari: Full support
- Mobile browsers: Full support with touch gestures

## Performance

- **Progressive loading**: Only loads visible pages
- **Virtual scrolling**: For documents with 100+ pages
- **Image caching**: Caches loaded pages in memory
- **Debounced scroll**: Updates page indicator with 100ms debounce
- **React optimizations**: Uses React.memo, useMemo, and useCallback

## Accessibility

- **Keyboard navigation**: Full keyboard support for all actions
- **ARIA labels**: Proper labels for all buttons and controls
- **Focus management**: Visible focus indicators
- **Screen reader**: Announces page changes and current state
- **Touch targets**: Minimum 44x44px touch targets on mobile

## Error Handling

The viewer handles various error scenarios gracefully:

- **Missing pages**: Shows error message with retry option
- **Invalid page data**: Validates page structure and shows errors
- **Page load failures**: Individual page errors with retry buttons
- **Network issues**: Automatic retry mechanisms
- **Invalid navigation**: Clamps page numbers to valid range

## Migration from FlipBookViewer

The SimpleDocumentViewer is designed as a drop-in replacement for FlipBookViewer:

1. **Same page data format**: Uses the same PageData interface
2. **Similar props**: Compatible prop structure
3. **Enhanced features**: Adds zoom, view modes, and better navigation
4. **Better performance**: Optimized loading and rendering

## Documentation

### Complete Documentation Suite

- **[Documentation Index](./DOCUMENTATION_INDEX.md)** - Central hub for all documentation
- **[API Documentation](./API_DOCUMENTATION.md)** - Complete API reference
- **[User Guide](./USER_GUIDE.md)** - End-user documentation
- **[Integration Guide](./INTEGRATION_GUIDE.md)** - Developer integration guide
- **[Troubleshooting Guide](./TROUBLESHOOTING_GUIDE.md)** - Common issues and solutions
- **[Examples](./EXAMPLES.md)** - Practical usage examples

### Quick Examples

See [EXAMPLES.md](./EXAMPLES.md) for complete usage examples:
- Basic document viewer
- With watermark
- Protected documents
- Custom page loading
- Mobile-optimized
- With analytics
- Multi-document viewer
- Embedded viewer
- Print-friendly view
- Collaborative viewing