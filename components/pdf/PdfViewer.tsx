'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/Button';

// PDF.js types
interface PDFDocumentProxy {
  numPages: number;
  getPage(pageNumber: number): Promise<PDFPageProxy>;
  destroy(): void;
}

interface PDFPageProxy {
  getViewport(params: { scale: number }): PDFPageViewport;
  render(params: { canvasContext: CanvasRenderingContext2D; viewport: PDFPageViewport }): PDFRenderTask;
  getTextContent(): Promise<{ items: Array<{ str: string; transform: number[] }> }>;
}

interface PDFPageViewport {
  width: number;
  height: number;
  transform: number[];
}

interface PDFRenderTask {
  promise: Promise<void>;
  cancel(): void;
}

interface PdfViewerProps {
  signedUrl: string;
  documentTitle: string;
  memberName?: string;
  onClose?: () => void;
}

export function PdfViewer({ signedUrl, documentTitle, memberName, onClose }: PdfViewerProps) {
  const [pdfDoc, setPdfDoc] = useState<PDFDocumentProxy | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [scale, setScale] = useState(1.0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Array<{ page: number; text: string }>>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const renderTaskRef = useRef<PDFRenderTask | null>(null);

  // Initialize PDF.js worker
  useEffect(() => {
    const initPdfJs = async () => {
      try {
        // Dynamic import to avoid SSR issues
        const pdfjs = await import('pdfjs-dist');
        
        // Configure worker - use CDN for reliability
        pdfjs.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`;
        
        return pdfjs;
      } catch (err) {
        console.error('Failed to initialize PDF.js:', err);
        setError('Failed to initialize PDF viewer');
        setLoading(false);
        return null;
      }
    };

    initPdfJs().then(pdfjs => {
      if (pdfjs) {
        loadPdf(pdfjs);
      }
    });

    return () => {
      // Cleanup on unmount
      if (renderTaskRef.current) {
        renderTaskRef.current.cancel();
      }
      if (pdfDoc) {
        pdfDoc.destroy();
      }
    };
  }, [signedUrl]);

  const loadPdf = async (pdfjs: any) => {
    try {
      setLoading(true);
      setError(null);

      const loadingTask = pdfjs.getDocument({
        url: signedUrl,
        cMapUrl: `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/cmaps/`,
        cMapPacked: true,
      });

      const pdf = await loadingTask.promise;
      setPdfDoc(pdf);
      setTotalPages(pdf.numPages);
      setCurrentPage(1);
      
      // Render first page
      await renderPage(pdf, 1);
      setLoading(false);
    } catch (err) {
      console.error('Error loading PDF:', err);
      setError('Failed to load PDF document');
      setLoading(false);
    }
  };

  const renderPage = useCallback(async (pdf: PDFDocumentProxy, pageNumber: number) => {
    if (!canvasRef.current) return;

    try {
      // Cancel previous render task
      if (renderTaskRef.current) {
        renderTaskRef.current.cancel();
      }

      const page = await pdf.getPage(pageNumber);
      const viewport = page.getViewport({ scale });
      
      const canvas = canvasRef.current;
      const context = canvas.getContext('2d');
      if (!context) return;

      canvas.height = viewport.height;
      canvas.width = viewport.width;

      const renderContext = {
        canvasContext: context,
        viewport: viewport,
      };

      renderTaskRef.current = page.render(renderContext);
      await renderTaskRef.current.promise;
      renderTaskRef.current = null;

    } catch (err: any) {
      if (err.name !== 'RenderingCancelledException') {
        console.error('Error rendering page:', err);
      }
    }
  }, [scale]);

  // Re-render current page when scale changes
  useEffect(() => {
    if (pdfDoc && currentPage) {
      renderPage(pdfDoc, currentPage);
    }
  }, [pdfDoc, currentPage, scale, renderPage]);

  const goToPage = (pageNumber: number) => {
    if (pageNumber >= 1 && pageNumber <= totalPages) {
      setCurrentPage(pageNumber);
    }
  };

  const zoomIn = () => {
    setScale(prev => Math.min(prev * 1.2, 3.0));
  };

  const zoomOut = () => {
    setScale(prev => Math.max(prev / 1.2, 0.5));
  };

  const resetZoom = () => {
    setScale(1.0);
  };

  const searchInPdf = async () => {
    if (!pdfDoc || !searchQuery.trim()) {
      setSearchResults([]);
      return;
    }

    setSearchLoading(true);
    const results: Array<{ page: number; text: string }> = [];

    try {
      for (let i = 1; i <= totalPages; i++) {
        const page = await pdfDoc.getPage(i);
        const textContent = await page.getTextContent();
        const pageText = textContent.items.map((item: any) => item.str).join(' ');
        
        if (pageText.toLowerCase().includes(searchQuery.toLowerCase())) {
          // Extract context around the match
          const index = pageText.toLowerCase().indexOf(searchQuery.toLowerCase());
          const start = Math.max(0, index - 50);
          const end = Math.min(pageText.length, index + searchQuery.length + 50);
          const context = pageText.substring(start, end);
          
          results.push({
            page: i,
            text: `...${context}...`
          });
        }
      }
      
      setSearchResults(results);
    } catch (err) {
      console.error('Search error:', err);
    } finally {
      setSearchLoading(false);
    }
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  // Handle fullscreen change events
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement) return; // Don't interfere with input fields

      switch (e.key) {
        case 'ArrowLeft':
        case 'PageUp':
          e.preventDefault();
          goToPage(currentPage - 1);
          break;
        case 'ArrowRight':
        case 'PageDown':
          e.preventDefault();
          goToPage(currentPage + 1);
          break;
        case 'Home':
          e.preventDefault();
          goToPage(1);
          break;
        case 'End':
          e.preventDefault();
          goToPage(totalPages);
          break;
        case '+':
        case '=':
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            zoomIn();
          }
          break;
        case '-':
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            zoomOut();
          }
          break;
        case '0':
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            resetZoom();
          }
          break;
        case 'f':
        case 'F11':
          if (!e.ctrlKey && !e.metaKey) {
            e.preventDefault();
            toggleFullscreen();
          }
          break;
        case 'Escape':
          if (isFullscreen) {
            e.preventDefault();
            document.exitFullscreen();
          }
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [currentPage, totalPages, isFullscreen]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100 dark:bg-slate-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-300">Loading PDF...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100 dark:bg-slate-900">
        <div className="text-center max-w-md mx-auto px-4">
          <div className="text-red-600 dark:text-red-400 text-6xl mb-4">⚠️</div>
          <h2 className="text-2xl font-bold mb-2 text-gray-900 dark:text-white">Error Loading PDF</h2>
          <p className="text-gray-600 dark:text-gray-300 mb-4">{error}</p>
          {onClose && (
            <Button onClick={onClose}>Back</Button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="fixed inset-0 bg-gray-900 flex flex-col z-50">
      {/* Toolbar */}
      <div className="bg-gray-800 border-b border-gray-700 px-4 py-2 flex items-center justify-between flex-shrink-0">
        <h1 className="text-white font-medium truncate max-w-md" title={documentTitle}>
          {documentTitle}
        </h1>

        <div className="flex items-center gap-3">
          {/* Search */}
          <div className="flex items-center gap-2">
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && searchInPdf()}
              placeholder="Search in PDF..."
              className="w-64 px-3 py-1.5 rounded bg-gray-700 text-white placeholder-gray-300 outline-none border border-gray-600 focus:border-gray-400"
            />
            <Button
              onClick={searchInPdf}
              disabled={searchLoading}
              className="px-3 py-1.5 text-sm"
            >
              {searchLoading ? 'Searching...' : 'Search'}
            </Button>
          </div>

          {/* Search results count */}
          {searchResults.length > 0 && (
            <div className="text-xs text-gray-200">
              Found {searchResults.length} result{searchResults.length === 1 ? '' : 's'}
            </div>
          )}

          {/* Page navigation */}
          <div className="flex items-center gap-2">
            <Button
              onClick={() => goToPage(currentPage - 1)}
              disabled={currentPage <= 1}
              className="px-2 py-1 text-sm"
            >
              ←
            </Button>
            <span className="text-gray-300 text-sm min-w-[80px] text-center">
              {currentPage} / {totalPages}
            </span>
            <Button
              onClick={() => goToPage(currentPage + 1)}
              disabled={currentPage >= totalPages}
              className="px-2 py-1 text-sm"
            >
              →
            </Button>
          </div>

          {/* Zoom controls */}
          <div className="flex items-center gap-1">
            <Button onClick={zoomOut} className="px-2 py-1 text-sm">-</Button>
            <span className="text-gray-300 text-xs min-w-[50px] text-center">
              {Math.round(scale * 100)}%
            </span>
            <Button onClick={zoomIn} className="px-2 py-1 text-sm">+</Button>
            <Button onClick={resetZoom} className="px-2 py-1 text-xs">Reset</Button>
          </div>

          {/* Fullscreen toggle */}
          <Button onClick={toggleFullscreen} className="px-2 py-1 text-sm">
            {isFullscreen ? '⛶' : '⛶'}
          </Button>

          {/* Close button */}
          {onClose && (
            <Button onClick={onClose} className="px-3 py-1 text-sm">
              ✕ Close
            </Button>
          )}
        </div>
      </div>

      {/* Search results */}
      {searchResults.length > 0 && (
        <div className="bg-gray-900 border-b border-gray-700 px-4 py-2 max-h-32 overflow-y-auto">
          <div className="space-y-1">
            {searchResults.map((result, index) => (
              <div
                key={index}
                className="text-sm text-gray-200 cursor-pointer hover:text-white"
                onClick={() => goToPage(result.page)}
              >
                <span className="text-blue-400">Page {result.page}:</span> {result.text}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* PDF Canvas */}
      <div className="flex-1 overflow-auto bg-gray-800 p-4">
        <div className="flex justify-center">
          <div className="relative bg-white shadow-lg">
            <canvas
              ref={canvasRef}
              className="max-w-full h-auto"
              style={{ display: 'block' }}
            />
            
            {/* Watermark overlay */}
            {memberName && (
              <div
                className="absolute inset-0 pointer-events-none flex items-center justify-center"
                style={{
                  background: `repeating-linear-gradient(
                    45deg,
                    transparent,
                    transparent 150px,
                    rgba(0, 0, 0, 0.02) 150px,
                    rgba(0, 0, 0, 0.02) 300px
                  )`,
                }}
              >
                <div
                  className="text-gray-400 font-bold transform rotate-45 select-none"
                  style={{
                    fontSize: '32px',
                    opacity: 0.3,
                    textShadow: '1px 1px 2px rgba(0,0,0,0.1)',
                    userSelect: 'none',
                    pointerEvents: 'none',
                  }}
                >
                  jStudyRoom - {memberName}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Keyboard shortcuts help */}
      <div className="bg-gray-800 border-t border-gray-700 px-4 py-1 text-xs text-gray-400">
        Shortcuts: ← → (pages) | Ctrl+/- (zoom) | F (fullscreen) | Esc (exit fullscreen)
      </div>
    </div>
  );
}