/**
 * Error Display Component
 * 
 * Comprehensive error display for flipbook and annotations
 * Requirements: 18.1, 18.2, 18.3, 18.4
 */

'use client';

import React from 'react';
import {
  FlipbookError,
  PDFConversionError,
  MediaUploadError,
  NetworkError,
  PermissionError,
  AnnotationError,
  PageLoadError,
  SecurityError,
  ValidationError,
} from '@/lib/errors/flipbook-errors';
import { getUserFriendlyMessage, isRetryableError } from '@/lib/errors/error-handler';

export interface ErrorDisplayProps {
  error: Error;
  onRetry?: () => void;
  onDismiss?: () => void;
  compact?: boolean;
  showDetails?: boolean;
}

/**
 * Main error display component with clear, user-friendly messages
 */
export function ErrorDisplay({
  error,
  onRetry,
  onDismiss,
  compact = false,
  showDetails = false,
}: ErrorDisplayProps) {
  const { title, message, action, actionLabel } = getUserFriendlyMessage(error);
  const canRetry = isRetryableError(error);

  // Get error-specific icon
  const getErrorIcon = () => {
    if (error instanceof PDFConversionError) {
      return (
        <svg className="w-12 h-12 text-orange-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      );
    }
    if (error instanceof MediaUploadError) {
      return (
        <svg className="w-12 h-12 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
        </svg>
      );
    }
    if (error instanceof NetworkError) {
      return (
        <svg className="w-12 h-12 text-yellow-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.141 0M1.394 9.393c5.857-5.857 15.355-5.857 21.213 0" />
        </svg>
      );
    }
    if (error instanceof PermissionError || error instanceof SecurityError) {
      return (
        <svg className="w-12 h-12 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
        </svg>
      );
    }
    // Default error icon
    return (
      <svg className="w-12 h-12 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    );
  };

  if (compact) {
    return (
      <div className="bg-red-50 border-l-4 border-red-400 p-4 rounded">
        <div className="flex items-start">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3 flex-1">
            <p className="text-sm font-medium text-red-800">{title}</p>
            <p className="mt-1 text-sm text-red-700">{message}</p>
            {(canRetry || onDismiss) && (
              <div className="mt-2 flex gap-3">
                {canRetry && onRetry && (
                  <button
                    onClick={onRetry}
                    className="text-sm font-medium text-red-800 hover:text-red-900 underline"
                  >
                    {actionLabel || 'Try Again'}
                  </button>
                )}
                {onDismiss && (
                  <button
                    onClick={onDismiss}
                    className="text-sm font-medium text-red-800 hover:text-red-900 underline"
                  >
                    Dismiss
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center p-8 bg-gradient-to-br from-red-50 via-orange-50 to-yellow-50 rounded-lg">
      <div className="mb-4">
        {getErrorIcon()}
      </div>
      
      <h3 className="text-xl font-semibold text-gray-900 mb-2 text-center">
        {title}
      </h3>
      
      <p className="text-gray-700 text-center max-w-md mb-6">
        {message}
      </p>

      {showDetails && error instanceof FlipbookError && error.context && (
        <details className="mb-4 w-full max-w-md">
          <summary className="text-sm text-gray-600 cursor-pointer hover:text-gray-800">
            Technical Details
          </summary>
          <pre className="mt-2 p-3 bg-gray-100 rounded text-xs overflow-auto">
            {JSON.stringify(error.context, null, 2)}
          </pre>
        </details>
      )}

      <div className="flex gap-3">
        {canRetry && onRetry && (
          <button
            onClick={onRetry}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
          >
            {actionLabel || 'Try Again'}
          </button>
        )}
        {onDismiss && (
          <button
            onClick={onDismiss}
            className="px-6 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors font-medium"
          >
            Dismiss
          </button>
        )}
      </div>
    </div>
  );
}

/**
 * Specific error displays for common scenarios
 */

export function PDFConversionErrorDisplay({ error, onRetry }: { error: PDFConversionError; onRetry?: () => void }) {
  return (
    <div className="bg-orange-50 border border-orange-200 rounded-lg p-6">
      <div className="flex items-start">
        <svg className="w-6 h-6 text-orange-500 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        <div className="ml-3 flex-1">
          <h4 className="text-lg font-semibold text-orange-900">PDF Conversion Failed</h4>
          <p className="mt-1 text-orange-800">{error.message}</p>
          
          {error.context?.reason === 'page_limit_exceeded' && (
            <p className="mt-2 text-sm text-orange-700">
              💡 Tip: Try splitting your PDF into smaller documents
            </p>
          )}
          
          {error.context?.reason === 'corrupted' && (
            <p className="mt-2 text-sm text-orange-700">
              💡 Tip: Try opening and re-saving the PDF in a PDF editor
            </p>
          )}
          
          {onRetry && (
            <button
              onClick={onRetry}
              className="mt-4 px-4 py-2 bg-orange-600 text-white rounded hover:bg-orange-700 transition-colors"
            >
              Try Again
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export function MediaUploadErrorDisplay({ error, onRetry }: { error: MediaUploadError; onRetry?: () => void }) {
  return (
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
      <div className="flex items-start">
        <svg className="w-6 h-6 text-blue-500 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
        </svg>
        <div className="ml-3 flex-1">
          <h4 className="text-lg font-semibold text-blue-900">Upload Failed</h4>
          <p className="mt-1 text-blue-800">{error.message}</p>
          
          {error.context?.reason === 'file_too_large' && (
            <p className="mt-2 text-sm text-blue-700">
              💡 Tip: Try compressing your media file or use an external URL instead
            </p>
          )}
          
          {error.context?.reason === 'invalid_type' && (
            <p className="mt-2 text-sm text-blue-700">
              💡 Supported formats: MP3, WAV (audio) | MP4, WEBM (video)
            </p>
          )}
          
          {error.context?.reason === 'quota_exceeded' && (
            <p className="mt-2 text-sm text-blue-700">
              💡 Tip: Delete unused media files or upgrade your storage plan
            </p>
          )}
          
          {onRetry && (
            <button
              onClick={onRetry}
              className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
            >
              Try Again
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export function NetworkErrorDisplay({ error, onRetry }: { error: NetworkError; onRetry?: () => void }) {
  return (
    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
      <div className="flex items-start">
        <svg className="w-6 h-6 text-yellow-500 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.141 0M1.394 9.393c5.857-5.857 15.355-5.857 21.213 0" />
        </svg>
        <div className="ml-3 flex-1">
          <h4 className="text-lg font-semibold text-yellow-900">Connection Error</h4>
          <p className="mt-1 text-yellow-800">{error.message}</p>
          
          <p className="mt-2 text-sm text-yellow-700">
            💡 Please check your internet connection and try again
          </p>
          
          {onRetry && (
            <button
              onClick={onRetry}
              className="mt-4 px-4 py-2 bg-yellow-600 text-white rounded hover:bg-yellow-700 transition-colors"
            >
              Retry Connection
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export function PermissionErrorDisplay({ error }: { error: PermissionError }) {
  return (
    <div className="bg-red-50 border border-red-200 rounded-lg p-6">
      <div className="flex items-start">
        <svg className="w-6 h-6 text-red-500 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
        </svg>
        <div className="ml-3 flex-1">
          <h4 className="text-lg font-semibold text-red-900">Access Denied</h4>
          <p className="mt-1 text-red-800">{error.message}</p>
          
          {error.context?.reason === 'session_expired' && (
            <p className="mt-2 text-sm text-red-700">
              💡 Please log in again to continue
            </p>
          )}
          
          {error.context?.reason === 'insufficient_privileges' && (
            <p className="mt-2 text-sm text-red-700">
              💡 Contact an administrator if you need access to this feature
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

export default ErrorDisplay;
