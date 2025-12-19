/**
 * Download Fallback UI Component
 * 
 * Provides a user-friendly interface when all PDF rendering methods fail,
 * offering download options and alternative access methods.
 * 
 * Requirements: 1.4, 6.4
 */

'use client';

import React, { useState } from 'react';
import { Button } from '../ui/Button';

interface DownloadFallbackUIProps {
  /** PDF document URL */
  pdfUrl: string;
  /** Document title/name */
  documentTitle?: string;
  /** File size in bytes */
  fileSize?: number;
  /** Callback when download is initiated */
  onDownload?: (url: string) => void;
  /** Callback when user chooses to retry viewing */
  onRetryViewing?: () => void;
  /** Callback when user dismisses the fallback */
  onDismiss?: () => void;
  /** Additional error context */
  errorContext?: string;
  /** Custom className */
  className?: string;
}

/**
 * Format file size for display
 */
function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

/**
 * Download Fallback UI Component
 */
export function DownloadFallbackUI({
  pdfUrl,
  documentTitle = 'PDF Document',
  fileSize,
  onDownload,
  onRetryViewing,
  onDismiss,
  errorContext,
  className = '',
}: DownloadFallbackUIProps) {
  const [isDownloading, setIsDownloading] = useState(false);

  const handleDownload = async () => {
    setIsDownloading(true);
    try {
      if (onDownload) {
        onDownload(pdfUrl);
      } else {
        // Default download behavior
        const link = document.createElement('a');
        link.href = pdfUrl;
        link.download = documentTitle.endsWith('.pdf') ? documentTitle : `${documentTitle}.pdf`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
    } catch (error) {
      console.error('Download failed:', error);
    } finally {
      setIsDownloading(false);
    }
  };

  const handleOpenInNewTab = () => {
    window.open(pdfUrl, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className={`flex flex-col items-center justify-center p-8 bg-gradient-to-br from-blue-50 via-white to-indigo-50 dark:from-gray-900 dark:via-gray-800 dark:to-blue-900/20 rounded-lg border border-gray-200 dark:border-gray-700 ${className}`}>
      {/* Download Icon */}
      <div className="mb-6 flex justify-center">
        <div className="relative">
          <svg className="w-16 h-16 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          {/* Animated download arrow */}
          <div className="absolute inset-0 flex items-center justify-center">
            <svg className="w-6 h-6 text-blue-600 animate-bounce" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
            </svg>
          </div>
        </div>
      </div>
      
      {/* Title */}
      <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-3 text-center">
        Unable to Display PDF
      </h2>
      
      {/* Description */}
      <p className="text-gray-700 dark:text-gray-300 text-center max-w-md mb-2 leading-relaxed">
        We couldn't display this PDF in your browser, but you can still access it by downloading or opening it in a new tab.
      </p>
      
      {/* Error context if provided */}
      {errorContext && (
        <p className="text-sm text-gray-600 dark:text-gray-400 text-center max-w-md mb-6 italic">
          {errorContext}
        </p>
      )}
      
      {/* Document Info */}
      <div className="bg-gray-100 dark:bg-gray-700 rounded-lg p-4 mb-6 w-full max-w-md">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <div>
              <p className="font-medium text-gray-900 dark:text-white text-sm">
                {documentTitle}
              </p>
              {fileSize && (
                <p className="text-xs text-gray-600 dark:text-gray-400">
                  {formatFileSize(fileSize)}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
      
      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row gap-3 w-full max-w-md">
        {/* Primary Download Button */}
        <Button
          onClick={handleDownload}
          variant="primary"
          isLoading={isDownloading}
          disabled={isDownloading}
          className="flex-1 flex items-center justify-center space-x-2"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <span>{isDownloading ? 'Downloading...' : 'Download PDF'}</span>
        </Button>
        
        {/* Open in New Tab Button */}
        <Button
          onClick={handleOpenInNewTab}
          variant="secondary"
          className="flex-1 flex items-center justify-center space-x-2"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
          </svg>
          <span>Open in New Tab</span>
        </Button>
      </div>
      
      {/* Secondary Actions */}
      <div className="flex flex-wrap gap-2 mt-4 justify-center">
        {onRetryViewing && (
          <Button
            onClick={onRetryViewing}
            variant="secondary"
            size="sm"
          >
            Try Viewing Again
          </Button>
        )}
        
        {onDismiss && (
          <Button
            onClick={onDismiss}
            variant="secondary"
            size="sm"
          >
            Close
          </Button>
        )}
      </div>
      
      {/* Help Text */}
      <div className="mt-6 text-center">
        <p className="text-xs text-gray-500 dark:text-gray-400 max-w-md">
          💡 <strong>Tip:</strong> If you're having trouble viewing PDFs, try updating your browser or using a different device.
        </p>
      </div>
    </div>
  );
}

/**
 * Compact Download Fallback for inline use
 */
export function CompactDownloadFallback({
  pdfUrl,
  documentTitle = 'PDF Document',
  onDownload,
  className = '',
}: {
  pdfUrl: string;
  documentTitle?: string;
  onDownload?: (url: string) => void;
  className?: string;
}) {
  const [isDownloading, setIsDownloading] = useState(false);

  const handleDownload = async () => {
    setIsDownloading(true);
    try {
      if (onDownload) {
        onDownload(pdfUrl);
      } else {
        const link = document.createElement('a');
        link.href = pdfUrl;
        link.download = documentTitle.endsWith('.pdf') ? documentTitle : `${documentTitle}.pdf`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
    } catch (error) {
      console.error('Download failed:', error);
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className={`bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 ${className}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <svg className="w-6 h-6 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <div>
            <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
              Can't display PDF in browser
            </p>
            <p className="text-xs text-blue-700 dark:text-blue-300">
              Download to view the document
            </p>
          </div>
        </div>
        
        <Button
          onClick={handleDownload}
          variant="primary"
          size="sm"
          isLoading={isDownloading}
          disabled={isDownloading}
        >
          {isDownloading ? 'Downloading...' : 'Download'}
        </Button>
      </div>
    </div>
  );
}