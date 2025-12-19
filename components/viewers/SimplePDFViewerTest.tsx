'use client';

import React, { useState, useEffect, useRef } from 'react';

interface SimplePDFViewerTestProps {
  pdfUrl: string;
  documentTitle: string;
}

/**
 * Simplified PDF Viewer for Testing Navigation Issues
 * 
 * This component strips away all complex features to test basic scrolling
 */
export default function SimplePDFViewerTest({ pdfUrl, documentTitle }: SimplePDFViewerTestProps) {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    console.log('[SimplePDFViewerTest] Initializing with URL:', pdfUrl);
    setLoading(false);
  }, [pdfUrl]);

  return (
    <div className="fixed inset-0 bg-gray-900 flex flex-col">
      {/* Simple Header */}
      <div className="bg-gray-800 text-white p-4 flex-shrink-0">
        <h1 className="text-lg font-medium">{documentTitle} - Test Viewer</h1>
        <p className="text-sm text-gray-300">Testing basic PDF navigation</p>
      </div>

      {/* PDF Container with explicit scroll settings */}
      <div 
        ref={containerRef}
        className="flex-1 bg-gray-800"
        style={{
          overflow: 'auto', // Explicit scroll
          height: 'calc(100vh - 80px)',
          width: '100%',
        }}
      >
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-white">Loading PDF...</div>
          </div>
        ) : error ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-red-400">Error: {error}</div>
          </div>
        ) : (
          <div className="w-full h-full flex justify-center p-4">
            {/* Direct iframe approach for testing */}
            <iframe
              src={pdfUrl}
              className="w-full max-w-4xl h-full border-0"
              style={{
                minHeight: '100vh',
                backgroundColor: 'white',
              }}
              title={documentTitle}
              onLoad={() => {
                console.log('[SimplePDFViewerTest] PDF loaded successfully');
              }}
              onError={(e) => {
                console.error('[SimplePDFViewerTest] PDF load error:', e);
                setError('Failed to load PDF');
              }}
            />
          </div>
        )}
      </div>

      {/* Debug Info */}
      <div className="bg-gray-700 text-white p-2 text-xs flex-shrink-0">
        <div>Debug: Container scroll enabled | PDF URL: {pdfUrl.substring(0, 50)}...</div>
      </div>
    </div>
  );
}