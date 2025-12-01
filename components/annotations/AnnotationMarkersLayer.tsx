/**
 * Annotation Markers Layer Component
 * Manages and renders all annotation markers for a flipbook page
 */
'use client';

import React, { useMemo } from 'react';
import { AnnotationMarker } from './AnnotationMarker';
import type { DocumentAnnotation } from '@/lib/types/annotations';

interface AnnotationMarkersLayerProps {
  annotations: DocumentAnnotation[];
  pageNumber: number;
  onMarkerClick: (annotation: DocumentAnnotation) => void;
  zoomLevel?: number;
  pageWidth?: number;
  pageHeight?: number;
}

export function AnnotationMarkersLayer({
  annotations,
  pageNumber,
  onMarkerClick,
  zoomLevel = 1,
  pageWidth = 800,
  pageHeight = 1000
}: AnnotationMarkersLayerProps) {
  // Filter annotations for current page
  const pageAnnotations = useMemo(() => {
    return annotations.filter(ann => ann.pageNumber === pageNumber);
  }, [annotations, pageNumber]);

  // Calculate marker positions to avoid overlap
  const markerPositions = useMemo(() => {
    const positions: Map<string, { x: number; y: number }> = new Map();
    const markerSize = 32; // 8 * 4 (w-8 in Tailwind)
    const minDistance = markerSize + 10; // Minimum distance between markers

    pageAnnotations.forEach((annotation, index) => {
      // Default position based on index (staggered grid)
      const col = index % 3;
      const row = Math.floor(index / 3);
      
      let x = 100 + (col * 150); // Spread horizontally
      let y = 100 + (row * 100);  // Spread vertically

      // Ensure within page bounds
      x = Math.min(x, pageWidth - 50);
      y = Math.min(y, pageHeight - 50);
      x = Math.max(x, 50);
      y = Math.max(y, 50);

      // Check for overlaps and adjust
      let attempts = 0;
      const maxAttempts = 10;
      
      while (attempts < maxAttempts) {
        let hasOverlap = false;
        
        for (const [, pos] of positions) {
          const distance = Math.sqrt(
            Math.pow(x - pos.x, 2) + Math.pow(y - pos.y, 2)
          );
          
          if (distance < minDistance) {
            hasOverlap = true;
            // Move marker slightly
            x += 40;
            if (x > pageWidth - 50) {
              x = 50;
              y += 40;
            }
            break;
          }
        }
        
        if (!hasOverlap) break;
        attempts++;
      }

      positions.set(annotation.id, { x, y });
    });

    return positions;
  }, [pageAnnotations, pageWidth, pageHeight]);

  if (pageAnnotations.length === 0) {
    return null;
  }

  return (
    <div 
      className="absolute inset-0 pointer-events-none"
      style={{ zIndex: 10 }}
    >
      <div className="relative w-full h-full pointer-events-auto">
        {pageAnnotations.map((annotation) => {
          const position = markerPositions.get(annotation.id) || { x: 100, y: 100 };
          
          return (
            <AnnotationMarker
              key={annotation.id}
              annotation={annotation}
              onClick={onMarkerClick}
              position={position}
              zoomLevel={zoomLevel}
            />
          );
        })}
      </div>
    </div>
  );
}
