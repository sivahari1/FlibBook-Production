'use client';

import React, { useState, useEffect } from 'react';
import { 
  AlertTriangle, 
  RefreshCw, 
  Download, 
  ExternalLink, 
  MessageCircle,
  Wifi,
  Shield,
  FileX,
  Monitor,
  Zap,
  HelpCircle,
} from 'lucide-react';
import {
  RenderingError,
  RenderingErrorType,
  ErrorSeverity,
  FallbackOption,
} from '@/lib/errors/rendering-errors';
import { getErrorRecoveryStrategy } from '@/lib/errors/error-recovery';

interface RenderingErrorDisplayProps {
  error: RenderingError;
  onRetry?: () => void;
  onClose?: () => void;
  onFallbackAction?: (option: FallbackOption) => void;
  showDiagnostics?: boolean;
}

/**
 * RenderingErrorDisplay - Enhanced error display with recovery options
 * 
 * Provides detailed error information with specific failure context and recovery options
 * Requirements: 1.3, 2.4, 3.3
 */
function RenderingErrorDisplay({
  error,
  onRetry,
  onClose,
  onFallbackAction,
  showDiagnostics = false,
}: RenderingErrorDisplayProps) {
  const [fallbackOptions, setFallbackOptions] = useState<FallbackOption[]>([]);
  const [showDetails, setShowDetails] = useState(false);
  const [isRetrying, setIsRetrying] = useState(false);

  // Load fallback options on mount
  useEffect(() => {
    const recoveryStrategy = getErrorRecoveryStrategy();
    const options = recoveryStrategy.getFallbackOptions(error);
    setFallbackOptions(options);
  }, [error]);

  const getErrorIcon = () => {
    switch (error.type) {
      case RenderingErrorType.NETWORK_TIMEOUT:
      case RenderingErrorType.NETWORK_FAILURE:
      case RenderingErrorType.NETWORK_UNAVAILABLE:
        return <Wifi className="w-16 h-16 text-yellow-500" />;
      
      case RenderingErrorType.SECURITY_CORS_ERROR:
      case RenderingErrorType.SECURITY_PERMISSION_DENIED:
      case RenderingErrorType.SECURITY_CSP_VIOLATION:
        return <Shield className="w-16 h-16 text-red-500" />;
      
      case RenderingErrorType.PDF_CORRUPTED:
      case RenderingErrorType.PDF_INVALID_FORMAT:
      case RenderingErrorType.PDF_PARSING_FAILED:
        return <FileX className="w-16 h-16 text-orange-500" />;
      
      case RenderingErrorType.BROWSER_COMPATIBILITY:
      case RenderingErrorType.BROWSER_CANVAS_UNAVAILABLE:
      case RenderingErrorType.BROWSER_WEBGL_UNAVAILABLE:
        return <Monitor className="w-16 h-16 text-purple-500" />;
      
      case RenderingErrorType.MEMORY_EXHAUSTED:
      case RenderingErrorType.MEMORY_ALLOCATION_FAILED:
        return <Zap className="w-16 h-16 text-red-600" />;
      
      default:
        return <AlertTriangle className="w-16 h-16 text-red-500" />;
    }
  };

  const getSeverityColor = () => {
    switch (error.severity) {
      case ErrorSeverity.CRITICAL:
        return 'text-red-600 bg-red-50 border-red-200';
      case ErrorSeverity.HIGH:
        return 'text-orange-600 bg-orange-50 border-orange-200';
      case ErrorSeverity.MEDIUM:
        return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case ErrorSeverity.LOW:
        return 'text-blue-600 bg-blue-50 border-blue-200';
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const handleRetry = async () => {
    if (!onRetry) return;
    
    setIsRetrying(true);
    try {
      await onRetry();
    } finally {
      setIsRetrying(false);
    }
  };

  const handleFallbackAction = async (option: FallbackOption) => {
    try {
      if (onFallbackAction) {
        await onFallbackAction(option);
      } else {
        await option.action();
      }
    } catch (actionError) {
      console.error('Fallback action failed:', actionError);
    }
  };

  const getFallbackIcon = (type: FallbackOption['type']) => {
    switch (type) {
      case 'retry':
        return <RefreshCw className="w-4 h-4" />;
      case 'download_prompt':
        return <Download className="w-4 h-4" />;
      case 'browser_update':
        return <ExternalLink className="w-4 h-4" />;
      case 'contact_support':
        return <MessageCircle className="w-4 h-4" />;
      default:
        return <HelpCircle className="w-4 h-4" />;
    }
  };

  return (
    <div 
      className="flex items-center justify-center h-full bg-gray-800 p-8"
      data-testid="rendering-error-display"
      role="alert"
      aria-live="assertive"
    >
      <div className="text-center max-w-2xl">
        {/* Error Icon */}
        <div className="mb-6 flex justify-center">
          {getErrorIcon()}
        </div>
        
        {/* Error Title */}
        <h2 className="text-2xl font-bold text-white mb-4">
          {error.userMessage}
        </h2>
        
        {/* Error Description */}
        <p className="text-gray-300 mb-4">
          {error.suggestion}
        </p>

        {/* Severity Badge */}
        <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium mb-6 ${getSeverityColor()}`}>
          {error.severity.toUpperCase()} SEVERITY
        </div>

        {/* Primary Actions */}
        <div className="flex gap-3 justify-center mb-6">
          {error.retryable && onRetry && (
            <button
              onClick={handleRetry}
              disabled={isRetrying}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
              data-testid="retry-button"
            >
              <RefreshCw className={`w-4 h-4 ${isRetrying ? 'animate-spin' : ''}`} />
              {isRetrying ? 'Retrying...' : 'Try Again'}
            </button>
          )}
          
          {onClose && (
            <button
              onClick={onClose}
              className="px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
              data-testid="close-button"
            >
              Close
            </button>
          )}
        </div>

        {/* Fallback Options */}
        {fallbackOptions.length > 0 && (
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-white mb-3">
              Alternative Options
            </h3>
            <div className="flex flex-wrap gap-2 justify-center">
              {fallbackOptions.map((option, index) => (
                <button
                  key={index}
                  onClick={() => handleFallbackAction(option)}
                  className="px-4 py-2 bg-gray-700 text-gray-200 rounded-lg hover:bg-gray-600 transition-colors flex items-center gap-2 text-sm"
                  data-testid={`fallback-${option.type}`}
                >
                  {getFallbackIcon(option.type)}
                  {option.description}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Technical Details Toggle */}
        {showDiagnostics && error.diagnostics && (
          <div className="text-left">
            <button
              onClick={() => setShowDetails(!showDetails)}
              className="text-gray-400 hover:text-gray-300 text-sm mb-3 flex items-center gap-1"
              data-testid="toggle-details"
            >
              <HelpCircle className="w-4 h-4" />
              {showDetails ? 'Hide' : 'Show'} Technical Details
            </button>

            {showDetails && (
              <div className="bg-gray-900 rounded-lg p-4 text-left">
                <div className="space-y-3 text-sm">
                  {/* Error Type */}
                  <div>
                    <span className="text-gray-400">Error Type:</span>
                    <span className="text-white ml-2">{error.type}</span>
                  </div>

                  {/* Technical Message */}
                  <div>
                    <span className="text-gray-400">Technical Message:</span>
                    <span className="text-white ml-2">{error.technicalMessage}</span>
                  </div>

                  {/* Document Info */}
                  {error.diagnostics.documentInfo && (
                    <div>
                      <span className="text-gray-400">Document:</span>
                      <div className="text-white ml-2 text-xs">
                        {error.diagnostics.documentInfo.pageCount && (
                          <div>Pages: {error.diagnostics.documentInfo.pageCount}</div>
                        )}
                        {error.diagnostics.documentInfo.fileSize && (
                          <div>Size: {Math.round(error.diagnostics.documentInfo.fileSize / 1024 / 1024 * 100) / 100} MB</div>
                        )}
                        {error.diagnostics.documentInfo.encrypted && (
                          <div>Encrypted: Yes</div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Browser Info */}
                  <div>
                    <span className="text-gray-400">Browser:</span>
                    <div className="text-white ml-2 text-xs">
                      <div>PDF.js: {error.diagnostics.browserInfo.pdfJsVersion || 'Unknown'}</div>
                      <div>WebGL: {error.diagnostics.browserInfo.webGLSupported ? 'Yes' : 'No'}</div>
                      <div>Canvas: {error.diagnostics.browserInfo.canvasSupported ? 'Yes' : 'No'}</div>
                    </div>
                  </div>

                  {/* Performance Metrics */}
                  {error.diagnostics.performanceMetrics && (
                    <div>
                      <span className="text-gray-400">Performance:</span>
                      <div className="text-white ml-2 text-xs">
                        <div>Load Time: {error.diagnostics.performanceMetrics.loadTime}ms</div>
                        <div>Memory: {Math.round(error.diagnostics.performanceMetrics.memoryUsage / 1024 / 1024 * 100) / 100} MB</div>
                      </div>
                    </div>
                  )}

                  {/* Network Context */}
                  {error.diagnostics.networkContext && (
                    <div>
                      <span className="text-gray-400">Network:</span>
                      <div className="text-white ml-2 text-xs">
                        {error.diagnostics.networkContext.responseStatus && (
                          <div>Status: {error.diagnostics.networkContext.responseStatus}</div>
                        )}
                        {error.diagnostics.networkContext.loadTime && (
                          <div>Load Time: {error.diagnostics.networkContext.loadTime}ms</div>
                        )}
                        {error.diagnostics.networkContext.retryAttempts && (
                          <div>Retries: {error.diagnostics.networkContext.retryAttempts}</div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Timestamp */}
                  <div>
                    <span className="text-gray-400">Occurred:</span>
                    <span className="text-white ml-2">{error.diagnostics.timestamp.toLocaleString()}</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

RenderingErrorDisplay.displayName = 'RenderingErrorDisplay';

export default RenderingErrorDisplay;