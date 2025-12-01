/**
 * Flipbook with Fallback Component
 * 
 * Integrates flipbook viewer with fallback mechanisms
 * Requirements: 18.1, 18.4
 */

'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { FlipBookViewer } from '@/components/flipbook/FlipBookViewer';
import { StaticPDFViewer } from './StaticPDFViewer';
import { FlipbookErrorBoundary } from '@/components/errors/FlipbookErrorBoundary';
import {
  FallbackMode,
  decideFallback,
  recordSuccess,
  getFallbackManager,
} from '@/lib/fallback/flipbook-fallback';
import { retryOperation } from '@/lib/errors/error-handler';
import type { Document } from '@/lib/types/flipbook';

export interface FlipbookWithFallbackProps {
  /**
   * Document to display
   */
  document: Document;

  /**
   * PDF file URL (for fallback)
   */
  pdfUrl?: string;

  /**
   * Watermark text
   */
  watermark?: string;

  /**
   * Allow download in fallback mode
   */
  allowDownload?: boolean;

  /**
   * Enable automatic retry
   */
  enableAutoRetry?: boolean;

  /**
   * Maximum retry attempts
   */
  maxRetries?: number;

  /**
   * Callback when fallback mode changes
   */
  onFallbackModeChange?: (mode: FallbackMode) => void;

  /**
   * Callback when retry is attempted
   */
  onRetry?: (attempt: number) => void;

  /**
   * Additional CSS classes
   */
  className?: string;
}

/**
 * Flipbook with Fallback Component
 */
export function FlipbookWithFallback({
  document,
  pdfUrl,
  watermark,
  allowDownload = false,
  enableAutoRetry = true,
  maxRetries = 3,
  onFallbackModeChange,
  onRetry,
  className = '',
}: FlipbookWithFallbackProps) {
  const [currentMode, setCurrentMode] = useState<FallbackMode>(FallbackMode.FLIPBOOK);
  const [error, setError] = useState<Error | null>(null);
  const [retryCount, setRetryCount] = useState<number>(0);
  const [isRetrying, setIsRetrying] = useState<boolean>(false);
  const [fallbackMessage, setFallbackMessage] = useState<string>('');

  // Check if should use fallback on mount
  useEffect(() => {
    const manager = getFallbackManager();
    if (manager.shouldUseFallback(document.id)) {
      setCurrentMode(FallbackMode.STATIC_VIEWER);
      setFallbackMessage('Using static viewer due to previous failures');
      onFallbackModeChange?.(FallbackMode.STATIC_VIEWER);
    }
  }, [document.id, onFallbackModeChange]);

  /**
   * Handle error from flipbook
   */
  const handleError = useCallback(
    async (err: Error) => {
      setError(err);

      // Decide fallback mode
      const decision = decideFallback(err, document.id);
      
      setFallbackMessage(decision.fallbackData?.message || decision.reason);

      // If can retry and auto-retry is enabled
      if (decision.canRetry && enableAutoRetry && retryCount < maxRetries) {
        setIsRetrying(true);
        
        // Wait for retry delay
        if (decision.retryDelay) {
          await new Promise((resolve) => setTimeout(resolve, decision.retryDelay));
        }

        setRetryCount((prev) => prev + 1);
        onRetry?.(retryCount + 1);
        
        // Try to reload
        setError(null);
        setIsRetrying(false);
      } else {
        // Switch to fallback mode
        setCurrentMode(decision.mode);
        onFallbackModeChange?.(decision.mode);
      }
    },
    [document.id, enableAutoRetry, maxRetries, retryCount, onRetry, onFallbackModeChange]
  );

  /**
   * Handle successful load
   */
  const handleSuccess = useCallback(() => {
    recordSuccess(document.id);
    setError(null);
    setRetryCount(0);
    setIsRetrying(false);
    
    if (currentMode !== FallbackMode.FLIPBOOK) {
      setCurrentMode(FallbackMode.FLIPBOOK);
      onFallbackModeChange?.(FallbackMode.FLIPBOOK);
    }
  }, [document.id, currentMode, onFallbackModeChange]);

  /**
   * Manual retry
   */
  const handleManualRetry = useCallback(() => {
    setError(null);
    setRetryCount(0);
    setIsRetrying(false);
    setCurrentMode(FallbackMode.FLIPBOOK);
    onFallbackModeChange?.(FallbackMode.FLIPBOOK);
  }, [onFallbackModeChange]);

  /**
   * Render based on current mode
   */
  const renderContent = () => {
    switch (currentMode) {
      case FallbackMode.FLIPBOOK:
        return (
          <FlipbookErrorBoundary
            onError={(err) => handleError(err)}
            resetKeys={[document.id, retryCount]}
          >
            <FlipBookViewer
              document={document}
              watermark={watermark}
              onLoadSuccess={handleSuccess}
              onLoadError={handleError}
              className="h-full"
            />
          </FlipbookErrorBoundary>
        );

      case FallbackMode.STATIC_VIEWER:
        return (
          <div className="h-full flex flex-col">
            {/* Fallback Notice */}
            <div className="bg-yellow-50 dark:bg-yellow-900/20 border-b border-yellow-200 dark:border-yellow-800 p-3">
              <div className="flex items-start">
                <svg
                  className="h-5 w-5 text-yellow-400 mt-0.5"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                    clipRule="evenodd"
                  />
                </svg>
                <div className="ml-3 flex-1">
                  <p className="text-sm text-yellow-800 dark:text-yellow-200">
                    {fallbackMessage}
                  </p>
                  <button
                    onClick={handleManualRetry}
                    className="mt-2 text-sm font-medium text-yellow-800 dark:text-yellow-200 hover:underline"
                  >
                    Try Flipbook Again
                  </button>
                </div>
              </div>
            </div>

            {/* Static Viewer */}
            <div className="flex-1 overflow-hidden">
              <StaticPDFViewer
                file={pdfUrl || document.storagePath}
                title={document.title}
                watermark={watermark}
                allowDownload={allowDownload}
                className="h-full"
              />
            </div>
          </div>
        );

      case FallbackMode.DOWNLOAD_ONLY:
        return (
          <div className="flex items-center justify-center min-h-[400px] p-6">
            <div className="text-center max-w-md">
              <svg
                className="mx-auto h-16 w-16 text-gray-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"
                />
              </svg>
              <h3 className="mt-4 text-lg font-medium text-gray-900 dark:text-gray-100">
                Cannot Display PDF
              </h3>
              <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                {fallbackMessage}
              </p>
              {allowDownload && pdfUrl && (
                <a
                  href={pdfUrl}
                  download={document.filename}
                  className="mt-6 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  <svg
                    className="mr-2 h-4 w-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                    />
                  </svg>
                  Download PDF
                </a>
              )}
            </div>
          </div>
        );

      case FallbackMode.ERROR:
      default:
        return (
          <div className="flex items-center justify-center min-h-[400px] p-6">
            <div className="text-center max-w-md">
              <svg
                className="mx-auto h-16 w-16 text-red-400"
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
              <h3 className="mt-4 text-lg font-medium text-gray-900 dark:text-gray-100">
                Unable to Load Document
              </h3>
              <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                {error?.message || 'An unexpected error occurred'}
              </p>
              <div className="mt-6 flex gap-3 justify-center">
                <button
                  onClick={handleManualRetry}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800"
                >
                  Try Again
                </button>
                {allowDownload && pdfUrl && (
                  <a
                    href={pdfUrl}
                    download={document.filename}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700"
                  >
                    Download Instead
                  </a>
                )}
              </div>
            </div>
          </div>
        );
    }
  };

  return (
    <div className={`flipbook-with-fallback ${className}`}>
      {/* Retry Indicator */}
      {isRetrying && (
        <div className="absolute top-4 right-4 z-50 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3 shadow-lg">
          <div className="flex items-center">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
            <span className="text-sm text-blue-800 dark:text-blue-200">
              Retrying... (Attempt {retryCount + 1}/{maxRetries})
            </span>
          </div>
        </div>
      )}

      {/* Content */}
      {renderContent()}
    </div>
  );
}

export default FlipbookWithFallback;
