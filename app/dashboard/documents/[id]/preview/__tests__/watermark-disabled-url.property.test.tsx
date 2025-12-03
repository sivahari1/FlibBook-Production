/**
 * Property-Based Test: Watermark Disabled URL
 * Feature: preview-settings-workflow, Property 4: Watermark disabled excludes parameters
 * Validates: Requirements 2.2
 * 
 * Property: For any preview with watermark disabled, the preview URL should either 
 * have watermark=false or exclude watermark-related parameters
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

describe('PreviewClient - Property: Watermark Disabled Excludes Parameters', () => {
  it('Property 4: Watermark disabled URL should not include watermark-specific parameters', () => {
    fc.assert(
      fc.property(
        // Generate arbitrary valid settings
        fc.record({
          // Document IDs should be alphanumeric (like database IDs)
          documentId: fc.stringMatching(/^[a-zA-Z0-9_-]+$/),
          // Generate arbitrary watermark settings (which should be ignored)
          watermarkText: fc.string({ minLength: 1, maxLength: 100 }),
          watermarkSize: fc.integer({ min: 12, max: 32 }),
          watermarkOpacity: fc.double({ min: 0.1, max: 0.8 }),
          watermarkImage: fc.string({ minLength: 10, maxLength: 200 }),
        }),
        (settings) => {
          // Build URL with watermark DISABLED
          const url = buildPreviewUrl(
            settings.documentId,
            false, // enableWatermark = false
            'text', // watermarkType (doesn't matter when disabled)
            settings.watermarkText,
            settings.watermarkSize,
            settings.watermarkOpacity,
            settings.watermarkImage
          );
          
          // Parse the URL to extract parameters
          const urlObj = new URL(url, 'http://localhost');
          const params = new URLSearchParams(urlObj.search);
          
          // Property: URL should indicate watermark is disabled
          expect(params.get('watermark')).toBe('false');
          
          // Property: URL should NOT contain watermark-specific parameters
          expect(params.get('watermarkText')).toBeNull();
          expect(params.get('watermarkSize')).toBeNull();
          expect(params.get('watermarkOpacity')).toBeNull();
          expect(params.get('watermarkImage')).toBeNull();
        }
      ),
      { numRuns: 100 }
    );
  });
});
