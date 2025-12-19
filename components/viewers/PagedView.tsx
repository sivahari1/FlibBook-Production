'use client';

import { useEffect, useRef, useState } from 'react';
import { PageData } from './SimpleDocumentViewer';
import LoadingSpinner from './LoadingSpinner';
import PageLoadError from './PageLoadError';
import { OptimizedImage } from './OptimizedImage';

export interface PagedViewProps {
  pages: PageData[];
  currentPage: number;
  zoomLevel: number;
  onPageError?: (pageNumber: number, error: string) => void;
  onPageRetry?: (pageNumber: number) => void;
  pageErrors?: Map<number, string>;
}

/**
 * PagedView - Renders one page at a time with centering
 * 
 * Features:
 * - Single-page display
 * - Centered page layout
 * - Smooth transitions between pages
 * - Responsive sizing
 * 
 * Requirements: 6.2, 6.3
 */
export default function PagedView({
  pages,
  currentPage,
  zoomLevel,
  onPageError = () => {},
  onPageRetry = () => {},
  pageErrors = new Map(),
}: PagedViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isRetrying, setIsRetrying] = useState(false);
  const page = pages[currentPage - 1];

  // Smooth transition when page changes
  useEffect(() => {
    if (containerRef.current) {
      // Trigger a subtle fade-in effect
      containerRef.current.style.opacity = '0';
      const timer = setTimeout(() => {
        if (containerRef.current) {
          containerRef.current.style.opacity = '1';
        }
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [currentPage]);

  // Handle image load start
  const handleImageLoadStart = () => {
    setIsLoading(true);
  };

  // Handle image load success
  const handleImageLoad = () => {
    setIsLoading(false);
    setIsRetrying(false);
  };

  // Handle image load error
  const handleImageError = (event: React.SyntheticEvent<HTMLImageElement>) => {
    const img = event.currentTarget;
    const errorMessage = img.src ? 'Failed to load page image' : 'Invalid page URL';
    
    setIsLoading(false);
    onPageError(currentPage, errorMessage);
  };

  // Handle page retry
  const handleRetry = () => {
    setIsRetrying(true);
    onPageRetry(currentPage);
    
    // Trigger image reload
    setTimeout(() => {
      setIsRetrying(false);
    }, 100);
  };

  if (!page) {
    return (
      <div 
        className="flex items-center justify-center h-full bg-gray-800"
        data-testid="paged-view-error"
      >
        <div className="text-white text-center">
          <p className="text-xl mb-2">Page not found</p>
          <p className="text-gray-400">Page {currentPage} does not exist</p>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="flex items-center justify-center h-full bg-gray-800 p-2 md:p-4 transition-opacity duration-200"
      style={{
        minHeight: '100%',
      }}
      data-testid="paged-view"
      role="document"
      aria-label={`Page ${currentPage} of document in paged view`}
    >
      <div
        className="bg-white shadow-2xl"
        style={{
          width: `${(page.dimensions?.width || 800) * zoomLevel}px`,
          height: `${(page.dimensions?.height || 1000) * zoomLevel}px`,
          maxWidth: 'calc(100vw - 16px)', // Account for padding
          maxHeight: 'calc(100vh - 120px)', // Account for toolbar height
        }}
        data-testid={`page-${page.pageNumber}`}
        role="img"
        aria-label={`Page ${page.pageNumber} of document`}
      >
        {pageErrors.has(currentPage) ? (
          <PageLoadError
            pageNumber={currentPage}
            error={pageErrors.get(currentPage) || 'Unknown error'}
            onRetry={handleRetry}
            compact={false}
          />
        ) : (
          <>
            {(isLoading || isRetrying) && (
              <div className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-90 z-10">
                <LoadingSpinner 
                  message={isRetrying ? 'Retrying...' : `Loading page ${currentPage}...`}
                  size="md"
                />
              </div>
            )}
            <OptimizedImage
              src={`${page.pageUrl}${isRetrying ? `?retry=${Date.now()}` : ''}`}
              alt={`Page ${page.pageNumber} of document`}
              width={page.dimensions?.width || 800}
              height={page.dimensions?.height || 1000}
              className="w-full h-full object-contain"
              priority="high"
              progressive={true}
              networkSpeed="auto"
              onLoad={handleImageLoad}
              onError={(error) => {
                const mockEvent = {
                  currentTarget: { src: page.pageUrl }
                } as React.SyntheticEvent<HTMLImageElement>;
                handleImageError(mockEvent);
              }}
              placeholder={
                <div className="w-full h-full flex items-center justify-center bg-gray-100">
                  <LoadingSpinner 
                    message={isRetrying ? 'Retrying...' : `Loading page ${currentPage}...`}
                    size="md"
                  />
                </div>
              }
              style={{
                userSelect: 'none',
                WebkitUserSelect: 'none',
              }}
              aria-describedby={`page-${page.pageNumber}-description`}
            />
            <div 
              id={`page-${page.pageNumber}-description`} 
              className="sr-only"
            >
              Page {page.pageNumber} content of the document
            </div>
          </>
        )}
      </div>
    </div>
  );
}
