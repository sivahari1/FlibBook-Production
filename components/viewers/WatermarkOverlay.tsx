'use client';

import React from 'react';
import Image from 'next/image';

export interface WatermarkOverlayProps {
  text: string;
  opacity?: number;
  fontSize?: number;
  imageUrl?: string;
}

/**
 * Utility function to check if URL is external
 */
function isExternalUrl(url: string): boolean {
  try {
    const urlObj = new URL(url);
    return urlObj.origin !== window.location.origin;
  } catch {
    // If URL parsing fails, assume it's a relative path (internal)
    return false;
  }
}

/**
 * WatermarkOverlay - Displays watermark text or image over document content
 * 
 * Positioned above content with high z-index to ensure visibility while
 * not interfering with navigation controls. Supports both text and image watermarks.
 * 
 * Uses Next.js Image component for optimization when possible, falls back to
 * unoptimized loading for external URLs.
 * 
 * Requirements: 8.5
 */
function WatermarkOverlay({
  text,
  opacity = 0.2,
  fontSize = 24,
  imageUrl,
}: WatermarkOverlayProps) {
  // Don't render if no text and no image
  if (!text?.trim() && !imageUrl) {
    return null;
  }

  return (
    <div
      className="absolute inset-0 flex items-center justify-center pointer-events-none"
      aria-hidden="true"
      data-testid="watermark-overlay"
      style={{
        zIndex: 10, // Above content but below navigation controls
        opacity,
        pointerEvents: 'none',
        background: imageUrl 
          ? undefined 
          : 'repeating-linear-gradient(45deg, transparent, transparent 100px, rgba(0,0,0,0.02) 100px, rgba(0,0,0,0.02) 200px)',
      }}
    >
      {imageUrl ? (
        // Image watermark - optimized with Next.js Image when possible
        <div className="relative w-full h-full flex items-center justify-center">
          <Image
            src={imageUrl}
            alt="Watermark"
            fill
            className="object-contain"
            style={{
              opacity: opacity,
            }}
            unoptimized={isExternalUrl(imageUrl)}
            priority={false}
          />
        </div>
      ) : (
        // Text watermark
        <div
          className="text-gray-600 font-bold select-none transform rotate-45"
          style={{
            fontSize: `${fontSize}px`,
            textShadow: '1px 1px 2px rgba(255,255,255,0.5)',
            letterSpacing: '0.1em',
          }}
        >
          {text}
        </div>
      )}
    </div>
  );
}

WatermarkOverlay.displayName = 'WatermarkOverlay';

export default WatermarkOverlay;