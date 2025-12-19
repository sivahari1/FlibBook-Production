/**
 * Optimized Image Component
 * 
 * Provides WebP format with JPEG fallback, adaptive quality based on network speed,
 * and progressive loading for document page images.
 */

'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useImageOptimization, useProgressiveImageLoading } from '@/hooks/useImageOptimization';
import { cn } from '@/lib/utils';

export interface OptimizedImageProps {
  /** Image source URL */
  src: string;
  /** Alternative text */
  alt: string;
  /** Image width */
  width?: number;
  /** Image height */
  height?: number;
  /** CSS class name */
  className?: string;
  /** Loading priority */
  priority?: 'high' | 'normal' | 'low';
  /** Whether to use progressive loading */
  progressive?: boolean;
  /** Responsive image sizes */
  responsiveSizes?: number[];
  /** Quality override */
  quality?: number;
  /** Network speed hint */
  networkSpeed?: 'slow' | 'fast' | 'auto';
  /** Loading placeholder */
  placeholder?: React.ReactNode;
  /** Error fallback */
  errorFallback?: React.ReactNode;
  /** Callback when image loads */
  onLoad?: () => void;
  /** Callback when image fails to load */
  onError?: (error: string) => void;
  /** Whether to show loading state */
  showLoading?: boolean;
  /** Custom loading component */
  loadingComponent?: React.ReactNode;
}

export function OptimizedImage({
  src,
  alt,
  width,
  height,
  className,
  priority = 'normal',
  progressive = true,
  responsiveSizes,
  quality,
  networkSpeed = 'auto',
  placeholder,
  errorFallback,
  onLoad,
  onError,
  showLoading = true,
  loadingComponent
}: OptimizedImageProps) {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);

  // Use progressive loading if enabled
  const progressiveResult = useProgressiveImageLoading(
    progressive ? src : null,
    {
      width,
      height,
      quality,
      networkSpeed,
      preload: priority === 'high',
      responsiveSizes
    }
  );

  // Use regular optimization if progressive is disabled
  const regularResult = useImageOptimization(
    !progressive ? src : null,
    {
      width,
      height,
      quality,
      networkSpeed,
      preload: priority === 'high',
      responsiveSizes
    }
  );

  // Determine which result to use
  const result = progressive ? progressiveResult : regularResult;
  const imageUrl = progressive ? result.currentUrl : result.optimizedImage?.url;
  const fallbackUrl = progressive ? null : result.optimizedImage?.fallbackUrl;

  // Handle image load
  const handleImageLoad = () => {
    setImageLoaded(true);
    setImageError(false);
    onLoad?.();
  };

  // Handle image error
  const handleImageError = () => {
    setImageError(true);
    const errorMessage = result.error || 'Failed to load image';
    onError?.(errorMessage);

    // Try fallback URL if available
    if (fallbackUrl && imgRef.current) {
      imgRef.current.src = fallbackUrl;
    }
  };

  // Preload high priority images
  useEffect(() => {
    if (priority === 'high' && imageUrl) {
      const link = document.createElement('link');
      link.rel = 'preload';
      link.as = 'image';
      link.href = imageUrl;
      document.head.appendChild(link);

      return () => {
        document.head.removeChild(link);
      };
    }
  }, [imageUrl, priority]);

  // Show loading state
  if (result.loading && showLoading) {
    if (loadingComponent) {
      return <>{loadingComponent}</>;
    }

    return (
      <div 
        className={cn(
          "flex items-center justify-center bg-gray-100 animate-pulse",
          className
        )}
        style={{ width, height }}
      >
        <div className="text-gray-400 text-sm">Loading...</div>
      </div>
    );
  }

  // Show error state
  if (result.error || imageError) {
    if (errorFallback) {
      return <>{errorFallback}</>;
    }

    return (
      <div 
        className={cn(
          "flex items-center justify-center bg-gray-100 border-2 border-dashed border-gray-300",
          className
        )}
        style={{ width, height }}
      >
        <div className="text-gray-500 text-sm text-center p-4">
          <div>Failed to load image</div>
          {result.error && (
            <div className="text-xs mt-1 text-gray-400">{result.error}</div>
          )}
        </div>
      </div>
    );
  }

  // Show placeholder while image loads
  if (!imageLoaded && placeholder) {
    return (
      <>
        {placeholder}
        {imageUrl && (
          <img
            ref={imgRef}
            src={imageUrl}
            alt={alt}
            width={width}
            height={height}
            className="hidden"
            onLoad={handleImageLoad}
            onError={handleImageError}
          />
        )}
      </>
    );
  }

  // Render optimized image
  if (!imageUrl) {
    return null;
  }

  return (
    <img
      ref={imgRef}
      src={imageUrl}
      alt={alt}
      width={width}
      height={height}
      className={cn(
        "transition-opacity duration-300",
        imageLoaded ? "opacity-100" : "opacity-0",
        className
      )}
      onLoad={handleImageLoad}
      onError={handleImageError}
      loading={priority === 'high' ? 'eager' : 'lazy'}
      decoding="async"
    />
  );
}

/**
 * Responsive Optimized Image Component
 */
export interface ResponsiveOptimizedImageProps extends Omit<OptimizedImageProps, 'responsiveSizes'> {
  /** Responsive breakpoints and sizes */
  sizes: string;
  /** Source set for different screen sizes */
  srcSet?: { size: number; descriptor: string }[];
}

export function ResponsiveOptimizedImage({
  src,
  alt,
  sizes,
  srcSet = [
    { size: 320, descriptor: '320w' },
    { size: 640, descriptor: '640w' },
    { size: 1024, descriptor: '1024w' },
    { size: 1920, descriptor: '1920w' }
  ],
  ...props
}: ResponsiveOptimizedImageProps) {
  const responsiveSizes = srcSet.map(item => item.size);
  
  const { responsiveImages, loading, error } = useImageOptimization(src, {
    ...props,
    responsiveSizes
  });

  // Build srcSet string
  const srcSetString = responsiveImages
    .map((img, index) => img ? `${img.url} ${srcSet[index].descriptor}` : '')
    .filter(Boolean)
    .join(', ');

  if (loading || error || responsiveImages.length === 0) {
    return (
      <OptimizedImage
        src={src}
        alt={alt}
        {...props}
      />
    );
  }

  return (
    <img
      src={responsiveImages[0]?.url || src}
      srcSet={srcSetString}
      sizes={sizes}
      alt={alt}
      className={props.className}
      loading={props.priority === 'high' ? 'eager' : 'lazy'}
      decoding="async"
    />
  );
}

/**
 * Progressive Image Component with Blur Effect
 */
export interface ProgressiveImageProps extends OptimizedImageProps {
  /** Blur intensity for low quality placeholder */
  blurIntensity?: number;
}

export function ProgressiveImage({
  src,
  alt,
  blurIntensity = 10,
  ...props
}: ProgressiveImageProps) {
  const { lowQualityUrl, currentUrl, loading } = useProgressiveImageLoading(src, props);
  const [highQualityLoaded, setHighQualityLoaded] = useState(false);

  useEffect(() => {
    if (currentUrl === lowQualityUrl) {
      setHighQualityLoaded(false);
    } else {
      setHighQualityLoaded(true);
    }
  }, [currentUrl, lowQualityUrl]);

  return (
    <div className={cn("relative overflow-hidden", props.className)}>
      {/* Low quality placeholder */}
      {lowQualityUrl && (
        <img
          src={lowQualityUrl}
          alt={alt}
          className={cn(
            "absolute inset-0 w-full h-full object-cover transition-all duration-500",
            highQualityLoaded ? "opacity-0 scale-110" : "opacity-100",
            `blur-[${blurIntensity}px]`
          )}
        />
      )}
      
      {/* High quality image */}
      {currentUrl && (
        <img
          src={currentUrl}
          alt={alt}
          width={props.width}
          height={props.height}
          className={cn(
            "relative w-full h-full object-cover transition-opacity duration-500",
            highQualityLoaded ? "opacity-100" : "opacity-0"
          )}
          loading={props.priority === 'high' ? 'eager' : 'lazy'}
          decoding="async"
        />
      )}
      
      {/* Loading overlay */}
      {loading && props.showLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-20">
          <div className="text-white text-sm">Loading...</div>
        </div>
      )}
    </div>
  );
}