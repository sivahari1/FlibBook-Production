/**
 * User-Friendly Error Display Component
 * 
 * Displays user-friendly error messages with actionable steps
 * for JStudyRoom document viewing issues.
 * 
 * Requirements: 3.1, 3.2
 */

'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { 
  UserFriendlyError, 
  ErrorAction, 
  ErrorContext,
  UserFriendlyErrorMessages,
  ErrorMessageFormatter,
  SupportContactIntegration
} from '@/lib/errors/user-friendly-messages';
import { DocumentErrorType } from '@/lib/resilience/document-error-recovery';
import Link from 'next/link';

interface UserFriendlyErrorDisplayProps {
  /** Error type from the recovery system */
  errorType: DocumentErrorType;
  /** Original error object */
  originalError?: Error;
  /** Additional context for generating contextual messages */
  context?: ErrorContext;
  /** Callback for retry actions */
  onRetry?: () => void | Promise<void>;
  /** Callback for refresh actions */
  onRefresh?: () => void | Promise<void>;
  /** Callback for download actions */
  onDownload?: () => void | Promise<void>;
  /** Callback for conversion actions */
  onConvert?: () => void | Promise<void>;
  /** Display mode */
  mode?: 'fullPage' | 'inline' | 'toast';
  /** Additional CSS classes */
  className?: string;
}

export function UserFriendlyErrorDisplay({
  errorType,
  originalError,
  context,
  onRetry,
  onRefresh,
  onDownload,
  onConvert,
  mode = 'fullPage',
  className = ''
}: UserFriendlyErrorDisplayProps) {
  const [error, setError] = useState<UserFriendlyError | null>(null);
  const [isActionLoading, setIsActionLoading] = useState<string | null>(null);
  const [errorFrequency, setErrorFrequency] = useState(0);

  useEffect(() => {
    // Generate user-friendly error message
    const userFriendlyError = UserFriendlyErrorMessages.generateErrorMessage(
      errorType,
      originalError,
      context
    );

    // Check for browser-specific issues
    const browserError = UserFriendlyErrorMessages.getBrowserSpecificMessage(context);
    if (browserError) {
      setError(browserError);
      return;
    }

    setError(userFriendlyError);

    // Track error frequency (in real app, this would be stored in localStorage or sent to analytics)
    const errorKey = `error_${errorType}_${context?.documentId || 'unknown'}`;
    const stored = localStorage.getItem(errorKey);
    const frequency = stored ? parseInt(stored, 10) + 1 : 1;
    localStorage.setItem(errorKey, frequency.toString());
    setErrorFrequency(frequency);
  }, [errorType, originalError, context]);

  const handleAction = async (action: ErrorAction) => {
    if (typeof action.action === 'function') {
      setIsActionLoading(action.label);
      try {
        await action.action();
      } catch (error) {
        console.error('Action failed:', error);
      } finally {
        setIsActionLoading(null);
      }
      return;
    }

    const actionValue = action.action as string;
    setIsActionLoading(action.label);

    try {
      switch (action.type) {
        case 'retry':
          if (actionValue === 'retry' && onRetry) {
            await onRetry();
          } else if (actionValue === 'convert' && onConvert) {
            await onConvert();
          }
          break;

        case 'refresh':
          if (actionValue === 'refresh' && onRefresh) {
            await onRefresh();
          } else {
            window.location.reload();
          }
          break;

        case 'download':
          if (onDownload) {
            await onDownload();
          }
          break;

        case 'contact':
          if (actionValue === 'support') {
            const supportUrl = SupportContactIntegration.generateSupportUrl(error!, context);
            window.open(supportUrl, '_blank');
          }
          break;

        case 'external':
          window.open(actionValue, '_blank');
          break;

        case 'navigate':
          // This will be handled by Link component
          break;
      }
    } catch (actionError) {
      console.error('Action execution failed:', actionError);
    } finally {
      setIsActionLoading(null);
    }
  };

  const renderAction = (action: ErrorAction, index: number) => {
    const isLoading = isActionLoading === action.label;
    const isDisabled = action.disabled || isLoading;

    if (action.type === 'navigate') {
      return (
        <Link key={index} href={action.action as string}>
          <Button
            variant={action.variant || 'secondary'}
            disabled={isDisabled}
            className="min-w-[120px]"
          >
            {isLoading ? (
              <div className="flex items-center gap-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current"></div>
                <span>Loading...</span>
              </div>
            ) : (
              action.label
            )}
          </Button>
        </Link>
      );
    }

    return (
      <Button
        key={index}
        variant={action.variant || 'secondary'}
        onClick={() => handleAction(action)}
        disabled={isDisabled}
        className="min-w-[120px]"
      >
        {isLoading ? (
          <div className="flex items-center gap-2">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current"></div>
            <span>Loading...</span>
          </div>
        ) : (
          action.label
        )}
      </Button>
    );
  };

  if (!error) {
    return null;
  }

  // Render based on mode
  if (mode === 'toast') {
    const toastData = ErrorMessageFormatter.formatForToast(error);
    return (
      <div className={`p-4 rounded-lg border ${className} ${
        toastData.type === 'error' ? 'bg-red-50 border-red-200 text-red-800' :
        toastData.type === 'warning' ? 'bg-yellow-50 border-yellow-200 text-yellow-800' :
        'bg-blue-50 border-blue-200 text-blue-800'
      }`}>
        <div className="flex items-start gap-3">
          <span className="text-2xl">{error.icon}</span>
          <div className="flex-1">
            <h4 className="font-semibold">{toastData.title}</h4>
            <p className="text-sm mt-1">{toastData.message}</p>
            {error.actions.length > 0 && (
              <div className="flex gap-2 mt-3">
                {error.actions.slice(0, 2).map(renderAction)}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (mode === 'inline') {
    const inlineData = ErrorMessageFormatter.formatForInline(error);
    return (
      <div className={`p-3 rounded border ${className} ${
        inlineData.severity === 'error' ? 'bg-red-50 border-red-200' :
        inlineData.severity === 'warning' ? 'bg-yellow-50 border-yellow-200' :
        'bg-blue-50 border-blue-200'
      }`}>
        <p className="text-sm mb-2">{inlineData.message}</p>
        {inlineData.actions.length > 0 && (
          <div className="flex gap-2">
            {inlineData.actions.map(renderAction)}
          </div>
        )}
      </div>
    );
  }

  // Full page mode
  const fullPageData = ErrorMessageFormatter.formatForFullPage(error);
  const contextualHelp = UserFriendlyErrorMessages.getContextualHelp(errorType, errorFrequency);

  return (
    <div className={`flex items-center justify-center min-h-screen bg-gray-100 dark:bg-slate-900 ${className}`}>
      <Card className="max-w-md mx-auto p-6 text-center">
        <div className="text-6xl mb-4">{fullPageData.icon}</div>
        
        <h2 className="text-2xl font-bold mb-2 text-gray-900 dark:text-white">
          {fullPageData.title}
        </h2>
        
        <p className="text-gray-600 dark:text-gray-300 mb-4 leading-relaxed">
          {fullPageData.message}
        </p>

        {fullPageData.estimatedResolution && (
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3 mb-4">
            <p className="text-sm text-blue-800 dark:text-blue-200">
              <span className="font-medium">Estimated resolution:</span> {fullPageData.estimatedResolution}
            </p>
          </div>
        )}

        {contextualHelp && (
          <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-3 mb-4">
            <p className="text-sm text-amber-800 dark:text-amber-200">
              <span className="font-medium">💡 Tip:</span> {contextualHelp}
            </p>
          </div>
        )}

        <div className="flex flex-col gap-2">
          {fullPageData.actions.map(renderAction)}
        </div>

        {/* Additional help section */}
        <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
            Still having trouble?
          </p>
          <div className="flex justify-center gap-4 text-xs">
            <button
              onClick={() => {
                const emailUrl = SupportContactIntegration.generateSupportEmail(error, context);
                window.location.href = emailUrl;
              }}
              className="text-blue-600 dark:text-blue-400 hover:underline"
            >
              Email Support
            </button>
            <Link 
              href="/help/document-viewing" 
              className="text-blue-600 dark:text-blue-400 hover:underline"
            >
              View Help Guide
            </Link>
          </div>
        </div>

        {/* Error details for debugging (only in development) */}
        {process.env.NODE_ENV === 'development' && originalError && (
          <details className="mt-4 text-left">
            <summary className="text-xs text-gray-500 cursor-pointer">
              Technical Details (Dev Only)
            </summary>
            <pre className="text-xs text-gray-400 mt-2 p-2 bg-gray-100 dark:bg-gray-800 rounded overflow-auto">
              {originalError.stack || originalError.message}
            </pre>
          </details>
        )}
      </Card>
    </div>
  );
}

/**
 * Hook for managing error display state
 */
export function useUserFriendlyError() {
  const [currentError, setCurrentError] = useState<{
    type: DocumentErrorType;
    error?: Error;
    context?: ErrorContext;
  } | null>(null);

  const showError = (
    type: DocumentErrorType,
    error?: Error,
    context?: ErrorContext
  ) => {
    setCurrentError({ type, error, context });
  };

  const clearError = () => {
    setCurrentError(null);
  };

  return {
    currentError,
    showError,
    clearError
  };
}

export default UserFriendlyErrorDisplay;