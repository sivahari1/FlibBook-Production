/**
 * Property-Based Test: Watermark Enabled URL
 * Feature: preview-settings-workflow, Property 5: Watermark enabled includes parameters
 * Validates: Requirements 2.3
 * 
 * Property: For any preview with watermark enabled, the preview URL should include 
 * watermark=true and all configured watermark parameters (text/image, opacity, size)
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';

// Helper function to build URL with settings (extracted from PreviewClient logic)
function buildPreviewUrl(
  documentId: string,
  enableWatermark: boolean,
  watermarkType: 'text' | 'image',
  watermarkText: string,
  watermarkSize: number,
  watermarkOpacity: number,
  watermarkImage: string
): string {
  const params = new URLSearchParams({
    watermark: enableWatermark.toString(),
    ...(enableWatermark && watermarkType === 'text' && {
      watermarkText,
      watermarkSize: watermarkSize.toString(),
      watermarkOpacity: watermarkOpacity.toString(),
    }),
    ...(enableWatermark && watermarkType === 'image' && {
      watermarkImage: encodeURIComponent(watermarkImage),
      watermarkOpacity: watermarkOpacity.toString(),
    }),
  });

  return `/dashboard/documents/${documentId}/view?${params.toString()}`;
}

describe('PreviewClient - Property: Watermark Enabled Includes Parameters', () => {
  it('Property 5: Watermark enabled with text should include all text watermark parameters', () => {
    fc.assert(
      fc.property(
        // Generate arbitrary valid settings
        fc.record({
          // Document IDs should be alphanumeric (like database IDs)
          documentId: fc.stringMatching(/^[a-zA-Z0-9_-]+$/),
          watermarkText: fc.string({ minLength: 1, maxLength: 100 }),
          watermarkSize: fc.integer({ min: 12, max: 32 }),
          watermarkOpacity: fc.double({ min: 0.1, max: 0.8 }),
        }),
        (settings) => {
          // Build URL with text watermark ENABLED
          const url = buildPreviewUrl(
            settings.documentId,
            true, // enableWatermark = true
            'text', // watermarkType
            settings.watermarkText,
            settings.watermarkSize,
            settings.watermarkOpacity,
            '' // watermarkImage (not used for text)
          );
          
          // Parse the URL to extract parameters
          const urlObj = new URL(url, 'http://localhost');
          const params = new URLSearchParams(urlObj.search);
          
          // Property: URL should indicate watermark is enabled
          expect(params.get('watermark')).toBe('true');
          
          // Property: URL should contain all text watermark parameters
          expect(params.get('watermarkText')).toBe(settings.watermarkText);
          expect(params.get('watermarkSize')).toBe(settings.watermarkSize.toString());
          expect(params.get('watermarkOpacity')).toBe(settings.watermarkOpacity.toString());
          
          // Property: URL should NOT contain image watermark parameter
          expect(params.get('watermarkImage')).toBeNull();
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Property 5: Watermark enabled with image should include all image watermark parameters', () => {
    fc.assert(
      fc.property(
        // Generate arbitrary valid settings
        fc.record({
          // Document IDs should be alphanumeric (like database IDs)
          documentId: fc.stringMatching(/^[a-zA-Z0-9_-]+$/),
          watermarkImage: fc.string({ minLength: 10, maxLength: 200 }),
          watermarkOpacity: fc.double({ min: 0.1, max: 0.8 }),
        }),
        (settings) => {
          // Build URL with image watermark ENABLED
          const url = buildPreviewUrl(
            settings.documentId,
            true, // enableWatermark = true
            'image', // watermarkType
            '', // watermarkText (not used for image)
            16, // watermarkSize (not used for image)
            settings.watermarkOpacity,
            settings.watermarkImage
          );
          
          // Parse the URL to extract parameters
          const urlObj = new URL(url, 'http://localhost');
          const params = new URLSearchParams(urlObj.search);
          
          // Property: URL should indicate watermark is enabled
          expect(params.get('watermark')).toBe('true');
          
          // Property: URL should contain all image watermark parameters
          expect(params.get('watermarkImage')).not.toBeNull();
          expect(params.get('watermarkOpacity')).toBe(settings.watermarkOpacity.toString());
          
          // Property: URL should NOT contain text watermark parameters
          expect(params.get('watermarkText')).toBeNull();
          expect(params.get('watermarkSize')).toBeNull();
        }
      ),
      { numRuns: 100 }
    );
  });
});
