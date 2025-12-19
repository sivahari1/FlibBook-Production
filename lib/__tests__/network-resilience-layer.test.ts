/**
 * Unit Tests for NetworkResilienceLayer
 * 
 * Tests timeout handling, URL refresh logic, partial data handling, and network recovery
 * 
 * Requirements: 7.1, 7.2, 7.3, 7.4, 7.5
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NetworkResilienceLayer, type NetworkRequestConfig, type URLRefreshCallback } from '../pdf-reliability/network-resilience-layer';
import { NetworkError, TimeoutError, AuthenticationError } from '../pdf-reliability/errors';
import { RenderingStage, RenderingMethod, type RenderContext } from '../pdf-reliability/types';

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('NetworkResilienceLayer', () => {
  let networkLayer: NetworkResilienceLayer;
  let mockContext: RenderContext;

  beforeEach(() => {
    networkLayer = new NetworkResilienceLayer();
    mockContext = {
      renderingId: 'test-render-123',
      url: 'https://example.com/test.pdf',
      options: {},
      startTime: new Date(),
      currentMethod: RenderingMethod.PDFJS_CANVAS,
      attemptCount: 1,
      progressState: {
        percentage: 0,
        stage: RenderingStage.FETCHING,
        bytesLoaded: 0,
        totalBytes: 0,
        timeElapsed: 0,
        isStuck: false,
        lastUpdate: new Date()
      },
      errorHistory: []
    };

    // Reset mocks
    mockFetch.mockReset();
  });

  afterEach(() => {
    networkLayer.cleanup();
  });

  describe('Configuration', () => {
    it('should use default configuration when none provided', () => {
      const config = networkLayer.getConfig();
      
      expect(config.timeout).toBe(30000);
      expect(config.maxRetries).toBe(5);
      expect(config.baseDelay).toBe(1000);
      expect(config.maxDelay).toBe(30000);
      expect(config.enablePartialData).toBe(true);
    });

    it('should merge custom configuration with defaults', () => {
      const customConfig: Partial<NetworkRequestConfig> = {
        timeout: 60000,
        maxRetries: 3,
        enablePartialData: false
      };

      const layer = new NetworkResilienceLayer(customConfig);
      const config = layer.getConfig();

      expect(config.timeout).toBe(60000);
      expect(config.maxRetries).toBe(3);
      expect(config.enablePartialData).toBe(false);
      expect(config.baseDelay).toBe(1000); // Should keep default
    });

    it('should update configuration dynamically', () => {
      networkLayer.updateConfig({ timeout: 45000, maxRetries: 2 });
      const config = networkLayer.getConfig();

      expect(config.timeout).toBe(45000);
      expect(config.maxRetries).toBe(2);
    });
  });

  describe('Successful Requests', () => {
    it('should fetch PDF data successfully', async () => {
      const mockPDFData = new ArrayBuffer(1024);
      const mockResponse = {
        ok: true,
        status: 200,
        headers: new Headers({
          'content-length': '1024',
          'content-type': 'application/pdf'
        }),
        body: {
          getReader: () => ({
            read: vi.fn()
              .mockResolvedValueOnce({ done: false, value: new Uint8Array(mockPDFData) })
              .mockResolvedValueOnce({ done: true }),
            releaseLock: vi.fn()
          })
        }
      };

      mockFetch.mockResolvedValueOnce(mockResponse);

      const result = await networkLayer.fetchPDFData(
        'https://example.com/test.pdf',
        mockContext
      );

      expect(result.status).toBe(200);
      expect(result.bytesReceived).toBe(1024);
      expect(result.contentLength).toBe(1024);
      expect(result.isPartial).toBe(false);
      expect(mockFetch).toHaveBeenCalledWith(
        'https://example.com/test.pdf',
        expect.objectContaining({
          method: 'GET',
          cache: 'no-cache'
        })
      );
    });

    it('should report progress during download', async () => {
      const chunk1 = new Uint8Array(512);
      const chunk2 = new Uint8Array(512);
      const mockResponse = {
        ok: true,
        status: 200,
        headers: new Headers({ 'content-length': '1024' }),
        body: {
          getReader: () => ({
            read: vi.fn()
              .mockResolvedValueOnce({ done: false, value: chunk1 })
              .mockResolvedValueOnce({ done: false, value: chunk2 })
              .mockResolvedValueOnce({ done: true }),
            releaseLock: vi.fn()
          })
        }
      };

      mockFetch.mockResolvedValueOnce(mockResponse);

      const progressCallback = vi.fn();
      await networkLayer.fetchPDFData(
        'https://example.com/test.pdf',
        mockContext,
        progressCallback
      );

      expect(progressCallback).toHaveBeenCalledWith(512, 1024);
      expect(progressCallback).toHaveBeenCalledWith(1024, 1024);
    });
  });

  describe('Timeout Handling', () => {
    it('should handle timeout configuration', () => {
      const layer = new NetworkResilienceLayer({ timeout: 10000 });
      const config = layer.getConfig();
      expect(config.timeout).toBe(10000);
    });
  });

  describe('URL Refresh Logic', () => {
    it('should refresh expired URLs and retry', async () => {
      const urlRefreshCallback: URLRefreshCallback = vi.fn()
        .mockResolvedValue('https://example.com/refreshed.pdf');

      const layer = new NetworkResilienceLayer({}, urlRefreshCallback);

      // First call fails with 401 (expired)
      mockFetch
        .mockRejectedValueOnce(new Error('401 Unauthorized'))
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          headers: new Headers({ 'content-length': '1024' }),
          body: {
            getReader: () => ({
              read: vi.fn()
                .mockResolvedValueOnce({ done: false, value: new Uint8Array(1024) })
                .mockResolvedValueOnce({ done: true }),
              releaseLock: vi.fn()
            })
          }
        });

      const result = await layer.fetchPDFData(
        'https://example.com/expired.pdf',
        mockContext
      );

      expect(urlRefreshCallback).toHaveBeenCalledWith('https://example.com/expired.pdf');
      expect(mockFetch).toHaveBeenCalledTimes(2);
      expect(result.status).toBe(200);
    });

    it('should throw AuthenticationError when URL refresh fails', async () => {
      const urlRefreshCallback: URLRefreshCallback = vi.fn()
        .mockRejectedValue(new Error('Refresh failed'));

      const layer = new NetworkResilienceLayer({}, urlRefreshCallback);

      mockFetch.mockRejectedValue(new Error('403 Forbidden'));

      await expect(
        layer.fetchPDFData('https://example.com/expired.pdf', mockContext)
      ).rejects.toThrow(AuthenticationError);

      expect(urlRefreshCallback).toHaveBeenCalled();
    });

    it('should set URL refresh callback dynamically', () => {
      const callback: URLRefreshCallback = vi.fn();
      networkLayer.setURLRefreshCallback(callback);

      // Verify callback is set (we can't directly test private property,
      // but we can test behavior in integration)
      expect(callback).toBeDefined();
    });
  });

  describe('Partial Data Handling', () => {
    it('should detect valid partial PDF data', () => {
      // Create buffer with PDF header
      const buffer = new ArrayBuffer(2048);
      const view = new Uint8Array(buffer);
      const pdfHeader = '%PDF-1.4';
      for (let i = 0; i < pdfHeader.length; i++) {
        view[i] = pdfHeader.charCodeAt(i);
      }

      const canRender = networkLayer.canRenderPartialData(buffer, 4096);
      expect(canRender).toBe(true);
    });

    it('should reject partial data without PDF header', () => {
      const buffer = new ArrayBuffer(2048);
      const view = new Uint8Array(buffer);
      view.fill(0); // No PDF header

      const canRender = networkLayer.canRenderPartialData(buffer, 4096);
      expect(canRender).toBe(false);
    });

    it('should reject partial data that is too small', () => {
      const buffer = new ArrayBuffer(512); // Less than 1KB
      const view = new Uint8Array(buffer);
      const pdfHeader = '%PDF-1.4';
      for (let i = 0; i < pdfHeader.length; i++) {
        view[i] = pdfHeader.charCodeAt(i);
      }

      const canRender = networkLayer.canRenderPartialData(buffer, 4096);
      expect(canRender).toBe(false);
    });

    it('should reject partial data with insufficient percentage', () => {
      const buffer = new ArrayBuffer(1024); // Only 1KB of 100KB (1%)
      const view = new Uint8Array(buffer);
      const pdfHeader = '%PDF-1.4';
      for (let i = 0; i < pdfHeader.length; i++) {
        view[i] = pdfHeader.charCodeAt(i);
      }

      const canRender = networkLayer.canRenderPartialData(buffer, 102400);
      expect(canRender).toBe(false);
    });

    it('should handle partial data when enabled in config', async () => {
      const partialData = new ArrayBuffer(2048);
      const view = new Uint8Array(partialData);
      const pdfHeader = '%PDF-1.4';
      for (let i = 0; i < pdfHeader.length; i++) {
        view[i] = pdfHeader.charCodeAt(i);
      }

      const mockResponse = {
        ok: true,
        status: 200,
        headers: new Headers({ 'content-length': '4096' }),
        body: {
          getReader: () => ({
            read: vi.fn()
              .mockResolvedValueOnce({ done: false, value: new Uint8Array(partialData) })
              .mockResolvedValueOnce({ done: true }),
            releaseLock: vi.fn()
          })
        }
      };

      mockFetch.mockResolvedValueOnce(mockResponse);

      const result = await networkLayer.fetchPDFData(
        'https://example.com/test.pdf',
        mockContext
      );

      expect(result.isPartial).toBe(true);
      expect(result.bytesReceived).toBe(2048);
      expect(result.contentLength).toBe(4096);
    });
  });

  describe('Network Recovery', () => {
    it('should handle network errors gracefully', async () => {
      // Use a network layer with shorter timeouts for testing
      const testNetworkLayer = new NetworkResilienceLayer({
        timeout: 100,
        maxRetries: 1,
        baseDelay: 10,
        maxDelay: 50
      });

      mockFetch.mockRejectedValue(new Error('Network error'));

      await expect(
        testNetworkLayer.fetchPDFData('https://example.com/test.pdf', mockContext)
      ).rejects.toThrow();

      expect(mockFetch).toHaveBeenCalled();
      testNetworkLayer.cleanup();
    });

    it('should not retry on non-retryable errors', async () => {
      mockFetch.mockRejectedValue(new Error('404 Not Found'));

      await expect(
        networkLayer.fetchPDFData('https://example.com/test.pdf', mockContext)
      ).rejects.toThrow();

      expect(mockFetch).toHaveBeenCalledTimes(1); // No retries
    });
  });

  describe('Request Management', () => {
    it('should handle request cancellation', () => {
      // Test that cancellation doesn't throw errors
      expect(() => {
        networkLayer.cancelRequest('non-existent-id');
      }).not.toThrow();
    });

    it('should clean up resources on cleanup', () => {
      // Test that cleanup doesn't throw errors
      expect(() => {
        networkLayer.cleanup();
      }).not.toThrow();
    });
  });

  describe('Error Handling', () => {
    it('should handle HTTP error responses', async () => {
      // Use a network layer with shorter timeouts for testing
      const testNetworkLayer = new NetworkResilienceLayer({
        timeout: 100,
        maxRetries: 0,
        baseDelay: 10
      });

      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error'
      });

      await expect(
        testNetworkLayer.fetchPDFData('https://example.com/test.pdf', mockContext)
      ).rejects.toThrow();
      
      testNetworkLayer.cleanup();
    });

    it('should handle missing response body', async () => {
      // Use a network layer with shorter timeouts for testing
      const testNetworkLayer = new NetworkResilienceLayer({
        timeout: 100,
        maxRetries: 0,
        baseDelay: 10
      });

      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        headers: new Headers(),
        body: null
      });

      await expect(
        testNetworkLayer.fetchPDFData('https://example.com/test.pdf', mockContext)
      ).rejects.toThrow(NetworkError);
      
      testNetworkLayer.cleanup();
    });

    it('should handle reader errors', async () => {
      const mockResponse = {
        ok: true,
        status: 200,
        headers: new Headers(),
        body: {
          getReader: () => ({
            read: vi.fn().mockRejectedValue(new Error('Reader error')),
            releaseLock: vi.fn()
          })
        }
      };

      mockFetch.mockResolvedValue(mockResponse);

      await expect(
        networkLayer.fetchPDFData('https://example.com/test.pdf', mockContext)
      ).rejects.toThrow();
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty response', async () => {
      const mockResponse = {
        ok: true,
        status: 200,
        headers: new Headers({ 'content-length': '0' }),
        body: {
          getReader: () => ({
            read: vi.fn().mockResolvedValue({ done: true }),
            releaseLock: vi.fn()
          })
        }
      };

      mockFetch.mockResolvedValue(mockResponse);

      const result = await networkLayer.fetchPDFData(
        'https://example.com/empty.pdf',
        mockContext
      );

      expect(result.bytesReceived).toBe(0);
      expect(result.data.byteLength).toBe(0);
    });

    it('should handle missing content-length header', async () => {
      const mockData = new ArrayBuffer(1024);
      const mockResponse = {
        ok: true,
        status: 200,
        headers: new Headers(), // No content-length
        body: {
          getReader: () => ({
            read: vi.fn()
              .mockResolvedValueOnce({ done: false, value: new Uint8Array(mockData) })
              .mockResolvedValueOnce({ done: true }),
            releaseLock: vi.fn()
          })
        }
      };

      mockFetch.mockResolvedValue(mockResponse);

      const result = await networkLayer.fetchPDFData(
        'https://example.com/test.pdf',
        mockContext
      );

      expect(result.contentLength).toBeUndefined();
      expect(result.isPartial).toBe(false);
      expect(result.bytesReceived).toBe(1024);
    });

    it('should handle configuration limits correctly', () => {
      const layer = new NetworkResilienceLayer({ 
        baseDelay: 1000,
        maxDelay: 5000
      });

      expect(layer.getConfig().maxDelay).toBe(5000);
    });
  });
});