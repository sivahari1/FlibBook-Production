'use client';

import React from 'react';

interface SimplePDFViewerProps {
  pdfUrl: string;
  documentTitle: string;
  onError?: (error: Error) => void;
}

/**
 * Simple PDF Viewer - Iframe-Only Implementation (Phase 1)
 * 
 * This is a minimal, iframe-based PDF viewer that provides immediate PDF viewing
 * functionality without PDF.js dependencies.
 * 
 * Phase-1 Rule: NO PDF.js, NO react-pdf, NO canvas, NO workers - Iframe-only
 */
const SimplePDFViewer = React.forwardRef<HTMLDivElement, SimplePDFViewerProps>((props, ref) => {
  const { pdfUrl, documentTitle, onError } = props;

  const handleIframeError = () => {
    const error = new Error('Failed to load PDF in iframe');
    onError?.(error);
  };

  if (!pdfUrl) {
    return (
      <div className="flex items-center justify-center h-full bg-gray-50">
        <p className="text-gray-600">No PDF URL provided</p>
      </div>
    );
  }

  return (
    <div 
      ref={ref}
      className="w-full h-full bg-black"
      style={{ minHeight: 600 }}
    >
      <iframe
        src={pdfUrl}
        title={documentTitle || 'PDF Viewer'}
        className="w-full h-full"
        sandbox="allow-same-origin allow-scripts allow-forms"
        onError={handleIframeError}
      />
    </div>
  );
});

SimplePDFViewer.displayName = 'SimplePDFViewer';

export default SimplePDFViewer;