/**
 * Tests for Image Optimization Hooks
 */

import { renderHook, waitFor } from '@testing-library/react';
import { useImageOptimization, useBatchImageOptimization, useProgressiveImageLoading } from '../useImageOptimization';
import { imageOptimizer } from '@/lib/services/image-optimizer';

// Mock the image optimizer
jest.mock('@/lib/services/image-optimizer', () => ({
  imageOptimizer: {
    optimizeImage: jest.fn(),
    getResponsiveImages: jest.fn(),
    preloadImage: jest.fn(),
    getNetworkInfo: jest.fn(),
    isWebPSupported: jest.fn()
  }
}));

const mockImageOptimizer = imageOptimizer as jest.Mocked<typeof imageOptimizer>;

describe('useImageOptimization', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    mockImageOptimizer.optimizeImage.mockResolvedValue({
      url: 'https://example.com/optimized.webp',
      fallbackUrl: 'https://example.com/optimized.jpg',
      width: 800,
      height: 600,
      size: 50000,
      format: 'webp',
      progressive: true
    });

    mockImageOptimizer.getNetworkInfo.mockReturnValue({
      type: '4g',
      downlink: 10,
      rtt: 100,
      saveData: false
    });

    mockImageOptimizer.isWebPSupported.mockResolvedValue(true);
    mockImageOptimizer.preloadImage.mockResolvedValue();
  });

  it('should optimize image on mount', async () => {
    const { result } = renderHook(() =>
      useImageOptimization('https://example.com/image.jpg', {
        width: 800,
        height: 600
      })
    );

    expect(result.current.loading).toBe(true);

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(mockImageOptimizer.optimizeImage).toHaveBeenCalledWith(
      'https://example.com/image.jpg',
      expect.objectContaining({
        width: 800,
        height: 600
      })
    );

    expect(result.current.optimizedImage).toEqual({
      url: 'https://example.com/optimized.webp',
      fallbackUrl: 'https://example.com/optimized.jpg',
      width: 800,
      height: 600,
      size: 50000,
      format: 'webp',
      progressive: true
    });
  });

  it('should handle null image URL', async () => {
    const { result } = renderHook(() =>
      useImageOptimization(null)
    );

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.optimizedImage).toBeNull();
    expect(mockImageOptimizer.optimizeImage).not.toHaveBeenCalled();
  });

  it('should generate responsive images when sizes provided', async () => {
    mockImageOptimizer.getResponsiveImages.mockResolvedValue([
      {
        url: 'https://example.com/320.webp',
        fallbackUrl: 'https://example.com/320.jpg',
        width: 320,
        height: 240,
        size: 20000,
        format: 'webp',
        progressive: true
      },
      {
        url: 'https://example.com/640.webp',
        fallbackUrl: 'https://example.com/640.jpg',
        width: 640,
        height: 480,
        size: 40000,
        format: 'webp',
        progressive: true
      }
    ]);

    const { result } = renderHook(() =>
      useImageOptimization('https://example.com/image.jpg', {
        responsiveSizes: [320, 640]
      })
    );

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(mockImageOptimizer.getResponsiveImages).toHaveBeenCalledWith(
      'https://example.com/image.jpg',
      [320, 640],
      expect.any(Object)
    );

    expect(result.current.responsiveImages).toHaveLength(2);
  });

  it('should preload image when preload option is true', async () => {
    const { result } = renderHook(() =>
      useImageOptimization('https://example.com/image.jpg', {
        preload: true
      })
    );

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(mockImageOptimizer.preloadImage).toHaveBeenCalledWith(
      'https://example.com/optimized.webp',
      'https://example.com/optimized.jpg'
    );
  });

  it('should handle optimization errors', async () => {
    mockImageOptimizer.optimizeImage.mockRejectedValue(new Error('Optimization failed'));

    const { result } = renderHook(() =>
      useImageOptimization('https://example.com/image.jpg')
    );

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.error).toBe('Optimization failed');
    expect(result.current.optimizedImage).toBeNull();
  });

  it('should provide retry function', async () => {
    mockImageOptimizer.optimizeImage.mockRejectedValueOnce(new Error('Network error'));

    const { result } = renderHook(() =>
      useImageOptimization('https://example.com/image.jpg')
    );

    await waitFor(() => {
      expect(result.current.error).toBe('Network error');
    });

    // Reset mock to succeed on retry
    mockImageOptimizer.optimizeImage.mockResolvedValue({
      url: 'https://example.com/optimized.webp',
      fallbackUrl: 'https://example.com/optimized.jpg',
      width: 800,
      height: 600,
      size: 50000,
      format: 'webp',
      progressive: true
    });

    // Retry
    result.current.retry();

    await waitFor(() => {
      expect(result.current.error).toBeNull();
      expect(result.current.optimizedImage).not.toBeNull();
    });
  });

  it('should update when URL changes', async () => {
    const { result, rerender } = renderHook(
      ({ url }) => useImageOptimization(url),
      { initialProps: { url: 'https://example.com/image1.jpg' } }
    );

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(mockImageOptimizer.optimizeImage).toHaveBeenCalledWith(
      'https://example.com/image1.jpg',
      expect.any(Object)
    );

    // Change URL
    rerender({ url: 'https://example.com/image2.jpg' });

    await waitFor(() => {
      expect(mockImageOptimizer.optimizeImage).toHaveBeenCalledWith(
        'https://example.com/image2.jpg',
        expect.any(Object)
      );
    });
  });
});

describe('useBatchImageOptimization', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    mockImageOptimizer.optimizeImage.mockImplementation((url) =>
      Promise.resolve({
        url: `${url}?optimized=webp`,
        fallbackUrl: `${url}?optimized=jpg`,
        width: 800,
        height: 600,
        size: 50000,
        format: 'webp',
        progressive: true
      })
    );
  });

  it('should optimize multiple images', async () => {
    const urls = [
      'https://example.com/image1.jpg',
      'https://example.com/image2.jpg',
      'https://example.com/image3.jpg'
    ];

    const { result } = renderHook(() =>
      useBatchImageOptimization(urls)
    );

    expect(result.current.loading).toBe(true);

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.optimizedImages).toHaveLength(3);
    expect(result.current.progress).toBe(100);
    expect(mockImageOptimizer.optimizeImage).toHaveBeenCalledTimes(3);
  });

  it('should handle empty URL array', async () => {
    const { result } = renderHook(() =>
      useBatchImageOptimization([])
    );

    expect(result.current.optimizedImages).toEqual([]);
    expect(result.current.progress).toBe(0);
    expect(result.current.loading).toBe(false);
  });

  it('should handle partial failures', async () => {
    mockImageOptimizer.optimizeImage
      .mockResolvedValueOnce({
        url: 'https://example.com/image1.webp',
        fallbackUrl: 'https://example.com/image1.jpg',
        width: 800,
        height: 600,
        size: 50000,
        format: 'webp',
        progressive: true
      })
      .mockRejectedValueOnce(new Error('Failed'))
      .mockResolvedValueOnce({
        url: 'https://example.com/image3.webp',
        fallbackUrl: 'https://example.com/image3.jpg',
        width: 800,
        height: 600,
        size: 50000,
        format: 'webp',
        progressive: true
      });

    const urls = [
      'https://example.com/image1.jpg',
      'https://example.com/image2.jpg',
      'https://example.com/image3.jpg'
    ];

    const { result } = renderHook(() =>
      useBatchImageOptimization(urls)
    );

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.optimizedImages).toHaveLength(3);
    expect(result.current.optimizedImages[0]).not.toBeNull();
    expect(result.current.optimizedImages[1]).toBeNull(); // Failed
    expect(result.current.optimizedImages[2]).not.toBeNull();
  });
});

describe('useProgressiveImageLoading', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock different quality versions
    mockImageOptimizer.optimizeImage
      .mockImplementationOnce(() =>
        Promise.resolve({
          url: 'https://example.com/low-quality.webp',
          fallbackUrl: 'https://example.com/low-quality.jpg',
          width: 200,
          height: 150,
          size: 10000,
          format: 'webp',
          progressive: false
        })
      )
      .mockImplementationOnce(() =>
        Promise.resolve({
          url: 'https://example.com/high-quality.webp',
          fallbackUrl: 'https://example.com/high-quality.jpg',
          width: 800,
          height: 600,
          size: 80000,
          format: 'webp',
          progressive: true
        })
      );

    // Mock Image constructor for progressive loading
    global.Image = class {
      onload: (() => void) | null = null;
      onerror: (() => void) | null = null;
      src: string = '';

      constructor() {
        setTimeout(() => {
          this.onload?.();
        }, 100);
      }
    } as any;
  });

  it('should provide progressive loading URLs', async () => {
    const { result } = renderHook(() =>
      useProgressiveImageLoading('https://example.com/image.jpg', {
        width: 800,
        height: 600
      })
    );

    expect(result.current.loading).toBe(true);

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.lowQualityUrl).toBe('https://example.com/low-quality.webp');
    expect(result.current.highQualityUrl).toBe('https://example.com/high-quality.webp');
    expect(result.current.currentUrl).toBe('https://example.com/high-quality.webp');
  });

  it('should start with low quality image', async () => {
    const { result } = renderHook(() =>
      useProgressiveImageLoading('https://example.com/image.jpg')
    );

    // Initially should show low quality
    await waitFor(() => {
      expect(result.current.lowQualityUrl).toBe('https://example.com/low-quality.webp');
    });

    // Should have low quality as current initially
    expect(result.current.currentUrl).toBe('https://example.com/low-quality.webp');
  });

  it('should handle null URL', async () => {
    const { result } = renderHook(() =>
      useProgressiveImageLoading(null)
    );

    expect(result.current.lowQualityUrl).toBeNull();
    expect(result.current.highQualityUrl).toBeNull();
    expect(result.current.currentUrl).toBeNull();
    expect(result.current.loading).toBe(false);
  });
});