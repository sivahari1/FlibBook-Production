/**
 * Manual Retry Actions Component
 * 
 * Provides specific manual retry mechanisms for different failure scenarios
 * in JStudyRoom document viewing.
 * 
 * Task 5.3: Add manual retry mechanisms
 * Requirements: 2.4, 3.2
 */

'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { DocumentErrorType } from '@/lib/resilience/document-error-recovery';

interface ManualRetryActionsProps {
  /** Type of error that occurred */
  errorType: DocumentErrorType;
  /** Document ID for context */
  documentId: string;
  /** Current retry count */
  retryCount?: number;
  /** Maximum allowed retries */
  maxRetries?: number;
  /** Whether conversion is currently in progress */
  isConverting?: boolean;
  /** Callback for retry conversion */
  onRetryConversion?: () => void | Promise<void>;
  /** Callback for refresh/reload */
  onRefresh?: () => void | Promise<void>;
  /** Callback for reporting problem */
  onReportProblem?: () => void | Promise<void>;
  /** Callback for downloading original document */
  onDownload?: () => void | Promise<void>;
  /** Callback for clearing cache and retrying */
  onClearCacheRetry?: () => void | Promise<void>;
  /** Callback for manual recovery */
  onManualRecovery?: () => void | Promise<void>;
}

export function ManualRetryActions({
  errorType,
  documentId,
  retryCount = 0,
  maxRetries = 3,
  isConverting = false,
  onRetryConversion,
  onRefresh,
  onReportProblem,
  onDownload,
  onClearCacheRetry,
  onManualRecovery
}: ManualRetryActionsProps) {
  const [activeAction, setActiveAction] = useState<string | null>(null);

  const handleAction = async (actionName: string, actionFn?: () => void | Promise<void>) => {
    if (!actionFn) return;
    
    setActiveAction(actionName);
    try {
      await actionFn();
    } catch (error) {
      console.error(`Action ${actionName} failed:`, error);
    } finally {
      setActiveAction(null);
    }
  };

  const isActionLoading = (actionName: string) => activeAction === actionName;
  const canRetry = retryCount < maxRetries;

  // Render action button with loading state
  const renderActionButton = (
    label: string,
    actionName: string,
    actionFn?: () => void | Promise<void>,
    variant: 'primary' | 'secondary' | 'danger' = 'secondary',
    disabled = false
  ) => (
    <Button
      variant={variant}
      onClick={() => handleAction(actionName, actionFn)}
      disabled={disabled || isActionLoading(actionName) || !actionFn}
      className="min-w-[140px]"
    >
      {isActionLoading(actionName) ? (
        <div className="flex items-center gap-2">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current"></div>
          <span>Working...</span>
        </div>
      ) : (
        label
      )}
    </Button>
  );

  // Get retry actions based on error type
  const getRetryActions = () => {
    switch (errorType) {
      case DocumentErrorType.CONVERSION_FAILED:
        return (
          <div className="space-y-3">
            <div className="text-sm text-gray-600 dark:text-gray-400 mb-3">
              <strong>Conversion Failed:</strong> Try these options to resolve the issue
            </div>
            
            <div className="flex flex-col gap-2">
              {canRetry && (
                <>
                  {renderActionButton(
                    'Retry Conversion',
                    'retry-conversion',
                    onRetryConversion,
                    'primary'
                  )}
                  
                  {renderActionButton(
                    'Clear Cache & Retry',
                    'clear-cache-retry',
                    onClearCacheRetry,
                    'secondary'
                  )}
                </>
              )}
              
              {renderActionButton(
                'Download Original',
                'download',
                onDownload,
                'secondary'
              )}
              
              {!canRetry && renderActionButton(
                'Report Problem',
                'report-problem',
                onReportProblem,
                'danger'
              )}
            </div>
            
            {retryCount > 0 && (
              <div className="text-xs text-gray-500 dark:text-gray-400">
                Retry attempts: {retryCount}/{maxRetries}
              </div>
            )}
          </div>
        );

      case DocumentErrorType.NETWORK_FAILURE:
        return (
          <div className="space-y-3">
            <div className="text-sm text-gray-600 dark:text-gray-400 mb-3">
              <strong>Network Issue:</strong> Connection problems detected
            </div>
            
            <div className="flex flex-col gap-2">
              {renderActionButton(
                'Try Again',
                'refresh',
                onRefresh,
                'primary'
              )}
              
              {renderActionButton(
                'Force Refresh',
                'manual-recovery',
                onManualRecovery,
                'secondary'
              )}
              
              {renderActionButton(
                'Download Instead',
                'download',
                onDownload,
                'secondary'
              )}
              
              {renderActionButton(
                'Report Connection Issue',
                'report-problem',
                onReportProblem,
                'secondary'
              )}
            </div>
          </div>
        );

      case DocumentErrorType.STORAGE_URL_EXPIRED:
        return (
          <div className="space-y-3">
            <div className="text-sm text-gray-600 dark:text-gray-400 mb-3">
              <strong>Link Expired:</strong> Security link needs refresh
            </div>
            
            <div className="flex flex-col gap-2">
              {renderActionButton(
                'Refresh Link',
                'refresh',
                onRefresh,
                'primary'
              )}
              
              {renderActionButton(
                'Manual Recovery',
                'manual-recovery',
                onManualRecovery,
                'secondary'
              )}
            </div>
          </div>
        );

      case DocumentErrorType.PAGES_NOT_FOUND:
        return (
          <div className="space-y-3">
            <div className="text-sm text-gray-600 dark:text-gray-400 mb-3">
              <strong>Pages Missing:</strong> Document needs processing
            </div>
            
            <div className="flex flex-col gap-2">
              {renderActionButton(
                'Process Document',
                'retry-conversion',
                onRetryConversion,
                'primary',
                isConverting
              )}
              
              {renderActionButton(
                'Download Original',
                'download',
                onDownload,
                'secondary'
              )}
              
              {renderActionButton(
                'Report Issue',
                'report-problem',
                onReportProblem,
                'secondary'
              )}
            </div>
          </div>
        );

      case DocumentErrorType.TIMEOUT:
        return (
          <div className="space-y-3">
            <div className="text-sm text-gray-600 dark:text-gray-400 mb-3">
              <strong>Timeout:</strong> Taking longer than expected
            </div>
            
            <div className="flex flex-col gap-2">
              {renderActionButton(
                'Keep Waiting',
                'refresh',
                onRefresh,
                'primary'
              )}
              
              {renderActionButton(
                'Start Over',
                'manual-recovery',
                onManualRecovery,
                'secondary'
              )}
              
              {renderActionButton(
                'Download Instead',
                'download',
                onDownload,
                'secondary'
              )}
            </div>
          </div>
        );

      case DocumentErrorType.DOCUMENT_CORRUPTED:
        return (
          <div className="space-y-3">
            <div className="text-sm text-gray-600 dark:text-gray-400 mb-3">
              <strong>Document Issue:</strong> File may be corrupted
            </div>
            
            <div className="flex flex-col gap-2">
              {renderActionButton(
                'Try Processing Again',
                'retry-conversion',
                onRetryConversion,
                'primary'
              )}
              
              {renderActionButton(
                'Report Corrupted File',
                'report-problem',
                onReportProblem,
                'danger'
              )}
            </div>
          </div>
        );

      case DocumentErrorType.PERMISSION_DENIED:
        return (
          <div className="space-y-3">
            <div className="text-sm text-gray-600 dark:text-gray-400 mb-3">
              <strong>Access Denied:</strong> Permission issue detected
            </div>
            
            <div className="flex flex-col gap-2">
              {renderActionButton(
                'Refresh Access',
                'refresh',
                onRefresh,
                'primary'
              )}
              
              {renderActionButton(
                'Report Access Issue',
                'report-problem',
                onReportProblem,
                'danger'
              )}
            </div>
          </div>
        );

      default:
        return (
          <div className="space-y-3">
            <div className="text-sm text-gray-600 dark:text-gray-400 mb-3">
              <strong>Unknown Issue:</strong> General troubleshooting options
            </div>
            
            <div className="flex flex-col gap-2">
              {renderActionButton(
                'Try Again',
                'refresh',
                onRefresh,
                'primary'
              )}
              
              {renderActionButton(
                'Manual Recovery',
                'manual-recovery',
                onManualRecovery,
                'secondary'
              )}
              
              {renderActionButton(
                'Report Problem',
                'report-problem',
                onReportProblem,
                'danger'
              )}
            </div>
          </div>
        );
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-lg">🔧</span>
        <h3 className="font-semibold text-gray-900 dark:text-white">
          Manual Recovery Options
        </h3>
      </div>
      
      {getRetryActions()}
      
      {/* Help text */}
      <div className="mt-4 pt-3 border-t border-gray-200 dark:border-gray-700">
        <p className="text-xs text-gray-500 dark:text-gray-400">
          💡 <strong>Tip:</strong> If none of these options work, try refreshing the entire page or contact support for assistance.
        </p>
      </div>
    </div>
  );
}

export default ManualRetryActions;