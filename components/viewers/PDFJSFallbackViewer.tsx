/**
 * PDF.js Fallback Viewer Component
 * 
 * Provides fallback rendering when PDF.js is unavailable or encounters errors.
 * Falls back to native browser PDF viewer or download option.
 * 
 * INFINITE LOOP PREVENTION APPLIED:
 * - Callback dependencies stabilized with refs
 * - Consistent with main viewer patterns
 * - Proper cleanup and error handling
 * 
 * Requirements: 2.5, 1.1, 1.2
 */

'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Download, AlertCircle, Info } from 'lucide-react';
import {
  FallbackMethod,
  FallbackConfig,
  createFallbackConfig,
  getFallbackURL,
  supportsNativePDFViewing,
} from '@/lib/errors/pdfjs-fallback';
import { PDFJSErrorCode } from '@/lib/errors/pdfjs-errors';
import WatermarkOverlay from './WatermarkOverlay';

export interface PDFJSFallbackViewerProps {
  /** PDF URL */
  pdfUrl: string;
  
  /** Document title */
  documentTitle: string;
  
  /** Watermark settings */
  watermark?: {
    text: string;
    opacity: number;
    fontSize: number;
  };
  
  /** Enable DRM protections */
  enableDRM?: boolean;
  
  /** Error code that triggered fallback */
  errorCode?: PDFJSErrorCode;
  
  /** Fallback configuration */
  fallbackConfig?: FallbackConfig;
  
  /** Callback when fallback is used */
  onFallbackUsed?: (method: FallbackMethod) => void;
}

/**
 * PDFJSFallbackViewer Component
 * 
 * Requirements: 2.5
 */
export default function PDFJSFallbackViewer({
  pdfUrl,
  documentTitle,
  watermark,
  enableDRM = false,
  errorCode,
  fallbackConfig: providedConfig,
  onFallbackUsed,
}: PDFJSFallbackViewerProps) {
  // Create fallback configuration
  const [fallbackConfig] = useState<FallbackConfig>(() => {
    if (providedConfig) {
      return providedConfig;
    }
    return createFallbackConfig(errorCode);
  });
  
  const [showNotification, setShowNotification] = useState(
    fallbackConfig.showNotification
  );
  
  // Notify parent when fallback is used with stable dependencies
  // Requirements: 1.1, 1.2 - Use ref for callback to prevent infinite loops
  const onFallbackUsedRef = useRef(onFallbackUsed);
  
  // Update ref when prop changes
  useEffect(() => {
    onFallbackUsedRef.current = onFallbackUsed;
  }, [onFallbackUsed]);

  useEffect(() => {
    // Use ref-based callback to avoid dependency
    if (onFallbackUsedRef.current) {
      onFallbackUsedRef.current(fallbackConfig.method);
    }
  }, [fallbackConfig.method]); // FIXED: Only depend on method - use ref for callback
  
  // Get fallback URL
  const fallbackUrl = getFallbackURL(pdfUrl, fallbackConfig.method);
  
  // Render based on fallback method
  const renderFallback = () => {
    switch (fallbackConfig.method) {
      case FallbackMethod.NATIVE_IFRAME:
        return renderNativeIframe();
        
      case FallbackMethod.OBJECT_EMBED:
        return renderObjectEmbed();
        
      case FallbackMethod.DOWNLOAD:
        return renderDownloadOption();
        
      case FallbackMethod.ERROR_ONLY:
        return renderErrorOnly();
        
      default:
        return renderNativeIframe();
    }
  };
  
  /**
   * Render native iframe fallback
   * 
   * Requirements: 2.5
   */
  const renderNativeIframe = () => {
    // Check if browser supports native PDF viewing
    const supportsNative = supportsNativePDFViewing();
    
    if (!supportsNative) {
      return renderDownloadOption();
    }
    
    return (
      <div className="relative w-full h-full">
        <iframe
          src={fallbackUrl}
          className="w-full h-full border-0"
          title={documentTitle}
          data-testid="pdfjs-fallback-iframe"
          style={enableDRM ? {
            userSelect: 'none',
            WebkitUserSelect: 'none',
            MozUserSelect: 'none',
            msUserSelect: 'none',
          } : undefined}
        />
        
        {/* Watermark overlay */}
        {watermark && (
          <div 
            className="absolute inset-0 pointer-events-none"
            style={{ zIndex: 10 }}
            data-testid="pdfjs-fallback-watermark"
          >
            <WatermarkOverlay
              text={watermark.text}
              opacity={watermark.opacity}
              fontSize={watermark.fontSize}
            />
          </div>
        )}
      </div>
    );
  };
  
  /**
   * Render object/embed fallback
   * 
   * Requirements: 2.5
   */
  const renderObjectEmbed = () => {
    return (
      <div className="relative w-full h-full">
        <object
          data={fallbackUrl}
          type="application/pdf"
          className="w-full h-full"
          data-testid="pdfjs-fallback-object"
        >
          <embed
            src={fallbackUrl}
            type="application/pdf"
            className="w-full h-full"
            data-testid="pdfjs-fallback-embed"
          />
          
          {/* Fallback if object/embed not supported */}
          <div className="flex items-center justify-center h-full bg-gray-800 p-8">
            <div className="text-center">
              <AlertCircle className="w-16 h-16 text-yellow-500 mx-auto mb-4" />
              <p className="text-white mb-4">
                Your browser cannot display this PDF.
              </p>
              <a
                href={pdfUrl}
                download={documentTitle}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors inline-flex items-center gap-2"
              >
                <Download className="w-4 h-4" />
                Download PDF
              </a>
            </div>
          </div>
        </object>
        
        {/* Watermark overlay */}
        {watermark && (
          <div 
            className="absolute inset-0 pointer-events-none"
            style={{ zIndex: 10 }}
            data-testid="pdfjs-fallback-watermark"
          >
            <WatermarkOverlay
              text={watermark.text}
              opacity={watermark.opacity}
              fontSize={watermark.fontSize}
            />
          </div>
        )}
      </div>
    );
  };
  
  /**
   * Render download option
   * 
   * Requirements: 2.5
   */
  const renderDownloadOption = () => {
    return (
      <div 
        className="flex items-center justify-center h-full bg-gray-800 p-8"
        data-testid="pdfjs-fallback-download"
      >
        <div className="text-center max-w-md">
          <Download className="w-16 h-16 text-blue-500 mx-auto mb-6" />
          
          <h2 className="text-2xl font-bold text-white mb-4">
            Download PDF
          </h2>
          
          <p className="text-gray-300 mb-6">
            This PDF cannot be displayed in your browser. Please download it to view.
          </p>
          
          <a
            href={pdfUrl}
            download={documentTitle}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors inline-flex items-center gap-2 text-lg"
          >
            <Download className="w-5 h-5" />
            Download {documentTitle}
          </a>
          
          {fallbackConfig.notificationMessage && (
            <p className="text-gray-500 text-sm mt-6">
              {fallbackConfig.notificationMessage}
            </p>
          )}
        </div>
      </div>
    );
  };
  
  /**
   * Render error only
   * 
   * Requirements: 2.5
   */
  const renderErrorOnly = () => {
    return (
      <div 
        className="flex items-center justify-center h-full bg-gray-800 p-8"
        data-testid="pdfjs-fallback-error"
      >
        <div className="text-center max-w-md">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-6" />
          
          <h2 className="text-2xl font-bold text-white mb-4">
            Cannot Display PDF
          </h2>
          
          <p className="text-gray-300 mb-6">
            This PDF cannot be displayed due to an error.
          </p>
          
          {fallbackConfig.notificationMessage && (
            <p className="text-gray-400 text-sm mb-6">
              {fallbackConfig.notificationMessage}
            </p>
          )}
          
          <a
            href={pdfUrl}
            download={documentTitle}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors inline-flex items-center gap-2"
          >
            <Download className="w-4 h-4" />
            Download PDF
          </a>
        </div>
      </div>
    );
  };
  
  return (
    <div className="w-full h-full flex flex-col bg-gray-800">
      {/* Fallback notification */}
      {showNotification && fallbackConfig.notificationMessage && (
        <div 
          className="bg-yellow-900 bg-opacity-50 border-b border-yellow-700 px-4 py-3 flex items-center justify-between"
          data-testid="pdfjs-fallback-notification"
          role="alert"
        >
          <div className="flex items-center gap-3">
            <Info className="w-5 h-5 text-yellow-400 flex-shrink-0" />
            <p className="text-yellow-100 text-sm">
              {fallbackConfig.notificationMessage}
            </p>
          </div>
          
          <button
            onClick={() => setShowNotification(false)}
            className="text-yellow-400 hover:text-yellow-300 transition-colors"
            aria-label="Dismiss notification"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}
      
      {/* Fallback content */}
      <div className="flex-1 relative">
        {renderFallback()}
      </div>
    </div>
  );
}
