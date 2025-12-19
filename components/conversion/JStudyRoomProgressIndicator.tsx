'use client';

import React, { useState, useEffect } from 'react';
import { ConversionProgress } from '@/lib/types/conversion';
import { DocumentConversionProgress, DocumentConversionProgressBar } from './DocumentConversionProgress';
import { Button } from '@/components/ui/Button';
import { 
  RefreshCw, 
  ExternalLink, 
  AlertTriangle,
  Clock,
  CheckCircle2,
  XCircle
} from 'lucide-react';

interface JStudyRoomProgressIndicatorProps {
  documentId: string;
  documentTitle?: string;
  progress?: ConversionProgress;
  isLoading?: boolean;
  error?: string | null;
  onRetry?: () => void;
  onNavigateBack?: () => void;
  onViewDocument?: () => void;
  className?: string;
  variant?: 'full' | 'compact' | 'minimal';
}

/**
 * JStudyRoom-specific Progress Indicator
 * 
 * Provides specialized progress feedback for document viewing in JStudyRoom
 * with automatic conversion triggering, ETA calculations, and user-friendly messaging.
 * 
 * Requirements: 1.2, 1.5, 3.1 - Document loading reliability and user feedback
 */
export function JStudyRoomProgressIndicator({
  documentId,
  documentTitle,
  progress,
  isLoading = false,
  error = null,
  onRetry,
  onNavigateBack,
  onViewDocument,
  className = '',
  variant = 'full',
}: JStudyRoomProgressIndicatorProps) {
  const [showDetails, setShowDetails] = useState(false);
  const [estimatedTimeRemaining, setEstimatedTimeRemaining] = useState<number | null>(null);

  // Calculate ETA based on progress and historical data
  useEffect(() => {
    if (progress && progress.status === 'processing' && progress.progress > 0) {
      // Simple ETA calculation based on current progress
      // In a real implementation, this would use historical conversion data
      const averageConversionTime = 30000; // 30 seconds average
      const remainingProgress = 100 - progress.progress;
      const eta = (remainingProgress / 100) * averageConversionTime;
      setEstimatedTimeRemaining(eta);
    } else {
      setEstimatedTimeRemaining(null);
    }
  }, [progress]);

  // Handle different states
  if (error) {
    return (
      <div className={`bg-white dark:bg-gray-800 border border-red-200 dark:border-red-800 rounded-lg p-6 shadow-sm ${className}`}>
        <div className="text-center">
          <XCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            Unable to Load Document
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
            {error}
          </p>
          <div className="flex items-center justify-center space-x-3">
            {onRetry && (
              <Button onClick={onRetry} size="sm">
                <RefreshCw className="w-4 h-4 mr-2" />
                Try Again
              </Button>
            )}
            {onNavigateBack && (
              <Button variant="outline" onClick={onNavigateBack} size="sm">
                Go Back
              </Button>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (isLoading && !progress) {
    return (
      <div className={`bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6 shadow-sm ${className}`}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            Preparing Document
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Checking document status...
          </p>
        </div>
      </div>
    );
  }

  if (progress?.status === 'completed') {
    return (
      <div className={`bg-white dark:bg-gray-800 border border-green-200 dark:border-green-800 rounded-lg p-6 shadow-sm ${className}`}>
        <div className="text-center">
          <CheckCircle2 className="w-12 h-12 text-green-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            Document Ready!
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
            {documentTitle || 'Your document'} has been successfully prepared for viewing.
          </p>
          <div className="flex items-center justify-center space-x-3">
            {onViewDocument && (
              <Button onClick={onViewDocument}>
                <ExternalLink className="w-4 h-4 mr-2" />
                View Document
              </Button>
            )}
            {onNavigateBack && (
              <Button variant="outline" onClick={onNavigateBack} size="sm">
                Back to Library
              </Button>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (!progress) {
    return null;
  }

  // Render based on variant
  if (variant === 'minimal') {
    return (
      <div className={`${className}`}>
        <DocumentConversionProgressBar 
          progress={progress}
          showPercentage={true}
        />
      </div>
    );
  }

  if (variant === 'compact') {
    return (
      <div className={`bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 shadow-sm ${className}`}>
        <div className="flex items-center justify-between mb-3">
          <div>
            <h4 className="font-medium text-gray-900 dark:text-white">
              Converting Document
            </h4>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {documentTitle && documentTitle.length > 30 
                ? `${documentTitle.substring(0, 30)}...` 
                : documentTitle || 'Preparing for viewing'}
            </p>
          </div>
          <div className="text-right">
            <div className="text-lg font-semibold text-gray-900 dark:text-white">
              {progress.progress}%
            </div>
            {estimatedTimeRemaining && (
              <div className="text-xs text-gray-500 dark:text-gray-400">
                {Math.ceil(estimatedTimeRemaining / 1000)}s left
              </div>
            )}
          </div>
        </div>
        
        <DocumentConversionProgressBar 
          progress={progress}
          showPercentage={false}
        />
        
        {progress.status === 'failed' && (
          <div className="mt-3 flex items-center justify-between">
            <span className="text-sm text-red-600 dark:text-red-400">
              Conversion failed
            </span>
            {onRetry && (
              <Button variant="outline" size="sm" onClick={onRetry}>
                <RefreshCw className="w-3 h-3 mr-1" />
                Retry
              </Button>
            )}
          </div>
        )}
      </div>
    );
  }

  // Full variant
  return (
    <div className={`${className}`}>
      <DocumentConversionProgress
        progress={{
          ...progress,
          estimatedTimeRemaining: estimatedTimeRemaining || progress.estimatedTimeRemaining,
        }}
        onRetry={onRetry}
        showDetails={showDetails}
        showETA={true}
      />
      
      {/* JStudyRoom-specific actions */}
      <div className="mt-4 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowDetails(!showDetails)}
            className="text-gray-600 dark:text-gray-400"
          >
            {showDetails ? 'Hide Details' : 'Show Details'}
          </Button>
          {documentTitle && (
            <span className="text-sm text-gray-500 dark:text-gray-400 truncate max-w-48" title={documentTitle}>
              {documentTitle}
            </span>
          )}
        </div>
        
        <div className="flex items-center space-x-2">
          {onNavigateBack && (
            <Button variant="outline" size="sm" onClick={onNavigateBack}>
              Back to Library
            </Button>
          )}
        </div>
      </div>
      
      {/* Helpful tips during conversion */}
      {progress.status === 'processing' && (
        <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-md">
          <div className="flex items-start space-x-2">
            <Clock className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
            <div className="text-sm text-blue-700 dark:text-blue-300">
              <p className="font-medium">Document Processing</p>
              <p className="mt-1">
                We're converting your document for optimal viewing. This usually takes 30-60 seconds depending on document size.
              </p>
            </div>
          </div>
        </div>
      )}
      
      {/* Warning for slow conversion */}
      {progress.status === 'processing' && progress.progress > 0 && estimatedTimeRemaining && estimatedTimeRemaining > 60000 && (
        <div className="mt-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-md">
          <div className="flex items-start space-x-2">
            <AlertTriangle className="w-4 h-4 text-yellow-500 mt-0.5 flex-shrink-0" />
            <div className="text-sm text-yellow-700 dark:text-yellow-300">
              <p className="font-medium">Taking Longer Than Expected</p>
              <p className="mt-1">
                This document is taking longer to process than usual. You can wait for it to complete or try again later.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Hook for managing JStudyRoom document progress state
 */
export function useJStudyRoomProgress(documentId: string) {
  const [progress, setProgress] = useState<ConversionProgress | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const checkProgress = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const response = await fetch(`/api/documents/${documentId}/conversion-status`);
      if (!response.ok) {
        throw new Error('Failed to check conversion status');
      }
      
      const data = await response.json();
      setProgress(data.progress);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const triggerConversion = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const response = await fetch(`/api/documents/${documentId}/convert`, {
        method: 'POST',
      });
      
      if (!response.ok) {
        throw new Error('Failed to start conversion');
      }
      
      // Start polling for progress
      checkProgress();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start conversion');
    } finally {
      setIsLoading(false);
    }
  };

  const retry = () => {
    setError(null);
    triggerConversion();
  };

  return {
    progress,
    isLoading,
    error,
    checkProgress,
    triggerConversion,
    retry,
  };
}