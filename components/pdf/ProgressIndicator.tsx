/**
 * Enhanced Progress Indicator Component
 * 
 * Provides comprehensive visual progress feedback for PDF rendering operations
 * with stage information, force retry buttons, and detailed status.
 * 
 * Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 1.4
 */

'use client';

import React, { useEffect, useState } from 'react';
import { Button } from '../ui/Button';
import { RenderingStage, type ProgressState } from '../../lib/pdf-reliability/types';
const Stage = RenderingStage;

interface ProgressIndicatorProps {
  /** Current progress state */
  progress: ProgressState;
  /** Callback when force retry is requested */
  onForceRetry?: () => void;
  /** Whether to show detailed information */
  showDetails?: boolean;
  /** Custom className for styling */
  className?: string;
}

/**
 * Get user-friendly stage description
 */
function getStageDescription(stage: RenderingStage): string {
  switch (stage) {
    case Stage.INITIALIZING:
      return 'Initializing...';
    case Stage.FETCHING:
      return 'Downloading PDF...';
    case Stage.PARSING:
      return 'Processing document...';
    case Stage.RENDERING:
      return 'Rendering pages...';
    case Stage.FINALIZING:
      return 'Finalizing...';
    case Stage.COMPLETE:
      return 'Complete';
    case Stage.ERROR:
      return 'Error occurred';
    default:
      return 'Loading...';
  }
}

/**
 * Get progress bar color based on state
 */
function getProgressColor(progress: ProgressState): string {
  if (progress.isStuck) {
    return 'bg-yellow-500';
  }
  if (progress.stage === Stage.ERROR) {
    return 'bg-red-500';
  }
  if (progress.stage === Stage.COMPLETE) {
    return 'bg-green-500';
  }
  return 'bg-blue-500';
}

/**
 * Format time elapsed
 */
function formatTimeElapsed(milliseconds: number): string {
  const seconds = Math.floor(milliseconds / 1000);
  if (seconds < 60) {
    return `${seconds}s`;
  }
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}m ${remainingSeconds}s`;
}

/**
 * Format bytes
 */
function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

/**
 * Get stage icon
 */
function getStageIcon(stage: RenderingStage): React.ReactNode {
  const iconClass = "w-6 h-6";
  
  switch (stage) {
    case Stage.INITIALIZING:
      return (
        <svg className={`${iconClass} text-blue-500 animate-spin`} fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
        </svg>
      );
    case Stage.FETCHING:
      return (
        <svg className={`${iconClass} text-blue-500`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 12l2 2 4-4" />
        </svg>
      );
    case Stage.PARSING:
      return (
        <svg className={`${iconClass} text-yellow-500`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      );
    case Stage.RENDERING:
      return (
        <svg className={`${iconClass} text-orange-500`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      );
    case Stage.FINALIZING:
      return (
        <svg className={`${iconClass} text-green-500`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
      );
    case Stage.COMPLETE:
      return (
        <svg className={`${iconClass} text-green-600`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      );
    case Stage.ERROR:
      return (
        <svg className={`${iconClass} text-red-500`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      );
    default:
      return (
        <svg className={`${iconClass} text-gray-500`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      );
  }
}

/**
 * Get stage order for progress visualization
 */
function getStageOrder(stage: RenderingStage): number {
  const stageOrder = {
    [Stage.INITIALIZING]: 0,
    [Stage.FETCHING]: 1,
    [Stage.PARSING]: 2,
    [Stage.RENDERING]: 3,
    [Stage.FINALIZING]: 4,
    [Stage.COMPLETE]: 5,
    [Stage.ERROR]: -1,
  };
  return stageOrder[stage] ?? -1;
}

/**
 * Enhanced Progress Indicator Component with Stage Information
 */
export function ProgressIndicator({
  progress,
  onForceRetry,
  showDetails = false,
  className = '',
}: ProgressIndicatorProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [showStageDetails, setShowStageDetails] = useState(false);

  // Show progress indicator immediately (Requirements: 5.1)
  useEffect(() => {
    setIsVisible(true);
  }, []);

  // Don't render if not visible yet
  if (!isVisible) {
    return null;
  }

  const progressColor = getProgressColor(progress);
  const stageDescription = getStageDescription(progress.stage);
  const showRetryButton = progress.isStuck && onForceRetry;
  const stageIcon = getStageIcon(progress.stage);

  return (
    <div className={`w-full max-w-lg mx-auto p-6 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 ${className}`}>
      {/* Enhanced Header with Stage Icon */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-3">
          <div className="flex-shrink-0">
            {stageIcon}
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Loading PDF
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {stageDescription}
            </p>
          </div>
        </div>
        <div className="text-right">
          <div className="text-2xl font-bold text-gray-900 dark:text-white">
            {Math.round(progress.percentage)}%
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400">
            {formatTimeElapsed(progress.timeElapsed)}
          </div>
        </div>
      </div>

      {/* Enhanced Progress Bar with Animation */}
      <div className="mb-4">
        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3 overflow-hidden">
          <div
            className={`h-3 rounded-full transition-all duration-500 ease-out ${progressColor} relative`}
            style={{ width: `${progress.percentage}%` }}
            role="progressbar"
            aria-valuenow={progress.percentage}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={`Loading progress: ${progress.percentage}%`}
          >
            {/* Animated shimmer effect for active progress */}
            {progress.stage !== Stage.COMPLETE && progress.stage !== Stage.ERROR && (
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-pulse" />
            )}
          </div>
        </div>
        
        {/* Stage Progress Indicators */}
        <div className="flex justify-between mt-2 text-xs">
          {Object.values(Stage).filter(stage => stage !== Stage.ERROR).map((stage, index) => (
            <div
              key={stage}
              className={`flex flex-col items-center ${
                getStageOrder(progress.stage) >= getStageOrder(stage)
                  ? 'text-blue-600 dark:text-blue-400'
                  : 'text-gray-400 dark:text-gray-600'
              }`}
            >
              <div
                className={`w-2 h-2 rounded-full mb-1 ${
                  getStageOrder(progress.stage) >= getStageOrder(stage)
                    ? 'bg-blue-600 dark:bg-blue-400'
                    : 'bg-gray-300 dark:bg-gray-600'
                }`}
              />
              <span className="capitalize">{stage.replace('_', ' ')}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Stuck State Warning */}
      {progress.isStuck && (
        <div className="mb-3 p-2 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-md">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <svg
                className="w-4 h-4 text-yellow-600 dark:text-yellow-400 mr-2"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                  clipRule="evenodd"
                />
              </svg>
              <span className="text-sm text-yellow-800 dark:text-yellow-200">
                Loading appears stuck
              </span>
            </div>
            
            {showRetryButton && (
              <Button
                onClick={onForceRetry}
                size="sm"
                variant="outline"
                className="ml-2"
              >
                Force Retry
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Detailed Information */}
      {showDetails && (
        <div className="text-xs text-gray-500 dark:text-gray-400 space-y-1">
          <div className="flex justify-between">
            <span>Time elapsed:</span>
            <span>{formatTimeElapsed(progress.timeElapsed)}</span>
          </div>
          
          {progress.totalBytes > 0 && (
            <div className="flex justify-between">
              <span>Downloaded:</span>
              <span>
                {formatBytes(progress.bytesLoaded)} / {formatBytes(progress.totalBytes)}
              </span>
            </div>
          )}
          
          <div className="flex justify-between">
            <span>Last update:</span>
            <span>{progress.lastUpdate.toLocaleTimeString()}</span>
          </div>
        </div>
      )}

      {/* Error State */}
      {progress.stage === Stage.ERROR && (
        <div className="mt-2 p-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md">
          <div className="flex items-center">
            <svg
              className="w-4 h-4 text-red-600 dark:text-red-400 mr-2"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                clipRule="evenodd"
              />
            </svg>
            <span className="text-sm text-red-800 dark:text-red-200">
              Failed to load PDF
            </span>
          </div>
        </div>
      )}

      {/* Success State */}
      {progress.stage === Stage.COMPLETE && (
        <div className="mt-2 p-2 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-md">
          <div className="flex items-center">
            <svg
              className="w-4 h-4 text-green-600 dark:text-green-400 mr-2"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                clipRule="evenodd"
              />
            </svg>
            <span className="text-sm text-green-800 dark:text-green-200">
              PDF loaded successfully
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Minimal Progress Bar Component
 * 
 * A simpler version for inline use
 */
export function MinimalProgressBar({
  progress,
  className = '',
}: {
  progress: ProgressState;
  className?: string;
}) {
  const progressColor = getProgressColor(progress);

  return (
    <div className={`w-full ${className}`}>
      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1">
        <div
          className={`h-1 rounded-full transition-all duration-300 ${progressColor}`}
          style={{ width: `${progress.percentage}%` }}
          role="progressbar"
          aria-valuenow={progress.percentage}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`Progress: ${progress.percentage}%`}
        />
      </div>
    </div>
  );
}