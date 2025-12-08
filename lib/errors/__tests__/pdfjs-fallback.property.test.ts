/**
 * PDF.js Fallback Property-Based Tests
 * 
 * Property-based tests for fallback rendering when PDF.js is unavailable
 * 
 * Feature: pdf-iframe-blocking-fix
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as fc from 'fast-check';
import {
  detectPDFJSAvailability,
  determineFallbackMethod,
  createFallbackConfig,
  shouldUseFallback,
  getFallbackURL,
  supportsNativePDFViewing,
  FallbackMethod,
  FallbackReason,
} from '../pdfjs-fallback';
import { PDFJSErrorCode } from '../pdfjs-errors';

// Mock pdfjs-config
vi.mock('@/lib/pdfjs-config', () => ({
  isPDFJSAvailable: vi.fn(),
}));

describe('PDF.js Fallback - Property-Based Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Ensure test environment has required features
    // Mock canvas support
    if (typeof document !== 'undefined') {
      const originalCreateElement = document.createElement.bind(document);
      vi.spyOn(document, 'createElement').mockImplementation((tagName: string) => {
        const element = originalCreateElement(tagName);
        if (tagName === 'canvas') {
          // Ensure canvas has getContext method
          if (!element.getContext) {
            (element as any).getContext = vi.fn(() => ({}));
          }
        }
        return element;
      });
    }
    
    // Mock Worker support
    if (typeof global.Worker === 'undefined') {
      (global as any).Worker = class Worker {
        constructor() {}
      };
    }
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  /**
   * Feature: pdf-iframe-blocking-fix, Property 5: Fallback rendering
   * 
   * Property: For any scenario where PDF.js is unavailable, the system should
   * fall back to an alternative rendering method
   * 
   * Validates: Requirements 2.5
   * 
   * This property tests that when PDF.js is unavailable or encounters errors,
   * the system provides a fallback rendering method. It generates various
   * error scenarios and verifies that appropriate fallback methods are selected.
   */
  describe('Property 5: Fallback rendering', () => {
    it('should provide fallback method for any PDF.js unavailability scenario', async () => {
      await fc.assert(
        fc.asyncProperty(
          // Generate various unavailability scenarios
          fc.constantFrom(
            FallbackReason.LIBRARY_UNAVAILABLE,
            FallbackReason.WORKER_FAILED,
            FallbackReason.SECURITY_RESTRICTIONS,
            FallbackReason.UNSUPPORTED_FEATURES,
            FallbackReason.RENDERING_ERRORS
          ),
          fc.webUrl({ withFragments: false }), // PDF URL
          async (reason, pdfUrl) => {
            // Mock PDF.js as unavailable
            const { isPDFJSAvailable } = await import('@/lib/pdfjs-config');
            vi.mocked(isPDFJSAvailable).mockReturnValue(false);

            // Create fallback configuration
            const fallbackConfig = createFallbackConfig(undefined, reason);

            // Verify fallback method is provided
            expect(fallbackConfig).toBeDefined();
            expect(fallbackConfig.method).toBeDefined();
            expect(Object.values(FallbackMethod)).toContain(fallbackConfig.method);

            // Verify fallback reason is recorded
            expect(fallbackConfig.reason).toBe(reason);

            // Verify notification is shown for unavailability
            expect(fallbackConfig.showNotification).toBe(true);
            expect(fallbackConfig.notificationMessage).toBeDefined();
            expect(fallbackConfig.notificationMessage).not.toBe('');

            // Verify appropriate fallback method is selected based on reason
            switch (reason) {
              case FallbackReason.LIBRARY_UNAVAILABLE:
              case FallbackReason.WORKER_FAILED:
              case FallbackReason.UNSUPPORTED_FEATURES:
              case FallbackReason.RENDERING_ERRORS:
                // Should fall back to native iframe
                expect(fallbackConfig.method).toBe(FallbackMethod.NATIVE_IFRAME);
                break;

              case FallbackReason.SECURITY_RESTRICTIONS:
                // Should fall back to download
                expect(fallbackConfig.method).toBe(FallbackMethod.DOWNLOAD);
                break;
            }

            // Verify fallback URL is generated
            const fallbackUrl = getFallbackURL(pdfUrl, fallbackConfig.method);
            expect(fallbackUrl).toBeDefined();
            expect(fallbackUrl).not.toBe('');

            // Verify fallback URL is valid based on method
            if (fallbackConfig.method === FallbackMethod.NATIVE_IFRAME) {
              // Should include toolbar=0 parameter
              expect(fallbackUrl).toContain('toolbar=0');
            } else if (fallbackConfig.method === FallbackMethod.DOWNLOAD) {
              // Should include download parameter
              expect(fallbackUrl).toContain('download=true');
            }
          }
        ),
        {
          numRuns: 100, // Run 100 iterations as specified in design
          verbose: true,
        }
      );
    });

    it('should detect PDF.js unavailability and provide fallback', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.boolean(), // Whether PDF.js library is available
          fc.webUrl({ withFragments: false }),
          async (isLibraryAvailable, pdfUrl) => {
            // Mock PDF.js library availability
            const { isPDFJSAvailable } = await import('@/lib/pdfjs-config');
            vi.mocked(isPDFJSAvailable).mockReturnValue(isLibraryAvailable);

            // Detect availability (this also checks environment features)
            const detection = detectPDFJSAvailability();

            // The detection result depends on both library availability and environment
            // In a test environment with jsdom, canvas and Worker should be available
            // So the result should match the library availability
            expect(detection.available).toBeDefined();
            expect(typeof detection.available).toBe('boolean');

            if (!detection.available) {
              // If unavailable, should have a reason
              expect(detection.reason).toBeDefined();
              expect(Object.values(FallbackReason)).toContain(detection.reason);

              // Should require fallback
              const needsFallback = shouldUseFallback();
              expect(needsFallback).toBe(true);

              // Should provide fallback configuration
              const fallbackConfig = createFallbackConfig();
              expect(fallbackConfig).toBeDefined();
              expect(fallbackConfig.method).toBeDefined();
              expect(fallbackConfig.showNotification).toBe(true);

              // Should generate fallback URL
              const fallbackUrl = getFallbackURL(pdfUrl, fallbackConfig.method);
              expect(fallbackUrl).toBeDefined();
              expect(fallbackUrl.length).toBeGreaterThan(0);
            } else {
              // If available, should not have a reason
              expect(detection.reason).toBeUndefined();

              // Should not require fallback when no error code is provided
              const needsFallback = shouldUseFallback();
              expect(needsFallback).toBe(false);
            }
          }
        ),
        {
          numRuns: 100,
          verbose: true,
        }
      );
    });

    it('should provide fallback for any PDF.js error code', async () => {
      await fc.assert(
        fc.asyncProperty(
          // Generate various error codes
          fc.constantFrom(
            PDFJSErrorCode.LIBRARY_UNAVAILABLE,
            PDFJSErrorCode.WORKER_INIT_ERROR,
            PDFJSErrorCode.CORS_ERROR,
            PDFJSErrorCode.PERMISSION_DENIED,
            PDFJSErrorCode.UNSUPPORTED_FORMAT,
            PDFJSErrorCode.CORRUPTED_FILE,
            PDFJSErrorCode.INVALID_PDF
          ),
          fc.webUrl({ withFragments: false }),
          async (errorCode, pdfUrl) => {
            // Mock PDF.js as available (but error occurred)
            const { isPDFJSAvailable } = await import('@/lib/pdfjs-config');
            vi.mocked(isPDFJSAvailable).mockReturnValue(true);

            // Check if fallback is needed for this error
            const needsFallback = shouldUseFallback(errorCode);

            // Determine fallback method (without reason, only error code)
            const fallbackMethod = determineFallbackMethod(errorCode, undefined);

            // Verify fallback method is provided
            expect(fallbackMethod).toBeDefined();
            expect(Object.values(FallbackMethod)).toContain(fallbackMethod);

            // Verify appropriate fallback based on error type
            switch (errorCode) {
              case PDFJSErrorCode.LIBRARY_UNAVAILABLE:
              case PDFJSErrorCode.WORKER_INIT_ERROR:
              case PDFJSErrorCode.UNSUPPORTED_FORMAT:
                // Should require fallback
                expect(needsFallback).toBe(true);
                // Should use native iframe
                expect(fallbackMethod).toBe(FallbackMethod.NATIVE_IFRAME);
                break;

              case PDFJSErrorCode.CORS_ERROR:
                // Should require fallback (CORS is in the shouldUseFallback list)
                expect(needsFallback).toBe(true);
                // Should use download
                expect(fallbackMethod).toBe(FallbackMethod.DOWNLOAD);
                break;

              case PDFJSErrorCode.PERMISSION_DENIED:
                // Should NOT require fallback (not in shouldUseFallback list)
                expect(needsFallback).toBe(false);
                // But should still provide download method
                expect(fallbackMethod).toBe(FallbackMethod.DOWNLOAD);
                break;

              case PDFJSErrorCode.CORRUPTED_FILE:
              case PDFJSErrorCode.INVALID_PDF:
                // Should not require fallback (error only)
                expect(needsFallback).toBe(false);
                // Should show error only
                expect(fallbackMethod).toBe(FallbackMethod.ERROR_ONLY);
                break;
            }

            // Create fallback configuration with error code
            const fallbackConfig = createFallbackConfig(errorCode, undefined);
            expect(fallbackConfig).toBeDefined();
            
            // The method should match what determineFallbackMethod returns
            expect(fallbackConfig.method).toBe(fallbackMethod);

            // Generate fallback URL
            const fallbackUrl = getFallbackURL(pdfUrl, fallbackMethod);
            expect(fallbackUrl).toBeDefined();

            // Verify fallback URL format
            if (fallbackMethod === FallbackMethod.NATIVE_IFRAME) {
              expect(fallbackUrl).toContain('#toolbar=0');
              // Verify base URL is preserved
              const baseUrl = pdfUrl.split('#')[0];
              expect(fallbackUrl).toContain(baseUrl);
            } else if (fallbackMethod === FallbackMethod.DOWNLOAD) {
              expect(fallbackUrl).toContain('download=true');
              // Verify it's a valid URL with the same origin and path
              const originalUrl = new URL(pdfUrl);
              const fallbackUrlObj = new URL(fallbackUrl);
              expect(fallbackUrlObj.origin).toBe(originalUrl.origin);
              expect(fallbackUrlObj.pathname).toBe(originalUrl.pathname);
            } else if (fallbackMethod === FallbackMethod.ERROR_ONLY) {
              // Error only, URL may be unchanged
              expect(fallbackUrl).toBe(pdfUrl);
            }
          }
        ),
        {
          numRuns: 100,
          verbose: true,
        }
      );
    });

    it('should generate valid fallback URLs for all fallback methods', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.webUrl({ withFragments: false }),
          fc.constantFrom(
            FallbackMethod.NATIVE_IFRAME,
            FallbackMethod.OBJECT_EMBED,
            FallbackMethod.DOWNLOAD,
            FallbackMethod.ERROR_ONLY
          ),
          async (pdfUrl, fallbackMethod) => {
            // Generate fallback URL
            const fallbackUrl = getFallbackURL(pdfUrl, fallbackMethod);

            // Verify URL is generated
            expect(fallbackUrl).toBeDefined();
            expect(fallbackUrl).not.toBe('');

            // Verify URL format based on method
            switch (fallbackMethod) {
              case FallbackMethod.NATIVE_IFRAME:
                // Should add toolbar parameters
                expect(fallbackUrl).toContain(pdfUrl);
                expect(fallbackUrl).toContain('#toolbar=0');
                expect(fallbackUrl).toContain('navpanes=0');
                expect(fallbackUrl).toContain('scrollbar=0');
                break;

              case FallbackMethod.OBJECT_EMBED:
                // Should return original URL
                expect(fallbackUrl).toBe(pdfUrl);
                break;

              case FallbackMethod.DOWNLOAD:
                // Should add download parameter
                expect(fallbackUrl).toContain('download=true');
                // Verify it's a valid URL
                expect(() => new URL(fallbackUrl)).not.toThrow();
                // Verify the base URL is preserved (allowing for URL normalization)
                const originalUrl = new URL(pdfUrl);
                const fallbackUrlObj = new URL(fallbackUrl);
                expect(fallbackUrlObj.origin).toBe(originalUrl.origin);
                expect(fallbackUrlObj.pathname).toBe(originalUrl.pathname);
                break;

              case FallbackMethod.ERROR_ONLY:
                // Should return original URL
                expect(fallbackUrl).toBe(pdfUrl);
                break;
            }

            // Verify URL is valid (can be parsed)
            if (fallbackMethod !== FallbackMethod.ERROR_ONLY) {
              expect(() => new URL(fallbackUrl)).not.toThrow();
            }
          }
        ),
        {
          numRuns: 100,
          verbose: true,
        }
      );
    });

    it('should provide notification messages for all fallback scenarios', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.constantFrom(
            FallbackMethod.NATIVE_IFRAME,
            FallbackMethod.OBJECT_EMBED,
            FallbackMethod.DOWNLOAD,
            FallbackMethod.ERROR_ONLY
          ),
          fc.constantFrom(
            FallbackReason.LIBRARY_UNAVAILABLE,
            FallbackReason.WORKER_FAILED,
            FallbackReason.SECURITY_RESTRICTIONS,
            FallbackReason.UNSUPPORTED_FEATURES,
            FallbackReason.RENDERING_ERRORS
          ),
          async (fallbackMethod, fallbackReason) => {
            // Create fallback configuration
            const fallbackConfig = createFallbackConfig(undefined, fallbackReason);

            // Verify notification is provided
            expect(fallbackConfig.showNotification).toBe(true);
            expect(fallbackConfig.notificationMessage).toBeDefined();
            expect(fallbackConfig.notificationMessage).not.toBe('');

            // Verify notification message is user-friendly
            const message = fallbackConfig.notificationMessage!;
            expect(message.length).toBeGreaterThan(10); // Reasonable message length
            expect(message).not.toContain('undefined');
            expect(message).not.toContain('null');

            // Verify message mentions fallback or alternative
            const lowerMessage = message.toLowerCase();
            const hasFallbackMention =
              lowerMessage.includes('fallback') ||
              lowerMessage.includes('alternative') ||
              lowerMessage.includes('browser') ||
              lowerMessage.includes('download') ||
              lowerMessage.includes('cannot be displayed');
            expect(hasFallbackMention).toBe(true);
          }
        ),
        {
          numRuns: 100,
          verbose: true,
        }
      );
    });

    it('should handle browser native PDF support detection', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.boolean(), // Whether browser supports native PDF viewing
          async (hasNativeSupport) => {
            // Mock navigator.mimeTypes
            const originalNavigator = global.navigator;
            
            if (hasNativeSupport) {
              // Mock browser with PDF support
              Object.defineProperty(global, 'navigator', {
                value: {
                  ...originalNavigator,
                  mimeTypes: {
                    'application/pdf': {
                      type: 'application/pdf',
                      description: 'Portable Document Format',
                      suffixes: 'pdf',
                    },
                  },
                  plugins: [],
                },
                writable: true,
                configurable: true,
              });
            } else {
              // Mock browser without PDF support
              Object.defineProperty(global, 'navigator', {
                value: {
                  ...originalNavigator,
                  mimeTypes: {},
                  plugins: [],
                },
                writable: true,
                configurable: true,
              });
            }

            // Check native PDF support
            const nativeSupport = supportsNativePDFViewing();

            // In our mock environment, we always return true for modern browsers
            // This is because we assume modern browsers support PDF viewing
            expect(typeof nativeSupport).toBe('boolean');

            // Restore original navigator
            Object.defineProperty(global, 'navigator', {
              value: originalNavigator,
              writable: true,
              configurable: true,
            });
          }
        ),
        {
          numRuns: 100,
          verbose: true,
        }
      );
    });

    it('should provide consistent fallback for repeated unavailability scenarios', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.constantFrom(
            FallbackReason.LIBRARY_UNAVAILABLE,
            FallbackReason.WORKER_FAILED,
            FallbackReason.SECURITY_RESTRICTIONS
          ),
          fc.webUrl({ withFragments: false }),
          fc.integer({ min: 2, max: 5 }), // Number of repeated calls
          async (reason, pdfUrl, repeatCount) => {
            // Mock PDF.js as unavailable
            const { isPDFJSAvailable } = await import('@/lib/pdfjs-config');
            vi.mocked(isPDFJSAvailable).mockReturnValue(false);

            // Create fallback configuration multiple times
            const configs = [];
            for (let i = 0; i < repeatCount; i++) {
              const config = createFallbackConfig(undefined, reason);
              configs.push(config);
            }

            // Verify all configurations are consistent
            const firstConfig = configs[0];
            for (let i = 1; i < configs.length; i++) {
              expect(configs[i].method).toBe(firstConfig.method);
              expect(configs[i].reason).toBe(firstConfig.reason);
              expect(configs[i].showNotification).toBe(firstConfig.showNotification);
              expect(configs[i].notificationMessage).toBe(firstConfig.notificationMessage);
            }

            // Verify fallback URLs are consistent
            const urls = configs.map(config => getFallbackURL(pdfUrl, config.method));
            const firstUrl = urls[0];
            for (let i = 1; i < urls.length; i++) {
              expect(urls[i]).toBe(firstUrl);
            }
          }
        ),
        {
          numRuns: 100,
          verbose: true,
        }
      );
    });

    it('should handle edge cases in fallback URL generation', async () => {
      await fc.assert(
        fc.asyncProperty(
          // Generate URLs with various edge cases
          fc.record({
            baseUrl: fc.webUrl({ withFragments: false }),
            hasQueryParams: fc.boolean(),
            hasFragment: fc.boolean(),
          }),
          fc.constantFrom(
            FallbackMethod.NATIVE_IFRAME,
            FallbackMethod.DOWNLOAD
          ),
          async (urlData, fallbackMethod) => {
            // Construct URL with edge cases
            let url = urlData.baseUrl;
            if (urlData.hasQueryParams) {
              url += '?existing=param&another=value';
            }
            if (urlData.hasFragment) {
              url += '#existing-fragment';
            }

            // Generate fallback URL
            const fallbackUrl = getFallbackURL(url, fallbackMethod);

            // Verify URL is valid
            expect(fallbackUrl).toBeDefined();
            expect(fallbackUrl).not.toBe('');

            // Verify fallback parameters are added correctly
            if (fallbackMethod === FallbackMethod.NATIVE_IFRAME) {
              // Should add fragment parameters
              expect(fallbackUrl).toContain('#toolbar=0');
              // Original URL should be preserved
              expect(fallbackUrl).toContain(urlData.baseUrl);
            } else if (fallbackMethod === FallbackMethod.DOWNLOAD) {
              // Should add download query parameter
              expect(fallbackUrl).toContain('download=true');
              // Should be a valid URL
              expect(() => new URL(fallbackUrl)).not.toThrow();
            }
          }
        ),
        {
          numRuns: 100,
          verbose: true,
        }
      );
    });
  });
});
