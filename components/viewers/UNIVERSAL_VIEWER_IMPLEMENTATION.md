# Universal Viewer Implementation

## Overview

The Universal Viewer is a routing component that automatically selects and renders the appropriate viewer based on content type. It provides a unified interface for viewing PDF, Image, Video, and Link content.

## Implementation Status

✅ **COMPLETE** - All features implemented and tested

## Features Implemented

### 1. Content Type Routing
- ✅ Automatic detection of content type
- ✅ Routes to PDFViewer for PDF content
- ✅ Routes to ImageViewer for IMAGE content
- ✅ Routes to VideoPlayer for VIDEO content
- ✅ Routes to LinkPreview for LINK content

### 2. Loading States
- ✅ Loading indicator while content is being prepared
- ✅ Smooth transition from loading to content display

### 3. Error Handling
- ✅ Validates content type is present
- ✅ Validates required fields (fileUrl for files, linkUrl for links)
- ✅ User-friendly error messages
- ✅ Reload button for error recovery

### 4. Analytics Tracking
- ✅ Optional analytics callback
- ✅ Tracks view events with metadata
- ✅ Includes document ID, content type, timestamp
- ✅ Passes shareKey for tracking

### 5. Watermark Support
- ✅ Accepts watermark configuration
- ✅ Passes watermark to all child viewers
- ✅ Supports text watermarks with opacity and font size

### 6. Content Validation
- ✅ Validates content structure before rendering
- ✅ Checks for required fields based on content type
- ✅ Provides specific error messages for missing data

## Component Structure

```
UniversalViewer
├── Loading State
│   └── Spinner + "Loading content..."
├── Error State
│   ├── Error Icon
│   ├── Error Message
│   └── Reload Button
└── Content Routing
    ├── PDF → PDFViewer
    ├── IMAGE → ImageViewer
    ├── VIDEO → VideoPlayer
    └── LINK → LinkPreview
```

## Requirements Validation

### Requirement 6.1: Image Viewer Rendering
✅ Routes to ImageViewer component for IMAGE content type

### Requirement 7.1: Video Player Rendering
✅ Routes to VideoPlayer component for VIDEO content type with HTML5 video

### Requirement 8.1: Link Preview Display
✅ Routes to LinkPreview component for LINK content type

### Requirement 14.1: PDF Viewer Routing
✅ Routes to PDFViewer for PDF content type

### Requirement 14.2: Image Viewer Routing
✅ Routes to ImageViewer for IMAGE content type

### Requirement 14.3: Video Player Routing
✅ Routes to VideoPlayer for VIDEO content type

### Requirement 14.4: Link Preview Routing
✅ Routes to LinkPreview for LINK content type

## API Interface

### Props

```typescript
interface UniversalViewerProps {
  content: EnhancedDocument;           // Required: Content to display
  watermark?: WatermarkConfig;         // Optional: Watermark configuration
  onAnalytics?: (event: ViewerAnalyticsEvent) => void;  // Optional: Analytics callback
  requireEmail?: boolean;              // Optional: Require email (PDF only)
  shareKey?: string;                   // Optional: Share key for tracking
}
```

### Content Structure

```typescript
interface EnhancedDocument {
  id: string;
  title: string;
  contentType: ContentType;            // PDF | IMAGE | VIDEO | LINK
  fileUrl?: string;                    // Required for PDF, IMAGE, VIDEO
  linkUrl?: string;                    // Required for LINK
  thumbnailUrl?: string;
  metadata: ContentMetadata;
  userId: string;
  createdAt: Date;
  updatedAt: Date;
}
```

### Analytics Event

```typescript
interface ViewerAnalyticsEvent {
  documentId: string;
  contentType: ContentType;
  action: 'view' | 'download' | 'zoom' | 'play' | 'pause' | 'fullscreen';
  timestamp: Date;
  metadata?: Record<string, any>;
}
```

## Usage Examples

### Basic Usage

```tsx
<UniversalViewer content={document} />
```

### With Watermark

```tsx
<UniversalViewer
  content={document}
  watermark={{
    text: 'user@example.com',
    opacity: 0.3,
    fontSize: 16
  }}
/>
```

### With Analytics

```tsx
<UniversalViewer
  content={document}
  onAnalytics={(event) => {
    console.log('Analytics:', event);
    // Send to analytics service
  }}
/>
```

### With Email Requirement

```tsx
<UniversalViewer
  content={document}
  requireEmail={true}
  shareKey="share-123"
/>
```

## Error Handling

The component handles the following error cases:

1. **Missing Content Type**
   - Error: "Content type is missing"
   - Cause: `content.contentType` is undefined

2. **Missing File URL**
   - Error: "File URL is missing for this content"
   - Cause: PDF/IMAGE/VIDEO content without `fileUrl`

3. **Missing Link URL**
   - Error: "Link URL is missing for this content"
   - Cause: LINK content without `linkUrl`

4. **Unsupported Content Type**
   - Error: "Unsupported content type: {type}"
   - Cause: Unknown content type value

## Content Type Routing Logic

```typescript
switch (content.contentType) {
  case ContentType.PDF:
    return <PDFViewer ... />;
  
  case ContentType.IMAGE:
    return <ImageViewer ... />;
  
  case ContentType.VIDEO:
    return <VideoPlayer ... />;
  
  case ContentType.LINK:
    return <LinkPreview ... />;
  
  default:
    return <UnsupportedTypeError />;
}
```

## Integration Points

### 1. Dashboard Integration
```tsx
// In document details page
<UniversalViewer
  content={document}
  watermark={{ text: session.user.email }}
/>
```

### 2. Share View Integration
```tsx
// In share view page
<UniversalViewer
  content={sharedDocument}
  requireEmail={true}
  shareKey={shareKey}
  onAnalytics={trackShareView}
/>
```

### 3. BookShop Integration
```tsx
// In purchased content view
<UniversalViewer
  content={purchasedItem}
  watermark={{ text: member.email }}
  onAnalytics={trackPurchasedView}
/>
```

### 4. Member Library Integration
```tsx
// In My jStudyRoom
<UniversalViewer
  content={libraryItem}
  watermark={{ text: member.email }}
/>
```

## Testing Checklist

- ✅ PDF content routing
- ✅ Image content routing
- ✅ Video content routing
- ✅ Link content routing
- ✅ Loading state display
- ✅ Error state display
- ✅ Missing fileUrl error
- ✅ Missing linkUrl error
- ✅ Unsupported type error
- ✅ Analytics callback invocation
- ✅ Watermark propagation
- ✅ ShareKey passing

## Performance Considerations

1. **Lazy Loading**: Child viewers are only loaded when needed
2. **Error Boundaries**: Errors in child viewers don't crash the app
3. **Analytics Debouncing**: Analytics events are fired once on mount
4. **Validation Early**: Content validation happens before rendering

## Accessibility

- ✅ Semantic HTML structure
- ✅ ARIA labels for loading and error states
- ✅ Keyboard navigation support (inherited from child viewers)
- ✅ Screen reader friendly error messages

## Browser Compatibility

- ✅ Chrome/Edge (latest)
- ✅ Firefox (latest)
- ✅ Safari (latest)
- ✅ Mobile browsers (iOS Safari, Chrome Mobile)

## Future Enhancements

Potential improvements for future iterations:

1. **Preloading**: Preload content before displaying
2. **Caching**: Cache viewed content for faster re-access
3. **Offline Support**: Allow viewing cached content offline
4. **Custom Viewers**: Support for custom viewer plugins
5. **Thumbnail Preview**: Show thumbnail while loading full content
6. **Progress Tracking**: Track viewing progress for videos/PDFs

## Related Files

- `components/viewers/UniversalViewer.tsx` - Main component
- `components/viewers/UniversalViewer.README.md` - Documentation
- `components/viewers/UniversalViewer.example.tsx` - Usage examples
- `components/viewers/ImageViewer.tsx` - Image viewer
- `components/viewers/VideoPlayer.tsx` - Video player
- `components/viewers/LinkPreview.tsx` - Link preview
- `components/pdf/PDFViewer.tsx` - PDF viewer
- `lib/types/content.ts` - Type definitions

## Conclusion

The Universal Viewer provides a clean, unified interface for viewing all content types in the jStudyRoom platform. It handles routing, validation, error states, and analytics tracking, making it easy to integrate content viewing throughout the application.
