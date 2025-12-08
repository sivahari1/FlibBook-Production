/**
 * PDF.js Error Display Component
 * 
 * Displays user-friendly error messages for PDF.js errors
 * with appropriate actions and suggestions.
 * 
 * Requirements: 2.4, 7.1, 7.5
 */

'use client';

import React from 'react';
import { 
  RefreshCw, 
  AlertTriangle, 
  FileX, 
  Wifi, 
  Shield, 
  FileWarning,
  XCircle,
  Loader2,
} from 'lucide-react';
import type { PDFJSError, PDFJSErrorCategory } from '@/lib/errors/pdfjs-errors';

export interface PDFJSErrorDisplayProps {
  /** PDF.js error object */
  error: PDFJSError;
  
  /** Retry callback */
  onRetry?: () => void;
  
  /** Close callback */
  onClose?: () => void;
  
  /** Whether retry is in progress */
  isRetrying?: boolean;
  
  /** Current retry attempt number */
  retryAttempt?: number;
  
  /** Maximum retry attempts */
  maxRetryAttempts?: number;
}

/**
 * Get icon for error category
 * 
 * Requirements: 2.4, 7.1
 */
function getErrorIcon(category: PDFJSErrorCategory) {
  switch (category) {
    case 'network':
      return <Wifi className="w-16 h-16 text-yellow-500" aria-hidden="true" />;
    case 'permission':
      return <Shield className="w-16 h-16 text-red-500" aria-hidden="true" />;
    case 'file':
      return <FileWarning className="w-16 h-16 text-orange-500" aria-hidden="true" />;
    case 'rendering':
      return <XCircle className="w-16 h-16 text-red-500" aria-hidden="true" />;
    case 'library':
      return <AlertTriangle className="w-16 h-16 text-yellow-500" aria-hidden="true" />;
    default:
      return <AlertTriangle className="w-16 h-16 text-red-500" aria-hidden="true" />;
  }
}

/**
 * Get title for error category
 * 
 * Requirements: 2.4, 7.1
 */
function getErrorTitle(category: PDFJSErrorCategory): string {
  switch (category) {
    case 'network':
      return 'Connection Error';
    case 'permission':
      return 'Access Denied';
    case 'file':
      return 'Invalid File';
    case 'rendering':
      return 'Rendering Error';
    case 'library':
      return 'Viewer Error';
    default:
      return 'Error Loading PDF';
  }
}

/**
 * PDFJSErrorDisplay Component
 * 
 * Requirements: 2.4, 7.1, 7.5
 */
export default function PDFJSErrorDisplay({
  error,
  onRetry,
  onClose,
  isRetrying = false,
  retryAttempt = 0,
  maxRetryAttempts = 0,
}: PDFJSErrorDisplayProps) {
  const showRetry = error.retryable && onRetry && !isRetrying;
  const showRetryProgress = error.retryable && isRetrying;
  const showRetryCount = retryAttempt > 0 && maxRetryAttempts > 0;
  
  return (
    <div 
      className="flex items-center justify-center h-full bg-gray-800 p-8"
      data-testid="pdfjs-error-display"
      role="alert"
      aria-live="assertive"
    >
      <div className="text-center max-w-md">
        {/* Error icon */}
        <div className="mb-6 flex justify-center">
          {getErrorIcon(error.category)}
        </div>
        
        {/* Error title */}
        <h2 
          className="text-2xl font-bold text-white mb-4"
          data-testid="pdfjs-error-title"
        >
          {getErrorTitle(error.category)}
        </h2>
        
        {/* Error message */}
        <p 
          className="text-gray-300 mb-2 font-medium"
          data-testid="pdfjs-error-message"
        >
          {error.userMessage}
        </p>
        
        {/* Error suggestion */}
        <p 
          className="text-gray-400 text-sm mb-6"
          data-testid="pdfjs-error-suggestion"
        >
          {error.suggestion}
        </p>
        
        {/* Retry progress */}
        {showRetryProgress && (
          <div 
            className="mb-6 flex items-center justify-center gap-2 text-blue-400"
            data-testid="pdfjs-retry-progress"
            role="status"
            aria-live="polite"
          >
            <Loader2 className="w-5 h-5 animate-spin" aria-hidden="true" />
            <span>Retrying...</span>
          </div>
        )}
        
        {/* Retry count */}
        {showRetryCount && !isRetrying && (
          <p 
            className="text-gray-500 text-xs mb-4"
            data-testid="pdfjs-retry-count"
            role="status"
          >
            Attempt {retryAttempt} of {maxRetryAttempts}
          </p>
        )}
        
        {/* Error code (for debugging) */}
        <p 
          className="text-gray-600 text-xs mb-6 font-mono"
          data-testid="pdfjs-error-code"
        >
          Error code: {error.code}
        </p>

        {/* Action buttons */}
        <div className="flex gap-3 justify-center">
          {/* Retry button */}
          {showRetry && (
            <button
              onClick={onRetry}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
              data-testid="pdfjs-retry-button"
              aria-label="Retry loading PDF"
            >
              <RefreshCw className="w-4 h-4" aria-hidden="true" />
              Try Again
            </button>
          )}
          
          {/* Close button */}
          {onClose && (
            <button
              onClick={onClose}
              className="px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 focus:ring-offset-gray-800"
              data-testid="pdfjs-close-button"
              aria-label="Close error message"
            >
              Close
            </button>
          )}
        </div>
        
        {/* Non-recoverable message */}
        {!error.recoverable && (
          <p 
            className="text-gray-500 text-xs mt-6"
            data-testid="pdfjs-non-recoverable-message"
          >
            This error cannot be automatically recovered. Please contact support if the problem persists.
          </p>
        )}
      </div>
    </div>
  );
}
