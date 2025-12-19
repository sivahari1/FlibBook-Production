/**
 * Tests for OptimizedImage Component
 */

import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { OptimizedImage, ResponsiveOptimizedImage, ProgressiveImage } from '../OptimizedImage';
import { useImageOptimization, useProgressiveImageLoading } from '@/hooks/useImageOptimization';

// Mock the hooks
jest.mock('@/hooks/useImageOptimization', () => ({
  useImageOptimization: jest.fn(),
  useProgressiveImageLoading: jest.fn()
}));

const mockUseImageOptimization = useImageOptimization as jest.MockedFunction<typeof useImageOptimization>;
const mockUseProgressiveImageLoading = useProgressiveImageLoading as jest.MockedFunction<typeof useProgressiveImageLoading>;

describe('OptimizedImage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Default mock implementation
    mockUseImageOptimization.mockReturnValue({
      optimizedImage: {
        url: 'https://example.com/optimized.webp',
        fallbackUrl: 'https://example.com/optimized.jpg',
        width: 800,
        height: 600,
        size: 50000,
        format: 'webp',
        progressive: true
      },
      responsiveImages: [],
      loading: false,
      error: null,
      networkInfo: null,
      webpSupported: true,
      preload: jest.fn(),
      retry: jest.fn()
    });

    mockUseProgressiveImageLoading.mockReturnValue({
      lowQualityUrl: null,
      highQualityUrl: null,
      currentUrl: null,
      loading: false,
      error: null
    });
  });

  it('should render optimized image', async () => {
    render(
      <OptimizedImage
        src="https://example.com/image.jpg"
        alt="Test image"
        width={800}
        height={600}
      />
    );

    await waitFor(() => {
      const img = screen.getByRole('img');
      expect(img).toBeInTheDocument();
      expect(img).toHaveAttribute('src', 'https://example.com/optimized.webp');
      expect(img).toHaveAttribute('alt', 'Test image');
      expect(img).toHaveAttribute('width', '800');
      expect(img).toHaveAttribute('height', '600');
    });
  });

  it('should show loading state', () => {
    mockUseImageOptimization.mockReturnValue({
      optimizedImage: null,
      responsiveImages: [],
      loading: true,
      error: null,
      networkInfo: null,
      webpSupported: true,
      preload: jest.fn(),
      retry: jest.fn()
    });

    render(
      <OptimizedImage
        src="https://example.com/image.jpg"
        alt="Test image"
        showLoading={true}
      />
    );

    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('should show custom loading component', () => {
    mockUseImageOptimization.mockReturnValue({
      optimizedImage: null,
      responsiveImages: [],
      loading: true,
      error: null,
      networkInfo: null,
      webpSupported: true,
      preload: jest.fn(),
      retry: jest.fn()
    });

    render(
      <OptimizedImage
        src="https://example.com/image.jpg"
        alt="Test image"
        loadingComponent={<div>Custom loading...</div>}
      />
    );

    expect(screen.getByText('Custom loading...')).toBeInTheDocument();
  });

  it('should show error state', () => {
    mockUseImageOptimization.mockReturnValue({
      optimizedImage: null,
      responsiveImages: [],
      loading: false,
      error: 'Failed to optimize image',
      networkInfo: null,
      webpSupported: true,
      preload: jest.fn(),
      retry: jest.fn()
    });

    render(
      <OptimizedImage
        src="https://example.com/image.jpg"
        alt="Test image"
      />
    );

    expect(screen.getByText('Failed to load image')).toBeInTheDocument();
    expect(screen.getByText('Failed to optimize image')).toBeInTheDocument();
  });

  it('should show custom error fallback', () => {
    mockUseImageOptimization.mockReturnValue({
      optimizedImage: null,
      responsiveImages: [],
      loading: false,
      error: 'Failed to optimize image',
      networkInfo: null,
      webpSupported: true,
      preload: jest.fn(),
      retry: jest.fn()
    });

    render(
      <OptimizedImage
        src="https://example.com/image.jpg"
        alt="Test image"
        errorFallback={<div>Custom error message</div>}
      />
    );

    expect(screen.getByText('Custom error message')).toBeInTheDocument();
  });

  it('should call onLoad callback', async () => {
    const onLoad = jest.fn();

    render(
      <OptimizedImage
        src="https://example.com/image.jpg"
        alt="Test image"
        onLoad={onLoad}
      />
    );

    const img = screen.getByRole('img');
    fireEvent.load(img);

    expect(onLoad).toHaveBeenCalled();
  });

  it('should call onError callback and try fallback', async () => {
    const onError = jest.fn();

    render(
      <OptimizedImage
        src="https://example.com/image.jpg"
        alt="Test image"
        onError={onError}
      />
    );

    const img = screen.getByRole('img');
    fireEvent.error(img);

    expect(onError).toHaveBeenCalledWith(expect.any(String));
    expect(img).toHaveAttribute('src', 'https://example.com/optimized.jpg');
  });

  it('should use progressive loading when enabled', () => {
    mockUseProgressiveImageLoading.mockReturnValue({
      lowQualityUrl: 'https://example.com/low.webp',
      highQualityUrl: 'https://example.com/high.webp',
      currentUrl: 'https://example.com/high.webp',
      loading: false,
      error: null
    });

    render(
      <OptimizedImage
        src="https://example.com/image.jpg"
        alt="Test image"
        progressive={true}
      />
    );

    expect(mockUseProgressiveImageLoading).toHaveBeenCalledWith(
      'https://example.com/image.jpg',
      expect.any(Object)
    );

    const img = screen.getByRole('img');
    expect(img).toHaveAttribute('src', 'https://example.com/high.webp');
  });

  it('should set loading attribute based on priority', () => {
    render(
      <OptimizedImage
        src="https://example.com/image.jpg"
        alt="Test image"
        priority="high"
      />
    );

    const img = screen.getByRole('img');
    expect(img).toHaveAttribute('loading', 'eager');
  });

  it('should set lazy loading for normal priority', () => {
    render(
      <OptimizedImage
        src="https://example.com/image.jpg"
        alt="Test image"
        priority="normal"
      />
    );

    const img = screen.getByRole('img');
    expect(img).toHaveAttribute('loading', 'lazy');
  });

  it('should show placeholder while loading', () => {
    render(
      <OptimizedImage
        src="https://example.com/image.jpg"
        alt="Test image"
        placeholder={<div>Image placeholder</div>}
      />
    );

    expect(screen.getByText('Image placeholder')).toBeInTheDocument();
  });
});

describe('ResponsiveOptimizedImage', () => {
  beforeEach(() => {
    mockUseImageOptimization.mockReturnValue({
      optimizedImage: {
        url: 'https://example.com/optimized.webp',
        fallbackUrl: 'https://example.com/optimized.jpg',
        width: 800,
        height: 600,
        size: 50000,
        format: 'webp',
        progressive: true
      },
      responsiveImages: [
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
      ],
      loading: false,
      error: null,
      networkInfo: null,
      webpSupported: true,
      preload: jest.fn(),
      retry: jest.fn()
    });
  });

  it('should render responsive image with srcSet', () => {
    render(
      <ResponsiveOptimizedImage
        src="https://example.com/image.jpg"
        alt="Responsive image"
        sizes="(max-width: 640px) 320px, 640px"
      />
    );

    const img = screen.getByRole('img');
    expect(img).toHaveAttribute('srcset', 'https://example.com/320.webp 320w, https://example.com/640.webp 640w');
    expect(img).toHaveAttribute('sizes', '(max-width: 640px) 320px, 640px');
  });

  it('should fallback to regular OptimizedImage when no responsive images', () => {
    mockUseImageOptimization.mockReturnValue({
      optimizedImage: null,
      responsiveImages: [],
      loading: true,
      error: null,
      networkInfo: null,
      webpSupported: true,
      preload: jest.fn(),
      retry: jest.fn()
    });

    render(
      <ResponsiveOptimizedImage
        src="https://example.com/image.jpg"
        alt="Responsive image"
        sizes="(max-width: 640px) 320px, 640px"
        showLoading={true}
      />
    );

    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });
});

describe('ProgressiveImage', () => {
  beforeEach(() => {
    mockUseProgressiveImageLoading.mockReturnValue({
      lowQualityUrl: 'https://example.com/low.webp',
      highQualityUrl: 'https://example.com/high.webp',
      currentUrl: 'https://example.com/high.webp',
      loading: false,
      error: null
    });
  });

  it('should render progressive image with blur effect', () => {
    render(
      <ProgressiveImage
        src="https://example.com/image.jpg"
        alt="Progressive image"
        blurIntensity={15}
      />
    );

    const container = screen.getByRole('img').parentElement;
    expect(container).toHaveClass('relative', 'overflow-hidden');
  });

  it('should show loading overlay when loading', () => {
    mockUseProgressiveImageLoading.mockReturnValue({
      lowQualityUrl: null,
      highQualityUrl: null,
      currentUrl: null,
      loading: true,
      error: null
    });

    render(
      <ProgressiveImage
        src="https://example.com/image.jpg"
        alt="Progressive image"
        showLoading={true}
      />
    );

    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('should handle missing progressive URLs gracefully', () => {
    mockUseProgressiveImageLoading.mockReturnValue({
      lowQualityUrl: null,
      highQualityUrl: null,
      currentUrl: null,
      loading: false,
      error: null
    });

    render(
      <ProgressiveImage
        src="https://example.com/image.jpg"
        alt="Progressive image"
      />
    );

    // Should render container even without images
    const container = screen.getByRole('generic');
    expect(container).toHaveClass('relative', 'overflow-hidden');
  });
});