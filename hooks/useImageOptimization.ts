/**
 * React Hook for Image Optimization
 * 
 * Provides optimized images with WebP/JPEG fallback, adaptive quality,
 * and progressive loading capabilities.
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { imageOptimizer, ImageOptimizationOptions, OptimizedImage, NetworkSpeedInfo } from '@/lib/services/image-optimizer';

export interface UseImageOptimizationOptions extends ImageOptimizationOptions {
  /** Whether to preload the image */
  preload?: boolean;
  /** Responsive image sizes */
  responsiveSizes?: number[];
  /** Loading priority */
  priority?: 'high' | 'normal' | 'low';
}

export interface UseImageOptimizationResult {
  /** Optimized image data */
  optimizedImage: OptimizedImage | null;
  /** Responsive images for different sizes */
  responsiveImages: OptimizedImage[];
  /** Loading state */
  loading: boolean;
  /** Error state */
  error: string | null;
  /** Network information */
  networkInfo: NetworkSpeedInfo | null;
  /** WebP support status */
  webpSupported: boolean;
  /** Preload function */
  preload: () => Promise<void>;
  /** Retry optimization */
  retry: () => void;
}

export function useImageOptimization(
  imageUrl: string | null,
  options: UseImageOptimizationOptions = {}
): UseImageOptimizationResult {
  const [optimizedImage, setOptimizedImage] = useState<OptimizedImage | null>(null);
  const [responsiveImages, setResponsiveImages] = useState<OptimizedImage[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [networkInfo, setNetworkInfo] = useState<NetworkSpeedInfo | null>(null);
  const [webpSupported, setWebpSupported] = useState(false);

  // Memoize optimization options to prevent unnecessary re-renders
  const optimizationOptions = useMemo(() => ({
    width: options.width,
    height: options.height,
    quality: options.quality,
    progressive: options.progressive,
    networkSpeed: options.networkSpeed,
    format: options.format
  }), [
    options.width,
    options.height,
    options.quality,
    options.progressive,
    options.networkSpeed,
    options.format
  ]);

  // Initialize network info and WebP support
  useEffect(() => {
    const initializeCapabilities = async () => {
      const networkData = imageOptimizer.getNetworkInfo();
      const webpSupport = await imageOptimizer.isWebPSupported();
      
      setNetworkInfo(networkData);
      setWebpSupported(webpSupport);
    };

    initializeCapabilities();
  }, []);

  // Optimize image when URL or options change
  const optimizeImage = useCallback(async () => {
    if (!imageUrl) {
      setOptimizedImage(null);
      setResponsiveImages([]);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Optimize main image
      const optimized = await imageOptimizer.optimizeImage(imageUrl, optimizationOptions);
      setOptimizedImage(optimized);

      // Generate responsive images if sizes are specified
      if (options.responsiveSizes && options.responsiveSizes.length > 0) {
        const responsive = await imageOptimizer.getResponsiveImages(
          imageUrl,
          options.responsiveSizes,
          optimizationOptions
        );
        setResponsiveImages(responsive);
      }

      // Preload if requested
      if (options.preload) {
        await imageOptimizer.preloadImage(optimized.url, optimized.fallbackUrl);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to optimize image';
      setError(errorMessage);
      console.error('Image optimization failed:', err);
    } finally {
      setLoading(false);
    }
  }, [imageUrl, optimizationOptions, options.responsiveSizes, options.preload]);

  // Preload function
  const preload = useCallback(async () => {
    if (!optimizedImage) return;
    
    try {
      await imageOptimizer.preloadImage(optimizedImage.url, optimizedImage.fallbackUrl);
    } catch (err) {
      console.warn('Image preload failed:', err);
    }
  }, [optimizedImage]);

  // Retry function
  const retry = useCallback(() => {
    optimizeImage();
  }, [optimizeImage]);

  // Run optimization when dependencies change
  useEffect(() => {
    optimizeImage();
  }, [optimizeImage]);

  return {
    optimizedImage,
    responsiveImages,
    loading,
    error,
    networkInfo,
    webpSupported,
    preload,
    retry
  };
}

/**
 * Hook for batch image optimization
 */
export function useBatchImageOptimization(
  imageUrls: string[],
  options: UseImageOptimizationOptions = {}
): {
  optimizedImages: (OptimizedImage | null)[];
  loading: boolean;
  error: string | null;
  progress: number;
} {
  const [optimizedImages, setOptimizedImages] = useState<(OptimizedImage | null)[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (imageUrls.length === 0) {
      setOptimizedImages([]);
      setProgress(0);
      return;
    }

    const optimizeBatch = async () => {
      setLoading(true);
      setError(null);
      setProgress(0);

      const results: (OptimizedImage | null)[] = new Array(imageUrls.length).fill(null);
      let completed = 0;

      try {
        const promises = imageUrls.map(async (url, index) => {
          try {
            const optimized = await imageOptimizer.optimizeImage(url, options);
            results[index] = optimized;
          } catch (err) {
            console.error(`Failed to optimize image ${index}:`, err);
            results[index] = null;
          } finally {
            completed++;
            setProgress((completed / imageUrls.length) * 100);
            setOptimizedImages([...results]);
          }
        });

        await Promise.all(promises);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Batch optimization failed';
        setError(errorMessage);
      } finally {
        setLoading(false);
      }
    };

    optimizeBatch();
  }, [imageUrls, options]);

  return {
    optimizedImages,
    loading,
    error,
    progress
  };
}

/**
 * Hook for progressive image loading
 */
export function useProgressiveImageLoading(
  imageUrl: string | null,
  options: UseImageOptimizationOptions = {}
): {
  lowQualityUrl: string | null;
  highQualityUrl: string | null;
  currentUrl: string | null;
  loading: boolean;
  error: string | null;
} {
  const [lowQualityUrl, setLowQualityUrl] = useState<string | null>(null);
  const [highQualityUrl, setHighQualityUrl] = useState<string | null>(null);
  const [currentUrl, setCurrentUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!imageUrl) {
      setLowQualityUrl(null);
      setHighQualityUrl(null);
      setCurrentUrl(null);
      return;
    }

    const loadProgressively = async () => {
      setLoading(true);
      setError(null);

      try {
        // Generate low quality version (small size, low quality)
        const lowQuality = await imageOptimizer.optimizeImage(imageUrl, {
          ...options,
          width: Math.min(options.width || 800, 200),
          quality: 30,
          progressive: false
        });

        // Generate high quality version
        const highQuality = await imageOptimizer.optimizeImage(imageUrl, {
          ...options,
          progressive: true
        });

        setLowQualityUrl(lowQuality.url);
        setHighQualityUrl(highQuality.url);
        setCurrentUrl(lowQuality.url);

        // Preload high quality image
        const img = new Image();
        img.onload = () => {
          setCurrentUrl(highQuality.url);
          setLoading(false);
        };
        img.onerror = () => {
          setError('Failed to load high quality image');
          setLoading(false);
        };
        img.src = highQuality.url;

      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Progressive loading failed';
        setError(errorMessage);
        setLoading(false);
      }
    };

    loadProgressively();
  }, [imageUrl, options]);

  return {
    lowQualityUrl,
    highQualityUrl,
    currentUrl,
    loading,
    error
  };
}