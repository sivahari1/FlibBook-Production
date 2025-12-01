/**
 * Flipbook Error Boundary Component
 * 
 * React error boundary for catching and handling flipbook errors
 * Requirements: 18.1, 18.4
 */

'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { FlipbookError, getErrorSeverity, ErrorSeverity } from '@/lib/errors/flipbook-errors';
import { handleError, getUserFriendlyMessage } from '@/lib/errors/error-handler';

interface Props {
  children: ReactNode;
  fallback?: (error: Error, reset: () => void) => ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  resetKeys?: any[];
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class FlipbookErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
    };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log error
    handleError(error, {
      componentStack: errorInfo.componentStack,
      errorBoundary: 'FlipbookErrorBoundary',
    });

    // Call custom error handler
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  componentDidUpdate(prevProps: Props) {
    // Reset error state if resetKeys change
    if (this.state.hasError && this.props.resetKeys) {
      const hasResetKeyChanged = this.props.resetKeys.some(
        (key, index) => key !== prevProps.resetKeys?.[index]
      );

      if (hasResetKeyChanged) {
        this.reset();
      }
    }
  }

  reset = () => {
    this.setState({
      hasError: false,
      error: null,
    });
  };

  render() {
    if (this.state.hasError && this.state.error) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback(this.state.error, this.reset);
      }

      // Default fallback UI
      return <DefaultErrorFallback error={this.state.error} onReset={this.reset} />;
    }

    return this.props.children;
  }
}

/**
 * Default error fallback component
 */
function DefaultErrorFallback({ error, onReset }: { error: Error; onReset: () => void }) {
  const { title, message, action, actionLabel } = getUserFriendlyMessage(error);
  const severity = getErrorSeverity(error);

  const severityColors = {
    [ErrorSeverity.LOW]: 'bg-blue-50 border-blue-200',
    [ErrorSeverity.MEDIUM]: 'bg-yellow-50 border-yellow-200',
    [ErrorSeverity.HIGH]: 'bg-orange-50 border-orange-200',
    [ErrorSeverity.CRITICAL]: 'bg-red-50 border-red-200',
  };

  const severityTextColors = {
    [ErrorSeverity.LOW]: 'text-blue-800',
    [ErrorSeverity.MEDIUM]: 'text-yellow-800',
    [ErrorSeverity.HIGH]: 'text-orange-800',
    [ErrorSeverity.CRITICAL]: 'text-red-800',
  };

  const severityButtonColors = {
    [ErrorSeverity.LOW]: 'bg-blue-600 hover:bg-blue-700',
    [ErrorSeverity.MEDIUM]: 'bg-yellow-600 hover:bg-yellow-700',
    [ErrorSeverity.HIGH]: 'bg-orange-600 hover:bg-orange-700',
    [ErrorSeverity.CRITICAL]: 'bg-red-600 hover:bg-red-700',
  };

  return (
    <div className="flex items-center justify-center min-h-[400px] p-4">
      <div
        className={`max-w-md w-full rounded-lg border-2 p-6 ${severityColors[severity]}`}
        role="alert"
      >
        <div className="flex items-start">
          <div className="flex-shrink-0">
            <svg
              className={`h-6 w-6 ${severityTextColors[severity]}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>
          <div className="ml-3 flex-1">
            <h3 className={`text-lg font-medium ${severityTextColors[severity]}`}>{title}</h3>
            <div className={`mt-2 text-sm ${severityTextColors[severity]}`}>
              <p>{message}</p>
            </div>
            {error instanceof FlipbookError && error.context && (
              <details className="mt-4">
                <summary className={`cursor-pointer text-sm font-medium ${severityTextColors[severity]}`}>
                  Technical Details
                </summary>
                <pre className={`mt-2 text-xs ${severityTextColors[severity]} overflow-auto`}>
                  {JSON.stringify(error.context, null, 2)}
                </pre>
              </details>
            )}
            <div className="mt-4 flex gap-2">
              {action === 'retry' && (
                <button
                  onClick={onReset}
                  className={`px-4 py-2 text-sm font-medium text-white rounded-md ${severityButtonColors[severity]} focus:outline-none focus:ring-2 focus:ring-offset-2`}
                >
                  {actionLabel || 'Try Again'}
                </button>
              )}
              <button
                onClick={() => window.location.reload()}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
              >
                Reload Page
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Hook for using error boundary imperatively
 */
export function useErrorBoundary() {
  const [error, setError] = React.useState<Error | null>(null);

  React.useEffect(() => {
    if (error) {
      throw error;
    }
  }, [error]);

  const showBoundary = React.useCallback((error: Error) => {
    setError(error);
  }, []);

  const resetBoundary = React.useCallback(() => {
    setError(null);
  }, []);

  return {
    showBoundary,
    resetBoundary,
  };
}

export default FlipbookErrorBoundary;
