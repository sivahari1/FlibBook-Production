'use client';

import React from 'react';
import { ConversionProgress, ConversionStatus, ConversionStage } from '@/lib/types/conversion';
import { Button } from '@/components/ui/Button';
import { Loader2, AlertCircle, CheckCircle, Clock, RefreshCw } from 'lucide-react';

interface ConversionProgressIndicatorProps {
  progress: ConversionProgress;
  onRetry?: () => void;
  onCancel?: () => void;
  className?: string;
  showDetails?: boolean;
}

export function ConversionProgressIndicator({
  progress,
  onRetry,
  onCancel,
  className = '',
  showDetails = true,
}: ConversionProgressIndicatorProps) {
  const getStatusIcon = (status: ConversionStatus) => {
    switch (status) {
      case 'queued':
        return <Clock className="w-4 h-4 text-blue-500" />;
      case 'processing':
        return <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />;
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'failed':
        return <AlertCircle className="w-4 h-4 text-red-500" />;
      case 'cancelled':
        return <AlertCircle className="w-4 h-4 text-gray-500" />;
      default:
        return <Clock className="w-4 h-4 text-gray-500" />;
    }
  };

  const getStatusColor = (status: ConversionStatus) => {
    switch (status) {
      case 'queued':
        return 'bg-blue-500';
      case 'processing':
        return 'bg-blue-500';
      case 'completed':
        return 'bg-green-500';
      case 'failed':
        return 'bg-red-500';
      case 'cancelled':
        return 'bg-gray-500';
      default:
        return 'bg-gray-300';
    }
  };

  const formatTimeRemaining = (milliseconds: number) => {
    const seconds = Math.ceil(milliseconds / 1000);
    if (seconds < 60) {
      return `${seconds}s`;
    }
    const minutes = Math.ceil(seconds / 60);
    if (minutes < 60) {
      return `${minutes}m`;
    }
    const hours = Math.ceil(minutes / 60);
    return `${hours}h`;
  };

  const isActive = progress.status === 'queued' || progress.status === 'processing';
  const canRetry = progress.status === 'failed' && progress.retryCount < 3;
  const canCancel = isActive;

  return (
    <div className={`bg-white border border-gray-200 rounded-lg p-4 ${className}`}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-2">
          {getStatusIcon(progress.status)}
          <span className="font-medium text-gray-900">
            Document Conversion
          </span>
        </div>
        
        {showDetails && (
          <div className="flex items-center space-x-2">
            {canCancel && onCancel && (
              <Button
                variant="outline"
                size="sm"
                onClick={onCancel}
                className="text-gray-600 hover:text-gray-800"
              >
                Cancel
              </Button>
            )}
            {canRetry && onRetry && (
              <Button
                variant="outline"
                size="sm"
                onClick={onRetry}
                className="text-blue-600 hover:text-blue-800"
              >
                <RefreshCw className="w-3 h-3 mr-1" />
                Retry
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Progress Bar */}
      <div className="mb-3">
        <div className="flex justify-between text-sm text-gray-600 mb-1">
          <span>{progress.message}</span>
          <span>{progress.progress}%</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className={`h-2 rounded-full transition-all duration-300 ${getStatusColor(progress.status)}`}
            style={{ width: `${progress.progress}%` }}
          />
        </div>
      </div>

      {/* Details */}
      {showDetails && (
        <div className="space-y-2 text-sm text-gray-600">
          {progress.totalPages && (
            <div className="flex justify-between">
              <span>Pages:</span>
              <span>{progress.processedPages} / {progress.totalPages}</span>
            </div>
          )}
          
          {progress.estimatedTimeRemaining && progress.estimatedTimeRemaining > 0 && (
            <div className="flex justify-between">
              <span>Time remaining:</span>
              <span>{formatTimeRemaining(progress.estimatedTimeRemaining)}</span>
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
            <span>Stage:</span>
            <span className="capitalize">{progress.stage.replace('_', ' ')}</span>
          </div>
        </div>
      )}

      {/* Error Message */}
      {progress.status === 'failed' && (
        <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-md">
          <div className="flex items-start space-x-2">
            <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
            <div className="text-sm text-red-700">
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

      {/* Success Message */}
      {progress.status === 'completed' && (
        <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-md">
          <div className="flex items-center space-x-2">
            <CheckCircle className="w-4 h-4 text-green-500" />
            <span className="text-sm text-green-700 font-medium">
              Document converted successfully! You can now view your document.
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

// Compact version for inline display
export function ConversionProgressBadge({
  progress,
  className = '',
}: {
  progress: ConversionProgress;
  className?: string;
}) {
  const getStatusColor = (status: ConversionStatus) => {
    switch (status) {
      case 'queued':
        return 'bg-blue-100 text-blue-800';
      case 'processing':
        return 'bg-blue-100 text-blue-800';
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'failed':
        return 'bg-red-100 text-red-800';
      case 'cancelled':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className={`inline-flex items-center space-x-2 px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(progress.status)} ${className}`}>
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