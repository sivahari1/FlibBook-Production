'use client';

import React from 'react';

export interface WatermarkOverlayProps {
  text: string;
  opacity?: number;
  fontSize?: number;
  imageUrl?: string;
}

/**
 * WatermarkOverlay - Displays watermark text or image over document content
 * 
 * Positioned above content with high z-index to ensure visibility while
 * not interfering with navigation controls. Supports both text and image watermarks.
 * 
 * Requirements: 8.5
 */
export default function WatermarkOverlay({
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
        // Image watermark
        <img
          src={imageUrl}
          alt="Watermark"
          className="max-w-full max-h-full object-contain"
          style={{
            opacity: opacity,
          }}
        />
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