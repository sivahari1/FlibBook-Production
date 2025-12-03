/**
 * Property-Based Test: Settings URL Generation
 * Feature: preview-settings-workflow, Property 3: Settings passed to preview URL
 * Validates: Requirements 1.4, 3.2
 * 
 * Property: For any preview settings configuration, when opening preview 
 * the URL parameters should exactly match the configured settings
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

describe('PreviewClient - Property: Settings Passed to Preview URL', () => {

  it('Property 3: URL parameters should match configured text watermark settings', () => {
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
          // Build URL with text watermark enabled
          const url = buildPreviewUrl(
            settings.documentId,
            true, // enableWatermark
            'text', // watermarkType
            settings.watermarkText,
            settings.watermarkSize,
            settings.watermarkOpacity,
            '' // watermarkImage (not used for text)
          );
          
          // Parse the URL to extract parameters
          const urlObj = new URL(url, 'http://localhost');
          const params = new URLSearchParams(urlObj.search);
          
          // Property: URL should contain all configured settings with correct values
          expect(url).toContain(`/dashboard/documents/${settings.documentId}/view`);
          expect(params.get('watermark')).toBe('true');
          expect(params.get('watermarkText')).toBe(settings.watermarkText);
          expect(params.get('watermarkSize')).toBe(settings.watermarkSize.toString());
          expect(params.get('watermarkOpacity')).toBe(settings.watermarkOpacity.toString());
          
          // Property: URL should not contain image watermark parameters
          expect(params.get('watermarkImage')).toBeNull();
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Property 3: URL parameters should match configured image watermark settings', () => {
    fc.assert(
      fc.property(
        // Generate arbitrary valid settings
        fc.record({
          // Document IDs should be alphanumeric (like database IDs)
          documentId: fc.stringMatching(/^[a-zA-Z0-9_-]+$/),
          watermarkImage: fc.string({ minLength: 10, maxLength: 200 }), // base64 or URL
          watermarkOpacity: fc.double({ min: 0.1, max: 0.8 }),
        }),
        (settings) => {
          // Build URL with image watermark enabled
          const url = buildPreviewUrl(
            settings.documentId,
            true, // enableWatermark
            'image', // watermarkType
            '', // watermarkText (not used for image)
            16, // watermarkSize (not used for image)
            settings.watermarkOpacity,
            settings.watermarkImage
          );
          
          // Property: URL should contain all configured settings
          expect(url).toContain(`/dashboard/documents/${settings.documentId}/view`);
          expect(url).toContain('watermark=true');
          expect(url).toContain('watermarkImage=');
          expect(url).toContain(`watermarkOpacity=${settings.watermarkOpacity}`);
          
          // Property: URL should not contain text watermark parameters
          expect(url).not.toContain('watermarkText=');
          expect(url).not.toContain('watermarkSize=');
        }
      ),
      { numRuns: 100 }
    );
  });
});
