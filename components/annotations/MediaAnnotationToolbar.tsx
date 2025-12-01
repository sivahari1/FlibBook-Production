/**
 * MediaAnnotationToolbar Component
 * Toolbar that appears when text is selected, allowing users to add annotations
 * Only visible to users with PLATFORM_USER role
 */
'use client';

import React, { useEffect, useState } from 'react';
import { useShowAnnotationToolbar } from '@/hooks/useAnnotationPermissions';
import { InlinePermissionMessage } from './PermissionError';

interface MediaAnnotationToolbarProps {
  selectedText: string;
  position: { x: number; y: number };
  onAddAudio: () => void;
  onAddVideo: () => void;
  onClose: () => void;
  visible: boolean;
}

export function MediaAnnotationToolbar({
  selectedText,
  position,
  onAddAudio,
  onAddVideo,
  onClose,
  visible,
}: MediaAnnotationToolbarProps) {
  const canCreateAnnotation = useShowAnnotationToolbar();
  const [showPermissionMessage, setShowPermissionMessage] = useState(false);

  useEffect(() => {
    if (visible && !canCreateAnnotation) {
      setShowPermissionMessage(true);
      const timer = setTimeout(() => {
        setShowPermissionMessage(false);
        onClose();
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [visible, canCreateAnnotation, onClose]);

  if (!visible) return null;

  // Show permission message if user doesn't have permission
  if (!canCreateAnnotation) {
    if (!showPermissionMessage) return null;
    
    return (
      <div
        className="fixed z-50 rounded-lg bg-white p-3 shadow-xl dark:bg-gray-800"
        style={{
          left: `${position.x}px`,
          top: `${position.y - 60}px`,
        }}
      >
        <InlinePermissionMessage message="Only PLATFORM_USER can create annotations" />
      </div>
    );
  }

  return (
    <div
      className="fixed z-50 flex items-center gap-2 rounded-lg bg-white p-2 shadow-xl dark:bg-gray-800"
      style={{
        left: `${position.x}px`,
        top: `${position.y - 60}px`,
      }}
    >
      <div className="flex items-center gap-2 border-r border-gray-200 pr-2 dark:border-gray-700">
        <span className="text-xs text-gray-600 dark:text-gray-400">
          Add annotation:
        </span>
      </div>
      
      <button
        onClick={onAddAudio}
        className="flex items-center gap-1 rounded-md bg-green-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
        title="Add audio annotation"
      >
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
        </svg>
        Audio
      </button>
      
      <button
        onClick={onAddVideo}
        className="flex items-center gap-1 rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
        title="Add video annotation"
      >
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
        </svg>
        Video
      </button>
      
      <button
        onClick={onClose}
        className="ml-1 rounded-md p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 focus:outline-none dark:hover:bg-gray-700 dark:hover:text-gray-300"
        title="Close"
      >
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
}

/**
 * Hook to manage toolbar visibility and position
 */
export function useAnnotationToolbar() {
  const [toolbarState, setToolbarState] = useState({
    visible: false,
    selectedText: '',
    position: { x: 0, y: 0 },
  });

  const showToolbar = (text: string, x: number, y: number) => {
    setToolbarState({
      visible: true,
      selectedText: text,
      position: { x, y },
    });
  };

  const hideToolbar = () => {
    setToolbarState({
      visible: false,
      selectedText: '',
      position: { x: 0, y: 0 },
    });
  };

  return {
    toolbarState,
    showToolbar,
    hideToolbar,
  };
}
