# Design Document

## Overview

This design implements a full-screen document viewer with intuitive navigation controls, replacing the current small-window flipbook viewer with a modern, user-friendly interface. The solution provides smooth scrolling, page navigation arrows, keyboard shortcuts, and zoom controls while maintaining DRM features like watermarks and screenshot prevention.

## Architecture

### Current State Analysis

**Existing Implementation:**
- `FlipBookViewer` uses HTMLFlipBook library with page-turning animations
- Viewer dimensions calculated as 40% of container width on desktop
- Large padding (p-8) and decorative gradient backgrounds reduce usable space
- Navigation limited to page-flip gestures
- No scrollbar or traditional navigation controls

**Problems:**
1. **Limited Screen Usage:** Only ~40% of viewport width used for content
2. **Unfamiliar Navigation:** Flipbook metaphor not intuitive for all users
3. **No Scrolling:** Can't scroll through document like standard PDF viewers
4. **Missing Controls:** No visible page indicators or navigation arrows
5. **Fixed Layout:** Can't switch between viewing modes

### Proposed Architecture

**New Component Structure:**
```
PreviewViewerClient
  └─> SimpleDocumentViewer (new)
        ├─> ViewerToolbar (navigation controls)
        │     ├─> PageNavigator (arrows, page indicator)
        │     ├─> ZoomControls (zoom in/out, fit-to-width)
        │     └─> ViewModeToggle (continuous/paged)
        ├─> DocumentCanvas (full-screen display area)
        │     ├─> ContinuousScrollView (for continuous mode)
        │     │     └─> PageRenderer (renders each page)
        │     └─> PagedView (for paged mode)
        │           └─> SinglePageRenderer
        └─> WatermarkOverlay (if enabled)
```

**Key Design Decisions:**

1. **Replace HTMLFlipBook:** Use custom renderer with standard scrolling
2. **Full Viewport Usage:** Remove decorative backgrounds, minimize padding
3. **Dual View Modes:** Support both continuous scroll and paged viewing
4. **Persistent Toolbar:** Fixed toolbar with all navigation controls
5. **Progressive Loading:** Load pages on-demand as user scrolls

## Components and Interfaces

### 1. SimpleDocumentViewer Component

**Location:** `components/viewers/SimpleDocumentViewer.tsx`

**Purpose:** Main container for full-screen document viewing

**Props:**
```typescript
interface SimpleDocumentViewerProps {
  documentId: string;
  documentTitle: string;
  pages: Array<{
    pageNumber: number;
    pageUrl: string;
    dimensions: { width: number; height: number };
  }>;
  watermark?: {
    text: string;
    opacity: number;
    fontSize: number;
  };
  enableScreenshotPrevention?: boolean;
  onClose?: () => void;
}
```

**State Management:**
```typescript
interface ViewerState {
  currentPage: number;
  totalPages: number;
  viewMode: 'continuous' | 'paged';
  zoomLevel: number; // 0.5 to 3.0
  isLoading: boolean;
  loadedPages: Set<number>;
}
```

**Layout:**
```tsx
<div className="fixed inset-0 bg-gray-900 flex flex-col">
  {/* Toolbar - fixed at top */}
  <ViewerToolbar 
    currentPage={currentPage}
    totalPages={totalPages}
    viewMode={viewMode}
    zoomLevel={zoomLevel}
    onPageChange={handlePageChange}
    onViewModeChange={setViewMode}
    onZoomChange={handleZoom}
    onClose={onClose}
  />
  
  {/* Document canvas - fills remaining space */}
  <div className="flex-1 overflow-auto relative">
    {viewMode === 'continuous' ? (
      <ContinuousScrollView 
        pages={pages}
        zoomLevel={zoomLevel}
        onPageVisible={setCurrentPage}
      />
    ) : (
      <PagedView 
        pages={pages}
        currentPage={currentPage}
        zoomLevel={zoomLevel}
      />
    )}
    
    {/* Watermark overlay */}
    {watermark && (
      <WatermarkOverlay 
        text={watermark.text}
        opacity={watermark.opacity}
        fontSize={watermark.fontSize}
      />
    )}
  </div>
</div>
```

### 2. ViewerToolbar Component

**Location:** `components/viewers/ViewerToolbar.tsx`

**Purpose:** Navigation controls and settings

**Layout:**
```tsx
<div className="bg-gray-800 border-b border-gray-700 px-4 py-2 flex items-center justify-between">
  {/* Left: Document title */}
  <div className="flex items-center space-x-4">
    <button onClick={onClose} className="text-gray-400 hover:text-white">
      <X className="w-5 h-5" />
    </button>
    <h1 className="text-white font-medium truncate max-w-md">
      {documentTitle}
    </h1>
  </div>
  
  {/* Center: Page navigation */}
  <div className="flex items-center space-x-2">
    <button 
      onClick={() => onPageChange(currentPage - 1)}
      disabled={currentPage === 1}
      className="p-2 text-gray-400 hover:text-white disabled:opacity-30"
    >
      <ChevronLeft className="w-5 h-5" />
    </button>
    
    <div className="flex items-center space-x-2 bg-gray-700 rounded px-3 py-1">
      <input
        type="number"
        value={currentPage}
        onChange={(e) => onPageChange(parseInt(e.target.value))}
        className="w-12 bg-transparent text-white text-center"
        min={1}
        max={totalPages}
      />
      <span className="text-gray-400">of {totalPages}</span>
    </div>
    
    <button 
      onClick={() => onPageChange(currentPage + 1)}
      disabled={currentPage === totalPages}
      className="p-2 text-gray-400 hover:text-white disabled:opacity-30"
    >
      <ChevronRight className="w-5 h-5" />
    </button>
  </div>
  
  {/* Right: View controls */}
  <div className="flex items-center space-x-2">
    {/* Zoom controls */}
    <button 
      onClick={() => onZoomChange(zoomLevel - 0.25)}
      disabled={zoomLevel <= 0.5}
      className="p-2 text-gray-400 hover:text-white disabled:opacity-30"
    >
      <ZoomOut className="w-5 h-5" />
    </button>
    <span className="text-gray-400 text-sm w-12 text-center">
      {Math.round(zoomLevel * 100)}%
    </span>
    <button 
      onClick={() => onZoomChange(zoomLevel + 0.25)}
      disabled={zoomLevel >= 3.0}
      className="p-2 text-gray-400 hover:text-white disabled:opacity-30"
    >
      <ZoomIn className="w-5 h-5" />
    </button>
    
    {/* View mode toggle */}
    <button
      onClick={() => onViewModeChange(viewMode === 'continuous' ? 'paged' : 'continuous')}
      className="p-2 text-gray-400 hover:text-white"
      title={viewMode === 'continuous' ? 'Switch to paged view' : 'Switch to continuous scroll'}
    >
      {viewMode === 'continuous' ? <BookOpen /> : <Scroll />}
    </button>
  </div>
</div>
```

### 3. ContinuousScrollView Component

**Location:** `components/viewers/ContinuousScrollView.tsx`

**Purpose:** Renders pages in vertical scroll layout

**Implementation:**
```typescript
export function ContinuousScrollView({ 
  pages, 
  zoomLevel, 
  onPageVisible 
}: ContinuousScrollViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [visiblePages, setVisiblePages] = useState<Set<number>>(new Set([1]));
  
  // Intersection Observer to track visible pages
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const pageNum = parseInt(entry.target.getAttribute('data-page') || '0');
          if (entry.isIntersecting) {
            setVisiblePages(prev => new Set(prev).add(pageNum));
            onPageVisible(pageNum);
          }
        });
      },
      { threshold: 0.5 } // Page is "visible" when 50% in viewport
    );
    
    // Observe all page elements
    const pageElements = containerRef.current?.querySelectorAll('[data-page]');
    pageElements?.forEach(el => observer.observe(el));
    
    return () => observer.disconnect();
  }, [pages, onPageVisible]);
  
  return (
    <div 
      ref={containerRef}
      className="flex flex-col items-center py-8 space-y-4"
      style={{ 
        minHeight: '100%',
        backgroundColor: '#1f2937' // gray-800
      }}
    >
      {pages.map((page) => (
        <div
          key={page.pageNumber}
          data-page={page.pageNumber}
          className="bg-white shadow-2xl"
          style={{
            width: `${page.dimensions.width * zoomLevel}px`,
            height: `${page.dimensions.height * zoomLevel}px`,
          }}
        >
          {visiblePages.has(page.pageNumber) ? (
            <img
              src={page.pageUrl}
              alt={`Page ${page.pageNumber}`}
              className="w-full h-full object-contain"
              loading="lazy"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gray-100">
              <div className="text-gray-400">Loading page {page.pageNumber}...</div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
```

### 4. PagedView Component

**Location:** `components/viewers/PagedView.tsx`

**Purpose:** Renders one page at a time

**Implementation:**
```typescript
export function PagedView({ 
  pages, 
  currentPage, 
  zoomLevel 
}: PagedViewProps) {
  const page = pages[currentPage - 1];
  
  if (!page) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-white">Page not found</div>
      </div>
    );
  }
  
  return (
    <div className="flex items-center justify-center h-full bg-gray-800 p-4">
      <div
        className="bg-white shadow-2xl"
        style={{
          width: `${page.dimensions.width * zoomLevel}px`,
          height: `${page.dimensions.height * zoomLevel}px`,
          maxWidth: '100%',
          maxHeight: '100%',
        }}
      >
        <img
          src={page.pageUrl}
          alt={`Page ${page.pageNumber}`}
          className="w-full h-full object-contain"
        />
      </div>
    </div>
  );
}
```

### 5. Keyboard Navigation Hook

**Location:** `hooks/useKeyboardNavigation.ts`

**Purpose:** Handle keyboard shortcuts

**Implementation:**
```typescript
export function useKeyboardNavigation({
  currentPage,
  totalPages,
  onPageChange,
  onZoomChange,
  zoomLevel,
}: UseKeyboardNavigationProps) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Prevent default for navigation keys
      if (['ArrowUp', 'ArrowDown', 'PageUp', 'PageDown', 'Home', 'End'].includes(e.key)) {
        e.preventDefault();
      }
      
      switch (e.key) {
        case 'ArrowDown':
        case 'PageDown':
          if (currentPage < totalPages) {
            onPageChange(currentPage + 1);
          }
          break;
          
        case 'ArrowUp':
        case 'PageUp':
          if (currentPage > 1) {
            onPageChange(currentPage - 1);
          }
          break;
          
        case 'Home':
          onPageChange(1);
          break;
          
        case 'End':
          onPageChange(totalPages);
          break;
          
        case '+':
        case '=':
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            onZoomChange(Math.min(zoomLevel + 0.25, 3.0));
          }
          break;
          
        case '-':
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            onZoomChange(Math.max(zoomLevel - 0.25, 0.5));
          }
          break;
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentPage, totalPages, zoomLevel, onPageChange, onZoomChange]);
}
```

## Data Models

### ViewerPreferences

```typescript
interface ViewerPreferences {
  viewMode: 'continuous' | 'paged';
  defaultZoom: number;
  rememberPosition: boolean;
}
```

Stored in localStorage:
```typescript
const VIEWER_PREFS_KEY = 'document-viewer-preferences';

function savePreferences(prefs: ViewerPreferences) {
  localStorage.setItem(VIEWER_PREFS_KEY, JSON.stringify(prefs));
}

function loadPreferences(): ViewerPreferences {
  const stored = localStorage.getItem(VIEWER_PREFS_KEY);
  return stored ? JSON.parse(stored) : {
    viewMode: 'continuous',
    defaultZoom: 1.0,
    rememberPosition: true,
  };
}
```

### PagePosition

```typescript
interface PagePosition {
  documentId: string;
  pageNumber: number;
  scrollPosition: number;
  timestamp: number;
}
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Full viewport utilization

*For any* browser viewport size, the document viewer should occupy at least 95% of the available width and 90% of the available height (excluding toolbar)
**Validates: Requirements 1.1, 1.2, 1.3, 1.4**

### Property 2: Smooth page transitions

*For any* navigation action (scroll, arrow click, keyboard shortcut), the system should update the current page indicator within 100ms
**Validates: Requirements 2.1, 2.2, 2.3, 4.3, 5.1, 5.2**

### Property 3: Navigation boundary enforcement

*For any* navigation attempt beyond document boundaries, the system should prevent the action and maintain the current position (first or last page)
**Validates: Requirements 3.4, 3.5**

### Property 4: Page indicator accuracy

*For any* visible page in the viewport, the page indicator should display the correct page number and total page count
**Validates: Requirements 4.1, 4.2, 4.3, 4.4, 4.5**

### Property 5: Keyboard shortcut consistency

*For any* keyboard shortcut, the system should perform the corresponding navigation action without interfering with browser defaults
**Validates: Requirements 5.1, 5.2, 5.3, 5.4, 5.5, 5.6**

### Property 6: View mode preservation

*For any* view mode switch, the system should maintain the current page position and update the display accordingly
**Validates: Requirements 6.4**

### Property 7: Zoom level bounds

*For any* zoom operation, the resulting zoom level should be between 0.5x and 3.0x, and the current page should remain visible
**Validates: Requirements 7.2, 7.3, 7.5**

### Property 8: Content type consistency

*For any* content type (PDF, image, video, link), the full-screen viewer should provide consistent navigation controls and layout
**Validates: Requirements 8.1, 8.2, 8.3, 8.4, 8.5**

## Error Handling

### Page Loading Failures
- **Scenario:** Individual page image fails to load
- **Handling:** Display placeholder with retry button
- **User Feedback:** "Failed to load page X. Click to retry."
- **Fallback:** Continue showing other pages

### Invalid Page Navigation
- **Scenario:** User enters invalid page number (e.g., 0, negative, > total)
- **Handling:** Clamp to valid range (1 to totalPages)
- **User Feedback:** Brief toast notification
- **Example:** Input "100" when total is 50 → navigate to page 50

### Keyboard Conflict
- **Scenario:** Keyboard shortcut conflicts with browser/OS
- **Handling:** Use preventDefault() for document-specific keys only
- **User Feedback:** None (transparent handling)
- **Fallback:** Mouse/touch navigation always available

### Zoom Overflow
- **Scenario:** Zoomed content exceeds viewport
- **Handling:** Enable scrolling within page container
- **User Feedback:** Scrollbars appear automatically
- **Behavior:** Maintain zoom level, allow panning

### Missing Preferences
- **Scenario:** localStorage unavailable or cleared
- **Handling:** Use default preferences
- **User Feedback:** None (silent fallback)
- **Defaults:** Continuous mode, 100% zoom

## Testing Strategy

### Unit Tests

**Test File:** `components/viewers/__tests__/SimpleDocumentViewer.test.tsx`

1. **Test full-screen layout**
   - Render viewer with mock pages
   - Assert container uses `fixed inset-0`
   - Assert no unnecessary padding/margins

2. **Test page navigation**
   - Click next arrow → current page increments
   - Click previous arrow → current page decrements
   - Verify boundary conditions (first/last page)

3. **Test keyboard shortcuts**
   - Simulate ArrowDown → page advances
   - Simulate ArrowUp → page goes back
   - Simulate Home → jumps to page 1
   - Simulate End → jumps to last page

4. **Test zoom controls**
   - Click zoom in → zoom level increases by 0.25
   - Click zoom out → zoom level decreases by 0.25
   - Verify bounds (0.5x to 3.0x)

5. **Test view mode toggle**
   - Start in continuous mode
   - Click toggle → switches to paged mode
   - Verify current page preserved

**Test File:** `components/viewers/__tests__/ContinuousScrollView.test.tsx`

6. **Test progressive loading**
   - Render with 10 pages
   - Assert only visible pages load images
   - Scroll down → assert new pages load

7. **Test page visibility tracking**
   - Mock IntersectionObserver
   - Scroll to page 5
   - Assert onPageVisible called with 5

**Test File:** `hooks/__tests__/useKeyboardNavigation.test.tsx`

8. **Test keyboard event handling**
   - Simulate each keyboard shortcut
   - Assert correct callback invoked
   - Verify preventDefault() called

### Integration Tests

**Test File:** `app/dashboard/documents/[id]/view/__tests__/full-screen-viewer.integration.test.tsx`

9. **Test end-to-end viewing flow**
   - Navigate to document view page
   - Assert full-screen viewer renders
   - Navigate through pages
   - Assert page indicator updates
   - Test zoom and view mode

10. **Test watermark integration**
    - Enable watermark in settings
    - Open document
    - Assert watermark overlays content
    - Assert navigation still works

### Property-Based Tests

**Test File:** `components/viewers/__tests__/viewer-properties.test.tsx`

11. **Property test: Viewport utilization**
    - Generate random viewport sizes
    - Assert viewer uses ≥95% width, ≥90% height

12. **Property test: Page navigation bounds**
    - Generate random page numbers
    - Attempt navigation
    - Assert result is always within [1, totalPages]

## Implementation Notes

### Performance Optimization

1. **Lazy Loading:** Only load page images when they enter viewport
2. **Virtual Scrolling:** For documents with 100+ pages, render only visible pages
3. **Image Caching:** Cache loaded page images in memory
4. **Debounced Scroll:** Update page indicator with 100ms debounce

### Accessibility

1. **Keyboard Navigation:** Full keyboard support for all actions
2. **ARIA Labels:** Proper labels for all buttons and controls
3. **Focus Management:** Visible focus indicators
4. **Screen Reader:** Announce page changes

### Mobile Considerations

1. **Touch Gestures:** Swipe left/right for page navigation
2. **Pinch Zoom:** Support pinch-to-zoom on touch devices
3. **Responsive Toolbar:** Collapse toolbar on small screens
4. **Touch Targets:** Minimum 44x44px touch targets

### Browser Compatibility

- Chrome/Edge: Full support
- Firefox: Full support
- Safari: Full support (test IntersectionObserver)
- Mobile browsers: Test touch gestures

## Migration Strategy

### Phase 1: Create New Viewer Component
1. Build SimpleDocumentViewer with continuous scroll mode
2. Add ViewerToolbar with basic navigation
3. Implement keyboard shortcuts
4. Test with sample documents

### Phase 2: Integrate with Existing System
1. Update PreviewViewerClient to use SimpleDocumentViewer for PDFs
2. Keep FlipBookViewer as fallback option
3. Add feature flag to toggle between viewers
4. Deploy to staging for testing

### Phase 3: Add Advanced Features
1. Implement paged view mode
2. Add zoom controls
3. Add view mode toggle
4. Save user preferences

### Phase 4: Full Rollout
1. Make SimpleDocumentViewer the default
2. Remove FlipBookViewer (or keep as option)
3. Monitor performance and user feedback
4. Iterate based on feedback

## Rollback Plan

If issues arise:

1. **Feature Flag:** Toggle back to FlipBookViewer via environment variable
2. **Partial Rollback:** Keep new viewer for some users, old for others
3. **Full Rollback:** Revert to previous version completely

## Future Enhancements

1. **Thumbnail Sidebar:** Show page thumbnails for quick navigation
2. **Search:** Full-text search within document
3. **Annotations:** Add comments and highlights
4. **Download:** Download current page or entire document
5. **Print:** Print-friendly view
6. **Bookmarks:** Save favorite pages
7. **Presentation Mode:** Full-screen with auto-advance
