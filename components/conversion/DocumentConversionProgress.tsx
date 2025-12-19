'use client';

import React, { useState, useEffect } from 'react';
import { ConversionProgress, ConversionStage, ConversionStatus, CONVERSION_STAGE_MESSAGES } from '@/lib/types/conversion';
import { Button } from '@/components/ui/Button';
import { 
  Loader2, 
  AlertCircle, 
  CheckCircle, 
  Clock, 
  RefreshCw, 
  FileText,
  Upload,
  Settings,
  Download
} from 'lucide-react';

interface DocumentConversionProgressProps {
  progress: ConversionProgress;
  onRetry?: () => void;
  onCancel?: () => void;
  className?: string;
  showDetails?: boolean;
  showETA?: boolean;
}

/**
 * Enhanced Document Conversion Progress Component
 * 
 * Provides comprehensive visual feedback for document conversion operations
 * with determinate progress bars, stage-based messages, and ETA calculations.
 * 
 * Requirements: 1.2, 3.1 - Real-time progress tracking and user feedback
 */
export function DocumentConversionProgress({
  progress,
  onRetry,
  onCancel,
  className = '',
  showDetails = true,
  showETA = true,
}: DocumentConversionProgressProps) {
  const [displayProgress, setDisplayProgress] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);

  // Smooth progress animation
  useEffect(() => {
    if (progress.progress !== displayProgress) {
      setIsAnimating(true);
      
      const startProgress = displayProgress;
      const targetProgress = progress.progress;
      const progressDiff = Math.abs(targetProgress - startProgress);
      
      // Adaptive animation duration based on progress change
      const duration = Math.min(500, Math.max(100, progressDiff * 5));
      const startTime = Date.now();

      const animate = () => {
        const elapsed = Date.now() - startTime;
        const animationProgress = Math.min(elapsed / duration, 1);
        
        // Smooth easing function
        const easeOutQuart = 1 - Math.pow(1 - animationProgress, 4);
        const currentProgress = startProgress + (targetProgress - startProgress) * easeOutQuart;
        
        setDisplayProgress(Math.round(currentProgress));
        
        if (animationProgress < 1) {
          requestAnimationFrame(animate);
        } else {
          setIsAnimating(false);
        }
      };
      
      requestAnimationFrame(animate);
    }
  }, [progress.progress, displayProgress]);

  const getStageIcon = (stage: ConversionStage) => {
    const iconClass = "w-5 h-5";
    
    switch (stage) {
      case 'queued':
        return <Clock className={`${iconClass} text-blue-500`} />;
      case 'initializing':
        return <Settings className={`${iconClass} text-blue-500 animate-spin`} />;
      case 'extracting_pages':
        return <FileText className={`${iconClass} text-yellow-500`} />;
      case 'processing_pages':
        return <Loader2 className={`${iconClass} text-orange-500 animate-spin`} />;
      case 'uploading_pages':
        return <Upload className={`${iconClass} text-purple-500`} />;
      case 'finalizing':
        return <Download className={`${iconClass} text-green-500`} />;
      case 'completed':
        return <CheckCircle className={`${iconClass} text-green-600`} />;
      case 'failed':
        return <AlertCircle className={`${iconClass} text-red-500`} />;
      default:
        return <Clock className={`${iconClass} text-gray-500`} />;
    }
  };

  const getProgressColor = (status: ConversionStatus, stage: ConversionStage) => {
    if (status === 'failed') return 'bg-red-500';
    if (status === 'completed') return 'bg-green-500';
    if (status === 'cancelled') return 'bg-gray-500';
    
    switch (stage) {
      case 'queued':
        return 'bg-blue-400';
      case 'initializing':
        return 'bg-blue-500';
      case 'extracting_pages':
        return 'bg-yellow-500';
      case 'processing_pages':
        return 'bg-orange-500';
      case 'uploading_pages':
        return 'bg-purple-500';
      case 'finalizing':
        return 'bg-green-500';
      default:
        return 'bg-blue-500';
    }
  };

  const formatTimeRemaining = (milliseconds: number) => {
    if (!milliseconds || milliseconds <= 0) return null;
    
    const seconds = Math.ceil(milliseconds / 1000);
    if (seconds < 60) {
      return `${seconds}s remaining`;
    }
    const minutes = Math.ceil(seconds / 60);
    if (minutes < 60) {
      return `${minutes}m remaining`;
    }
    const hours = Math.ceil(minutes / 60);
    return `${hours}h remaining`;
  };

  const getStageProgress = (stage: ConversionStage): number => {
    const stageProgressMap: Record<ConversionStage, number> = {
      queued: 0,
      initializing: 10,
      extracting_pages: 25,
      processing_pages: 60,
      uploading_pages: 85,
      finalizing: 95,
      completed: 100,
      failed: 0,
    };
    return stageProgressMap[stage] || 0;
  };

  const isActive = progress.status === 'queued' || progress.status === 'processing';
  const canRetry = progress.status === 'failed' && progress.retryCount < 3;
  const canCancel = isActive && onCancel;
  const progressColor = getProgressColor(progress.status, progress.stage);
  const stageIcon = getStageIcon(progress.stage);
  const etaText = showETA && progress.estimatedTimeRemaining ? formatTimeRemaining(progress.estimatedTimeRemaining) : null;

  return (
    <div className={`bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6 shadow-sm ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-3">
          <div className="flex-shrink-0">
            {stageIcon}
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Converting Document
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {CONVERSION_STAGE_MESSAGES[progress.stage] || progress.message}
            </p>
          </div>
        </div>
        
        <div className="text-right">
          <div className="text-2xl font-bold text-gray-900 dark:text-white">
            {displayProgress}%
          </div>
          {etaText && (
            <div className="text-xs text-gray-500 dark:text-gray-400">
              {etaText}
            </div>
          )}
        </div>
      </div>

      {/* Determinate Progress Bar */}
      <div className="mb-4">
        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3 overflow-hidden">
          <div
            className={`h-3 rounded-full transition-all duration-500 ease-out ${progressColor} relative`}
            style={{ width: `${displayProgress}%` }}
            role="progressbar"
            aria-valuenow={displayProgress}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={`Conversion progress: ${displayProgress}%`}
          >
            {/* Animated shimmer effect for active progress */}
            {isActive && (
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-pulse" />
            )}
          </div>
        </div>
        
        {/* Stage Progress Indicators */}
        {showDetails && (
          <div className="flex justify-between mt-3 text-xs">
            {(['queued', 'initializing', 'extracting_pages', 'processing_pages', 'uploading_pages', 'finalizing', 'completed'] as ConversionStage[]).map((stage, index) => {
              const stageProgress = getStageProgress(stage);
              const isCurrentStage = progress.stage === stage;
              const isCompletedStage = getStageProgress(progress.stage) > stageProgress;
              
              return (
                <div
                  key={stage}
                  className={`flex flex-col items-center ${
                    isCurrentStage
                      ? 'text-blue-600 dark:text-blue-400 font-medium'
                      : isCompletedStage
                      ? 'text-green-600 dark:text-green-400'
                      : 'text-gray-400 dark:text-gray-600'
                  }`}
                >
                  <div
                    className={`w-2 h-2 rounded-full mb-1 ${
                      isCurrentStage
                        ? 'bg-blue-600 dark:bg-blue-400 animate-pulse'
                        : isCompletedStage
                        ? 'bg-green-600 dark:bg-green-400'
                        : 'bg-gray-300 dark:bg-gray-600'
                    }`}
                  />
                  <span className="capitalize text-center leading-tight">
                    {stage.replace('_', ' ')}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Action Buttons */}
      {(canCancel || canRetry) && (
        <div className="flex items-center justify-end space-x-2 mb-4">
          {canCancel && (
            <Button
              variant="outline"
              size="sm"
              onClick={onCancel}
              className="text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200"
            >
              Cancel
            </Button>
          )}
          {canRetry && onRetry && (
            <Button
              variant="outline"
              size="sm"
              onClick={onRetry}
              className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-200"
            >
              <RefreshCw className="w-3 h-3 mr-1" />
              Retry ({3 - progress.retryCount} left)
            </Button>
          )}
        </div>
      )}

      {/* Detailed Information */}
      {showDetails && (
        <div className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
          {progress.totalPages && (
            <div className="flex justify-between">
              <span>Pages:</span>
              <span>{progress.processedPages} / {progress.totalPages}</span>
            </div>
          )}
          
          {progress.retryCount > 0 && (
            <div className="flex justify-between">
              <span>Retry attempts:</span>
              <span>{progress.retryCount} / 3</span>
            </div>
          )}
          
          <div className="flex justify-between">
            <span>Status:</span>
            <span className="capitalize">{progress.status.replace('_', ' ')}</span>
          </div>
          
          <div className="flex justify-between">
            <span>Document ID:</span>
            <span className="font-mono text-xs truncate max-w-32" title={progress.documentId}>
              {progress.documentId}
            </span>
          </div>
        </div>
      )}

      {/* Status Messages */}
      {progress.status === 'failed' && (
        <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md">
          <div className="flex items-start space-x-2">
            <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
            <div className="text-sm text-red-700 dark:text-red-300">
              <p className="font-medium">Conversion Failed</p>
              <p className="mt-1">
                {progress.retryCount < 3 
                  ? 'The document conversion encountered an error. You can try again.'
                  : 'The document conversion failed after multiple attempts. Please contact support if this continues.'
                }
              </p>
            </div>
          </div>
        </div>
      )}

      {progress.status === 'completed' && (
        <div className="mt-4 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-md">
          <div className="flex items-center space-x-2">
            <CheckCircle className="w-4 h-4 text-green-500" />
            <span className="text-sm text-green-700 dark:text-green-300 font-medium">
              Document converted successfully! You can now view your document.
            </span>
          </div>
        </div>
      )}

      {/* Accessibility */}
      <div 
        className="sr-only" 
        aria-live="polite" 
        aria-atomic="true"
      >
        {CONVERSION_STAGE_MESSAGES[progress.stage]} - {displayProgress}% complete
      </div>
    </div>
  );
}

/**
 * Compact Progress Badge for Inline Display
 */
export function DocumentConversionBadge({
  progress,
  className = '',
}: {
  progress: ConversionProgress;
  className?: string;
}) {
  const getStatusColor = (status: ConversionStatus) => {
    switch (status) {
      case 'queued':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300';
      case 'processing':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300';
      case 'completed':
        return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300';
      case 'failed':
        return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300';
      case 'cancelled':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-300';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-300';
    }
  };

  return (
    <div className={`inline-flex items-center space-x-2 px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(progress.status)} ${className}`}>
      {progress.status === 'processing' && (
        <Loader2 className="w-3 h-3 animate-spin" />
      )}
      <span className="capitalize">{progress.status.replace('_', ' ')}</span>
      {(progress.status === 'queued' || progress.status === 'processing') && (
        <span>{progress.progress}%</span>
      )}
    </div>
  );
}

/**
 * Minimal Progress Bar for Embedded Use
 */
export function DocumentConversionProgressBar({
  progress,
  showPercentage = true,
  className = '',
}: {
  progress: ConversionProgress;
  showPercentage?: boolean;
  className?: string;
}) {
  const progressColor = getProgressColor(progress.status, progress.stage);

  return (
    <div className={`w-full ${className}`}>
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs text-gray-600 dark:text-gray-400">
          {CONVERSION_STAGE_MESSAGES[progress.stage]}
        </span>
        {showPercentage && (
          <span className="text-xs font-medium text-gray-900 dark:text-white">
            {progress.progress}%
          </span>
        )}
      </div>
      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
        <div
          className={`h-2 rounded-full transition-all duration-300 ${progressColor}`}
          style={{ width: `${progress.progress}%` }}
          role="progressbar"
          aria-valuenow={progress.progress}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`Conversion progress: ${progress.progress}%`}
        />
      </div>
    </div>
  );
}