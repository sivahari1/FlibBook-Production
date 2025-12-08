import { useEffect } from 'react';

export interface UseKeyboardNavigationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  onZoomChange: (zoom: number) => void;
  zoomLevel: number;
}

/**
 * useKeyboardNavigation - Hook for handling keyboard shortcuts
 * 
 * Keyboard shortcuts:
 * - ArrowDown/PageDown: Next page
 * - ArrowUp/PageUp: Previous page
 * - Home: First page
 * - End: Last page
 * - Ctrl/Cmd + Plus: Zoom in
 * - Ctrl/Cmd + Minus: Zoom out
 * 
 * Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6
 */
export function useKeyboardNavigation({
  currentPage,
  totalPages,
  onPageChange,
  onZoomChange,
  zoomLevel,
}: UseKeyboardNavigationProps) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Prevent default for navigation keys
      if (['ArrowUp', 'ArrowDown', 'PageUp', 'PageDown', 'Home', 'End'].includes(e.key)) {
        e.preventDefault();
      }

      switch (e.key) {
        case 'ArrowDown':
        case 'PageDown':
          if (currentPage < totalPages) {
            onPageChange(currentPage + 1);
          }
          break;

        case 'ArrowUp':
        case 'PageUp':
          if (currentPage > 1) {
            onPageChange(currentPage - 1);
          }
          break;

        case 'Home':
          onPageChange(1);
          break;

        case 'End':
          onPageChange(totalPages);
          break;

        case '+':
        case '=':
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            onZoomChange(Math.min(zoomLevel + 0.25, 3.0));
          }
          break;

        case '-':
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            onZoomChange(Math.max(zoomLevel - 0.25, 0.5));
          }
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentPage, totalPages, zoomLevel, onPageChange, onZoomChange]);
}
