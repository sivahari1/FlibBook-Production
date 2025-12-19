/**
 * Unit tests for CacheAwarePageLoader
 * 
 * Tests cache-aware page loading functionality including:
 * - Multi-layer cache checking
 * - Network-aware loading
 * - Performance monitoring
 * - Error handling and retry logic
 */

import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import CacheAwarePageLoader from '../CacheAwarePageLoader';

// Mock the cache managers
jest.mock('@/lib/cache/document-cache-manager', () => ({
  documentCacheManager: {
    getPageCache: jest.fn(),
    setPageCache: jest.fn(),
    getBrowserCacheHeaders: jest.fn(() => ({
      'Content-Type': 'image/jpeg',
      'Cache-Control': 'public, max-age=604800',
    })),
  },
}));

jest.mock('@/lib/cache/cache-optimization-service', () => ({
  cacheOptimizationService: {
    optimizeCacheStrategy: jest.fn(() => Promise.resolve({
      browserCacheStrategy: 'conservative',
    })),
    predictivePreload: jest.fn(() => Promise.resolve([2, 3])),
    updateUserBehaviorPattern: jest.fn(),
  },
}));

// Mock WatermarkOverlay
jest.mock('../WatermarkOverlay', () => {
  return function MockWatermarkOverlay() {
    return <div data-testid="watermark-overlay">Watermark</div>;
  };
});

// Mock fetch
const mockFetch = jest.fn();
global.fetch = mockFetch;

// Mock URL.createObjectURL and revokeObjectURL
global.URL.createObjectURL = jest.fn(() => 'blob:mock-url');
global.URL.revokeObjectURL = jest.fn();

// Mock IntersectionObserver
const mockIntersectionObserver = jest.fn();
mockIntersectionObserver.mockReturnValue({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
});
global.IntersectionObserver = mockIntersectionObserver;

// Mock performance.now
Object.defineProperty(global, 'performance', {
  value: { now: jest.fn(() => 1000) },
  writable: true,
});

describe('CacheAwarePageLoader', () => {
  const defaultProps = {
    documentId: 'test-doc-1',
    pageNumber: 1,
    pageUrl: 'https://example.com/page1.jpg',
    dimensions: { width: 800, height: 1000 },
    priority: 'high' as const,
    isVisible: true,
  };

  const { documentCacheManager } = require('@/lib/cache/document-cache-manager');
  const { cacheOptimizationService } = require('@/lib/cache/cache-optimization-service');

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Reset mock implementations
    documentCacheManager.getPageCache.mockResolvedValue(null);
    documentCacheManager.setPageCache.mockResolvedValue(undefined);
    
    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
      headers: new Map([['x-cache', 'miss']]),
      blob: () => Promise.resolve(new Blob(['mock-image-data'])),
    });
  });

  describe('Rendering States', () => {
    it('should render idle state initially', () => {
      render(<CacheAwarePageLoader {...defaultProps} priority="low" isVisible={false} />);
      
      expect(screen.getByText('Page 1')).toBeInTheDocument();
      expect(screen.getByText('Priority: low')).toBeInTheDocument();
    });

    it('should render loading state when loading', async () => {
      render(<CacheAwarePageLoader {...defaultProps} />);
      
      await waitFor(() => {
        expect(screen.getByText('Loading page 1...')).toBeInTheDocument();
      });
      
      expect(screen.getByRole('progressbar', { hidden: true })).toBeInTheDocument();
    });

    it('should render error state on load failure', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'));
      
      render(<CacheAwarePageLoader {...defaultProps} />);
      
      await waitFor(() => {
        expect(screen.getByText('Failed to load page 1')).toBeInTheDocument();
        expect(screen.getByText('Network error')).toBeInTheDocument();
      });
      
      expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
    });

    it('should render loaded state with image', async () => {
      render(<CacheAwarePageLoader {...defaultProps} />);
      
      await waitFor(() => {
        expect(screen.getByAltText('Page 1')).toBeInTheDocument();
      });
    });
  });

  describe('Cache Hierarchy', () => {
    it('should check memory cache first', async () => {
      documentCacheManager.getPageCache.mockResolvedValue('cached-image-data');
      
      const onCacheHit = jest.fn();
      render(<CacheAwarePageLoader {...defaultProps} onCacheHit={onCacheHit} />);
      
      await waitFor(() => {
        expect(documentCacheManager.getPageCache).toHaveBeenCalledWith('test-doc-1', 1);
        expect(onCacheHit).toHaveBeenCalledWith(1, 'memory');
      });
      
      // Should not make network request
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('should check browser cache when memory cache misses', async () => {
      documentCacheManager.getPageCache.mockResolvedValue(null);
      
      // Mock browser cache hit
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          headers: new Map([['x-cache', 'miss']]),
          blob: () => Promise.resolve(new Blob(['image-data'])),
        });
      
      const onCacheHit = jest.fn();
      render(<CacheAwarePageLoader {...defaultProps} onCacheHit={onCacheHit} />);
      
      await waitFor(() => {
        expect(onCacheHit).toHaveBeenCalledWith(1, 'browser');
      });
    });

    it('should detect CDN cache hits', async () => {
      documentCacheManager.getPageCache.mockResolvedValue(null);
      
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        headers: new Map([['x-cache', 'HIT']]),
        blob: () => Promise.resolve(new Blob(['image-data'])),
      });
      
      const onCacheHit = jest.fn();
      render(<CacheAwarePageLoader {...defaultProps} onCacheHit={onCacheHit} />);
      
      await waitFor(() => {
        expect(onCacheHit).toHaveBeenCalledWith(1, 'cdn');
      });
    });

    it('should store successful loads in memory cache', async () => {
      documentCacheManager.getPageCache.mockResolvedValue(null);
      
      render(<CacheAwarePageLoader {...defaultProps} />);
      
      await waitFor(() => {
        expect(documentCacheManager.setPageCache).toHaveBeenCalledWith(
          'test-doc-1',
          1,
          'blob:mock-url',
          'image/jpeg'
        );
      });
    });
  });

  describe('Priority-Based Loading', () => {
    it('should load immediately for immediate priority', () => {
      render(<CacheAwarePageLoader {...defaultProps} priority="immediate" isVisible={false} />);
      
      // Should start loading even when not visible
      expect(documentCacheManager.getPageCache).toHaveBeenCalled();
    });

    it('should load when visible for high priority', () => {
      render(<CacheAwarePageLoader {...defaultProps} priority="high" isVisible={true} />);
      
      expect(documentCacheManager.getPageCache).toHaveBeenCalled();
    });

    it('should wait for intersection for normal priority', () => {
      render(<CacheAwarePageLoader {...defaultProps} priority="normal" isVisible={false} />);
      
      // Should not load immediately
      expect(documentCacheManager.getPageCache).not.toHaveBeenCalled();
    });

    it('should wait for intersection and idle state for low priority', () => {
      render(<CacheAwarePageLoader {...defaultProps} priority="low" isVisible={false} />);
      
      expect(documentCacheManager.getPageCache).not.toHaveBeenCalled();
    });
  });

  describe('Error Handling and Retry', () => {
    it('should retry on failure with exponential backoff', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'));
      
      const onRetry = jest.fn();
      render(<CacheAwarePageLoader {...defaultProps} onRetry={onRetry} />);
      
      await waitFor(() => {
        expect(screen.getByText('Failed to load page 1')).toBeInTheDocument();
      });
      
      const retryButton = screen.getByRole('button', { name: /retry/i });
      fireEvent.click(retryButton);
      
      expect(onRetry).toHaveBeenCalledWith(1);
    });

    it('should limit retry attempts', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'));
      
      render(<CacheAwarePageLoader {...defaultProps} />);
      
      await waitFor(() => {
        expect(screen.getByText('Failed to load page 1')).toBeInTheDocument();
      });
      
      // Retry 3 times
      const retryButton = screen.getByRole('button', { name: /retry/i });
      fireEvent.click(retryButton);
      
      await waitFor(() => {
        fireEvent.click(retryButton);
      });
      
      await waitFor(() => {
        fireEvent.click(retryButton);
      });
      
      await waitFor(() => {
        expect(screen.getByText('Max retries reached')).toBeInTheDocument();
      });
    });

    it('should call onError callback on failure', async () => {
      mockFetch.mockRejectedValue(new Error('Test error'));
      
      const onError = jest.fn();
      render(<CacheAwarePageLoader {...defaultProps} onError={onError} />);
      
      await waitFor(() => {
        expect(onError).toHaveBeenCalledWith(1, 'Test error');
      });
    });
  });

  describe('Performance Monitoring', () => {
    it('should track load times', async () => {
      const onLoad = jest.fn();
      render(<CacheAwarePageLoader {...defaultProps} onLoad={onLoad} />);
      
      await waitFor(() => {
        expect(onLoad).toHaveBeenCalledWith(1, expect.any(Number));
      });
    });

    it('should update user behavior patterns', async () => {
      const userId = 'test-user';
      render(<CacheAwarePageLoader {...defaultProps} userId={userId} />);
      
      await waitFor(() => {
        expect(cacheOptimizationService.updateUserBehaviorPattern).toHaveBeenCalledWith(
          userId,
          'test-doc-1',
          1,
          expect.any(Number)
        );
      });
    });

    it('should show cache status in development mode', async () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';
      
      documentCacheManager.getPageCache.mockResolvedValue('cached-data');
      
      render(<CacheAwarePageLoader {...defaultProps} />);
      
      await waitFor(() => {
        expect(screen.getByText('MEMORY')).toBeInTheDocument();
      });
      
      process.env.NODE_ENV = originalEnv;
    });
  });

  describe('Predictive Preloading', () => {
    it('should trigger predictive preloading after successful load', async () => {
      const userId = 'test-user';
      render(<CacheAwarePageLoader {...defaultProps} userId={userId} />);
      
      await waitFor(() => {
        expect(cacheOptimizationService.predictivePreload).toHaveBeenCalledWith(
          'test-doc-1',
          1,
          userId
        );
      });
    });

    it('should trigger predictive preloading after cache hit', async () => {
      documentCacheManager.getPageCache.mockResolvedValue('cached-data');
      
      const userId = 'test-user';
      render(<CacheAwarePageLoader {...defaultProps} userId={userId} />);
      
      await waitFor(() => {
        expect(cacheOptimizationService.predictivePreload).toHaveBeenCalledWith(
          'test-doc-1',
          1,
          userId
        );
      });
    });
  });

  describe('DRM and Watermark', () => {
    it('should render watermark when provided', async () => {
      const watermark = {
        text: 'Test Watermark',
        opacity: 0.5,
        fontSize: 24,
      };
      
      render(<CacheAwarePageLoader {...defaultProps} watermark={watermark} />);
      
      await waitFor(() => {
        expect(screen.getByTestId('watermark-overlay')).toBeInTheDocument();
      });
    });

    it('should apply DRM restrictions when enabled', async () => {
      render(<CacheAwarePageLoader {...defaultProps} enableDRM={true} />);
      
      await waitFor(() => {
        const image = screen.getByAltText('Page 1');
        expect(image).toHaveStyle('user-select: none');
        expect(image).toHaveStyle('pointer-events: none');
        expect(image).toHaveAttribute('draggable', 'false');
      });
    });
  });

  describe('Zoom and Dimensions', () => {
    it('should apply zoom level to container dimensions', () => {
      const zoomLevel = 1.5;
      render(<CacheAwarePageLoader {...defaultProps} zoomLevel={zoomLevel} />);
      
      const container = screen.getByTestId('page-loader-1');
      expect(container).toHaveStyle({
        width: `${defaultProps.dimensions.width * zoomLevel}px`,
        height: `${defaultProps.dimensions.height * zoomLevel}px`,
      });
    });

    it('should maintain aspect ratio with zoom', () => {
      const zoomLevel = 0.5;
      render(<CacheAwarePageLoader {...defaultProps} zoomLevel={zoomLevel} />);
      
      const container = screen.getByTestId('page-loader-1');
      expect(container).toHaveStyle({
        width: `${defaultProps.dimensions.width * zoomLevel}px`,
        height: `${defaultProps.dimensions.height * zoomLevel}px`,
      });
    });
  });

  describe('Intersection Observer', () => {
    it('should setup intersection observer', () => {
      render(<CacheAwarePageLoader {...defaultProps} priority="normal" />);
      
      expect(mockIntersectionObserver).toHaveBeenCalledWith(
        expect.any(Function),
        expect.objectContaining({
          rootMargin: '200px',
          threshold: 0.1,
        })
      );
    });

    it('should observe container element', () => {
      const mockObserve = jest.fn();
      mockIntersectionObserver.mockReturnValue({
        observe: mockObserve,
        unobserve: jest.fn(),
        disconnect: jest.fn(),
      });
      
      render(<CacheAwarePageLoader {...defaultProps} priority="normal" />);
      
      expect(mockObserve).toHaveBeenCalled();
    });
  });

  describe('Resource Cleanup', () => {
    it('should revoke blob URLs on unmount', () => {
      const { unmount } = render(<CacheAwarePageLoader {...defaultProps} />);
      
      unmount();
      
      expect(global.URL.revokeObjectURL).toHaveBeenCalledWith('blob:mock-url');
    });

    it('should clear retry timeouts on unmount', () => {
      const { unmount } = render(<CacheAwarePageLoader {...defaultProps} />);
      
      // Should not throw
      expect(() => unmount()).not.toThrow();
    });

    it('should disconnect intersection observer on unmount', () => {
      const mockDisconnect = jest.fn();
      mockIntersectionObserver.mockReturnValue({
        observe: jest.fn(),
        unobserve: jest.fn(),
        disconnect: mockDisconnect,
      });
      
      const { unmount } = render(<CacheAwarePageLoader {...defaultProps} />);
      
      unmount();
      
      expect(mockDisconnect).toHaveBeenCalled();
    });
  });

  describe('Cache Strategy Integration', () => {
    it('should use optimized cache strategy', async () => {
      render(<CacheAwarePageLoader {...defaultProps} userId="test-user" />);
      
      await waitFor(() => {
        expect(cacheOptimizationService.optimizeCacheStrategy).toHaveBeenCalledWith(
          'test-doc-1',
          'test-user'
        );
      });
    });

    it('should apply cache headers from cache manager', async () => {
      render(<CacheAwarePageLoader {...defaultProps} />);
      
      await waitFor(() => {
        expect(documentCacheManager.getBrowserCacheHeaders).toHaveBeenCalledWith('image/jpeg');
      });
    });
  });
});