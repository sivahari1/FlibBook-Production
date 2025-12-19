'use client';

import { RefreshCw, AlertTriangle } from 'lucide-react';

interface PageLoadErrorProps {
  pageNumber: number;
  error: string;
  onRetry: () => void;
  compact?: boolean;
}

/**
 * PageLoadError - Error display for individual page load failures
 * 
 * Shows error message with retry button for failed page loads
 * Requirements: 2.4
 */
function PageLoadError({ 
  pageNumber, 
  error, 
  onRetry, 
  compact = false 
}: PageLoadErrorProps) {
  if (compact) {
    return (
      <div 
        className="w-full h-full flex items-center justify-center bg-red-50 border border-red-200"
        data-testid={`page-error-${pageNumber}`}
      >
        <div className="text-center p-4">
          <AlertTriangle className="w-8 h-8 text-red-500 mx-auto mb-2" />
          <p className="text-red-700 text-sm mb-2">Failed to load page {pageNumber}</p>
          <button
            onClick={onRetry}
            className="px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700 transition-colors flex items-center gap-1 mx-auto"
            data-testid={`retry-page-${pageNumber}`}
          >
            <RefreshCw className="w-3 h-3" />
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div 
      className="w-full h-full flex items-center justify-center bg-red-50 border-2 border-red-200 rounded-lg"
      data-testid={`page-error-${pageNumber}`}
    >
      <div className="text-center p-8">
        <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-red-800 mb-2">
          Failed to Load Page {pageNumber}
        </h3>
        <p className="text-red-600 mb-4 max-w-sm">{error}</p>
        <button
          onClick={onRetry}
          className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center gap-2 mx-auto"
          data-testid={`retry-page-${pageNumber}`}
        >
          <RefreshCw className="w-4 h-4" />
          Try Again
        </button>
      </div>
    </div>
  );
}

PageLoadError.displayName = 'PageLoadError';

export default PageLoadError;