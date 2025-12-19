/**
 * Error Toast Notification Component
 * 
 * Display error notifications to users
 * Requirements: 18.1, 18.2, 18.3
 */

'use client';

import React, { useEffect, useState } from 'react';
import { FlipbookError, ErrorSeverity, getErrorSeverity } from '@/lib/errors/flipbook-errors';
import { getUserFriendlyMessage, isRetryableError } from '@/lib/errors/error-handler';

export interface ErrorToastProps {
  error: Error;
  onClose: () => void;
  onRetry?: () => void;
  autoClose?: boolean;
  autoCloseDelay?: number;
}

export function ErrorToast({
  error,
  onClose,
  onRetry,
  autoClose = true,
  autoCloseDelay = 5000,
}: ErrorToastProps) {
  const [isVisible, setIsVisible] = useState(true);
  const [isExiting, setIsExiting] = useState(false);

  const { title, message, action, actionLabel } = getUserFriendlyMessage(error);
  const severity = getErrorSeverity(error);
  const canRetry = isRetryableError(error);

  useEffect(() => {
    if (autoClose && severity !== ErrorSeverity.CRITICAL) {
      const timer = setTimeout(() => {
        handleClose();
      }, autoCloseDelay);

      return () => clearTimeout(timer);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoClose, autoCloseDelay, severity]);

  const handleClose = () => {
    setIsExiting(true);
    setTimeout(() => {
      setIsVisible(false);
      onClose();
    }, 300);
  };

  const handleRetry = () => {
    if (onRetry) {
      onRetry();
      handleClose();
    }
  };

  if (!isVisible) return null;

  const severityStyles = {
    [ErrorSeverity.LOW]: {
      bg: 'bg-blue-50',
      border: 'border-blue-400',
      text: 'text-blue-800',
      icon: 'text-blue-400',
    },
    [ErrorSeverity.MEDIUM]: {
      bg: 'bg-yellow-50',
      border: 'border-yellow-400',
      text: 'text-yellow-800',
      icon: 'text-yellow-400',
    },
    [ErrorSeverity.HIGH]: {
      bg: 'bg-orange-50',
      border: 'border-orange-400',
      text: 'text-orange-800',
      icon: 'text-orange-400',
    },
    [ErrorSeverity.CRITICAL]: {
      bg: 'bg-red-50',
      border: 'border-red-400',
      text: 'text-red-800',
      icon: 'text-red-400',
    },
  };

  const styles = severityStyles[severity];

  return (
    <div
      className={`fixed bottom-4 right-4 z-50 max-w-md w-full transition-all duration-300 ${
        isExiting ? 'opacity-0 translate-y-2' : 'opacity-100 translate-y-0'
      }`}
      role="alert"
      aria-live="assertive"
    >
      <div className={`${styles.bg} ${styles.border} border-l-4 p-4 rounded-lg shadow-lg`}>
        <div className="flex items-start">
          <div className="flex-shrink-0">
            <svg
              className={`h-5 w-5 ${styles.icon}`}
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                clipRule="evenodd"
              />
            </svg>
          </div>
          <div className="ml-3 flex-1">
            <p className={`text-sm font-medium ${styles.text}`}>{title}</p>
            <p className={`mt-1 text-sm ${styles.text}`}>{message}</p>
            {(canRetry || action) && (
              <div className="mt-3 flex gap-2">
                {canRetry && onRetry && (
                  <button
                    onClick={handleRetry}
                    className={`text-sm font-medium ${styles.text} hover:underline focus:outline-none`}
                  >
                    {actionLabel || 'Retry'}
                  </button>
                )}
                <button
                  onClick={handleClose}
                  className={`text-sm font-medium ${styles.text} hover:underline focus:outline-none`}
                >
                  Dismiss
                </button>
              </div>
            )}
          </div>
          <div className="ml-4 flex-shrink-0">
            <button
              onClick={handleClose}
              className={`inline-flex rounded-md ${styles.text} hover:opacity-75 focus:outline-none focus:ring-2 focus:ring-offset-2`}
            >
              <span className="sr-only">Close</span>
              <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path
                  fillRule="evenodd"
                  d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                  clipRule="evenodd"
                />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Error Toast Container
 * Manages multiple error toasts
 */
export function ErrorToastContainer() {
  const [errors, setErrors] = useState<Array<{ id: string; error: Error; onRetry?: () => void }>>([]);

  const addError = (error: Error, onRetry?: () => void) => {
    const id = `error-${Date.now()}-${Math.random()}`;
    setErrors((prev) => [...prev, { id, error, onRetry }]);
  };

  const removeError = (id: string) => {
    setErrors((prev) => prev.filter((e) => e.id !== id));
  };

  // Expose addError globally
  useEffect(() => {
    (window as any).__showErrorToast = addError;
    return () => {
      delete (window as any).__showErrorToast;
    };
  }, []);

  return (
    <div className="fixed bottom-0 right-0 z-50 p-4 space-y-4 pointer-events-none">
      {errors.map(({ id, error, onRetry }) => (
        <div key={id} className="pointer-events-auto">
          <ErrorToast
            error={error}
            onClose={() => removeError(id)}
            onRetry={onRetry}
          />
        </div>
      ))}
    </div>
  );
}

/**
 * Show error toast globally
 */
export function showErrorToast(error: Error, onRetry?: () => void) {
  if (typeof window !== 'undefined' && (window as any).__showErrorToast) {
    (window as any).__showErrorToast(error, onRetry);
  }
}

export default ErrorToast;
