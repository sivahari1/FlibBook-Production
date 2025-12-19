/**
 * Property-Based Tests for URL Refresh on Expiration
 * 
 * **PDF Rendering Reliability Fix, Property 16: URL refresh on expiration**
 * **Validates: Requirements 7.3**
 */

import { describe, test, expect, beforeEach, vi } from 'vitest';
import * as fc from 'fast-check';
import { NetworkResilienceLayer, type URLRefreshCallback } from '../pdf-reliability/network-resilience-layer';
import { AuthenticationError } from '../pdf-reliability/errors';
import type { RenderContext } from '../pdf-reliability/types';
import { RenderingStage, RenderingMethod } from '../pdf-reliability/types';

// Mock fetch globally
global.fetch = vi.fn();

describe('URL Refresh on Expiration Property Tests', () => {
  let networkLayer: NetworkResilienceLayer;
  let mockURLRefreshCallback: URLRefreshCallback;

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Mock URL refresh callback
    mockURLRefreshCallback = vi.fn();
    
    networkLayer = new NetworkResilienceLayer(
      {
        timeout: 10000,
        maxRetries: 3,
        baseDelay: 100,
        maxDelay: 1000,
        enablePartialData: true,
      },
      mockURLRefreshCallback
    );
  });

  /**
   * Property 16: URL refresh on expiration
   * For any signed URL that expires during loading, the system should detect 
   * the expiration and request a fresh URL automatically
   */
  test('expired URLs trigger automatic refresh', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          originalUrl: fc.constant('https://example.com/signed-pdf.pdf?expires=123456'),
          refreshedUrl: fc.constant('https://example.com/signed-pdf.pdf?expires=789012'),
          expiredStatusCode: fc.oneof(fc.constant(401), fc.constant(403)),
          expiredMessage: fc.oneof(
            fc.constant('Token expired'),
            fc.constant('Unauthorized'),
            fc.constant('Access denied')
          ),
        }),
        async ({ originalUrl, refreshedUrl, expiredStatusCode, expiredMessage }) => {
          // Setup mock URL refresh callback
          (mockURLRefreshCallback as any).mockResolvedValueOnce(refreshedUrl);

          // Create test context
          const context: RenderContext = {
            renderingId: 'test-url-refresh-' + Math.random(),
            url: originalUrl,
            options: { timeout: 10000 },
            startTime: new Date(),
            currentMethod: RenderingMethod.PDFJS_CANVAS,
            attemptCount: 0,
            progressState: {
              percentage: 0,
              stage: RenderingStage.FETCHING,
              bytesLoaded: 0,
              totalBytes: 0,
              timeElapsed: 0,
              isStuck: false,
              lastUpdate: new Date(),
            },
            errorHistory: [],
          };

          // Mock fetch to simulate expired URL on first call, success on second
          let callCount = 0;
          (global.fetch as any).mockImplementation(() => {
            callCount++;
            if (callCount === 1) {
              // First call: URL expired
              return Promise.resolve({
                ok: false,
                status: expiredStatusCode,
                statusText: expiredMessage,
                headers: new Headers(),
              });
            } else {
              // Second call: Success with refreshed URL
              const mockResponse = new Response(new ArrayBuffer(1024), {
                status: 200,
                statusText: 'OK',
                headers: new Headers({
                  'content-length': '1024',
                  'content-type': 'application/pdf',
                }),
              });
              
              // Mock the body reader
              const mockReader = {
                read: vi.fn()
                  .mockResolvedValueOnce({ done: false, value: new Uint8Array(512) })
                  .mockResolvedValueOnce({ done: false, value: new Uint8Array(512) })
                  .mockResolvedValueOnce({ done: true, value: undefined }),
                releaseLock: vi.fn(),
              };
              
              Object.defineProperty(mockResponse, 'body', {
                value: { getReader: () => mockReader },
                writable: false,
              });
              
              return Promise.resolve(mockResponse);
            }
          });

          // Attempt to fetch PDF data
          const result = await networkLayer.fetchPDFData(originalUrl, context);

          // Property: URL refresh should be triggered on expiration
          expect(mockURLRefreshCallback).toHaveBeenCalledWith(originalUrl);
          expect(mockURLRefreshCallback).toHaveBeenCalled();

          // Property: Request should succeed after URL refresh
          expect(result.status).toBe(200);
          expect(result.data).toBeInstanceOf(ArrayBuffer);
          expect(result.bytesReceived).toBe(1024);

          // Property: Both original and refreshed URLs should be called
          expect(global.fetch).toHaveBeenCalledWith(originalUrl, expect.any(Object));
          expect(global.fetch).toHaveBeenCalledWith(refreshedUrl, expect.any(Object));
          expect(global.fetch).toHaveBeenNthCalledWith(1, originalUrl, expect.any(Object));
          expect(global.fetch).toHaveBeenNthCalledWith(2, refreshedUrl, expect.any(Object));
        }
      ),
      { numRuns: 10 }
    );
  });

  test('URL refresh failure throws authentication error', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          originalUrl: fc.constant('https://example.com/signed-pdf.pdf?expires=123456'),
          refreshError: fc.string({ minLength: 1, maxLength: 50 }),
          expiredStatusCode: fc.oneof(fc.constant(401), fc.constant(403)),
        }),
        async ({ originalUrl, refreshError, expiredStatusCode }) => {
          // Setup mock URL refresh callback to fail
          (mockURLRefreshCallback as any).mockRejectedValueOnce(new Error(refreshError));

          // Create test context
          const context: RenderContext = {
            renderingId: 'test-refresh-fail-' + Math.random(),
            url: originalUrl,
            options: { timeout: 10000 },
            startTime: new Date(),
            currentMethod: RenderingMethod.PDFJS_CANVAS,
            attemptCount: 0,
            progressState: {
              percentage: 0,
              stage: RenderingStage.FETCHING,
              bytesLoaded: 0,
              totalBytes: 0,
              timeElapsed: 0,
              isStuck: false,
              lastUpdate: new Date(),
            },
            errorHistory: [],
          };

          // Mock fetch to simulate expired URL
          (global.fetch as any).mockResolvedValueOnce({
            ok: false,
            status: expiredStatusCode,
            statusText: 'Token expired',
            headers: new Headers(),
          });

          // Property: URL refresh failure should throw AuthenticationError
          await expect(networkLayer.fetchPDFData(originalUrl, context)).rejects.toThrow(AuthenticationError);

          // Property: URL refresh callback should be called
          expect(mockURLRefreshCallback).toHaveBeenCalledWith(originalUrl);
          expect(mockURLRefreshCallback).toHaveBeenCalled();

          // Property: Original URL should be called (refresh failed)
          expect(global.fetch).toHaveBeenCalled();
          expect(global.fetch).toHaveBeenCalledWith(originalUrl, expect.any(Object));
        }
      ),
      { numRuns: 10 }
    );
  });

  test('URL refresh preserves request configuration', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          originalUrl: fc.constant('https://example.com/signed-pdf.pdf?expires=123456'),
          refreshedUrl: fc.constant('https://example.com/signed-pdf.pdf?expires=789012'),
          timeout: fc.integer({ min: 5000, max: 30000 }),
          customHeaders: fc.record({
            'X-Custom-Header': fc.string({ minLength: 1, maxLength: 20 }).filter(s => s.trim().length > 0),
            'Authorization': fc.string({ minLength: 10, maxLength: 50 }).filter(s => s.trim().length > 0),
          }),
        }),
        async ({ originalUrl, refreshedUrl, timeout, customHeaders }) => {
          // Create network layer with custom config
          const customNetworkLayer = new NetworkResilienceLayer(
            {
              timeout,
              maxRetries: 2,
              headers: customHeaders,
            },
            mockURLRefreshCallback
          );

          // Setup mock URL refresh callback
          (mockURLRefreshCallback as any).mockResolvedValueOnce(refreshedUrl);

          // Create test context
          const context: RenderContext = {
            renderingId: 'test-config-preserve-' + Math.random(),
            url: originalUrl,
            options: { timeout },
            startTime: new Date(),
            currentMethod: RenderingMethod.PDFJS_CANVAS,
            attemptCount: 0,
            progressState: {
              percentage: 0,
              stage: RenderingStage.FETCHING,
              bytesLoaded: 0,
              totalBytes: 0,
              timeElapsed: 0,
              isStuck: false,
              lastUpdate: new Date(),
            },
            errorHistory: [],
          };

          // Mock fetch to simulate expired URL on first call, success on second
          let callCount = 0;
          (global.fetch as any).mockImplementation((url: string, options: any) => {
            callCount++;
            
            // Property: Custom headers should be preserved in both calls
            expect(options.headers.get('X-Custom-Header')).toBe(customHeaders['X-Custom-Header']);
            expect(options.headers.get('Authorization')).toBe(customHeaders['Authorization']);
            
            if (callCount === 1) {
              expect(url).toBe(originalUrl);
              return Promise.resolve({
                ok: false,
                status: 401,
                statusText: 'Unauthorized',
                headers: new Headers(),
              });
            } else {
              expect(url).toBe(refreshedUrl);
              const mockResponse = new Response(new ArrayBuffer(512), {
                status: 200,
                statusText: 'OK',
                headers: new Headers({
                  'content-length': '512',
                  'content-type': 'application/pdf',
                }),
              });
              
              const mockReader = {
                read: vi.fn()
                  .mockResolvedValueOnce({ done: false, value: new Uint8Array(512) })
                  .mockResolvedValueOnce({ done: true, value: undefined }),
                releaseLock: vi.fn(),
              };
              
              Object.defineProperty(mockResponse, 'body', {
                value: { getReader: () => mockReader },
                writable: false,
              });
              
              return Promise.resolve(mockResponse);
            }
          });

          // Attempt to fetch PDF data
          const result = await customNetworkLayer.fetchPDFData(originalUrl, context);

          // Property: Request should succeed with preserved configuration
          expect(result.status).toBe(200);
          expect(result.data).toBeInstanceOf(ArrayBuffer);
          expect(result.bytesReceived).toBe(512);

          // Property: URL refresh should be called
          expect(mockURLRefreshCallback).toHaveBeenCalledWith(originalUrl);

          // Property: Both URLs should be called with same configuration
          expect(global.fetch).toHaveBeenCalled();
        }
      ),
      { numRuns: 5 }
    );
  });

  test('URL refresh respects retry limits', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          originalUrl: fc.constant('https://example.com/signed-pdf.pdf?expires=123456'),
          maxRetries: fc.integer({ min: 1, max: 3 }),
        }),
        async ({ originalUrl, maxRetries }) => {
          // Create network layer with specific retry limit
          const limitedNetworkLayer = new NetworkResilienceLayer(
            {
              timeout: 5000,
              maxRetries,
              baseDelay: 50,
            },
            mockURLRefreshCallback
          );

          // Setup mock URL refresh callback to always return new URL
          (mockURLRefreshCallback as any).mockImplementation((url: string) => {
            return Promise.resolve(url + '&refreshed=' + Date.now());
          });

          // Create test context
          const context: RenderContext = {
            renderingId: 'test-retry-limit-' + Math.random(),
            url: originalUrl,
            options: { timeout: 5000 },
            startTime: new Date(),
            currentMethod: RenderingMethod.PDFJS_CANVAS,
            attemptCount: 0,
            progressState: {
              percentage: 0,
              stage: RenderingStage.FETCHING,
              bytesLoaded: 0,
              totalBytes: 0,
              timeElapsed: 0,
              isStuck: false,
              lastUpdate: new Date(),
            },
            errorHistory: [],
          };

          // Mock fetch to always return 401 (expired)
          (global.fetch as any).mockResolvedValue({
            ok: false,
            status: 401,
            statusText: 'Unauthorized',
            headers: new Headers(),
          });

          // Property: Should eventually fail after exhausting retries
          await expect(limitedNetworkLayer.fetchPDFData(originalUrl, context)).rejects.toThrow();

          // Property: URL refresh should be called up to maxRetries times
          expect(mockURLRefreshCallback).toHaveBeenCalled();

          // Property: Fetch should be called multiple times (original + retries)
          expect(global.fetch).toHaveBeenCalled();
        }
      ),
      { numRuns: 5 }
    );
  });
});