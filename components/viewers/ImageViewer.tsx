'use client';

import { useState, useEffect } from 'react';
import DRMProtection from '../security/DRMProtection';
import DevToolsDetector from '../security/DevToolsDetector';
import { ImageMetadata, WatermarkConfig } from '@/lib/types/content';

interface ImageViewerProps {
  imageUrl: string;
  metadata: ImageMetadata;
  watermark?: WatermarkConfig;
  allowZoom?: boolean;
  allowDownload?: boolean;
  title?: string;
}

export default function ImageViewer({
  imageUrl,
  metadata,
  watermark,
  allowZoom = true,
  allowDownload = false,
  title
}: ImageViewerProps) {
  const [scale, setScale] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [imageLoaded, setImageLoaded] = useState(false);

  // Format file size for display
  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  // Handle image load
  const handleImageLoad = () => {
    setImageLoaded(true);
    setLoading(false);
  };

  // Handle image error
  const handleImageError = () => {
    setError('Failed to load image');
    setLoading(false);
  };

  // Zoom controls
  const zoomIn = () => {
    if (allowZoom) {
      setScale(Math.min(scale + 0.25, 3));
    }
  };

  const zoomOut = () => {
    if (allowZoom) {
      setScale(Math.max(scale - 0.25, 0.5));
    }
  };

  const resetZoom = () => {
    if (allowZoom) {
      setScale(1);
    }
  };

  // Keyboard shortcuts for zoom
  useEffect(() => {
    if (!allowZoom) return;

    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.key === '+' || e.key === '=') {
        e.preventDefault();
        zoomIn();
      } else if (e.key === '-' || e.key === '_') {
        e.preventDefault();
        zoomOut();
      } else if (e.key === '0') {
        e.preventDefault();
        resetZoom();
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [scale, allowZoom]);

  return (
    <DRMProtection>
      <DevToolsDetector />
      <div className="bg-gray-100 dark:bg-slate-900 min-h-screen py-8">
        <div className="max-w-6xl mx-auto px-4">
          {/* Header with title */}
          {title && (
            <div className="bg-white dark:bg-slate-800 rounded-lg shadow-md p-4 mb-4">
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                {title}
              </h1>
            </div>
          )}

          {/* Controls Bar */}
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-md p-4 mb-6">
            <div className="flex items-center justify-between flex-wrap gap-4">
              {/* Metadata Display */}
              <div className="flex items-center gap-6 text-sm text-gray-700 dark:text-gray-300">
                <div className="flex items-center gap-2">
                  <span className="font-medium">Dimensions:</span>
                  <span>{metadata.width} × {metadata.height} px</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-medium">Size:</span>
                  <span>{formatFileSize(metadata.fileSize)}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-medium">Type:</span>
                  <span>{metadata.mimeType}</span>
                </div>
              </div>

              {/* Zoom Controls */}
              {allowZoom && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={zoomOut}
                    disabled={scale <= 0.5}
                    className="px-3 py-1 bg-gray-200 dark:bg-slate-700 hover:bg-gray-300 dark:hover:bg-slate-600 rounded text-gray-700 dark:text-gray-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    title="Zoom out (-)"
                  >
                    −
                  </button>
                  <button
                    onClick={resetZoom}
                    className="px-3 py-1 bg-gray-200 dark:bg-slate-700 hover:bg-gray-300 dark:hover:bg-slate-600 rounded text-gray-700 dark:text-gray-300 min-w-[70px] transition-colors"
                    title="Reset zoom (0)"
                  >
                    {Math.round(scale * 100)}%
                  </button>
                  <button
                    onClick={zoomIn}
                    disabled={scale >= 3}
                    className="px-3 py-1 bg-gray-200 dark:bg-slate-700 hover:bg-gray-300 dark:hover:bg-slate-600 rounded text-gray-700 dark:text-gray-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    title="Zoom in (+)"
                  >
                    +
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Image Container */}
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-md p-8 overflow-auto">
            {loading && (
              <div className="flex items-center justify-center min-h-[400px]">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                  <p className="text-gray-600 dark:text-gray-300">Loading image...</p>
                </div>
              </div>
            )}

            {error && (
              <div className="flex items-center justify-center min-h-[400px]">
                <div className="text-center">
                  <div className="text-red-600 dark:text-red-400 text-6xl mb-4">⚠️</div>
                  <h2 className="text-2xl font-bold mb-2 text-gray-900 dark:text-white">
                    Error Loading Image
                  </h2>
                  <p className="text-gray-600 dark:text-gray-300">{error}</p>
                </div>
              </div>
            )}

            {!error && (
              <div className="relative flex items-center justify-center">
                <div
                  className="relative inline-block"
                  style={{
                    transform: `scale(${scale})`,
                    transformOrigin: 'center',
                    transition: 'transform 0.2s ease-in-out',
                  }}
                >
                  <img
                    src={imageUrl}
                    alt={title || 'Image'}
                    onLoad={handleImageLoad}
                    onError={handleImageError}
                    className={`max-w-full h-auto ${loading ? 'hidden' : 'block'}`}
                    style={{
                      maxHeight: '80vh',
                      userSelect: 'none',
                      WebkitUserSelect: 'none',
                      pointerEvents: allowDownload ? 'auto' : 'none',
                    }}
                    draggable={false}
                    onContextMenu={(e) => {
                      if (!allowDownload) {
                        e.preventDefault();
                      }
                    }}
                  />

                  {/* Watermark Overlay */}
                  {watermark && imageLoaded && (
                    <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                      <div 
                        className="text-gray-500 dark:text-gray-400 font-semibold select-none"
                        style={{
                          opacity: watermark.opacity || 0.3,
                          fontSize: `${watermark.fontSize || 16}px`,
                          transform: 'rotate(-45deg)',
                          userSelect: 'none',
                          WebkitUserSelect: 'none',
                        }}
                      >
                        {watermark.text}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Keyboard Shortcuts Help */}
          {allowZoom && (
            <div className="mt-4 text-center text-sm text-gray-500 dark:text-gray-400">
              <p>
                Keyboard shortcuts: <kbd className="px-2 py-1 bg-gray-200 dark:bg-slate-700 rounded">+</kbd> zoom in,{' '}
                <kbd className="px-2 py-1 bg-gray-200 dark:bg-slate-700 rounded">-</kbd> zoom out,{' '}
                <kbd className="px-2 py-1 bg-gray-200 dark:bg-slate-700 rounded">0</kbd> reset
              </p>
            </div>
          )}
        </div>
      </div>
    </DRMProtection>
  );
}
