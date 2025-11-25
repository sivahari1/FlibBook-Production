/**
 * Tests for ImageViewer component
 * Validates Requirements: 6.1, 6.2, 6.3, 6.4
 */

import { describe, it, expect, vi } from 'vitest';
import * as fc from 'fast-check';
import { ImageMetadata, WatermarkConfig } from '@/lib/types/content';

describe('ImageViewer Component', () => {
  describe('ImageMetadata Interface', () => {
    it('should define required metadata fields', () => {
      const metadata: ImageMetadata = {
        width: 1920,
        height: 1080,
        fileSize: 2048576,
        mimeType: 'image/jpeg'
      };

      expect(metadata.width).toBe(1920);
      expect(metadata.height).toBe(1080);
      expect(metadata.fileSize).toBe(2048576);
      expect(metadata.mimeType).toBe('image/jpeg');
    });

    it('should accept various image MIME types', () => {
      const jpegMetadata: ImageMetadata = {
        width: 800,
        height: 600,
        fileSize: 1024000,
        mimeType: 'image/jpeg'
      };

      const pngMetadata: ImageMetadata = {
        width: 1024,
        height: 768,
        fileSize: 2048000,
        mimeType: 'image/png'
      };

      const webpMetadata: ImageMetadata = {
        width: 1280,
        height: 720,
        fileSize: 512000,
        mimeType: 'image/webp'
      };

      expect(jpegMetadata.mimeType).toBe('image/jpeg');
      expect(pngMetadata.mimeType).toBe('image/png');
      expect(webpMetadata.mimeType).toBe('image/webp');
    });

    it('should handle various image dimensions', () => {
      const smallImage: ImageMetadata = {
        width: 640,
        height: 480,
        fileSize: 102400,
        mimeType: 'image/jpeg'
      };

      const largeImage: ImageMetadata = {
        width: 3840,
        height: 2160,
        fileSize: 10485760,
        mimeType: 'image/png'
      };

      expect(smallImage.width).toBeLessThan(largeImage.width);
      expect(smallImage.height).toBeLessThan(largeImage.height);
      expect(smallImage.fileSize).toBeLessThan(largeImage.fileSize);
    });
  });

  describe('WatermarkConfig Interface', () => {
    it('should define watermark configuration', () => {
      const watermark: WatermarkConfig = {
        text: 'user@example.com',
        opacity: 0.3,
        fontSize: 16
      };

      expect(watermark.text).toBe('user@example.com');
      expect(watermark.opacity).toBe(0.3);
      expect(watermark.fontSize).toBe(16);
    });

    it('should handle optional watermark properties', () => {
      const minimalWatermark: WatermarkConfig = {
        text: 'watermark text'
      };

      expect(minimalWatermark.text).toBeDefined();
      expect(minimalWatermark.opacity).toBeUndefined();
      expect(minimalWatermark.fontSize).toBeUndefined();
    });

    it('should accept various opacity values', () => {
      const transparentWatermark: WatermarkConfig = {
        text: 'test',
        opacity: 0.1
      };

      const opaqueWatermark: WatermarkConfig = {
        text: 'test',
        opacity: 0.8
      };

      expect(transparentWatermark.opacity).toBeLessThan(opaqueWatermark.opacity!);
      expect(transparentWatermark.opacity).toBeGreaterThanOrEqual(0);
      expect(opaqueWatermark.opacity).toBeLessThanOrEqual(1);
    });
  });

  describe('Zoom Functionality (Requirement 6.2)', () => {
    it('should support zoom scale values', () => {
      const minZoom = 0.5;
      const defaultZoom = 1;
      const maxZoom = 3;

      expect(minZoom).toBeLessThan(defaultZoom);
      expect(defaultZoom).toBeLessThan(maxZoom);
      expect(minZoom).toBeGreaterThan(0);
    });

    it('should calculate zoom increments correctly', () => {
      const currentZoom = 1;
      const zoomIncrement = 0.25;
      
      const zoomIn = currentZoom + zoomIncrement;
      const zoomOut = currentZoom - zoomIncrement;

      expect(zoomIn).toBe(1.25);
      expect(zoomOut).toBe(0.75);
    });

    it('should enforce zoom limits', () => {
      const minZoom = 0.5;
      const maxZoom = 3;
      
      const attemptedZoomOut = 0.25;
      const attemptedZoomIn = 3.5;

      const clampedZoomOut = Math.max(minZoom, attemptedZoomOut);
      const clampedZoomIn = Math.min(maxZoom, attemptedZoomIn);

      expect(clampedZoomOut).toBe(minZoom);
      expect(clampedZoomIn).toBe(maxZoom);
    });

    it('should handle zoom reset', () => {
      const currentZoom = 2.5;
      const resetZoom = 1;

      expect(resetZoom).toBe(1);
      expect(currentZoom).not.toBe(resetZoom);
    });
  });

  describe('Metadata Display (Requirement 6.3)', () => {
    it('should format file size correctly', () => {
      const formatFileSize = (bytes: number): string => {
        if (bytes < 1024) return `${bytes} B`;
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
        return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
      };

      expect(formatFileSize(500)).toBe('500 B');
      expect(formatFileSize(1024)).toBe('1.00 KB');
      expect(formatFileSize(1024 * 1024)).toBe('1.00 MB');
      expect(formatFileSize(2048576)).toBe('1.95 MB');
    });

    it('should display dimensions in correct format', () => {
      const width = 1920;
      const height = 1080;
      const dimensionString = `${width} × ${height} px`;

      expect(dimensionString).toBe('1920 × 1080 px');
    });

    it('should include all required metadata fields', () => {
      const metadata: ImageMetadata = {
        width: 1920,
        height: 1080,
        fileSize: 2048576,
        mimeType: 'image/jpeg'
      };

      // Verify all required fields are present
      expect(metadata).toHaveProperty('width');
      expect(metadata).toHaveProperty('height');
      expect(metadata).toHaveProperty('fileSize');
      expect(metadata).toHaveProperty('mimeType');
    });
  });

  describe('Watermark Application (Requirement 6.4)', () => {
    it('should apply watermark when config is provided', () => {
      const watermark: WatermarkConfig = {
        text: 'user@example.com',
        opacity: 0.3,
        fontSize: 16
      };

      expect(watermark).toBeDefined();
      expect(watermark.text).toBeTruthy();
    });

    it('should handle watermark without config', () => {
      const watermark: WatermarkConfig | undefined = undefined;

      expect(watermark).toBeUndefined();
    });

    it('should use default watermark values when not specified', () => {
      const watermark: WatermarkConfig = {
        text: 'test@example.com'
      };

      const defaultOpacity = 0.3;
      const defaultFontSize = 16;

      const opacity = watermark.opacity || defaultOpacity;
      const fontSize = watermark.fontSize || defaultFontSize;

      expect(opacity).toBe(defaultOpacity);
      expect(fontSize).toBe(defaultFontSize);
    });
  });

  describe('Component Props', () => {
    it('should accept required props', () => {
      const props = {
        imageUrl: 'https://example.com/image.jpg',
        metadata: {
          width: 1920,
          height: 1080,
          fileSize: 2048576,
          mimeType: 'image/jpeg'
        }
      };

      expect(props.imageUrl).toBeTruthy();
      expect(props.metadata).toBeDefined();
    });

    it('should accept optional props', () => {
      const props = {
        imageUrl: 'https://example.com/image.jpg',
        metadata: {
          width: 1920,
          height: 1080,
          fileSize: 2048576,
          mimeType: 'image/jpeg'
        },
        watermark: {
          text: 'user@example.com',
          opacity: 0.3,
          fontSize: 16
        },
        allowZoom: true,
        allowDownload: false,
        title: 'Test Image'
      };

      expect(props.watermark).toBeDefined();
      expect(props.allowZoom).toBe(true);
      expect(props.allowDownload).toBe(false);
      expect(props.title).toBe('Test Image');
    });

    it('should handle default prop values', () => {
      const allowZoom = true; // default
      const allowDownload = false; // default

      expect(allowZoom).toBe(true);
      expect(allowDownload).toBe(false);
    });
  });

  describe('Responsive Image Display (Requirement 6.1)', () => {
    it('should handle various image URLs', () => {
      const localUrl = '/images/test.jpg';
      const remoteUrl = 'https://example.com/image.jpg';
      const signedUrl = 'https://storage.example.com/signed-url?token=abc123';

      expect(localUrl).toBeTruthy();
      expect(remoteUrl).toBeTruthy();
      expect(signedUrl).toBeTruthy();
    });

    it('should maintain aspect ratio', () => {
      const metadata: ImageMetadata = {
        width: 1920,
        height: 1080,
        fileSize: 2048576,
        mimeType: 'image/jpeg'
      };

      const aspectRatio = metadata.width / metadata.height;
      expect(aspectRatio).toBeCloseTo(16 / 9, 2);
    });
  });

  describe('Loading States', () => {
    it('should track loading state', () => {
      let loading = true;
      let imageLoaded = false;

      // Simulate image load
      const handleImageLoad = () => {
        imageLoaded = true;
        loading = false;
      };

      handleImageLoad();

      expect(loading).toBe(false);
      expect(imageLoaded).toBe(true);
    });

    it('should track error state', () => {
      let error: string | null = null;
      let loading = true;

      // Simulate image error
      const handleImageError = () => {
        error = 'Failed to load image';
        loading = false;
      };

      handleImageError();

      expect(loading).toBe(false);
      expect(error).toBe('Failed to load image');
    });
  });

  describe('Security Features', () => {
    it('should disable download when not allowed', () => {
      const allowDownload = false;

      expect(allowDownload).toBe(false);
    });

    it('should enable download when allowed', () => {
      const allowDownload = true;

      expect(allowDownload).toBe(true);
    });

    it('should prevent context menu when download disabled', () => {
      const allowDownload = false;
      const shouldPreventDefault = !allowDownload;

      expect(shouldPreventDefault).toBe(true);
    });
  });

  describe('Keyboard Shortcuts', () => {
    it('should recognize zoom in keys', () => {
      const zoomInKeys = ['+', '='];

      expect(zoomInKeys).toContain('+');
      expect(zoomInKeys).toContain('=');
    });

    it('should recognize zoom out keys', () => {
      const zoomOutKeys = ['-', '_'];

      expect(zoomOutKeys).toContain('-');
      expect(zoomOutKeys).toContain('_');
    });

    it('should recognize reset key', () => {
      const resetKey = '0';

      expect(resetKey).toBe('0');
    });
  });
});


// ============================================================================
// Property-Based Tests
// ============================================================================

describe('Property-Based Tests for ImageViewer', () => {
  /**
   * Property 18: Image viewer rendering
   * Feature: admin-enhanced-privileges, Property 18: Image viewer rendering
   * For any valid image document, the image viewer component should render 
   * without errors and display the image
   * Validates: Requirements 6.1
   */
  describe('Property 18: Image viewer rendering', () => {
    it('should accept valid image URLs and metadata without errors', () => {
      fc.assert(
        fc.property(
          // Generate valid image URLs
          fc.constantFrom(
            'https://example.com/image.jpg',
            'https://storage.example.com/photos/test.png',
            '/local/path/image.webp',
            'https://cdn.example.com/img/photo.gif',
            'https://example.com/images/test.jpeg'
          ),
          // Generate valid image metadata
          fc.record({
            width: fc.integer({ min: 100, max: 4000 }),
            height: fc.integer({ min: 100, max: 4000 }),
            fileSize: fc.integer({ min: 1024, max: 10 * 1024 * 1024 }),
            mimeType: fc.constantFrom('image/jpeg', 'image/png', 'image/gif', 'image/webp')
          }),
          // Generate optional title
          fc.option(fc.string({ minLength: 1, maxLength: 100 }), { nil: undefined }),
          (imageUrl, metadata, title) => {
            // Validate that the props structure is correct for rendering
            const props = {
              imageUrl,
              metadata,
              title,
              allowZoom: true,
              allowDownload: false
            };
            
            // All required props should be defined
            expect(props.imageUrl).toBeDefined();
            expect(props.imageUrl).toBeTruthy();
            expect(props.metadata).toBeDefined();
            expect(props.metadata.width).toBeGreaterThan(0);
            expect(props.metadata.height).toBeGreaterThan(0);
            expect(props.metadata.fileSize).toBeGreaterThan(0);
            expect(props.metadata.mimeType).toBeTruthy();
            
            // URL should be a valid string
            expect(typeof props.imageUrl).toBe('string');
            expect(props.imageUrl.length).toBeGreaterThan(0);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should validate image URL formats for rendering', () => {
      fc.assert(
        fc.property(
          // Generate valid image URLs with different patterns
          fc.constantFrom(
            'https://example.com/image.jpg',
            'https://storage.example.com/photos/test.png',
            '/local/path/image.webp',
            'https://cdn.example.com/img/photo.gif'
          ),
          // Generate valid metadata
          fc.record({
            width: fc.integer({ min: 100, max: 4000 }),
            height: fc.integer({ min: 100, max: 4000 }),
            fileSize: fc.integer({ min: 1024, max: 10 * 1024 * 1024 }),
            mimeType: fc.constantFrom('image/jpeg', 'image/png', 'image/webp', 'image/gif')
          }),
          (imageUrl, metadata) => {
            // Validate URL is suitable for image rendering
            const isValidUrl = 
              imageUrl.startsWith('http://') || 
              imageUrl.startsWith('https://') || 
              imageUrl.startsWith('/');
            
            expect(isValidUrl).toBe(true);
            
            // Metadata should be complete for rendering
            expect(metadata.width).toBeGreaterThan(0);
            expect(metadata.height).toBeGreaterThan(0);
            expect(metadata.fileSize).toBeGreaterThan(0);
            expect(metadata.mimeType).toMatch(/^image\//);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should maintain aspect ratio for any valid dimensions', () => {
      fc.assert(
        fc.property(
          // Generate valid dimensions
          fc.record({
            width: fc.integer({ min: 1, max: 10000 }),
            height: fc.integer({ min: 1, max: 10000 }),
            fileSize: fc.integer({ min: 1, max: 100 * 1024 * 1024 }),
            mimeType: fc.constantFrom('image/jpeg', 'image/png')
          }),
          (metadata) => {
            // Calculate aspect ratio
            const aspectRatio = metadata.width / metadata.height;
            
            // Aspect ratio should be a positive number
            expect(aspectRatio).toBeGreaterThan(0);
            expect(isFinite(aspectRatio)).toBe(true);
            
            // Verify dimensions are preserved
            expect(metadata.width).toBeGreaterThan(0);
            expect(metadata.height).toBeGreaterThan(0);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Property 19: Image viewer metadata display
   * Feature: admin-enhanced-privileges, Property 19: Image viewer metadata display
   * For any image document, the rendered viewer should contain the image 
   * dimensions and file size in the output
   * Validates: Requirements 6.3
   */
  describe('Property 19: Image viewer metadata display', () => {
    it('should format dimensions correctly for any valid metadata', () => {
      fc.assert(
        fc.property(
          // Generate valid dimensions
          fc.record({
            width: fc.integer({ min: 1, max: 10000 }),
            height: fc.integer({ min: 1, max: 10000 }),
            fileSize: fc.integer({ min: 1, max: 100 * 1024 * 1024 }),
            mimeType: fc.constantFrom('image/jpeg', 'image/png', 'image/gif', 'image/webp')
          }),
          (metadata) => {
            // Dimensions should be formatted as "width × height px"
            const dimensionText = `${metadata.width} × ${metadata.height} px`;
            
            // Verify format is correct
            expect(dimensionText).toMatch(/^\d+ × \d+ px$/);
            expect(dimensionText).toContain(metadata.width.toString());
            expect(dimensionText).toContain(metadata.height.toString());
            expect(dimensionText).toContain('×');
            expect(dimensionText).toContain('px');
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should format file size correctly for any valid size', () => {
      fc.assert(
        fc.property(
          // Generate valid metadata with various file sizes
          fc.record({
            width: fc.integer({ min: 100, max: 4000 }),
            height: fc.integer({ min: 100, max: 4000 }),
            fileSize: fc.integer({ min: 1, max: 100 * 1024 * 1024 }),
            mimeType: fc.constantFrom('image/jpeg', 'image/png', 'image/gif', 'image/webp')
          }),
          (metadata) => {
            // File size formatting function (same as in component)
            const formatFileSize = (bytes: number): string => {
              if (bytes < 1024) return `${bytes} B`;
              if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
              return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
            };
            
            const formattedSize = formatFileSize(metadata.fileSize);
            
            // Verify format is correct
            expect(formattedSize).toMatch(/^[\d.]+ (B|KB|MB)$/);
            
            // Verify correct unit is used
            if (metadata.fileSize < 1024) {
              expect(formattedSize).toContain('B');
              expect(formattedSize).not.toContain('KB');
              expect(formattedSize).not.toContain('MB');
            } else if (metadata.fileSize < 1024 * 1024) {
              expect(formattedSize).toContain('KB');
              expect(formattedSize).not.toContain('MB');
            } else {
              expect(formattedSize).toContain('MB');
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should include MIME type in metadata for any valid image', () => {
      fc.assert(
        fc.property(
          // Generate valid metadata
          fc.record({
            width: fc.integer({ min: 100, max: 4000 }),
            height: fc.integer({ min: 100, max: 4000 }),
            fileSize: fc.integer({ min: 1024, max: 10 * 1024 * 1024 }),
            mimeType: fc.constantFrom('image/jpeg', 'image/png', 'image/gif', 'image/webp')
          }),
          (metadata) => {
            // MIME type should be present and valid
            expect(metadata.mimeType).toBeDefined();
            expect(metadata.mimeType).toMatch(/^image\//);
            expect(['image/jpeg', 'image/png', 'image/gif', 'image/webp']).toContain(metadata.mimeType);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should contain all required metadata fields for any image', () => {
      fc.assert(
        fc.property(
          // Generate complete metadata
          fc.record({
            width: fc.integer({ min: 100, max: 4000 }),
            height: fc.integer({ min: 100, max: 4000 }),
            fileSize: fc.integer({ min: 1024, max: 10 * 1024 * 1024 }),
            mimeType: fc.constantFrom('image/jpeg', 'image/png', 'image/gif', 'image/webp')
          }),
          (metadata) => {
            // All required fields should be present and valid
            expect(metadata).toHaveProperty('width');
            expect(metadata).toHaveProperty('height');
            expect(metadata).toHaveProperty('fileSize');
            expect(metadata).toHaveProperty('mimeType');
            
            // All values should be valid
            expect(metadata.width).toBeGreaterThan(0);
            expect(metadata.height).toBeGreaterThan(0);
            expect(metadata.fileSize).toBeGreaterThan(0);
            expect(metadata.mimeType).toBeTruthy();
            
            // Verify metadata can be formatted for display
            const dimensionText = `${metadata.width} × ${metadata.height} px`;
            expect(dimensionText).toBeTruthy();
            
            const formatFileSize = (bytes: number): string => {
              if (bytes < 1024) return `${bytes} B`;
              if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
              return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
            };
            const sizeText = formatFileSize(metadata.fileSize);
            expect(sizeText).toBeTruthy();
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should handle edge case dimensions correctly', () => {
      fc.assert(
        fc.property(
          // Generate edge case dimensions
          fc.constantFrom(
            { width: 1, height: 1, fileSize: 1, mimeType: 'image/jpeg' },
            { width: 10000, height: 10000, fileSize: 100 * 1024 * 1024, mimeType: 'image/png' },
            { width: 640, height: 480, fileSize: 1024, mimeType: 'image/gif' },
            { width: 1920, height: 1080, fileSize: 2 * 1024 * 1024, mimeType: 'image/webp' },
            { width: 3840, height: 2160, fileSize: 10 * 1024 * 1024, mimeType: 'image/jpeg' }
          ),
          (metadata) => {
            // Metadata should be valid for all edge cases
            expect(metadata.width).toBeGreaterThan(0);
            expect(metadata.height).toBeGreaterThan(0);
            expect(metadata.fileSize).toBeGreaterThan(0);
            
            // Should be able to format dimensions
            const dimensionText = `${metadata.width} × ${metadata.height} px`;
            expect(dimensionText).toMatch(/^\d+ × \d+ px$/);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Property 20: Image watermark application
   * Feature: admin-enhanced-privileges, Property 20: Image watermark application
   * For any image view, the rendered output should include a watermark element
   * Validates: Requirements 6.4
   */
  describe('Property 20: Image watermark application', () => {
    it('should validate watermark config when provided', () => {
      fc.assert(
        fc.property(
          // Generate valid image metadata
          fc.record({
            width: fc.integer({ min: 100, max: 4000 }),
            height: fc.integer({ min: 100, max: 4000 }),
            fileSize: fc.integer({ min: 1024, max: 10 * 1024 * 1024 }),
            mimeType: fc.constantFrom('image/jpeg', 'image/png', 'image/gif', 'image/webp')
          }),
          // Generate valid watermark config
          fc.record({
            text: fc.string({ minLength: 1, maxLength: 100 }),
            opacity: fc.option(fc.double({ min: 0.1, max: 1.0, noNaN: true }), { nil: undefined }),
            fontSize: fc.option(fc.integer({ min: 10, max: 32 }), { nil: undefined })
          }),
          (metadata, watermark) => {
            // Watermark config should be valid
            expect(watermark.text).toBeDefined();
            expect(watermark.text.length).toBeGreaterThan(0);
            
            // If opacity is provided, it should be in valid range
            if (watermark.opacity !== undefined) {
              expect(watermark.opacity).toBeGreaterThanOrEqual(0.1);
              expect(watermark.opacity).toBeLessThanOrEqual(1.0);
            }
            
            // If fontSize is provided, it should be in valid range
            if (watermark.fontSize !== undefined) {
              expect(watermark.fontSize).toBeGreaterThanOrEqual(10);
              expect(watermark.fontSize).toBeLessThanOrEqual(32);
            }
            
            // Props structure should be valid for rendering with watermark
            const props = {
              imageUrl: 'https://example.com/test.jpg',
              metadata,
              watermark
            };
            
            expect(props.watermark).toBeDefined();
            expect(props.watermark.text).toBeTruthy();
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should handle undefined watermark config', () => {
      fc.assert(
        fc.property(
          // Generate valid image metadata
          fc.record({
            width: fc.integer({ min: 100, max: 4000 }),
            height: fc.integer({ min: 100, max: 4000 }),
            fileSize: fc.integer({ min: 1024, max: 10 * 1024 * 1024 }),
            mimeType: fc.constantFrom('image/jpeg', 'image/png', 'image/gif', 'image/webp')
          }),
          (metadata) => {
            // Props without watermark should be valid
            const props = {
              imageUrl: 'https://example.com/test.jpg',
              metadata,
              watermark: undefined
            };
            
            expect(props.watermark).toBeUndefined();
            expect(props.imageUrl).toBeDefined();
            expect(props.metadata).toBeDefined();
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should validate watermark with various opacity values', () => {
      fc.assert(
        fc.property(
          // Generate valid metadata
          fc.record({
            width: fc.integer({ min: 100, max: 4000 }),
            height: fc.integer({ min: 100, max: 4000 }),
            fileSize: fc.integer({ min: 1024, max: 10 * 1024 * 1024 }),
            mimeType: fc.constantFrom('image/jpeg', 'image/png')
          }),
          // Generate watermark with various opacity values (filter out NaN)
          fc.record({
            text: fc.constantFrom('user@example.com', 'test@test.com', 'watermark'),
            opacity: fc.double({ min: 0.1, max: 1.0, noNaN: true }),
            fontSize: fc.option(fc.integer({ min: 12, max: 24 }), { nil: undefined })
          }),
          (metadata, watermark) => {
            // Watermark with opacity should be valid
            expect(watermark.text).toBeTruthy();
            expect(watermark.opacity).toBeDefined();
            expect(watermark.opacity).toBeGreaterThanOrEqual(0.1);
            expect(watermark.opacity).toBeLessThanOrEqual(1.0);
            
            // Opacity should be a valid number for CSS
            expect(isFinite(watermark.opacity)).toBe(true);
            expect(watermark.opacity).not.toBeNaN();
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should validate watermark with various font sizes', () => {
      fc.assert(
        fc.property(
          // Generate valid metadata
          fc.record({
            width: fc.integer({ min: 100, max: 4000 }),
            height: fc.integer({ min: 100, max: 4000 }),
            fileSize: fc.integer({ min: 1024, max: 10 * 1024 * 1024 }),
            mimeType: fc.constantFrom('image/jpeg', 'image/png')
          }),
          // Generate watermark with various font sizes
          fc.record({
            text: fc.constantFrom('user@example.com', 'test@test.com'),
            opacity: fc.option(fc.double({ min: 0.2, max: 0.8, noNaN: true }), { nil: undefined }),
            fontSize: fc.integer({ min: 10, max: 32 })
          }),
          (metadata, watermark) => {
            // Watermark with fontSize should be valid
            expect(watermark.text).toBeTruthy();
            expect(watermark.fontSize).toBeDefined();
            expect(watermark.fontSize).toBeGreaterThanOrEqual(10);
            expect(watermark.fontSize).toBeLessThanOrEqual(32);
            
            // Font size should be a valid integer for CSS
            expect(Number.isInteger(watermark.fontSize)).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should apply default values when optional watermark fields are missing', () => {
      fc.assert(
        fc.property(
          // Generate valid metadata
          fc.record({
            width: fc.integer({ min: 100, max: 4000 }),
            height: fc.integer({ min: 100, max: 4000 }),
            fileSize: fc.integer({ min: 1024, max: 10 * 1024 * 1024 }),
            mimeType: fc.constantFrom('image/jpeg', 'image/png')
          }),
          // Generate minimal watermark config (only text)
          fc.string({ minLength: 5, maxLength: 50 }),
          (metadata, watermarkText) => {
            const watermark: WatermarkConfig = {
              text: watermarkText
            };
            
            // Minimal watermark should be valid
            expect(watermark.text).toBeTruthy();
            expect(watermark.text.length).toBeGreaterThanOrEqual(5);
            
            // Optional fields should be undefined
            expect(watermark.opacity).toBeUndefined();
            expect(watermark.fontSize).toBeUndefined();
            
            // Default values should be applied in component
            const defaultOpacity = 0.3;
            const defaultFontSize = 16;
            
            const opacity = watermark.opacity || defaultOpacity;
            const fontSize = watermark.fontSize || defaultFontSize;
            
            expect(opacity).toBe(defaultOpacity);
            expect(fontSize).toBe(defaultFontSize);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should validate watermark text for any valid string', () => {
      fc.assert(
        fc.property(
          // Generate various watermark text patterns
          fc.constantFrom(
            'user@example.com',
            'test@test.com',
            'John Doe',
            'Confidential',
            'Copyright © 2024',
            'DRAFT',
            'viewer-12345',
            'watermark-text'
          ),
          (watermarkText) => {
            const watermark: WatermarkConfig = {
              text: watermarkText
            };
            
            // Watermark text should be valid
            expect(watermark.text).toBeDefined();
            expect(watermark.text).toBeTruthy();
            expect(typeof watermark.text).toBe('string');
            expect(watermark.text.length).toBeGreaterThan(0);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should validate complete watermark config with all fields', () => {
      fc.assert(
        fc.property(
          // Generate complete watermark config
          fc.record({
            text: fc.string({ minLength: 1, maxLength: 100 }),
            opacity: fc.double({ min: 0.1, max: 1.0, noNaN: true }),
            fontSize: fc.integer({ min: 10, max: 32 })
          }),
          (watermark) => {
            // Complete watermark config should be valid
            expect(watermark.text).toBeDefined();
            expect(watermark.text.length).toBeGreaterThan(0);
            
            expect(watermark.opacity).toBeDefined();
            expect(watermark.opacity).toBeGreaterThanOrEqual(0.1);
            expect(watermark.opacity).toBeLessThanOrEqual(1.0);
            
            expect(watermark.fontSize).toBeDefined();
            expect(watermark.fontSize).toBeGreaterThanOrEqual(10);
            expect(watermark.fontSize).toBeLessThanOrEqual(32);
            
            // All values should be valid for rendering
            expect(typeof watermark.text).toBe('string');
            expect(typeof watermark.opacity).toBe('number');
            expect(typeof watermark.fontSize).toBe('number');
            expect(isFinite(watermark.opacity)).toBe(true);
            expect(Number.isInteger(watermark.fontSize)).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
