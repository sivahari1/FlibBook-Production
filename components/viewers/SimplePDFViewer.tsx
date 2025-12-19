'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { loadPDFDocument, renderPageToCanvas } from '@/lib/pdfjs-integration';
import LoadingSpinner from './LoadingSpinner';
import ViewerError from './ViewerError';

interface SimplePDFViewerProps {
  pdfUrl: string;
  documentTitle: string;
  onError?: (error: Error) => void;
}

interface PDFState {
  status: 'loading' | 'loaded' | 'error';
  document: any | null;
  numPages: number;
  currentPage: number;
  error?: Error;
}

/**
 * Simple PDF Viewer - Direct PDF.js Implementation
 * 
 * This is a minimal, working PDF viewer that bypasses the complex reliability system
 * to provide immediate PDF viewing functionality.
 * 
 * INFINITE LOOP PREVENTION APPLIED:
 * - Callback dependencies replaced with refs to prevent infinite re-renders
 * - Navigation functions use functional state updates
 * - Consistent error handling patterns with main viewer
 * - Proper cleanup mechanisms implemented
 */
const SimplePDFViewer = React.forwardRef<any, SimplePDFViewerProps>((props, ref) => {
  const { pdfUrl, documentTitle, onError } = props;
  const [pdfState, setPdfState] = useState<PDFState>({
    status: 'loading',
    document: null,
    numPages: 0,
    currentPage: 1
  });
  
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Load PDF document with stable dependencies
  // Requirements: 1.1, 1.2 - Prevent infinite loops by using refs for callbacks
  const onErrorRef = useRef(onError);
  
  // Update ref when prop changes
  useEffect(() => {
    onErrorRef.current = onError;
  }, [onError]);

  useEffect(() => {
    let isMounted = true;

    const loadPDF = async () => {
      try {
        console.log('[SimplePDFViewer] Loading PDF:', pdfUrl);
        
        const result = await loadPDFDocument({
          source: pdfUrl,
          timeout: 30000,
          onProgress: (progress) => {
            console.log('[SimplePDFViewer] Loading progress:', progress);
          }
        });

        if (!isMounted) return;

        console.log('[SimplePDFViewer] PDF loaded successfully, pages:', result.numPages);
        
        setPdfState({
          status: 'loaded',
          document: result.document,
          numPages: result.numPages,
          currentPage: 1
        });

      } catch (error) {
        console.error('[SimplePDFViewer] Failed to load PDF:', error);
        
        if (!isMounted) return;

        const err = error instanceof Error ? error : new Error('Failed to load PDF');
        setPdfState({
          status: 'error',
          document: null,
          numPages: 0,
          currentPage: 1,
          error: err
        });
        
        // Use ref-based callback to avoid dependency
        if (onErrorRef.current) {
          onErrorRef.current(err);
        }
      }
    };

    loadPDF();

    return () => {
      isMounted = false;
    };
  }, [pdfUrl]); // FIXED: Only depend on pdfUrl - use ref for onError callback

  // Render current page with stable dependencies
  // Requirements: 1.1, 1.2 - Prevent infinite loops by avoiding callback dependencies
  useEffect(() => {
    if (pdfState.status !== 'loaded' || !pdfState.document || !canvasRef.current) {
      return;
    }

    const renderPage = async () => {
      try {
        console.log('[SimplePDFViewer] Rendering page:', pdfState.currentPage);
        
        const page = await pdfState.document.getPage(pdfState.currentPage);
        const canvas = canvasRef.current!;
        
        const result = await renderPageToCanvas({
          page,
          canvas,
          scale: 1.0
        });

        console.log('[SimplePDFViewer] Page rendered successfully');

      } catch (error) {
        console.error('[SimplePDFViewer] Failed to render page:', error);
        
        const err = error instanceof Error ? error : new Error('Failed to render page');
        setPdfState(prev => ({
          ...prev,
          status: 'error',
          error: err
        }));
        
        // Use ref-based callback to avoid dependency
        if (onErrorRef.current) {
          onErrorRef.current(err);
        }
      }
    };

    renderPage();
  }, [pdfState.status, pdfState.document, pdfState.currentPage]); // FIXED: Remove onError dependency - use ref instead

  // Navigation functions with stable implementations
  // Requirements: 1.1, 1.2 - Use functional state updates to avoid dependencies
  const goToNextPage = useCallback(() => {
    setPdfState(prev => ({
      ...prev,
      currentPage: prev.currentPage < prev.numPages ? prev.currentPage + 1 : prev.currentPage
    }));
  }, []); // No dependencies - uses functional update

  const goToPreviousPage = useCallback(() => {
    setPdfState(prev => ({
      ...prev,
      currentPage: prev.currentPage > 1 ? prev.currentPage - 1 : prev.currentPage
    }));
  }, []); // No dependencies - uses functional update

  const goToPage = useCallback((pageNumber: number) => {
    setPdfState(prev => {
      const validPage = Math.max(1, Math.min(pageNumber, prev.numPages));
      return {
        ...prev,
        currentPage: validPage
      };
    });
  }, []); // No dependencies - uses functional update

  // Render loading state
  if (pdfState.status === 'loading') {
    return (
      <div className="w-full h-full flex items-center justify-center bg-gray-800">
        <LoadingSpinner message="Loading PDF..." />
      </div>
    );
  }

  // Render error state
  if (pdfState.status === 'error') {
    return (
      <div className="w-full h-full flex items-center justify-center bg-gray-800">
        <ViewerError
          error={pdfState.error?.message || 'Failed to load PDF'}
          type="generic"
          onRetry={() => window.location.reload()}
        />
      </div>
    );
  }

  // Render PDF viewer
  return (
    <div className="w-full h-full flex flex-col bg-gray-800">
      {/* Toolbar */}
      <div className="bg-gray-800 border-b border-gray-700 px-4 py-2 flex items-center justify-between flex-shrink-0">
        <h1 className="text-white font-medium truncate max-w-md" title={documentTitle}>
          {documentTitle}
        </h1>
        
        <div className="flex items-center space-x-2">
          <button
            onClick={goToPreviousPage}
            disabled={pdfState.currentPage === 1}
            className="p-2 text-gray-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            ←
          </button>
          
          <div className="flex items-center space-x-2 bg-gray-700 rounded px-3 py-1">
            <input
              type="number"
              value={pdfState.currentPage}
              onChange={(e) => {
                const value = parseInt(e.target.value);
                if (!isNaN(value)) {
                  goToPage(value);
                }
              }}
              className="w-12 bg-transparent text-white text-center outline-none"
              min={1}
              max={pdfState.numPages}
            />
            <span className="text-gray-400">of {pdfState.numPages}</span>
          </div>
          
          <button
            onClick={goToNextPage}
            disabled={pdfState.currentPage === pdfState.numPages}
            className="p-2 text-gray-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            →
          </button>
        </div>
      </div>

      {/* Canvas container */}
      <div className="flex-1 relative bg-gray-800 flex items-center justify-center overflow-auto">
        <canvas
          ref={canvasRef}
          className="max-w-full h-auto shadow-lg"
          style={{ backgroundColor: 'white' }}
        />
      </div>
    </div>
  );
});

export default SimplePDFViewer;