# SimpleDocumentViewer API Documentation

## Components

### SimpleDocumentViewer

The main document viewer component that provides full-screen document viewing with navigation controls.

#### Props

```typescript
interface SimpleDocumentViewerProps {
  documentId: string;
  documentTitle: string;
  pages: PageData[];
  watermark?: WatermarkSettings;
  enableScreenshotPrevention?: boolean;
  onClose?: () => void;
}
```

##### documentId
- **Type**: `string`
- **Required**: Yes
- **Description**: Unique identifier for the document being viewed
- **Example**: `"doc_123456"`

##### documentTitle
- **Type**: `string`
- **Required**: Yes
- **Description**: Display title shown in the toolbar
- **Example**: `"Annual Report 2024"`

##### pages
- **Type**: `PageData[]`
- **Required**: Yes
- **Description**: Array of page data objects containing URLs and dimensions
- **Example**:
```typescript
[
  {
    pageNumber: 1,
    pageUrl: "/api/documents/123/pages/1",
    dimensions: { width: 800, height: 1200 }
  },
  {
    pageNumber: 2,
    pageUrl: "/api/documents/123/pages/2", 
    dimensions: { width: 800, height: 1200 }
  }
]
```

##### watermark (optional)
- **Type**: `WatermarkSettings`
- **Required**: No
- **Description**: Watermark configuration for overlay display
- **Example**:
```typescript
{
  text: "CONFIDENTIAL",
  opacity: 0.3,
  fontSize: 24
}
```

##### enableScreenshotPrevention (optional)
- **Type**: `boolean`
- **Required**: No
- **Default**: `false`
- **Description**: Enables DRM screenshot prevention features

##### onClose (optional)
- **Type**: `() => void`
- **Required**: No
- **Description**: Callback function called when the close button is clicked

#### State Management

The component manages the following internal state:

```typescript
interface ViewerState {
  currentPage: number;        // Current page number (1-based)
  viewMode: ViewMode;         // 'continuous' | 'paged'
  zoomLevel: number;          // Zoom level (0.5 to 3.0)
  isLoading: boolean;         // Loading state
  error: string | null;       // Error message
  pageErrors: Map<number, string>; // Per-page error tracking
}
```

#### Methods

The component exposes these methods through refs (when using `forwardRef`):

```typescript
interface SimpleDocumentViewerRef {
  goToPage: (pageNumber: number) => void;
  setZoom: (zoomLevel: number) => void;
  setViewMode: (mode: ViewMode) => void;
  getCurrentPage: () => number;
  getTotalPages: () => number;
}
```

### ViewerToolbar

Navigation toolbar component with page controls and view options.

#### Props

```typescript
interface ViewerToolbarProps {
  documentTitle: string;
  currentPage: number;
  totalPages: number;
  viewMode: ViewMode;
  zoomLevel: number;
  onPageChange: (page: number) => void;
  onViewModeChange: (mode: ViewMode) => void;
  onZoomChange: (zoom: number) => void;
  onClose?: () => void;
}
```

##### Event Handlers

- **onPageChange**: Called when user navigates to a different page
- **onViewModeChange**: Called when user toggles between continuous/paged view
- **onZoomChange**: Called when user changes zoom level
- **onClose**: Called when user clicks the close button

### ContinuousScrollView

Renders pages in a vertical scrolling layout with progressive loading.

#### Props

```typescript
interface ContinuousScrollViewProps {
  pages: PageData[];
  zoomLevel: number;
  onPageVisible: (pageNumber: number) => void;
  onPageError: (pageNumber: number, error: string) => void;
  onPageRetry: (pageNumber: number) => void;
  pageErrors: Map<number, string>;
}
```

#### Features

- **Progressive Loading**: Only loads pages as they enter the viewport
- **Intersection Observer**: Tracks which pages are currently visible
- **Error Handling**: Individual page error states with retry functionality
- **Performance**: Optimized for large documents with virtual scrolling

### PagedView

Renders one page at a time with discrete navigation.

#### Props

```typescript
interface PagedViewProps {
  pages: PageData[];
  currentPage: number;
  zoomLevel: number;
  onPageError: (pageNumber: number, error: string) => void;
  onPageRetry: (pageNumber: number) => void;
  pageErrors: Map<number, string>;
}
```

#### Features

- **Single Page Display**: Shows only the current page
- **Centered Layout**: Centers page content in the viewport
- **Smooth Transitions**: Animated transitions between pages
- **Error Recovery**: Handles individual page load failures

### WatermarkOverlay

Overlays watermark content without interfering with navigation.

#### Props

```typescript
interface WatermarkOverlayProps {
  text: string;
  opacity: number;
  fontSize: number;
}
```

#### Features

- **Non-intrusive**: Positioned above content with pointer-events disabled
- **Customizable**: Configurable text, opacity, and font size
- **Responsive**: Adapts to different screen sizes

## Hooks

### useKeyboardNavigation

Handles keyboard shortcuts for document navigation and zoom.

#### Parameters

```typescript
interface UseKeyboardNavigationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  onZoomChange: (zoom: number) => void;
  zoomLevel: number;
}
```

#### Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `↓` / `Page Down` | Next page |
| `↑` / `Page Up` | Previous page |
| `Home` | First page |
| `End` | Last page |
| `Ctrl/Cmd + +` | Zoom in |
| `Ctrl/Cmd + -` | Zoom out |

### useTouchGestures

Handles touch gestures for mobile navigation.

#### Parameters

```typescript
interface TouchGestureHandlers {
  onSwipeLeft: () => void;
  onSwipeRight: () => void;
  onPinchZoom: (scale: number) => void;
}
```

#### Touch Gestures

| Gesture | Action |
|---------|--------|
| Swipe Left | Next page |
| Swipe Right | Previous page |
| Pinch | Zoom in/out |

## Types

### Core Types

```typescript
interface PageData {
  pageNumber: number;
  pageUrl: string;
  dimensions: {
    width: number;
    height: number;
  };
}

interface WatermarkSettings {
  text: string;
  opacity: number;
  fontSize: number;
}

type ViewMode = 'continuous' | 'paged';
```

### Viewer Preferences

```typescript
interface ViewerPreferences {
  viewMode: ViewMode;
  defaultZoom: number;
  rememberPosition: boolean;
}
```

### Error Types

```typescript
type ViewerErrorType = 
  | 'missing-data'
  | 'invalid-page'
  | 'network-error'
  | 'generic';

interface ViewerError {
  type: ViewerErrorType;
  message: string;
  pageNumber?: number;
  retryable: boolean;
}
```

## Events

### Page Navigation Events

```typescript
// Fired when current page changes
interface PageChangeEvent {
  previousPage: number;
  currentPage: number;
  totalPages: number;
  trigger: 'user' | 'programmatic';
}

// Fired when view mode changes
interface ViewModeChangeEvent {
  previousMode: ViewMode;
  currentMode: ViewMode;
  preservedPage: number;
}

// Fired when zoom level changes
interface ZoomChangeEvent {
  previousZoom: number;
  currentZoom: number;
  trigger: 'user' | 'programmatic';
}
```

### Error Events

```typescript
// Fired when a page fails to load
interface PageErrorEvent {
  pageNumber: number;
  error: string;
  retryCount: number;
}

// Fired when viewer encounters a critical error
interface ViewerErrorEvent {
  error: ViewerError;
  context: string;
}
```

## Performance Considerations

### Memory Management

- **Image Caching**: Loaded page images are cached in memory
- **Cleanup**: Unused images are garbage collected when pages leave viewport
- **Virtual Scrolling**: Only renders visible pages for large documents

### Network Optimization

- **Progressive Loading**: Pages load as needed
- **Retry Logic**: Failed requests are automatically retried
- **Debouncing**: Scroll events are debounced to prevent excessive updates

### Rendering Optimization

- **React.memo**: Components are memoized to prevent unnecessary re-renders
- **useCallback**: Event handlers are memoized
- **useMemo**: Expensive calculations are memoized

## Browser Compatibility

| Browser | Version | Support Level |
|---------|---------|---------------|
| Chrome | 80+ | Full |
| Firefox | 75+ | Full |
| Safari | 13+ | Full |
| Edge | 80+ | Full |
| iOS Safari | 13+ | Full |
| Android Chrome | 80+ | Full |

### Feature Support

- **Intersection Observer**: Required for progressive loading
- **Touch Events**: Required for mobile gestures
- **CSS Grid/Flexbox**: Required for layout
- **localStorage**: Required for preferences (graceful fallback)

## Testing

### Unit Tests

Components include comprehensive unit tests covering:
- Rendering with various props
- Event handling
- Error states
- Accessibility features

### Integration Tests

End-to-end tests verify:
- Complete navigation workflows
- Cross-browser compatibility
- Mobile responsiveness
- Performance benchmarks

### Property-Based Tests

Automated tests verify correctness properties:
- Navigation boundary enforcement
- Zoom level bounds
- View mode preservation
- Content type consistency