/**
 * Static PDF Viewer Fallback Component
 * 
 * Provides a simple iframe-based PDF viewer when flipbook fails
 * Phase-1: Iframe-only implementation (no PDF.js, no react-pdf)
 * Requirements: 18.1, 18.4
 */

'use client';

import React, { useState } from 'react';

export interface StaticPDFViewerProps {
  /**
   * PDF file URL
   */
  file: string;

  /**
   * Document title
   */
  title?: string;

  /**
   * Watermark text
   */
  watermark?: string;

  /**
   * Allow download
   */
  allowDownload?: boolean;

  /**
   * Callback when document loads successfully
   */
  onLoadSuccess?: () => void;

  /**
   * Callback when document fails to load
   */
  onLoadError?: (error: Error) => void;

  /**
   * Additional CSS classes
   */
  className?: string;
}

/**
 * Static PDF Viewer Component - Iframe Only (Phase 1)
 */
export function StaticPDFViewer({
  file,
  title,
  watermark,
  allowDownload = false,
  onLoadSuccess,
  onLoadError,
  className = '',
}: StaticPDFViewerProps) {
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);

  const handleIframeLoad = () => {
    setIsLoading(false);
    setError(null);
    onLoadSuccess?.();
  };

  const handleIframeError = () => {
    const error = new Error('Failed to load PDF in iframe');
    setIsLoading(false);
    setError(error);
    onLoadError?.(error);
  };

  if (error) {
    return (
      <div className={`flex items-center justify-center min-h-[400px] ${className}`}>
        <div className="text-center p-6">
          <svg
            className="mx-auto h-12 w-12 text-red-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
          <h3 className="mt-2 text-lg font-medium text-gray-900 dark:text-gray-100">
            Failed to Load PDF
          </h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            {error.message}
          </p>
          {allowDownload && (
            <button
              onClick={() => window.open(file, '_blank')}
              className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              Download PDF
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className={`static-pdf-viewer ${className}`}>
      {/* Header */}
      <div className="bg-gray-100 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-4">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            {title && (
              <h2 className="text-lg font-medium text-gray-900 dark:text-gray-100 truncate">
                {title}
              </h2>
            )}
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Static PDF Viewer (Iframe Mode - Phase 1)
            </p>
          </div>
          
          {/* Controls */}
          <div className="flex items-center gap-2">
            {/* Download Button */}
            {allowDownload && (
              <button
                onClick={() => window.open(file, '_blank')}
                className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700"
                title="Download PDF"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                  />
                </svg>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* PDF Content - Iframe Only */}
      <div className="relative overflow-hidden bg-gray-50 dark:bg-gray-900">
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-50 dark:bg-gray-900 z-10">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-4 text-sm text-gray-600 dark:text-gray-400">Loading PDF...</p>
            </div>
          </div>
        )}

        <div 
          className="w-full bg-black"
          style={{ height: 'calc(100vh - 120px)', minHeight: 600 }}
        >
          <iframe
            src={file}
            title={title || 'PDF Viewer'}
            className="w-full h-full"
            sandbox="allow-same-origin allow-scripts allow-forms"
            onLoad={handleIframeLoad}
            onError={handleIframeError}
          />

          {/* Watermark Overlay */}
          {watermark && (
            <div
              className="absolute inset-0 pointer-events-none flex items-center justify-center"
              style={{
                background: 'transparent',
              }}
            >
              <div
                className="text-gray-400 opacity-20 text-4xl font-bold transform rotate-[-45deg] select-none"
                style={{
                  textShadow: '2px 2px 4px rgba(0,0,0,0.1)',
                }}
              >
                {watermark}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default StaticPDFViewer;
