/**
 * Example usage of ImageViewer component
 * 
 * This file demonstrates how to use the ImageViewer component
 * with different configurations and use cases.
 */

import ImageViewer from './ImageViewer';
import { ImageMetadata, WatermarkConfig } from '@/lib/types/content';

// Example 1: Basic image viewer with metadata
export function BasicImageViewerExample() {
  const metadata: ImageMetadata = {
    width: 1920,
    height: 1080,
    fileSize: 2048576, // 2MB
    mimeType: 'image/jpeg'
  };

  return (
    <ImageViewer
      imageUrl="/path/to/image.jpg"
      metadata={metadata}
      title="Sample Image"
    />
  );
}

// Example 2: Image viewer with watermark
export function WatermarkedImageViewerExample() {
  const metadata: ImageMetadata = {
    width: 1920,
    height: 1080,
    fileSize: 2048576,
    mimeType: 'image/jpeg'
  };

  const watermark: WatermarkConfig = {
    text: 'user@example.com',
    opacity: 0.3,
    fontSize: 16
  };

  return (
    <ImageViewer
      imageUrl="/path/to/image.jpg"
      metadata={metadata}
      watermark={watermark}
      title="Watermarked Image"
    />
  );
}

// Example 3: Image viewer with zoom disabled
export function NoZoomImageViewerExample() {
  const metadata: ImageMetadata = {
    width: 800,
    height: 600,
    fileSize: 512000,
    mimeType: 'image/png'
  };

  return (
    <ImageViewer
      imageUrl="/path/to/image.png"
      metadata={metadata}
      allowZoom={false}
      title="Image (Zoom Disabled)"
    />
  );
}

// Example 4: Image viewer with download allowed
export function DownloadableImageViewerExample() {
  const metadata: ImageMetadata = {
    width: 1024,
    height: 768,
    fileSize: 1024000,
    mimeType: 'image/webp'
  };

  return (
    <ImageViewer
      imageUrl="/path/to/image.webp"
      metadata={metadata}
      allowDownload={true}
      title="Downloadable Image"
    />
  );
}

// Example 5: Complete configuration for shared image
export function SharedImageViewerExample() {
  const metadata: ImageMetadata = {
    width: 2560,
    height: 1440,
    fileSize: 3145728, // 3MB
    mimeType: 'image/png'
  };

  const watermark: WatermarkConfig = {
    text: 'viewer@example.com - Viewed on 2024-11-24',
    opacity: 0.25,
    fontSize: 14
  };

  return (
    <ImageViewer
      imageUrl="https://storage.example.com/images/shared-image.png"
      metadata={metadata}
      watermark={watermark}
      allowZoom={true}
      allowDownload={false}
      title="Shared Document - Confidential"
    />
  );
}

// Example 6: Using with dynamic data from API
export function DynamicImageViewerExample({ imageData }: { imageData: any }) {
  const metadata: ImageMetadata = {
    width: imageData.metadata.width,
    height: imageData.metadata.height,
    fileSize: imageData.metadata.fileSize,
    mimeType: imageData.metadata.mimeType
  };

  const watermark: WatermarkConfig = {
    text: imageData.viewerEmail,
    opacity: 0.3,
    fontSize: 16
  };

  return (
    <ImageViewer
      imageUrl={imageData.signedUrl}
      metadata={metadata}
      watermark={watermark}
      title={imageData.title}
    />
  );
}
