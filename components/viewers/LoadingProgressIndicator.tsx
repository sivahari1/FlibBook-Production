'use client';

import React, { useState, useEffect } from 'react';
import { LoadProgress } from './SimpleDocumentViewer';

interface LoadingProgressIndicatorProps {
  progress: LoadProgress;
  showDetails?: boolean;
  className?: string;
}

/**
 * Enhanced Loading Progress Indicator
 * 
 * Provides real-time loading status updates with smooth transitions
 * and detailed progress information for document loading.
 * 
 * Requirements: 1.5, 3.1, 3.2
 */
export default function LoadingProgressIndicator({
  progress,
  showDetails = true,
  className = ''
}: LoadingProgressIndicatorProps) {
  const [displayPercentage, setDisplayPercentage] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);

  // Update display percentage with enhanced smooth transitions
  useEffect(() => {
    // For testing environment or when animation is not needed, update immediately
    if (typeof window === 'undefined' || process.env.NODE_ENV === 'test') {
      setDisplayPercentage(progress.percentage);
      setIsAnimating(false);
      return;
    }

    if (progress.percentage !== displayPercentage) {
      setIsAnimating(true);
      
      // Animate progress bar smoothly with adaptive duration
      const startPercentage = displayPercentage;
      const targetPercentage = progress.percentage;
      const percentageDiff = Math.abs(targetPercentage - startPercentage);
      
      // Adaptive duration based on percentage change
      const baseDuration = 300;
      const duration = Math.min(baseDuration, Math.max(100, percentageDiff * 10));
      const startTime = Date.now();

      const animate = () => {
        const elapsed = Date.now() - startTime;
        const animationProgress = Math.min(elapsed / duration, 1);
        
        // Enhanced easing function for smoother animation
        const easeOutQuart = 1 - Math.pow(1 - animationProgress, 4);
        const currentPercentage = startPercentage + (targetPercentage - startPercentage) * easeOutQuart;
        
        setDisplayPercentage(Math.round(currentPercentage));
        
        if (animationProgress < 1) {
          requestAnimationFrame(animate);
        } else {
          setIsAnimating(false);
        }
      };
      
      requestAnimationFrame(animate);
    }
  }, [progress.percentage, displayPercentage]);

  const getStatusColor = () => {
    switch (progress.status) {
      case 'loading':
        return 'bg-blue-500';
      case 'rendering':
        return 'bg-yellow-500';
      case 'complete':
        return 'bg-green-500';
      case 'error':
        return 'bg-red-500';
      default:
        return 'bg-gray-500';
    }
  };

  const getStatusText = () => {
    switch (progress.status) {
      case 'loading':
        return 'Loading document...';
      case 'rendering':
        return 'Rendering pages...';
      case 'complete':
        return 'Document ready';
      case 'error':
        return 'Loading failed';
      default:
        return 'Preparing...';
    }
  };

  const getStatusIcon = () => {
    switch (progress.status) {
      case 'loading':
        return (
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
        );
      case 'rendering':
        return (
          <div className="animate-pulse rounded-full h-4 w-4 bg-yellow-500"></div>
        );
      case 'complete':
        return (
          <div className="rounded-full h-4 w-4 bg-green-500 flex items-center justify-center">
            <svg className="w-2 h-2 text-white" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
          </div>
        );
      case 'error':
        return (
          <div className="rounded-full h-4 w-4 bg-red-500 flex items-center justify-center">
            <svg className="w-2 h-2 text-white" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className={`w-full max-w-md mx-auto ${className}`} data-testid="loading-progress-indicator">
      {/* Progress Bar */}
      <div className="w-full bg-gray-200 rounded-full h-2 mb-3 overflow-hidden">
        <div 
          className={`h-full rounded-full transition-all duration-300 ease-out ${getStatusColor()}`}
          style={{ width: `${displayPercentage}%` }}
          data-testid="progress-bar"
        />
      </div>

      {/* Status Information */}
      <div className="flex items-center justify-between text-sm">
        <div className="flex items-center space-x-2">
          {getStatusIcon()}
          <span className="text-gray-700 dark:text-gray-300" data-testid="status-text">
            {getStatusText()}
          </span>
        </div>
        
        <div className="flex items-center space-x-2">
          <span 
            className={`font-medium ${isAnimating ? 'text-blue-600' : 'text-gray-600'} dark:text-gray-400`}
            data-testid="percentage-text"
          >
            {displayPercentage}%
          </span>
        </div>
      </div>

      {/* Detailed Information */}
      {showDetails && (
        <div className="mt-2 text-xs text-gray-500 dark:text-gray-400 space-y-1">
          <div className="flex justify-between" data-testid="bytes-info">
            <span>Loaded:</span>
            <span>{formatBytes(progress.loaded)} / {formatBytes(progress.total)}</span>
          </div>
          <div className="flex justify-between" data-testid="document-info">
            <span>Document:</span>
            <span className="truncate ml-2 max-w-32" title={progress.documentId}>
              {progress.documentId}
            </span>
          </div>
        </div>
      )}

      {/* Accessibility */}
      <div 
        className="sr-only" 
        aria-live="polite" 
        aria-atomic="true"
        data-testid="progress-announcer"
      >
        {getStatusText()} - {displayPercentage}% complete
      </div>
    </div>
  );
}

/**
 * Format bytes to human readable format
 */
function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}