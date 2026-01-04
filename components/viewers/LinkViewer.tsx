'use client';

import { useState } from 'react';

interface LinkViewerProps {
  url: string;
  title?: string;
}

export function LinkViewer({ url, title = "External Link" }: LinkViewerProps) {
  const [iframeError, setIframeError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const handleIframeError = () => {
    setIframeError(true);
    setIsLoading(false);
  };

  const handleIframeLoad = () => {
    setIsLoading(false);
    setIframeError(false);
  };

  const handleOpenInNewTab = () => {
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const handleReload = () => {
    setIframeError(false);
    setIsLoading(true);
    // Force iframe reload
    const iframe = document.querySelector('iframe') as HTMLIFrameElement;
    if (iframe) {
      const currentSrc = iframe.src;
      iframe.src = '';
      setTimeout(() => {
        iframe.src = currentSrc;
      }, 100);
    }
  };

  // Show fallback if iframe is blocked or fails to load
  if (iframeError) {
    return (
      <div className="flex flex-col items-center justify-center h-full bg-gray-50 p-8">
        <div className="text-center max-w-md">
          <div className="mb-6">
            <svg 
              className="mx-auto h-16 w-16 text-gray-400" 
              fill="none" 
              viewBox="0 0 24 24" 
              stroke="currentColor"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={1} 
                d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" 
              />
            </svg>
          </div>
          
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            Content Blocked
          </h3>
          
          <p className="text-gray-600 mb-2 font-medium">
            {title}
          </p>
          
          <p className="text-gray-500 text-sm mb-6">
            This content cannot be displayed in an embedded frame due to security restrictions. You can open it in a new tab instead.
          </p>
          
          <div className="space-x-4">
            <button
              onClick={handleReload}
              className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors"
            >
              Try Again
            </button>
            <button
              onClick={handleOpenInNewTab}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              Open in New Tab
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full">
      {/* Toolbar */}
      <div className="absolute top-0 left-0 right-0 z-10 bg-white border-b border-gray-200 px-4 py-2 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <svg 
            className="h-4 w-4 text-gray-500" 
            fill="none" 
            viewBox="0 0 24 24" 
            stroke="currentColor"
          >
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              strokeWidth={2} 
              d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" 
            />
          </svg>
          <h3 className="text-sm font-medium text-gray-900 truncate">
            {title}
          </h3>
        </div>
        <div className="flex space-x-2">
          <button
            onClick={handleReload}
            className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors"
            title="Reload"
          >
            Reload
          </button>
          <button
            onClick={handleOpenInNewTab}
            className="px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition-colors"
            title="Open in New Tab"
          >
            New Tab
          </button>
        </div>
      </div>

      {/* Loading indicator */}
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-50" style={{ marginTop: '48px' }}>
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
            <p className="text-sm text-gray-600">Loading content...</p>
          </div>
        </div>
      )}

      {/* Link Iframe */}
      <iframe
        src={url}
        className="w-full h-full border-0"
        style={{ marginTop: '48px', height: 'calc(100% - 48px)' }}
        title={title}
        onError={handleIframeError}
        onLoad={handleIframeLoad}
        sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox"
      />
    </div>
  );
}