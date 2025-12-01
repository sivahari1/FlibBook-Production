/**
 * Annotation Marker Component
 * Visual markers that appear on flipbook pages to indicate annotations
 */
'use client';

import React, { useState } from 'react';
import type { DocumentAnnotation } from '@/lib/types/annotations';

interface AnnotationMarkerProps {
  annotation: DocumentAnnotation;
  onClick: (annotation: DocumentAnnotation) => void;
  position?: { x: number; y: number };
  zoomLevel?: number;
}

export function AnnotationMarker({
  annotation,
  onClick,
  position = { x: 0, y: 0 },
  zoomLevel = 1
}: AnnotationMarkerProps) {
  const [isHovered, setIsHovered] = useState(false);

  const getMarkerIcon = () => {
    return annotation.mediaType === 'AUDIO' ? '🎵' : '🎬';
  };

  const getMarkerColor = () => {
    return annotation.mediaType === 'AUDIO' 
      ? 'bg-green-500 hover:bg-green-600' 
      : 'bg-blue-500 hover:bg-blue-600';
  };

  const isPrivate = annotation.visibility === 'private';

  // Calculate scaled position based on zoom level
  const scaledX = position.x * zoomLevel;
  const scaledY = position.y * zoomLevel;

  return (
    <>
      <button
        onClick={() => onClick(annotation)}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className={`
          absolute annotation-marker
          ${getMarkerColor()}
          ${isPrivate ? 'ring-2 ring-yellow-400' : ''}
          w-8 h-8 rounded-full
          flex items-center justify-center
          text-white text-sm font-bold
          shadow-lg
          cursor-pointer
          transition-all duration-200
          hover:scale-110
          z-20
        `}
        style={{
          left: `${scaledX}px`,
          top: `${scaledY}px`,
          transform: 'translate(-50%, -50%)'
        }}
        title={annotation.selectedText}
      >
        {getMarkerIcon()}
      </button>

      {/* Tooltip on hover */}
      {isHovered && (
        <div
          className="absolute z-30 bg-gray-900 text-white text-xs rounded-lg p-2 shadow-xl max-w-xs pointer-events-none"
          style={{
            left: `${scaledX}px`,
            top: `${scaledY - 50}px`,
            transform: 'translateX(-50%)'
          }}
        >
          <div className="font-semibold mb-1">
            {annotation.mediaType === 'AUDIO' ? '🎵 Audio' : '🎬 Video'} Annotation
          </div>
          <div className="text-gray-300 line-clamp-2">
            "{annotation.selectedText}"
          </div>
          {isPrivate && (
            <div className="text-yellow-400 text-xs mt-1">
              🔒 Private
            </div>
          )}
        </div>
      )}
    </>
  );
}
