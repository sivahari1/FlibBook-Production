/**
 * PDF Reliability Error Display Component
 * 
 * Displays user-friendly error messages for PDF rendering reliability errors
 * with diagnostic information and actionable recovery options.
 * 
 * Requirements: 1.4, 7.1, 7.2, 8.2
 */

'use client';

import React, { useState } from 'react';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';
import { ErrorType, RenderingMethod, RenderingStage, type RenderError } from '../../lib/pdf-reliability/types';
const EType = ErrorType;
const Method = RenderingMethod;
const Stage = RenderingStage;

interface ReliabilityErrorDisplayProps {
  /** The render error to display */
  error: RenderError;
  /** Callback for retry action */
  onRetry?: () => void;
  /** Callback for download fallback */
  onDownload?: () => void;
  /** Callback for dismissing the error */
  onDismiss?: () => void;
  /** Whether retry is in progress */
  isRetrying?: boolean;
  /** Show detailed diagnostic information */
  showDiagnostics?: boolean;
  /** Custom className */
  className?: string;
}

/**
 * Get user-friendly error title
 */
function getErrorTitle(error: RenderError): string {
  switch (error.type) {
    case EType.NETWORK_ERROR:
      return 'Connection Problem';
    case EType.PARSING_ERROR:
      return 'Document Processing Error';
    case EType.CANVAS_ERROR:
      return 'Display Error';
    case EType.MEMORY_ERROR:
      return 'Memory Issue';
    case EType.TIMEOUT_ERROR:
      return 'Loading Timeout';
    case EType.AUTHENTICATION_ERROR:
      return 'Access Required';
    case EType.CORRUPTION_ERROR:
      return 'Invalid Document';
    default:
      return 'Loading Error';
  }
}

/**
 * Get user-friendly error message
 */
function getErrorMessage(error: RenderError): string {
  switch (error.type) {
    case EType.NETWORK_ERROR:
      return 'Unable to download the PDF. Please check your internet connection and try again.';
    case EType.PARSING_ERROR:
      return 'The PDF document could not be processed. It may be corrupted or in an unsupported format.';
    case EType.CANVAS_ERROR:
      return 'Unable to display the PDF due to a rendering issue. Try refreshing the page.';
    case EType.MEMORY_ERROR:
      return 'The PDF is too large to display. Try closing other tabs or using the download option.';
    case EType.TIMEOUT_ERROR:
      return 'The PDF is taking too long to load. This may be due to a large file size or slow connection.';
    case EType.AUTHENTICATION_ERROR:
      if (error.context?.passwordRequired) {
        return 'This PDF is password-protected. Please provide the password to continue.';
      }
      return 'You don\'t have permission to access this document. Please check your access rights.';
    case EType.CORRUPTION_ERROR:
      return 'The PDF file appears to be corrupted or damaged and cannot be opened.';
    default:
      return error.message || 'An unexpected error occurred while loading the PDF.';
  }
}

/**
 * Get error icon
 */
function getErrorIcon(errorType: ErrorType): React.ReactNode {
  const iconClass = "w-12 h-12";
  
  switch (errorType) {
    case EType.NETWORK_ERROR:
      return (
        <svg className={`${iconClass} text-yellow-500`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.141 0M1.394 9.393c5.857-5.857 15.355-5.857 21.213 0" />
        </svg>
      );
    case EType.AUTHENTICATION_ERROR:
      return (
        <svg className={`${iconClass} text-blue-500`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
        </svg>
      );
    case EType.MEMORY_ERROR:
      return (
        <svg className={`${iconClass} text-orange-500`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      );
    case EType.TIMEOUT_ERROR:
      return (
        <svg className={`${iconClass} text-purple-500`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      );
    case EType.CORRUPTION_ERROR:
      return (
        <svg className={`${iconClass} text-red-500`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      );
    default:
      return (
        <svg className={`${iconClass} text-red-500`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      );
  }
}

/**
 * Get suggested actions based on error type
 */
function getSuggestedActions(error: RenderError): string[] {
  const actions: string[] = [];
  
  switch (error.type) {
    case EType.NETWORK_ERROR:
      actions.push('Check your internet connection');
      actions.push('Try refreshing the page');
      actions.push('Wait a moment and try again');
      break;
    case EType.PARSING_ERROR:
      actions.push('Try downloading the PDF directly');
      actions.push('Check if the file is corrupted');
      actions.push('Contact the document owner');
      break;
    case EType.CANVAS_ERROR:
      actions.push('Refresh the page');
      actions.push('Try a different browser');
      actions.push('Update your browser');
      break;
    case EType.MEMORY_ERROR:
      actions.push('Close other browser tabs');
      actions.push('Try downloading instead of viewing');
      actions.push('Use a device with more memory');
      break;
    case EType.TIMEOUT_ERROR:
      actions.push('Wait for a better connection');
      actions.push('Try downloading the PDF');
      actions.push('Contact support if this persists');
      break;
    case EType.AUTHENTICATION_ERROR:
      if (error.context?.passwordRequired) {
        actions.push('Enter the correct password');
        actions.push('Contact the document owner for the password');
      } else {
        actions.push('Check your access permissions');
        actions.push('Log in with the correct account');
        actions.push('Contact an administrator');
      }
      break;
    case EType.CORRUPTION_ERROR:
      actions.push('Try downloading a fresh copy');
      actions.push('Contact the document owner');
      actions.push('Check if the file was uploaded correctly');
      break;
    default:
      actions.push('Try refreshing the page');
      actions.push('Contact support if the problem persists');
      break;
  }
  
  return actions;
}

/**
 * PDF Reliability Error Display Component
 */
export function ReliabilityErrorDisplay({
  error,
  onRetry,
  onDownload,
  onDismiss,
  isRetrying = false,
  showDiagnostics = false,
  className = '',
}: ReliabilityErrorDisplayProps) {
  const [showDiagnosticsModal, setShowDiagnosticsModal] = useState(false);
  
  const title = getErrorTitle(error);
  const message = getErrorMessage(error);
  const icon = getErrorIcon(error.type);
  const suggestedActions = getSuggestedActions(error);
  const canRetry = error.recoverable && onRetry;
  const canDownload = onDownload && error.type !== EType.AUTHENTICATION_ERROR;

  return (
    <>
      <div className={`flex flex-col items-center justify-center p-8 bg-gradient-to-br from-gray-50 via-white to-gray-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 ${className}`}>
        {/* Error Icon */}
        <div className="mb-6 flex justify-center">
          {icon}
        </div>
        
        {/* Error Title */}
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-3 text-center">
          {title}
        </h2>
        
        {/* Error Message */}
        <p className="text-gray-700 dark:text-gray-300 text-center max-w-md mb-6 leading-relaxed">
          {message}
        </p>
        
        {/* Suggested Actions */}
        {suggestedActions.length > 0 && (
          <div className="mb-6 w-full max-w-md">
            <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">
              What you can try:
            </h4>
            <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
              {suggestedActions.map((action, index) => (
                <li key={index} className="flex items-start">
                  <span className="text-blue-500 mr-2">•</span>
                  {action}
                </li>
              ))}
            </ul>
          </div>
        )}
        
        {/* Action Buttons */}
        <div className="flex flex-wrap gap-3 justify-center">
          {canRetry && (
            <Button
              onClick={onRetry}
              variant="primary"
              isLoading={isRetrying}
              disabled={isRetrying}
            >
              {isRetrying ? 'Retrying...' : 'Try Again'}
            </Button>
          )}
          
          {canDownload && (
            <Button
              onClick={onDownload}
              variant="secondary"
            >
              Download PDF
            </Button>
          )}
          
          {showDiagnostics && (
            <Button
              onClick={() => setShowDiagnosticsModal(true)}
              variant="secondary"
              size="sm"
            >
              View Details
            </Button>
          )}
          
          {onDismiss && (
            <Button
              onClick={onDismiss}
              variant="secondary"
            >
              Close
            </Button>
          )}
        </div>
        
        {/* Error Code */}
        <div className="mt-4 text-xs text-gray-500 dark:text-gray-400 font-mono">
          Error: {error.type} | Stage: {error.stage} | Method: {error.method}
        </div>
      </div>

      {/* Diagnostics Modal */}
      <Modal
        isOpen={showDiagnosticsModal}
        onClose={() => setShowDiagnosticsModal(false)}
        title="Error Diagnostics"
        size="lg"
      >
        <div className="space-y-4">
          <div>
            <h4 className="font-semibold text-gray-900 dark:text-white mb-2">Error Details</h4>
            <div className="bg-gray-100 dark:bg-gray-700 rounded p-3 text-sm">
              <div className="grid grid-cols-2 gap-2">
                <div><strong>Type:</strong> {error.type}</div>
                <div><strong>Stage:</strong> {error.stage}</div>
                <div><strong>Method:</strong> {error.method}</div>
                <div><strong>Recoverable:</strong> {error.recoverable ? 'Yes' : 'No'}</div>
                <div><strong>Timestamp:</strong> {error.timestamp.toLocaleString()}</div>
              </div>
            </div>
          </div>
          
          {error.context && Object.keys(error.context).length > 0 && (
            <div>
              <h4 className="font-semibold text-gray-900 dark:text-white mb-2">Context</h4>
              <pre className="bg-gray-100 dark:bg-gray-700 rounded p-3 text-xs overflow-auto max-h-40">
                {JSON.stringify(error.context, null, 2)}
              </pre>
            </div>
          )}
          
          {error.stackTrace && (
            <div>
              <h4 className="font-semibold text-gray-900 dark:text-white mb-2">Stack Trace</h4>
              <pre className="bg-gray-100 dark:bg-gray-700 rounded p-3 text-xs overflow-auto max-h-40">
                {error.stackTrace}
              </pre>
            </div>
          )}
        </div>
      </Modal>
    </>
  );
}

/**
 * Compact Error Display for inline use
 */
export function CompactReliabilityErrorDisplay({
  error,
  onRetry,
  onDismiss,
  isRetrying = false,
}: {
  error: RenderError;
  onRetry?: () => void;
  onDismiss?: () => void;
  isRetrying?: boolean;
}) {
  const title = getErrorTitle(error);
  const canRetry = error.recoverable && onRetry;

  return (
    <div className="bg-red-50 dark:bg-red-900/20 border-l-4 border-red-400 p-4 rounded">
      <div className="flex items-start">
        <div className="flex-shrink-0">
          <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
          </svg>
        </div>
        <div className="ml-3 flex-1">
          <p className="text-sm font-medium text-red-800 dark:text-red-200">{title}</p>
          <p className="mt-1 text-sm text-red-700 dark:text-red-300">{getErrorMessage(error)}</p>
          {(canRetry || onDismiss) && (
            <div className="mt-2 flex gap-3">
              {canRetry && (
                <Button
                  onClick={onRetry}
                  size="sm"
                  variant="secondary"
                  isLoading={isRetrying}
                  disabled={isRetrying}
                >
                  {isRetrying ? 'Retrying...' : 'Try Again'}
                </Button>
              )}
              {onDismiss && (
                <Button
                  onClick={onDismiss}
                  size="sm"
                  variant="secondary"
                >
                  Dismiss
                </Button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}