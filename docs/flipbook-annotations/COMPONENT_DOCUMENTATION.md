# Component Documentation

## Overview

This document provides detailed documentation for all React components in the Flipbook & Media Annotations system.

---

## Core Components

### FlipBookViewer

Main flipbook viewer component with 3D page turning animations.

**Location**: `components/flipbook/FlipBookViewer.tsx`

**Props**:
```typescript
interface FlipBookViewerProps {
  documentId: string;
  pages: PageData[];
  initialPage?: number;
  watermark?: string;
  allowTextSelection?: boolean;
  onPageChange?: (page: number) => void;
  onError?: (error: Error) => void;
}

interface PageData {
  pageNumber: number;
  url: string;
  width: number;
  height: number;
}
```

**Usage**:
```tsx
<FlipBookViewer
  documentId="doc-123"
  pages={pageData}
  initialPage={1}
  watermark="user@example.com"
  allowTextSelection={true}
  onPageChange={(page) => console.log('Page:', page)}
/>
```

**Features**:
- 3D page flip animations
- Touch gesture support
- Keyboard navigation
- Zoom controls (50%-300%)
- Fullscreen mode
- Responsive design

---

### FlipBookViewerWithDRM

Wrapper component that adds DRM protections to the flipbook viewer.

**Location**: `components/flipbook/FlipBookViewerWithDRM.tsx`

**Props**:
```typescript
interface FlipBookViewerWithDRMProps extends FlipBookViewerProps {
  watermarkText: string;
  preventScreenshot?: boolean;
  preventRightClick?: boolean;
  preventKeyboardShortcuts?: boolean;
}
```

**Usage**:
```tsx
<FlipBookViewerWithDRM
  documentId="doc-123"
  pages={pageData}
  watermarkText="user@example.com"
  preventScreenshot={true}
  preventRightClick={true}
  preventKeyboardShortcuts={true}
/>
```

**DRM Features**:
- Watermark overlay
- Screenshot detection
- Right-click prevention
- Keyboard shortcut blocking
- DevTools detection

---

### FlipbookWithFallback

Flipbook viewer with automatic fallback to static PDF viewer on errors.

**Location**: `components/fallback/FlipbookWithFallback.tsx`

**Props**:
```typescript
interface FlipbookWithFallbackProps {
  documentId: string;
  documentUrl: string;
  pages?: PageData[];
  watermark?: string;
  onError?: (error: Error) => void;
}
```

**Usage**:
```tsx
<FlipbookWithFallback
  documentId="doc-123"
  documentUrl="/documents/doc-123.pdf"
  pages={pageData}
  watermark="user@example.com"
/>
```

**Features**:
- Automatic error detection
- Seamless fallback to static viewer
- Retry mechanism
- Error reporting

---

## Annotation Components

### MediaAnnotationToolbar

Toolbar that appears when text is selected, allowing users to create annotations.

**Location**: `components/annotations/MediaAnnotationToolbar.tsx`

**Props**:
```typescript
interface MediaAnnotationToolbarProps {
  documentId: string;
  pageNumber: number;
  selectedText: string;
  position: { x: number; y: number };
  onAnnotationCreate: (annotation: Annotation) => void;
  onClose: () => void;
}
```

**Usage**:
```tsx
<MediaAnnotationToolbar
  documentId="doc-123"
  pageNumber={5}
  selectedText="Important text"
  position={{ x: 100, y: 200 }}
  onAnnotationCreate={handleCreate}
  onClose={handleClose}
/>
```

**Features**:
- Positioned near text selection
- Add Audio button
- Add Video button
- Role-based visibility
- Keyboard shortcuts

---

### MediaUploadModal

Modal for uploading or linking media files for annotations.

**Location**: `components/annotations/MediaUploadModal.tsx`

**Props**:
```typescript
interface MediaUploadModalProps {
  isOpen: boolean;
  mediaType: 'AUDIO' | 'VIDEO';
  documentId: string;
  pageNumber: number;
  selectedText: string;
  position: { x: number; y: number };
  onClose: () => void;
  onSuccess: (annotation: Annotation) => void;
}
```

**Usage**:
```tsx
<MediaUploadModal
  isOpen={true}
  mediaType="AUDIO"
  documentId="doc-123"
  pageNumber={5}
  selectedText="Important text"
  position={{ x: 100, y: 200 }}
  onClose={handleClose}
  onSuccess={handleSuccess}
/>
```

**Features**:
- File upload with drag & drop
- External URL input
- File validation (type, size)
- Upload progress tracking
- Preview support

---

### MediaPlayerModal

Modal for playing audio/video annotations.

**Location**: `components/annotations/MediaPlayerModal.tsx`

**Props**:
```typescript
interface MediaPlayerModalProps {
  isOpen: boolean;
  annotation: Annotation;
  watermark?: string;
  onClose: () => void;
}

interface Annotation {
  id: string;
  mediaType: 'AUDIO' | 'VIDEO';
  mediaUrl: string;
  mediaSource: 'upload' | 'external';
  selectedText: string;
  description?: string;
}
```

**Usage**:
```tsx
<MediaPlayerModal
  isOpen={true}
  annotation={annotationData}
  watermark="user@example.com"
  onClose={handleClose}
/>
```

**Features**:
- HTML5 audio/video player
- Custom controls
- Watermark overlay
- Download prevention
- External media embedding (YouTube, Vimeo, SoundCloud)

---

### AnnotationMarker

Visual marker that indicates the presence of an annotation on a page.

**Location**: `components/annotations/AnnotationMarker.tsx`

**Props**:
```typescript
interface AnnotationMarkerProps {
  annotation: Annotation;
  position: { x: number; y: number };
  onClick: (annotation: Annotation) => void;
  onEdit?: (annotation: Annotation) => void;
  onDelete?: (annotationId: string) => void;
  canEdit?: boolean;
  canDelete?: boolean;
}
```

**Usage**:
```tsx
<AnnotationMarker
  annotation={annotationData}
  position={{ x: 100, y: 200 }}
  onClick={handleClick}
  onEdit={handleEdit}
  onDelete={handleDelete}
  canEdit={true}
  canDelete={true}
/>
```

**Features**:
- Icon indicators (🎵 audio, 🎬 video)
- Hover tooltip with text preview
- Click to play media
- Edit/delete actions (owner only)
- Responsive positioning

---

### AnnotationMarkersLayer

Container component that manages all annotation markers on a page.

**Location**: `components/annotations/AnnotationMarkersLayer.tsx`

**Props**:
```typescript
interface AnnotationMarkersLayerProps {
  documentId: string;
  pageNumber: number;
  annotations: Annotation[];
  onAnnotationClick: (annotation: Annotation) => void;
  onAnnotationUpdate: (annotation: Annotation) => void;
  onAnnotationDelete: (annotationId: string) => void;
}
```

**Usage**:
```tsx
<AnnotationMarkersLayer
  documentId="doc-123"
  pageNumber={5}
  annotations={pageAnnotations}
  onAnnotationClick={handleClick}
  onAnnotationUpdate={handleUpdate}
  onAnnotationDelete={handleDelete}
/>
```

**Features**:
- Manages marker positioning
- Prevents marker overlap
- Handles zoom adjustments
- Lazy loading per page

---

### AnnotationsContainer

High-level container that integrates annotations with the flipbook viewer.

**Location**: `components/annotations/AnnotationsContainer.tsx`

**Props**:
```typescript
interface AnnotationsContainerProps {
  documentId: string;
  currentPage: number;
  children: React.ReactNode;
}
```

**Usage**:
```tsx
<AnnotationsContainer documentId="doc-123" currentPage={5}>
  <FlipBookViewer {...viewerProps} />
</AnnotationsContainer>
```

**Features**:
- Manages annotation state
- Handles text selection
- Coordinates toolbar and markers
- Provides annotation context

---

## Error Components

### FlipbookErrorBoundary

Error boundary component that catches and handles flipbook errors.

**Location**: `components/errors/FlipbookErrorBoundary.tsx`

**Props**:
```typescript
interface FlipbookErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}
```

**Usage**:
```tsx
<FlipbookErrorBoundary
  fallback={<ErrorFallback />}
  onError={handleError}
>
  <FlipBookViewer {...props} />
</FlipbookErrorBoundary>
```

**Features**:
- Catches React errors
- Displays fallback UI
- Reports errors
- Provides recovery options

---

### ErrorToast

Toast notification component for displaying errors.

**Location**: `components/errors/ErrorToast.tsx`

**Props**:
```typescript
interface ErrorToastProps {
  error: FlipbookError;
  onClose: () => void;
  onRetry?: () => void;
}

interface FlipbookError {
  code: string;
  message: string;
  severity: 'error' | 'warning' | 'info';
  recoverable: boolean;
}
```

**Usage**:
```tsx
<ErrorToast
  error={errorData}
  onClose={handleClose}
  onRetry={handleRetry}
/>
```

**Features**:
- User-friendly error messages
- Retry button for recoverable errors
- Auto-dismiss timer
- Severity-based styling

---

## Performance Components

### PerformanceMonitor

Component that monitors and reports flipbook performance metrics.

**Location**: `components/performance/PerformanceMonitor.tsx`

**Props**:
```typescript
interface PerformanceMonitorProps {
  enabled?: boolean;
  onMetrics?: (metrics: PerformanceMetrics) => void;
}

interface PerformanceMetrics {
  fps: number;
  pageLoadTime: number;
  memoryUsage: number;
  annotationLoadTime: number;
}
```

**Usage**:
```tsx
<PerformanceMonitor
  enabled={true}
  onMetrics={handleMetrics}
/>
```

**Features**:
- FPS monitoring
- Page load time tracking
- Memory usage tracking
- Performance reporting

---

## Utility Components

### StaticPDFViewer

Fallback static PDF viewer component.

**Location**: `components/fallback/StaticPDFViewer.tsx`

**Props**:
```typescript
interface StaticPDFViewerProps {
  documentUrl: string;
  watermark?: string;
  allowTextSelection?: boolean;
}
```

**Usage**:
```tsx
<StaticPDFViewer
  documentUrl="/documents/doc-123.pdf"
  watermark="user@example.com"
  allowTextSelection={true}
/>
```

**Features**:
- PDF.js integration
- Basic navigation
- Watermark support
- DRM protections

---

### PermissionError

Component that displays permission-related error messages.

**Location**: `components/annotations/PermissionError.tsx`

**Props**:
```typescript
interface PermissionErrorProps {
  action: string;
  requiredRole: string;
  currentRole: string;
}
```

**Usage**:
```tsx
<PermissionError
  action="create annotations"
  requiredRole="PLATFORM_USER"
  currentRole="MEMBER"
/>
```

**Features**:
- Clear permission messages
- Role information
- Upgrade prompts

---

## Hooks

### useFlipbook

Custom hook for managing flipbook state and interactions.

**Location**: `hooks/useFlipbook.ts`

**Usage**:
```typescript
const {
  currentPage,
  totalPages,
  isLoading,
  error,
  goToPage,
  nextPage,
  prevPage,
  setZoom,
  toggleFullscreen
} = useFlipbook({
  documentId: 'doc-123',
  initialPage: 1
});
```

---

### usePageAnnotations

Custom hook for managing annotations on a specific page.

**Location**: `hooks/usePageAnnotations.ts`

**Usage**:
```typescript
const {
  annotations,
  isLoading,
  error,
  createAnnotation,
  updateAnnotation,
  deleteAnnotation,
  refetch
} = usePageAnnotations({
  documentId: 'doc-123',
  pageNumber: 5
});
```

---

### useAnnotationPermissions

Custom hook for checking annotation permissions.

**Location**: `hooks/useAnnotationPermissions.ts`

**Usage**:
```typescript
const {
  canCreate,
  canEdit,
  canDelete,
  canView
} = useAnnotationPermissions({
  documentId: 'doc-123',
  annotationId: 'ann-123'
});
```

---

## Component Composition Examples

### Complete Flipbook with Annotations

```tsx
import { FlipbookWithFallback } from '@/components/fallback/FlipbookWithFallback';
import { AnnotationsContainer } from '@/components/annotations/AnnotationsContainer';
import { FlipbookErrorBoundary } from '@/components/errors/FlipbookErrorBoundary';

function DocumentViewer({ documentId, pages, watermark }) {
  return (
    <FlipbookErrorBoundary>
      <AnnotationsContainer documentId={documentId} currentPage={1}>
        <FlipbookWithFallback
          documentId={documentId}
          documentUrl={`/documents/${documentId}.pdf`}
          pages={pages}
          watermark={watermark}
        />
      </AnnotationsContainer>
    </FlipbookErrorBoundary>
  );
}
```

---

## Styling

All components use Tailwind CSS for styling. Custom styles can be applied via:

- **className prop**: Pass custom Tailwind classes
- **CSS modules**: Import component-specific styles
- **Theme customization**: Modify `tailwind.config.ts`

---

## Testing

Components include comprehensive test coverage:

- **Unit tests**: Component rendering and behavior
- **Integration tests**: Component interactions
- **E2E tests**: Complete user workflows

Run tests:
```bash
npm test
npm run test:integration
npm run test:e2e
```

---

## Accessibility

All components follow WCAG 2.1 Level AA guidelines:

- Keyboard navigation support
- ARIA labels and roles
- Screen reader compatibility
- Focus management
- Color contrast compliance

---

## Browser Support

Components are tested and supported on:

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

---

## Performance Considerations

- Components use React.memo for optimization
- Lazy loading for heavy components
- Virtual scrolling for large lists
- Debounced event handlers
- Optimized re-renders

---

Last Updated: December 1, 2024
