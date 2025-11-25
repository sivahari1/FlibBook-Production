# VideoPlayer Component

## Overview

The `VideoPlayer` component provides a secure, feature-rich HTML5 video player with custom controls, watermarking, and DRM protection for the jStudyRoom platform.

## Features

- **HTML5 Video Player**: Native video playback with custom controls
- **Playback Controls**: Play/pause, seek, volume control
- **Fullscreen Support**: Toggle fullscreen mode
- **Watermark Overlay**: Apply watermarks for accountability
- **DRM Protection**: Prevent unauthorized downloads and screen capture
- **Metadata Display**: Show duration, dimensions, file size, codec
- **Keyboard Shortcuts**: Space (play/pause), F (fullscreen), M (mute), Arrow keys (seek)
- **Responsive Design**: Works on all screen sizes
- **Dark Mode Support**: Adapts to theme preferences
- **Loading States**: Visual feedback during video loading
- **Error Handling**: User-friendly error messages

## Requirements Validation

This component satisfies the following requirements:

- **7.1**: Displays video in an HTML5 video player
- **7.2**: Provides play/pause controls
- **7.3**: Provides volume controls
- **7.4**: Provides fullscreen capability
- **7.5**: Displays video duration and current time
- **7.6**: Applies watermarks for accountability

## Usage

```tsx
import VideoPlayer from '@/components/viewers/VideoPlayer';
import { VideoMetadata, WatermarkConfig } from '@/lib/types/content';

const metadata: VideoMetadata = {
  duration: 120, // seconds
  width: 1920,
  height: 1080,
  fileSize: 52428800, // bytes
  mimeType: 'video/mp4',
  codec: 'H.264'
};

const watermark: WatermarkConfig = {
  text: 'user@example.com',
  opacity: 0.3,
  fontSize: 16
};

<VideoPlayer
  videoUrl="https://example.com/video.mp4"
  metadata={metadata}
  watermark={watermark}
  autoplay={false}
  controls={true}
  title="Sample Video"
/>
```

## Props

| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `videoUrl` | `string` | Yes | - | URL of the video file |
| `metadata` | `VideoMetadata` | Yes | - | Video metadata (duration, dimensions, etc.) |
| `watermark` | `WatermarkConfig` | No | - | Watermark configuration |
| `autoplay` | `boolean` | No | `false` | Auto-play video on load |
| `controls` | `boolean` | No | `true` | Show custom controls |
| `title` | `string` | No | - | Video title to display |

## VideoMetadata Interface

```typescript
interface VideoMetadata {
  duration: number;      // Duration in seconds
  width: number;         // Video width in pixels
  height: number;        // Video height in pixels
  fileSize: number;      // File size in bytes
  mimeType: string;      // MIME type (e.g., 'video/mp4')
  bitrate?: number;      // Bitrate in kbps (optional)
  codec?: string;        // Video codec (optional)
}
```

## Keyboard Shortcuts

- **Space**: Play/Pause
- **F**: Toggle fullscreen
- **M**: Toggle mute
- **←** (Left Arrow): Seek backward 5 seconds
- **→** (Right Arrow): Seek forward 5 seconds

## Security Features

1. **DRM Protection**: Wraps the component in DRM protection to prevent unauthorized access
2. **DevTools Detection**: Detects and warns about developer tools
3. **Context Menu Disabled**: Prevents right-click download
4. **Download Prevention**: Uses `controlsList="nodownload"` attribute
5. **Picture-in-Picture Disabled**: Prevents PiP mode
6. **Watermark Overlay**: Applies visible watermark for accountability

## Styling

The component uses Tailwind CSS for styling and supports both light and dark modes. All colors and spacing follow the platform's design system.

## Browser Compatibility

The component uses standard HTML5 video APIs and is compatible with:
- Chrome/Edge (latest)
- Firefox (latest)
- Safari (latest)
- Mobile browsers (iOS Safari, Chrome Mobile)

## Implementation Notes

1. **Custom Controls**: The component implements custom controls instead of native browser controls for better consistency and security
2. **Progress Bar**: Visual progress bar with seek functionality
3. **Volume Control**: Slider-based volume control with mute toggle
4. **Fullscreen API**: Uses the Fullscreen API for fullscreen mode
5. **Time Formatting**: Displays time in MM:SS format
6. **File Size Formatting**: Displays file size in human-readable format (B, KB, MB)

## Testing

See `components/viewers/__tests__/VideoPlayer.test.tsx` for unit tests.

## Related Components

- `ImageViewer`: For viewing images
- `PDFViewer`: For viewing PDFs
- `LinkPreview`: For viewing links
- `Watermark`: Watermark overlay component
- `DRMProtection`: DRM protection wrapper
- `DevToolsDetector`: Developer tools detection

## Future Enhancements

- Playback speed control
- Quality selection for adaptive streaming
- Subtitle/caption support
- Thumbnail preview on hover
- Chapter markers
- Analytics tracking for viewing behavior
