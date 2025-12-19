'use client';

import React from 'react';
import { RefreshCw, AlertTriangle, FileX, Wifi, Shield } from 'lucide-react';

interface ViewerErrorProps {
  error: string;
  type?: 'network' | 'permission' | 'validation' | 'missing-data' | 'generic';
  onRetry?: () => void;
  onClose?: () => void;
}

/**
 * ViewerError - Main error display for document viewer
 * 
 * Provides user-friendly error messages with appropriate actions
 * Requirements: 2.4
 */
function ViewerError({ 
  error, 
  type = 'generic', 
  onRetry, 
  onClose 
}: ViewerErrorProps) {
  const getErrorIcon = () => {
    switch (type) {
      case 'network':
        return <Wifi className="w-16 h-16 text-yellow-500" />;
      case 'permission':
        return <Shield className="w-16 h-16 text-red-500" />;
      case 'missing-data':
        return <FileX className="w-16 h-16 text-orange-500" />;
      default:
        return <AlertTriangle className="w-16 h-16 text-red-500" />;
    }
  };

  const getErrorTitle = () => {
    switch (type) {
      case 'network':
        return 'Connection Error';
      case 'permission':
        return 'Access Denied';
      case 'validation':
        return 'Invalid Input';
      case 'missing-data':
        return 'Document Not Found';
      default:
        return 'Error Loading Document';
    }
  };

  const getErrorSuggestion = () => {
    switch (type) {
      case 'network':
        return 'Please check your internet connection and try again.';
      case 'permission':
        return 'You may not have permission to view this document.';
      case 'validation':
        return 'Please check your input and try again.';
      case 'missing-data':
        return 'The document may have been moved or deleted.';
      default:
        return 'Something went wrong while loading the document.';
    }
  };

  return (
    <div 
      className="flex items-center justify-center h-full bg-gray-800 p-8"
      data-testid="viewer-error"
    >
      <div className="text-center max-w-md">
        <div className="mb-6">
          {getErrorIcon()}
        </div>
        
        <h2 className="text-2xl font-bold text-white mb-4">
          {getErrorTitle()}
        </h2>
        
        <p className="text-gray-300 mb-2">
          {error}
        </p>
        
        <p className="text-gray-400 text-sm mb-6">
          {getErrorSuggestion()}
        </p>

        <div className="flex gap-3 justify-center">
          {onRetry && (
            <button
              onClick={onRetry}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
              data-testid="retry-button"
            >
              <RefreshCw className="w-4 h-4" />
              Try Again
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
      </div>
    </div>
  );
}

ViewerError.displayName = 'ViewerError';

export default ViewerError;