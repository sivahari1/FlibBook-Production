# ImageViewer Component

A comprehensive image viewing component with zoom functionality, metadata display, and watermark support for the jStudyRoom platform.

## Features

- **Responsive Image Display**: Displays images with proper scaling and centering
- **Zoom Functionality**: Supports zoom in/out with mouse controls and keyboard shortcuts
- **Metadata Display**: Shows image dimensions, file size, and MIME type
- **Watermark Overlay**: Applies configurable watermarks for accountability
- **DRM Protection**: Integrates with security components to prevent unauthorized access
- **Loading States**: Provides visual feedback during image loading
- **Error Handling**: Gracefully handles image loading failures
- **Dark Mode Support**: Fully compatible with light and dark themes
- **Keyboard Shortcuts**: Quick zoom controls via keyboard

## Requirements Validation

This component satisfies the following requirements:

- **Requirement 6.1**: Displays images in a responsive viewer
- **Requirement 6.2**: Supports zoom in/out functionality
- **Requirement 6.3**: Displays image metadata (dimensions, file size)
- **Requirement 6.4**: Applies watermark overlay for accountability

## Props

```typescript
interface ImageViewerProps {
  imageUrl: string;           // URL of the image to display
  metadata: ImageMetadata;    // Image metadata (dimensions, size, type)
  watermark?: WatermarkConfig; // Optional watermark configuration
  allowZoom?: boolean;        // Enable/disable zoom (default: true)
  allowDownload?: boolean;    // Allow right-click download (default: false)
  title?: string;             // Optional title to display
}
```

### ImageMetadata

```typescript
interface ImageMetadata {
  width: number;      // Image width in pixels
  height: number;     // Image height in pixels
  fileSize: number;   // File size in bytes
  mimeType: string;   // MIME type (e.g., 'image/jpeg')
}
```

### WatermarkConfig

```typescript
interface WatermarkConfig {
  text: string;       // Watermark text (e.g., email address)
  opacity?: number;   // Opacity (0-1, default: 0.3)
  fontSize?: number;  // Font size in pixels (default: 16)
}
```

## Usage Examples

### Basic Usage

```tsx
import ImageViewer from '@/components/viewers/ImageViewer';

const metadata = {
  width: 1920,
  height: 1080,
  fileSize: 2048576,
  mimeType: 'image/jpeg'
};

<ImageViewer
  imageUrl="/path/to/image.jpg"
  metadata={metadata}
  title="My Image"
/>
```

### With Watermark

```tsx
const watermark = {
  text: 'user@example.com',
  opacity: 0.3,
  fontSize: 16
};

<ImageViewer
  imageUrl="/path/to/image.jpg"
  metadata={metadata}
  watermark={watermark}
  title="Watermarked Image"
/>
```

### Disable Zoom

```tsx
<ImageViewer
  imageUrl="/path/to/image.jpg"
  metadata={metadata}
  allowZoom={false}
/>
```

### Allow Download

```tsx
<ImageViewer
  imageUrl="/path/to/image.jpg"
  metadata={metadata}
  allowDownload={true}
/>
```

## Keyboard Shortcuts

When zoom is enabled:

- **+** or **=**: Zoom in
- **-** or **_**: Zoom out
- **0**: Reset zoom to 100%

## Features in Detail

### Zoom Functionality

- Zoom range: 50% to 300%
- Smooth transitions between zoom levels
- Maintains center position during zoom
- Keyboard and button controls

### Metadata Display

The component displays:
- Image dimensions (width × height in pixels)
- File size (formatted as B, KB, or MB)
- MIME type (e.g., image/jpeg, image/png)

### Watermark

- Repeating diagonal pattern across the image
- Configurable text, opacity, and font size
- Non-intrusive but visible for accountability
- Prevents removal via screenshot or download

### Security Features

- Integrates with DRMProtection component
- Includes DevToolsDetector to prevent inspection
- Disables right-click context menu (unless allowDownload is true)
- Prevents image dragging
- User-select disabled to prevent easy copying

### Responsive Design

- Centers images in the viewport
- Scales large images to fit screen
- Maintains aspect ratio
- Works on all screen sizes

## Styling

The component uses Tailwind CSS classes and supports:
- Light and dark mode themes
- Responsive layouts
- Smooth transitions and animations
- Accessible color contrasts

## Integration with Other Components

### DRMProtection

Wraps the entire viewer to prevent unauthorized access and copying.

### DevToolsDetector

Monitors for developer tools to prevent inspection and manipulation.

### Watermark

Reuses the existing Watermark component from the PDF viewer for consistency.

## Error Handling

The component handles:
- Image loading failures
- Invalid image URLs
- Network errors
- Missing metadata

Error states display user-friendly messages with appropriate icons.

## Performance Considerations

- Lazy loading of images
- Efficient zoom transformations using CSS transforms
- Minimal re-renders during zoom operations
- Optimized event listeners

## Accessibility

- Semantic HTML structure
- Keyboard navigation support
- Screen reader friendly
- High contrast support
- Focus indicators

## Browser Compatibility

Tested and working on:
- Chrome/Edge (latest)
- Firefox (latest)
- Safari (latest)
- Mobile browsers (iOS Safari, Chrome Mobile)

## Future Enhancements

Potential improvements:
- Pan functionality for zoomed images
- Pinch-to-zoom on touch devices
- Image rotation controls
- Fullscreen mode
- Image comparison slider
- Thumbnail navigation for multiple images

## Related Components

- `PDFViewer`: For viewing PDF documents
- `VideoPlayer`: For viewing video content (to be implemented)
- `LinkPreview`: For displaying link previews (to be implemented)
- `UniversalViewer`: Routes to appropriate viewer based on content type (to be implemented)
