'use client';

import React, { useEffect, useRef } from 'react';
import { FlipBookViewer, FlipBookViewerProps } from './FlipBookViewer';

interface FlipBookViewerWithDRMProps extends FlipBookViewerProps {
  enableScreenshotPrevention?: boolean;
}

export function FlipBookViewerWithDRM({
  allowTextSelection = false,
  enableScreenshotPrevention = true,
  ...props
}: FlipBookViewerWithDRMProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Disable right-click context menu
    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
      return false;
    };

    // Block keyboard shortcuts for download/print/copy
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+C, Ctrl+X (copy/cut) - only if text selection is disabled
      if (!allowTextSelection && (e.ctrlKey || e.metaKey) && (e.key === 'c' || e.key === 'x')) {
        e.preventDefault();
        return false;
      }
      
      // Ctrl+P (print)
      if ((e.ctrlKey || e.metaKey) && e.key === 'p') {
        e.preventDefault();
        return false;
      }
      
      // Ctrl+S (save)
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        return false;
      }
      
      // Ctrl+U (view source)
      if ((e.ctrlKey || e.metaKey) && e.key === 'u') {
        e.preventDefault();
        return false;
      }
      
      // F12 (DevTools) - optional, can be intrusive
      if (e.key === 'F12') {
        e.preventDefault();
        return false;
      }

      // PrintScreen key
      if (e.key === 'PrintScreen') {
        e.preventDefault();
        return false;
      }
    };

    // Screenshot prevention (basic detection)
    const handleVisibilityChange = () => {
      if (enableScreenshotPrevention && document.hidden) {
        // Document is hidden, might be taking screenshot
        console.warn('Screenshot attempt detected');
      }
    };

    // Prevent drag and drop
    const handleDragStart = (e: DragEvent) => {
      e.preventDefault();
      return false;
    };

    // Add event listeners to the container
    const container = containerRef.current;
    if (container) {
      container.addEventListener('contextmenu', handleContextMenu as any);
      container.addEventListener('dragstart', handleDragStart as any);
    }

    // Add global event listeners
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Cleanup
    return () => {
      if (container) {
        container.removeEventListener('contextmenu', handleContextMenu as any);
        container.removeEventListener('dragstart', handleDragStart as any);
      }
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [allowTextSelection, enableScreenshotPrevention]);

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full"
      style={{
        userSelect: allowTextSelection ? 'text' : 'none',
        WebkitUserSelect: allowTextSelection ? 'text' : 'none',
        WebkitTouchCallout: 'none',
      }}
    >
      <FlipBookViewer
        {...props}
        allowTextSelection={allowTextSelection}
      />
    </div>
  );
}
