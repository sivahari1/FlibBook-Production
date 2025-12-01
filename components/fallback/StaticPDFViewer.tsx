/**
 * Static PDF Viewer Fallback Component
 * 
 * Provides a simple static PDF viewer when flipbook fails
 * Requirements: 18.1, 18.4
 */

'use client';

import React, { useState } from 'react';
import { Document as PDFDocument, Page as PDFPage, pdfjs } from 'react-pdf';
import 'react-pdf/dist/esm/Page/AnnotationLayer.css';
import 'react-pdf/dist/esm/Page/TextLayer.css';

// Set up PDF.js worker
if (typeof window !== 'undefined') {
  pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`;
}

export interface StaticPDFViewerProps {
  /**
   * PDF file URL or data
   */
  file: string | ArrayBuffer;

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
 * Static PDF Viewer Component
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
  const [numPages, setNumPages] = useState<number>(0);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [scale, setScale] = useState<number>(1.0);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);

  const handleLoadSuccess = ({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
    setIsLoading(false);
    setError(null);
    onLoadSuccess?.();
  };

  const handleLoadError = (error: Error) => {
    setIsLoading(false);
    setError(error);
    onLoadError?.(error);
  };

  const goToPage = (page: number) => {
    if (page >= 1 && page <= numPages) {
      setCurrentPage(page);
    }
  };

  const zoomIn = () => {
    setScale((prev) => Math.min(prev + 0.25, 3.0));
  };

  const zoomOut = () => {
    setScale((prev) => Math.max(prev - 0.25, 0.5));
  };

  const resetZoom = () => {
    setScale(1.0);
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
              onClick={() => window.open(file as string, '_blank')}
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
              Static PDF Viewer (Fallback Mode)
            </p>
          </div>
          
          {/* Controls */}
          <div className="flex items-center gap-2">
            {/* Zoom Controls */}
            <div className="flex items-center gap-1 border border-gray-300 dark:border-gray-600 rounded-md">
              <button
                onClick={zoomOut}
                disabled={scale <= 0.5}
                className="px-3 py-1 hover:bg-gray-200 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                title="Zoom out"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                </svg>
              </button>
              <button
                onClick={resetZoom}
                className="px-3 py-1 text-sm hover:bg-gray-200 dark:hover:bg-gray-700"
                title="Reset zoom"
              >
                {Math.round(scale * 100)}%
              </button>
              <button
                onClick={zoomIn}
                disabled={scale >= 3.0}
                className="px-3 py-1 hover:bg-gray-200 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                title="Zoom in"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              </button>
            </div>

            {/* Download Button */}
            {allowDownload && (
              <button
                onClick={() => window.open(file as string, '_blank')}
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

        {/* Page Navigation */}
        {numPages > 0 && (
          <div className="flex items-center justify-center gap-4 mt-4">
            <button
              onClick={() => goToPage(currentPage - 1)}
              disabled={currentPage <= 1}
              className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            
            <div className="flex items-center gap-2">
              <input
                type="number"
                min={1}
                max={numPages}
                value={currentPage}
                onChange={(e) => goToPage(parseInt(e.target.value) || 1)}
                className="w-16 px-2 py-1 text-center border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700"
              />
              <span className="text-sm text-gray-600 dark:text-gray-400">
                of {numPages}
              </span>
            </div>

            <button
              onClick={() => goToPage(currentPage + 1)}
              disabled={currentPage >= numPages}
              className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        )}
      </div>

      {/* PDF Content */}
      <div className="relative overflow-auto bg-gray-50 dark:bg-gray-900 p-4">
        {isLoading && (
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-4 text-sm text-gray-600 dark:text-gray-400">Loading PDF...</p>
            </div>
          </div>
        )}

        <div className="flex justify-center">
          <div className="relative">
            <PDFDocument
              file={file}
              onLoadSuccess={handleLoadSuccess}
              onLoadError={handleLoadError}
              loading=""
            >
              <PDFPage
                pageNumber={currentPage}
                scale={scale}
                renderTextLayer={true}
                renderAnnotationLayer={true}
              />
            </PDFDocument>

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
    </div>
  );
}

export default StaticPDFViewer;
