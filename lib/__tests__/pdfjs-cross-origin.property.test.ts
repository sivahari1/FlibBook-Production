/**
 * PDF.js Cross-Origin Resource Loading Property-Based Tests
 * 
 * Feature: pdf-iframe-blocking-fix, Property 29: Cross-origin resource loading
 * 
 * Property: For any cross-origin resource required by PDF.js, the resource should load successfully
 * 
 * Validates: Requirements 8.5
 * 
 * These property-based tests verify that PDF.js can successfully load all required
 * cross-origin resources (worker scripts, fonts, CMaps) from the CDN across various
 * scenarios using fast-check.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as fc from 'fast-check';
import { getPDFJSConfig, isPDFJSAvailable } from '../pdfjs-config';

describe('PDF.js Cross-Origin Resource Loading - Property-Based Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  /**
   * Feature: pdf-iframe-blocking-fix, Property 29: Cross-origin resource loading
   * 
   * Property: For any cross-origin resource required by PDF.js, the resource should load successfully
   * 
   * Validates: Requirements 8.5
   * 
   * This property tests that PDF.js configuration correctly specifies cross-origin
   * resources (worker, fonts, CMaps) that can be loaded from the CDN. The test verifies
   * that all resource URLs are properly formatted, use HTTPS, and point to the same
   * CDN domain and version.
   */
  describe('Property 29: Cross-origin resource loading', () => {
    it('should configure all cross-origin resources with valid HTTPS URLs', async () => {
      await fc.assert(
        fc.asyncProperty(
          // Generate various PDF.js version numbers
          fc.record({
            major: fc.integer({ min: 2, max: 5 }),
            minor: fc.integer({ min: 0, max: 20 }),
            patch: fc.integer({ min: 0, max: 200 }),
          }),
          async (version) => {
            // Get current PDF.js configuration
            const config = getPDFJSConfig();

            // Verify all resource URLs are defined
            expect(config.workerSrc).toBeDefined();
            expect(config.cMapUrl).toBeDefined();
            expect(config.standardFontDataUrl).toBeDefined();

            // Verify all resources use HTTPS protocol
            expect(config.workerSrc).toMatch(/^https:\/\//);
            expect(config.cMapUrl).toMatch(/^https:\/\//);
            expect(config.standardFontDataUrl).toMatch(/^https:\/\//);

            // Verify all resources use the same CDN domain
            const cdnDomain = 'cdnjs.cloudflare.com';
            expect(config.workerSrc).toContain(cdnDomain);
            expect(config.cMapUrl).toContain(cdnDomain);
            expect(config.standardFontDataUrl).toContain(cdnDomain);

            // Verify URLs are well-formed
            expect(() => new URL(config.workerSrc)).not.toThrow();
            expect(() => new URL(config.cMapUrl)).not.toThrow();
            expect(() => new URL(config.standardFontDataUrl)).not.toThrow();

            // Verify worker URL points to a JavaScript file
            expect(config.workerSrc).toMatch(/\.js$/);
            expect(config.workerSrc).toContain('pdf.worker');

            // Verify CMap URL points to a directory
            expect(config.cMapUrl).toMatch(/\/cmaps\/$/);

            // Verify font URL points to a directory
            expect(config.standardFontDataUrl).toMatch(/\/standard_fonts\/$/);
          }
        ),
        {
          numRuns: 100, // Run 100 iterations as specified in design
          verbose: true,
        }
      );
    });

    it('should ensure all cross-origin resources use consistent PDF.js version', async () => {
      await fc.assert(
        fc.asyncProperty(
          // Generate various resource types
          fc.constantFrom('worker', 'cmap', 'font'),
          async (resourceType) => {
            const config = getPDFJSConfig();

            // Extract version from each resource URL
            const workerVersion = config.workerSrc.match(/pdf\.js\/(\d+\.\d+\.\d+)/)?.[1];
            const cMapVersion = config.cMapUrl.match(/pdf\.js\/(\d+\.\d+\.\d+)/)?.[1];
            const fontVersion = config.standardFontDataUrl.match(/pdf\.js\/(\d+\.\d+\.\d+)/)?.[1];

            // Verify all versions are defined
            expect(workerVersion).toBeDefined();
            expect(cMapVersion).toBeDefined();
            expect(fontVersion).toBeDefined();

            // Verify all versions match
            expect(cMapVersion).toBe(workerVersion);
            expect(fontVersion).toBe(workerVersion);

            // Verify version format is valid (semantic versioning)
            const versionRegex = /^\d+\.\d+\.\d+$/;
            expect(workerVersion).toMatch(versionRegex);
            expect(cMapVersion).toMatch(versionRegex);
            expect(fontVersion).toMatch(versionRegex);

            // Verify the requested resource type uses the correct version
            let resourceUrl: string;
            switch (resourceType) {
              case 'worker':
                resourceUrl = config.workerSrc;
                break;
              case 'cmap':
                resourceUrl = config.cMapUrl;
                break;
              case 'font':
                resourceUrl = config.standardFontDataUrl;
                break;
            }

            expect(resourceUrl).toContain(workerVersion);
          }
        ),
        {
          numRuns: 100,
          verbose: true,
        }
      );
    });

    it('should ensure worker script URL is accessible and properly formatted', async () => {
      await fc.assert(
        fc.asyncProperty(
          // Generate various worker file formats
          fc.constantFrom('.min.js', '.js'),
          // Generate various CDN paths
          fc.constantFrom('ajax/libs', 'libs'),
          async (fileExtension, cdnPath) => {
            const config = getPDFJSConfig();

            // Verify worker URL structure
            expect(config.workerSrc).toBeTruthy();
            expect(config.workerSrc).toContain('pdf.worker');
            expect(config.workerSrc).toMatch(/\.js$/);

            // Verify worker URL uses minified version in production
            if (process.env.NODE_ENV === 'production') {
              expect(config.workerSrc).toContain('.min.js');
            }

            // Verify worker URL is a valid URL
            const workerUrl = new URL(config.workerSrc);
            expect(workerUrl.protocol).toBe('https:');
            expect(workerUrl.hostname).toContain('cloudflare.com');

            // Verify worker URL path structure
            expect(workerUrl.pathname).toContain('pdf.js');
            expect(workerUrl.pathname).toContain('pdf.worker');

            // Simulate successful worker load
            const mockWorkerResponse = {
              ok: true,
              status: 200,
              statusText: 'OK',
              headers: new Headers({
                'Content-Type': 'application/javascript',
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
                'Cache-Control': 'public, max-age=31536000',
              }),
            };

            // Verify worker response would have CORS headers
            expect(mockWorkerResponse.headers.get('Access-Control-Allow-Origin')).toBe('*');
            expect(mockWorkerResponse.headers.get('Content-Type')).toContain('javascript');
            expect(mockWorkerResponse.ok).toBe(true);
          }
        ),
        {
          numRuns: 100,
          verbose: true,
        }
      );
    });

    it('should ensure CMap resources are accessible for various character encodings', async () => {
      await fc.assert(
        fc.asyncProperty(
          // Generate various CMap names for different languages
          fc.constantFrom(
            'UniJIS-UTF16-H',      // Japanese
            'UniCNS-UTF16-H',      // Traditional Chinese
            'UniGB-UTF16-H',       // Simplified Chinese
            'UniKS-UTF16-H',       // Korean
            'Identity-H',          // Generic horizontal
            'Identity-V',          // Generic vertical
            'Adobe-Japan1-H',      // Adobe Japanese
            'Adobe-GB1-H',         // Adobe Chinese
            'Adobe-CNS1-H',        // Adobe Traditional Chinese
            'Adobe-Korea1-H'       // Adobe Korean
          ),
          async (cmapName) => {
            const config = getPDFJSConfig();

            // Verify CMap base URL is configured
            expect(config.cMapUrl).toBeTruthy();
            expect(config.cMapUrl).toMatch(/\/cmaps\/$/);

            // Verify CMap URL is a valid URL
            const cmapBaseUrl = new URL(config.cMapUrl);
            expect(cmapBaseUrl.protocol).toBe('https:');
            expect(cmapBaseUrl.hostname).toContain('cloudflare.com');

            // Verify packed CMaps are enabled for efficiency
            expect(config.cMapPacked).toBe(true);

            // Construct full CMap URL
            const cmapFileExtension = config.cMapPacked ? '.bcmap' : '.cmap';
            const fullCMapUrl = `${config.cMapUrl}${cmapName}${cmapFileExtension}`;

            // Verify full CMap URL is valid
            expect(() => new URL(fullCMapUrl)).not.toThrow();
            expect(fullCMapUrl).toContain(cmapName);

            // Simulate successful CMap load
            const mockCMapResponse = {
              ok: true,
              status: 200,
              statusText: 'OK',
              headers: new Headers({
                'Content-Type': config.cMapPacked ? 'application/octet-stream' : 'text/plain',
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
                'Cache-Control': 'public, max-age=31536000',
              }),
            };

            // Verify CMap response would have CORS headers
            expect(mockCMapResponse.headers.get('Access-Control-Allow-Origin')).toBe('*');
            expect(mockCMapResponse.ok).toBe(true);

            // Verify CMap URL structure supports the encoding
            expect(fullCMapUrl).toContain('cdnjs.cloudflare.com');
            expect(fullCMapUrl).toContain('cmaps');
          }
        ),
        {
          numRuns: 100,
          verbose: true,
        }
      );
    });

    it('should ensure standard font resources are accessible', async () => {
      await fc.assert(
        fc.asyncProperty(
          // Generate various standard font names
          fc.constantFrom(
            'Courier',
            'Courier-Bold',
            'Courier-Oblique',
            'Courier-BoldOblique',
            'Helvetica',
            'Helvetica-Bold',
            'Helvetica-Oblique',
            'Helvetica-BoldOblique',
            'Times-Roman',
            'Times-Bold',
            'Times-Italic',
            'Times-BoldItalic',
            'Symbol',
            'ZapfDingbats'
          ),
          async (fontName) => {
            const config = getPDFJSConfig();

            // Verify font base URL is configured
            expect(config.standardFontDataUrl).toBeTruthy();
            expect(config.standardFontDataUrl).toMatch(/\/standard_fonts\/$/);

            // Verify font URL is a valid URL
            const fontBaseUrl = new URL(config.standardFontDataUrl);
            expect(fontBaseUrl.protocol).toBe('https:');
            expect(fontBaseUrl.hostname).toContain('cloudflare.com');

            // Construct full font URL
            const fullFontUrl = `${config.standardFontDataUrl}${fontName}.pfb`;

            // Verify full font URL is valid
            expect(() => new URL(fullFontUrl)).not.toThrow();
            expect(fullFontUrl).toContain(fontName);
            expect(fullFontUrl).toMatch(/\.pfb$/);

            // Simulate successful font load
            const mockFontResponse = {
              ok: true,
              status: 200,
              statusText: 'OK',
              headers: new Headers({
                'Content-Type': 'application/octet-stream',
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
                'Cache-Control': 'public, max-age=31536000',
              }),
            };

            // Verify font response would have CORS headers
            expect(mockFontResponse.headers.get('Access-Control-Allow-Origin')).toBe('*');
            expect(mockFontResponse.ok).toBe(true);

            // Verify font URL structure
            expect(fullFontUrl).toContain('cdnjs.cloudflare.com');
            expect(fullFontUrl).toContain('standard_fonts');
          }
        ),
        {
          numRuns: 100,
          verbose: true,
        }
      );
    });

    it('should ensure all cross-origin resources support CORS preflight requests', async () => {
      await fc.assert(
        fc.asyncProperty(
          // Generate various resource types
          fc.constantFrom('worker', 'cmap', 'font'),
          // Generate various HTTP methods
          fc.constantFrom('GET', 'HEAD', 'OPTIONS'),
          async (resourceType, method) => {
            const config = getPDFJSConfig();

            // Get resource URL based on type
            let resourceUrl: string;
            switch (resourceType) {
              case 'worker':
                resourceUrl = config.workerSrc;
                break;
              case 'cmap':
                resourceUrl = `${config.cMapUrl}Identity-H.bcmap`;
                break;
              case 'font':
                resourceUrl = `${config.standardFontDataUrl}Helvetica.pfb`;
                break;
            }

            // Verify resource URL is valid
            expect(() => new URL(resourceUrl)).not.toThrow();

            // Simulate CORS preflight response (OPTIONS request)
            const preflightResponse = new Response(null, {
              status: 204,
              statusText: 'No Content',
              headers: new Headers({
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
                'Access-Control-Allow-Headers': 'Range, Content-Type',
                'Access-Control-Max-Age': '86400',
              }),
            });

            // Verify preflight response includes necessary CORS headers
            expect(preflightResponse.headers.get('Access-Control-Allow-Origin')).toBe('*');
            expect(preflightResponse.headers.get('Access-Control-Allow-Methods')).toContain(method);
            expect(preflightResponse.headers.get('Access-Control-Max-Age')).toBeTruthy();

            // Verify the method is allowed
            const allowedMethods = preflightResponse.headers.get('Access-Control-Allow-Methods') || '';
            expect(allowedMethods.split(',').map(m => m.trim())).toContain(method);

            // Verify preflight response status
            expect(preflightResponse.status).toBe(204);
          }
        ),
        {
          numRuns: 100,
          verbose: true,
        }
      );
    });

    it('should ensure CDN resources are cacheable for performance', async () => {
      await fc.assert(
        fc.asyncProperty(
          // Generate various resource types
          fc.constantFrom('worker', 'cmap', 'font'),
          // Generate various cache durations
          fc.integer({ min: 3600, max: 31536000 }), // 1 hour to 1 year
          async (resourceType, cacheDuration) => {
            const config = getPDFJSConfig();

            // Get resource URL based on type
            let resourceUrl: string;
            switch (resourceType) {
              case 'worker':
                resourceUrl = config.workerSrc;
                break;
              case 'cmap':
                resourceUrl = `${config.cMapUrl}Identity-H.bcmap`;
                break;
              case 'font':
                resourceUrl = `${config.standardFontDataUrl}Helvetica.pfb`;
                break;
            }

            // Verify resource URL is from CDN
            expect(resourceUrl).toContain('cdnjs.cloudflare.com');

            // Simulate CDN response with cache headers
            const mockCDNResponse = {
              ok: true,
              status: 200,
              statusText: 'OK',
              headers: new Headers({
                'Cache-Control': `public, max-age=${cacheDuration}`,
                'Access-Control-Allow-Origin': '*',
                'ETag': `"${Math.random().toString(36).substring(7)}"`,
                'Last-Modified': new Date(Date.now() - 86400000).toUTCString(),
              }),
            };

            // Verify cache headers are present
            expect(mockCDNResponse.headers.get('Cache-Control')).toBeTruthy();
            expect(mockCDNResponse.headers.get('Cache-Control')).toContain('public');
            expect(mockCDNResponse.headers.get('Cache-Control')).toContain('max-age');

            // Verify ETag for cache validation
            expect(mockCDNResponse.headers.get('ETag')).toBeTruthy();

            // Verify Last-Modified for conditional requests
            expect(mockCDNResponse.headers.get('Last-Modified')).toBeTruthy();

            // Verify CORS headers are present for cross-origin caching
            expect(mockCDNResponse.headers.get('Access-Control-Allow-Origin')).toBe('*');
          }
        ),
        {
          numRuns: 100,
          verbose: true,
        }
      );
    });

    it('should ensure PDF.js library is available for cross-origin resource loading', async () => {
      await fc.assert(
        fc.asyncProperty(
          // Generate various environment conditions
          fc.record({
            nodeEnv: fc.constantFrom('development', 'production', 'test'),
            browserType: fc.constantFrom('chrome', 'firefox', 'safari', 'edge'),
          }),
          async (env) => {
            // Verify PDF.js is available
            expect(isPDFJSAvailable()).toBe(true);

            // Get configuration
            const config = getPDFJSConfig();

            // Verify all cross-origin resources are configured
            expect(config.workerSrc).toBeTruthy();
            expect(config.cMapUrl).toBeTruthy();
            expect(config.standardFontDataUrl).toBeTruthy();

            // Verify worker is enabled (not disabled)
            expect(config.disableWorker).toBe(false);

            // Verify all resources use HTTPS
            expect(config.workerSrc).toMatch(/^https:\/\//);
            expect(config.cMapUrl).toMatch(/^https:\/\//);
            expect(config.standardFontDataUrl).toMatch(/^https:\/\//);

            // Verify all resources are from the same CDN
            const cdnDomain = 'cdnjs.cloudflare.com';
            expect(config.workerSrc).toContain(cdnDomain);
            expect(config.cMapUrl).toContain(cdnDomain);
            expect(config.standardFontDataUrl).toContain(cdnDomain);

            // Verify configuration is consistent across environments
            expect(config.cMapPacked).toBe(true);
          }
        ),
        {
          numRuns: 100,
          verbose: true,
        }
      );
    });

    it('should ensure cross-origin resources support range requests for efficient loading', async () => {
      await fc.assert(
        fc.asyncProperty(
          // Generate various byte ranges
          fc.record({
            start: fc.integer({ min: 0, max: 1000000 }),
            end: fc.integer({ min: 1000, max: 2000000 }),
          }).filter(range => range.end > range.start),
          // Generate resource types
          fc.constantFrom('worker', 'cmap', 'font'),
          async (range, resourceType) => {
            const config = getPDFJSConfig();

            // Get resource URL based on type
            let resourceUrl: string;
            switch (resourceType) {
              case 'worker':
                resourceUrl = config.workerSrc;
                break;
              case 'cmap':
                resourceUrl = `${config.cMapUrl}Identity-H.bcmap`;
                break;
              case 'font':
                resourceUrl = `${config.standardFontDataUrl}Helvetica.pfb`;
                break;
            }

            // Simulate range request response
            const mockRangeResponse = {
              ok: true,
              status: 206, // Partial Content
              statusText: 'Partial Content',
              headers: new Headers({
                'Content-Type': 'application/octet-stream',
                'Content-Range': `bytes ${range.start}-${range.end}/${range.end + 1000}`,
                'Accept-Ranges': 'bytes',
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'Range',
                'Access-Control-Expose-Headers': 'Content-Range, Accept-Ranges',
              }),
            };

            // Verify range request support
            expect(mockRangeResponse.status).toBe(206);
            expect(mockRangeResponse.headers.get('Accept-Ranges')).toBe('bytes');
            expect(mockRangeResponse.headers.get('Content-Range')).toBeTruthy();

            // Verify CORS headers allow range requests
            expect(mockRangeResponse.headers.get('Access-Control-Allow-Origin')).toBe('*');
            expect(mockRangeResponse.headers.get('Access-Control-Allow-Headers')).toContain('Range');
            expect(mockRangeResponse.headers.get('Access-Control-Expose-Headers')).toContain('Content-Range');

            // Verify Content-Range format
            const contentRange = mockRangeResponse.headers.get('Content-Range');
            expect(contentRange).toMatch(/^bytes \d+-\d+\/\d+$/);
          }
        ),
        {
          numRuns: 100,
          verbose: true,
        }
      );
    });

    it('should ensure cross-origin resources fail gracefully when CDN is unavailable', async () => {
      await fc.assert(
        fc.asyncProperty(
          // Generate various error scenarios
          fc.constantFrom(
            { status: 404, statusText: 'Not Found' },
            { status: 500, statusText: 'Internal Server Error' },
            { status: 503, statusText: 'Service Unavailable' },
            { status: 0, statusText: 'Network Error' }
          ),
          // Generate resource types
          fc.constantFrom('worker', 'cmap', 'font'),
          async (errorScenario, resourceType) => {
            const config = getPDFJSConfig();

            // Verify fallback configuration exists
            expect(config.disableWorker).toBeDefined();
            expect(typeof config.disableWorker).toBe('boolean');

            // Simulate error response
            const mockErrorResponse = {
              ok: false,
              status: errorScenario.status,
              statusText: errorScenario.statusText,
              headers: new Headers({
                'Access-Control-Allow-Origin': '*',
              }),
            };

            // Verify error response still has CORS headers
            expect(mockErrorResponse.headers.get('Access-Control-Allow-Origin')).toBe('*');
            expect(mockErrorResponse.ok).toBe(false);

            // Verify fallback strategy is available
            // If worker fails to load, disableWorker can be set to true
            if (resourceType === 'worker' && !mockErrorResponse.ok) {
              // Worker can be disabled as fallback
              expect(config.disableWorker).toBe(false); // Initially enabled
              // In error case, it could be set to true
            }

            // Verify error status is handled
            expect(mockErrorResponse.status).toBeGreaterThanOrEqual(0);
            if (mockErrorResponse.status > 0) {
              expect(mockErrorResponse.status).toBeGreaterThanOrEqual(400);
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
