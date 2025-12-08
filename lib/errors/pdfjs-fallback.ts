/**
 * PDF.js Fallback System
 * 
 * Provides fallback rendering strategies when PDF.js is unavailable
 * or encounters errors.
 * 
 * Requirements: 2.5
 */

import { isPDFJSAvailable } from '@/lib/pdfjs-config';
import { PDFJSErrorCode } from './pdfjs-errors';

/**
 * Fallback Method
 * 
 * Requirements: 2.5
 */
export enum FallbackMethod {
  /** Use browser's native PDF viewer in iframe */
  NATIVE_IFRAME = 'native-iframe',
  
  /** Use object/embed tag */
  OBJECT_EMBED = 'object-embed',
  
  /** Download PDF instead of viewing */
  DOWNLOAD = 'download',
  
  /** Show error message only */
  ERROR_ONLY = 'error-only',
}

/**
 * Fallback Reason
 * 
 * Requirements: 2.5
 */
export enum FallbackReason {
  /** PDF.js library not available */
  LIBRARY_UNAVAILABLE = 'library-unavailable',
  
  /** PDF.js worker failed to initialize */
  WORKER_FAILED = 'worker-failed',
  
  /** CORS/CSP restrictions */
  SECURITY_RESTRICTIONS = 'security-restrictions',
  
  /** Unsupported PDF features */
  UNSUPPORTED_FEATURES = 'unsupported-features',
  
  /** Rendering errors */
  RENDERING_ERRORS = 'rendering-errors',
  
  /** User preference */
  USER_PREFERENCE = 'user-preference',
}

/**
 * Fallback Configuration
 * 
 * Requirements: 2.5
 */
export interface FallbackConfig {
  /** Preferred fallback method */
  method: FallbackMethod;
  
  /** Reason for fallback */
  reason: FallbackReason;
  
  /** Whether to show notification */
  showNotification: boolean;
  
  /** Notification message */
  notificationMessage?: string;
}

/**
 * Detect if PDF.js is available
 * 
 * Requirements: 2.5
 */
export function detectPDFJSAvailability(): {
  available: boolean;
  reason?: FallbackReason;
} {
  // Check if PDF.js library is loaded
  if (!isPDFJSAvailable()) {
    return {
      available: false,
      reason: FallbackReason.LIBRARY_UNAVAILABLE,
    };
  }
  
  // Check if running in a supported environment
  if (typeof window === 'undefined') {
    return {
      available: false,
      reason: FallbackReason.LIBRARY_UNAVAILABLE,
    };
  }
  
  // Check if canvas is supported
  if (!document.createElement('canvas').getContext) {
    return {
      available: false,
      reason: FallbackReason.RENDERING_ERRORS,
    };
  }
  
  // Check if Web Workers are supported
  if (typeof Worker === 'undefined') {
    return {
      available: false,
      reason: FallbackReason.WORKER_FAILED,
    };
  }
  
  return {
    available: true,
  };
}

/**
 * Determine fallback method based on error
 * 
 * Requirements: 2.5
 */
export function determineFallbackMethod(
  errorCode?: PDFJSErrorCode,
  reason?: FallbackReason
): FallbackMethod {
  // If PDF.js is unavailable, try native iframe
  if (reason === FallbackReason.LIBRARY_UNAVAILABLE) {
    return FallbackMethod.NATIVE_IFRAME;
  }
  
  // If worker failed, try native iframe
  if (reason === FallbackReason.WORKER_FAILED) {
    return FallbackMethod.NATIVE_IFRAME;
  }
  
  // If CORS/CSP issues, download instead
  if (reason === FallbackReason.SECURITY_RESTRICTIONS) {
    return FallbackMethod.DOWNLOAD;
  }
  
  // If unsupported features, try native iframe
  if (reason === FallbackReason.UNSUPPORTED_FEATURES) {
    return FallbackMethod.NATIVE_IFRAME;
  }
  
  // If rendering errors, try native iframe
  if (reason === FallbackReason.RENDERING_ERRORS) {
    return FallbackMethod.NATIVE_IFRAME;
  }
  
  // Check error code
  if (errorCode) {
    switch (errorCode) {
      case PDFJSErrorCode.LIBRARY_UNAVAILABLE:
      case PDFJSErrorCode.WORKER_INIT_ERROR:
        return FallbackMethod.NATIVE_IFRAME;
        
      case PDFJSErrorCode.CORS_ERROR:
      case PDFJSErrorCode.PERMISSION_DENIED:
        return FallbackMethod.DOWNLOAD;
        
      case PDFJSErrorCode.UNSUPPORTED_FORMAT:
        return FallbackMethod.NATIVE_IFRAME;
        
      case PDFJSErrorCode.CORRUPTED_FILE:
      case PDFJSErrorCode.INVALID_PDF:
        return FallbackMethod.ERROR_ONLY;
        
      default:
        return FallbackMethod.NATIVE_IFRAME;
    }
  }
  
  // Default to native iframe
  return FallbackMethod.NATIVE_IFRAME;
}

/**
 * Get fallback notification message
 * 
 * Requirements: 2.5
 */
export function getFallbackNotificationMessage(
  method: FallbackMethod,
  reason: FallbackReason
): string {
  switch (method) {
    case FallbackMethod.NATIVE_IFRAME:
      return 'Using browser\'s native PDF viewer as a fallback.';
      
    case FallbackMethod.OBJECT_EMBED:
      return 'Using alternative PDF viewer.';
      
    case FallbackMethod.DOWNLOAD:
      return 'PDF cannot be displayed. Please download to view.';
      
    case FallbackMethod.ERROR_ONLY:
      return 'PDF cannot be displayed due to an error.';
      
    default:
      return 'Using fallback PDF viewer.';
  }
}

/**
 * Create fallback configuration
 * 
 * Requirements: 2.5
 */
export function createFallbackConfig(
  errorCode?: PDFJSErrorCode,
  reason?: FallbackReason
): FallbackConfig {
  // Detect PDF.js availability if no reason provided
  if (!reason) {
    const detection = detectPDFJSAvailability();
    if (!detection.available) {
      reason = detection.reason;
    }
  }
  
  // Determine fallback method
  const method = determineFallbackMethod(errorCode, reason);
  
  // Get notification message
  const notificationMessage = reason 
    ? getFallbackNotificationMessage(method, reason)
    : undefined;
  
  return {
    method,
    reason: reason || FallbackReason.USER_PREFERENCE,
    showNotification: !!reason,
    notificationMessage,
  };
}

/**
 * Check if browser supports native PDF viewing
 * 
 * Requirements: 2.5
 */
export function supportsNativePDFViewing(): boolean {
  // Check if running in browser
  if (typeof window === 'undefined' || typeof navigator === 'undefined') {
    return false;
  }
  
  // Check for PDF MIME type support
  const mimeTypes = navigator.mimeTypes;
  if (mimeTypes && mimeTypes['application/pdf']) {
    return true;
  }
  
  // Check for PDF plugin
  const plugins = navigator.plugins;
  if (plugins) {
    for (let i = 0; i < plugins.length; i++) {
      const plugin = plugins[i];
      if (plugin.name && plugin.name.toLowerCase().includes('pdf')) {
        return true;
      }
    }
  }
  
  // Assume modern browsers support PDF viewing
  return true;
}

/**
 * Get fallback URL for native viewing
 * 
 * Requirements: 2.5
 */
export function getFallbackURL(pdfUrl: string, method: FallbackMethod): string {
  switch (method) {
    case FallbackMethod.NATIVE_IFRAME:
      // Add parameters to disable PDF.js toolbar
      return `${pdfUrl}#toolbar=0&navpanes=0&scrollbar=0`;
      
    case FallbackMethod.OBJECT_EMBED:
      return pdfUrl;
      
    case FallbackMethod.DOWNLOAD:
      // Force download by adding download parameter
      const url = new URL(pdfUrl);
      url.searchParams.set('download', 'true');
      return url.toString();
      
    default:
      return pdfUrl;
  }
}

/**
 * Check if fallback is needed
 * 
 * Requirements: 2.5
 */
export function shouldUseFallback(errorCode?: PDFJSErrorCode): boolean {
  // Check PDF.js availability
  const detection = detectPDFJSAvailability();
  if (!detection.available) {
    return true;
  }
  
  // Check error code
  if (errorCode) {
    switch (errorCode) {
      case PDFJSErrorCode.LIBRARY_UNAVAILABLE:
      case PDFJSErrorCode.WORKER_INIT_ERROR:
      case PDFJSErrorCode.CORS_ERROR:
      case PDFJSErrorCode.UNSUPPORTED_FORMAT:
        return true;
        
      default:
        return false;
    }
  }
  
  return false;
}
