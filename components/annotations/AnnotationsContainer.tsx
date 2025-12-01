/**
 * Annotations Container Component
 * Integrates annotation markers with media player modal
 */
'use client';

import React, { useState } from 'react';
import { AnnotationMarkersLayer } from './AnnotationMarkersLayer';
import { MediaPlayerModal } from './MediaPlayerModal';
import { usePageAnnotations } from '@/hooks/usePageAnnotations';
import type { DocumentAnnotation } from '@/lib/types/annotations';

interface AnnotationsContainerProps {
  documentId: string;
  currentPage: number;
  zoomLevel?: number;
  pageWidth?: number;
  pageHeight?: number;
  watermarkText?: string;
  onAnnotationUpdate?: () => void;
}

export function AnnotationsContainer({
  documentId,
  currentPage,
  zoomLevel = 1,
  pageWidth = 800,
  pageHeight = 1000,
  watermarkText = '',
  onAnnotationUpdate
}: AnnotationsContainerProps) {
  const [selectedAnnotation, setSelectedAnnotation] = useState<DocumentAnnotation | null>(null);
  const [isPlayerOpen, setIsPlayerOpen] = useState(false);

  const { annotations, loading, error, refreshCurrentPage } = usePageAnnotations({
    documentId,
    currentPage,
    preloadNextPage: true
  });

  const handleMarkerClick = (annotation: DocumentAnnotation) => {
    setSelectedAnnotation(annotation);
    setIsPlayerOpen(true);
  };

  const handlePlayerClose = () => {
    setIsPlayerOpen(false);
    setSelectedAnnotation(null);
  };

  const handleAnnotationCreated = () => {
    refreshCurrentPage();
    onAnnotationUpdate?.();
  };

  if (loading) {
    return (
      <div className="absolute top-4 right-4 z-10">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-2">
          <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500" />
            <span>Loading annotations...</span>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="absolute top-4 right-4 z-10">
        <div className="bg-red-50 dark:bg-red-900/20 rounded-lg shadow-lg p-2">
          <div className="text-sm text-red-600 dark:text-red-400">
            Failed to load annotations
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Annotation Markers */}
      <AnnotationMarkersLayer
        annotations={annotations}
        pageNumber={currentPage}
        onMarkerClick={handleMarkerClick}
        zoomLevel={zoomLevel}
        pageWidth={pageWidth}
        pageHeight={pageHeight}
      />

      {/* Annotation Count Badge */}
      {annotations.length > 0 && (
        <div className="absolute top-4 right-4 z-10">
          <div className="bg-white dark:bg-gray-800 rounded-full shadow-lg px-3 py-1 flex items-center gap-2">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              {annotations.length} {annotations.length === 1 ? 'annotation' : 'annotations'}
            </span>
          </div>
        </div>
      )}

      {/* Media Player Modal */}
      {selectedAnnotation && (
        <MediaPlayerModal
          isOpen={isPlayerOpen}
          onClose={handlePlayerClose}
          annotation={selectedAnnotation}
          watermarkText={watermarkText}
        />
      )}
    </>
  );
}
