/**
 * PDF Reliability UI Container
 * 
 * Comprehensive UI component that orchestrates progress tracking, error display,
 * and fallback options for reliable PDF rendering.
 * 
 * Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 1.4
 */

'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { ProgressIndicator } from './ProgressIndicator';
import { ReliabilityErrorDisplay, CompactReliabilityErrorDisplay } from './ReliabilityErrorDisplay';
import { DownloadFallbackUI, CompactDownloadFallback } from './DownloadFallbackUI';
import type { 
  ProgressState, 
  RenderError, 
  RenderResult,
  DiagnosticsData 
} from '../../lib/pdf-reliability/types';
import { RenderingStage as Stage } from '../../lib/pdf-reliability/types';

interface PDFReliabilityUIProps {
  /** Current rendering state */
  renderingState: 'idle' | 'loading' | 'success' | 'error' | 'fallback';
  /** Progress information */
  progress?: ProgressState;
  /** Error information */
  error?: RenderError;
  /** Render result */
  result?: RenderResult;
  /** PDF document URL */
  pdfUrl: string;
  /** Document title */
  documentTitle?: string;
  /** File size in bytes */
  fileSize?: number;
  /** Callback for retry action */
  onRetry?: () => void;
  /** Callback for force retry when stuck */
  onForceRetry?: () => void;
  /** Callback for download action */
  onDownload?: (url: string) => void;
  /** Callback for dismissing UI */
  onDismiss?: () => void;
  /** Whether to show compact UI */
  compact?: boolean;
  /** Whether to show diagnostic information */
  showDiagnostics?: boolean;
  /** Whether retry is in progress */
  isRetrying?: boolean;
  /** Custom className */
  className?: string;
}

/**
 * PDF Reliability UI Container Component
 */
export function PDFReliabilityUI({
  renderingState,
  progress,
  error,
  result,
  pdfUrl,
  documentTitle,
  fileSize,
  onRetry,
  onForceRetry,
  onDownload,
  onDismiss,
  compact = false,
  showDiagnostics = false,
  isRetrying = false,
  className = '',
}: PDFReliabilityUIProps) {
  const [showProgress, setShowProgress] = useState(false);
  const [lastProgressUpdate, setLastProgressUpdate] = useState<Date>(new Date());

  // Show progress indicator when loading starts
  useEffect(() => {
    if (renderingState === 'loading' && progress) {
      setShowProgress(true);
      setLastProgressUpdate(new Date());
    } else if (renderingState === 'success') {
      // Hide progress after a brief delay to show completion
      const timer = setTimeout(() => setShowProgress(false), 1000);
      return () => clearTimeout(timer);
    } else if (renderingState === 'error' || renderingState === 'fallback') {
      setShowProgress(false);
    }
  }, [renderingState, progress]);

  // Track progress updates for stuck detection
  useEffect(() => {
    if (progress && progress.percentage > 0) {
      setLastProgressUpdate(new Date());
    }
  }, [progress?.percentage]);

  // Handle force retry for stuck states
  const handleForceRetry = useCallback(() => {
    if (onForceRetry) {
      onForceRetry();
    } else if (onRetry) {
      onRetry();
    }
  }, [onForceRetry, onRetry]);

  // Render loading state with progress
  if (renderingState === 'loading' && progress && showProgress) {
    if (compact) {
      return (
        <div className={`w-full ${className}`}>
          <div className="flex items-center space-x-3 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
            <div className="flex-shrink-0">
              <svg className="w-5 h-5 text-blue-500 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-blue-900 dark:text-blue-100 truncate">
                Loading PDF... {Math.round(progress.percentage)}%
              </p>
              <div className="w-full bg-blue-200 dark:bg-blue-800 rounded-full h-1 mt-1">
                <div
                  className="bg-blue-600 dark:bg-blue-400 h-1 rounded-full transition-all duration-300"
                  style={{ width: `${progress.percentage}%` }}
                />
              </div>
            </div>
            {progress.isStuck && onForceRetry && (
              <button
                onClick={handleForceRetry}
                className="text-xs text-blue-700 dark:text-blue-300 hover:text-blue-900 dark:hover:text-blue-100 underline"
              >
                Retry
              </button>
            )}
          </div>
        </div>
      );
    }

    return (
      <div className={className}>
        <ProgressIndicator
          progress={progress}
          onForceRetry={handleForceRetry}
          showDetails={showDiagnostics}
        />
      </div>
    );
  }

  // Render error state
  if (renderingState === 'error' && error) {
    if (compact) {
      return (
        <div className={className}>
          <CompactReliabilityErrorDisplay
            error={error}
            onRetry={onRetry}
            onDismiss={onDismiss}
            isRetrying={isRetrying}
          />
        </div>
      );
    }

    return (
      <div className={className}>
        <ReliabilityErrorDisplay
          error={error}
          onRetry={onRetry}
          onDownload={onDownload}
          onDismiss={onDismiss}
          isRetrying={isRetrying}
          showDiagnostics={showDiagnostics}
        />
      </div>
    );
  }

  // Render fallback state (when all rendering methods fail)
  if (renderingState === 'fallback') {
    if (compact) {
      return (
        <div className={className}>
          <CompactDownloadFallback
            pdfUrl={pdfUrl}
            documentTitle={documentTitle}
            onDownload={onDownload}
          />
        </div>
      );
    }

    return (
      <div className={className}>
        <DownloadFallbackUI
          pdfUrl={pdfUrl}
          documentTitle={documentTitle}
          fileSize={fileSize}
          onDownload={onDownload}
          onRetryViewing={onRetry}
          onDismiss={onDismiss}
          errorContext={error?.message}
        />
      </div>
    );
  }

  // Render success state (brief confirmation)
  if (renderingState === 'success' && showProgress && progress?.stage === Stage.COMPLETE) {
    return (
      <div className={`flex items-center justify-center p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg ${className}`}>
        <div className="flex items-center space-x-2 text-green-800 dark:text-green-200">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          <span className="text-sm font-medium">PDF loaded successfully</span>
        </div>
      </div>
    );
  }

  // Default: no UI (idle or success without progress)
  return null;
}

/**
 * Hook for managing PDF reliability UI state
 */
export function usePDFReliabilityUI() {
  const [renderingState, setRenderingState] = useState<'idle' | 'loading' | 'success' | 'error' | 'fallback'>('idle');
  const [progress, setProgress] = useState<ProgressState | undefined>();
  const [error, setError] = useState<RenderError | undefined>();
  const [result, setResult] = useState<RenderResult | undefined>();

  const startLoading = useCallback((initialProgress?: ProgressState) => {
    setRenderingState('loading');
    setProgress(initialProgress);
    setError(undefined);
    setResult(undefined);
  }, []);

  const updateProgress = useCallback((newProgress: ProgressState) => {
    setProgress(newProgress);
  }, []);

  const setSuccess = useCallback((renderResult: RenderResult) => {
    setRenderingState('success');
    setResult(renderResult);
    setError(undefined);
  }, []);

  const setErrorState = useCallback((renderError: RenderError) => {
    setRenderingState('error');
    setError(renderError);
  }, []);

  const setFallback = useCallback((renderError?: RenderError) => {
    setRenderingState('fallback');
    if (renderError) {
      setError(renderError);
    }
  }, []);

  const reset = useCallback(() => {
    setRenderingState('idle');
    setProgress(undefined);
    setError(undefined);
    setResult(undefined);
  }, []);

  return {
    renderingState,
    progress,
    error,
    result,
    startLoading,
    updateProgress,
    setSuccess,
    setError: setErrorState,
    setFallback,
    reset,
  };
}

export default PDFReliabilityUI;