/**
 * PDF.js Specific Error Handlers
 * 
 * Provides specific error handling for network errors, permission errors,
 * corrupted file errors, and timeout errors.
 * 
 * Requirements: 7.2, 7.3, 7.4
 */

import {
  PDFJSError,
  PDFJSErrorCode,
  createPDFJSError,
  parsePDFJSError,
} from './pdfjs-errors';

/**
 * Error Handler Result
 */
export interface ErrorHandlerResult {
  error: PDFJSError;
  handled: boolean;
  action?: 'retry' | 'reload' | 'notify' | 'fallback';
  message?: string;
}

/**
 * Network Error Handler
 * 
 * Handles network-related errors including timeouts, connection failures,
 * and missing resources.
 * 
 * Requirements: 7.2
 */
export class NetworkErrorHandler {
  /**
   * Handle network error
   */
  static handle(error: unknown): ErrorHandlerResult {
    const pdfjsError = parsePDFJSError(error);
    
    // Check if this is a network error
    if (pdfjsError.category !== 'network') {
      return {
        error: pdfjsError,
        handled: false,
      };
    }
    
    // Handle specific network error types
    switch (pdfjsError.code) {
      case PDFJSErrorCode.TIMEOUT:
        return this.handleTimeout(pdfjsError);
        
      case PDFJSErrorCode.NETWORK_ERROR:
        return this.handleNetworkError(pdfjsError);
        
      case PDFJSErrorCode.MISSING_PDF:
        return this.handleMissingPDF(pdfjsError);
        
      default:
        return {
          error: pdfjsError,
          handled: false,
        };
    }
  }
  
  /**
   * Handle timeout error
   * 
   * Requirements: 7.2
   */
  private static handleTimeout(error: PDFJSError): ErrorHandlerResult {
    return {
      error: createPDFJSError(
        PDFJSErrorCode.TIMEOUT,
        'The PDF took too long to load. This may be due to a slow connection or a large file size.',
        error.originalError
      ),
      handled: true,
      action: 'retry',
      message: 'Please check your internet connection and try again. If the problem persists, the file may be too large.',
    };
  }
  
  /**
   * Handle network error
   * 
   * Requirements: 7.2
   */
  private static handleNetworkError(error: PDFJSError): ErrorHandlerResult {
    // Check if offline
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      return {
        error: createPDFJSError(
          PDFJSErrorCode.NETWORK_ERROR,
          'You appear to be offline. Please check your internet connection.',
          error.originalError
        ),
        handled: true,
        action: 'notify',
        message: 'Please check your internet connection and try again.',
      };
    }
    
    return {
      error: createPDFJSError(
        PDFJSErrorCode.NETWORK_ERROR,
        'A network error occurred while loading the PDF. This may be due to a connection issue or server problem.',
        error.originalError
      ),
      handled: true,
      action: 'retry',
      message: 'Please check your internet connection and try again.',
    };
  }
  
  /**
   * Handle missing PDF error
   * 
   * Requirements: 7.2
   */
  private static handleMissingPDF(error: PDFJSError): ErrorHandlerResult {
    return {
      error: createPDFJSError(
        PDFJSErrorCode.MISSING_PDF,
        'The PDF file could not be found. The link may have expired or the file may have been deleted.',
        error.originalError
      ),
      handled: true,
      action: 'notify',
      message: 'The PDF file may have been moved or deleted. The link may have expired.',
    };
  }
  
  /**
   * Check if error is a network error
   */
  static isNetworkError(error: unknown): boolean {
    const pdfjsError = parsePDFJSError(error);
    return pdfjsError.category === 'network';
  }
}

/**
 * Permission Error Handler
 * 
 * Handles permission-related errors including access denied,
 * CORS errors, and password-protected PDFs.
 * 
 * Requirements: 7.3
 */
export class PermissionErrorHandler {
  /**
   * Handle permission error
   */
  static handle(error: unknown): ErrorHandlerResult {
    const pdfjsError = parsePDFJSError(error);
    
    // Check if this is a permission error
    if (pdfjsError.category !== 'permission') {
      return {
        error: pdfjsError,
        handled: false,
      };
    }
    
    // Handle specific permission error types
    switch (pdfjsError.code) {
      case PDFJSErrorCode.PERMISSION_DENIED:
        return this.handlePermissionDenied(pdfjsError);
        
      case PDFJSErrorCode.CORS_ERROR:
        return this.handleCORSError(pdfjsError);
        
      case PDFJSErrorCode.PASSWORD_REQUIRED:
        return this.handlePasswordRequired(pdfjsError);
        
      default:
        return {
          error: pdfjsError,
          handled: false,
        };
    }
  }
  
  /**
   * Handle permission denied error
   * 
   * Requirements: 7.3
   */
  private static handlePermissionDenied(error: PDFJSError): ErrorHandlerResult {
    return {
      error: createPDFJSError(
        PDFJSErrorCode.PERMISSION_DENIED,
        'You do not have permission to view this PDF. Access has been denied.',
        error.originalError
      ),
      handled: true,
      action: 'notify',
      message: 'You may not have permission to view this document. Please contact the document owner.',
    };
  }
  
  /**
   * Handle CORS error
   * 
   * Requirements: 7.3
   */
  private static handleCORSError(error: PDFJSError): ErrorHandlerResult {
    return {
      error: createPDFJSError(
        PDFJSErrorCode.CORS_ERROR,
        'The PDF cannot be loaded due to cross-origin security restrictions.',
        error.originalError
      ),
      handled: true,
      action: 'fallback',
      message: 'The PDF cannot be loaded due to security restrictions. Please contact support.',
    };
  }
  
  /**
   * Handle password required error
   * 
   * Requirements: 7.3
   */
  private static handlePasswordRequired(error: PDFJSError): ErrorHandlerResult {
    return {
      error: createPDFJSError(
        PDFJSErrorCode.PASSWORD_REQUIRED,
        'This PDF is password protected and cannot be opened.',
        error.originalError
      ),
      handled: true,
      action: 'notify',
      message: 'This PDF requires a password to open. Password-protected PDFs are not currently supported.',
    };
  }
  
  /**
   * Check if error is a permission error
   */
  static isPermissionError(error: unknown): boolean {
    const pdfjsError = parsePDFJSError(error);
    return pdfjsError.category === 'permission';
  }
}

/**
 * File Error Handler
 * 
 * Handles file-related errors including corrupted files,
 * invalid PDFs, and unsupported formats.
 * 
 * Requirements: 7.4
 */
export class FileErrorHandler {
  /**
   * Handle file error
   */
  static handle(error: unknown): ErrorHandlerResult {
    const pdfjsError = parsePDFJSError(error);
    
    // Check if this is a file error
    if (pdfjsError.category !== 'file') {
      return {
        error: pdfjsError,
        handled: false,
      };
    }
    
    // Handle specific file error types
    switch (pdfjsError.code) {
      case PDFJSErrorCode.INVALID_PDF:
        return this.handleInvalidPDF(pdfjsError);
        
      case PDFJSErrorCode.CORRUPTED_FILE:
        return this.handleCorruptedFile(pdfjsError);
        
      case PDFJSErrorCode.UNSUPPORTED_FORMAT:
        return this.handleUnsupportedFormat(pdfjsError);
        
      default:
        return {
          error: pdfjsError,
          handled: false,
        };
    }
  }
  
  /**
   * Handle invalid PDF error
   * 
   * Requirements: 7.4
   */
  private static handleInvalidPDF(error: PDFJSError): ErrorHandlerResult {
    return {
      error: createPDFJSError(
        PDFJSErrorCode.INVALID_PDF,
        'The file is not a valid PDF document. It may be corrupted or in an unsupported format.',
        error.originalError
      ),
      handled: true,
      action: 'notify',
      message: 'The file is not a valid PDF document. Please ensure you are opening a PDF file.',
    };
  }
  
  /**
   * Handle corrupted file error
   * 
   * Requirements: 7.4
   */
  private static handleCorruptedFile(error: PDFJSError): ErrorHandlerResult {
    return {
      error: createPDFJSError(
        PDFJSErrorCode.CORRUPTED_FILE,
        'The PDF file appears to be corrupted or damaged and cannot be opened.',
        error.originalError
      ),
      handled: true,
      action: 'notify',
      message: 'The PDF file appears to be corrupted or damaged. Please try re-uploading the file.',
    };
  }
  
  /**
   * Handle unsupported format error
   * 
   * Requirements: 7.4
   */
  private static handleUnsupportedFormat(error: PDFJSError): ErrorHandlerResult {
    return {
      error: createPDFJSError(
        PDFJSErrorCode.UNSUPPORTED_FORMAT,
        'This PDF uses features that are not currently supported by the viewer.',
        error.originalError
      ),
      handled: true,
      action: 'fallback',
      message: 'This PDF uses features that are not currently supported. Please try a different PDF.',
    };
  }
  
  /**
   * Check if error is a file error
   */
  static isFileError(error: unknown): boolean {
    const pdfjsError = parsePDFJSError(error);
    return pdfjsError.category === 'file';
  }
}

/**
 * Timeout Error Handler
 * 
 * Handles timeout errors with specific strategies for different
 * timeout scenarios.
 * 
 * Requirements: 7.2
 */
export class TimeoutErrorHandler {
  /**
   * Handle timeout error
   */
  static handle(error: unknown, timeoutDuration: number): ErrorHandlerResult {
    const pdfjsError = parsePDFJSError(error);
    
    // Check if this is a timeout error
    if (pdfjsError.code !== PDFJSErrorCode.TIMEOUT) {
      return {
        error: pdfjsError,
        handled: false,
      };
    }
    
    // Determine timeout type based on duration
    if (timeoutDuration < 10000) {
      // Short timeout - likely network issue
      return {
        error: createPDFJSError(
          PDFJSErrorCode.TIMEOUT,
          'The PDF loading timed out quickly. This may indicate a network issue.',
          pdfjsError.originalError
        ),
        handled: true,
        action: 'retry',
        message: 'Please check your internet connection and try again.',
      };
    } else if (timeoutDuration < 30000) {
      // Medium timeout - likely slow connection or large file
      return {
        error: createPDFJSError(
          PDFJSErrorCode.TIMEOUT,
          'The PDF took too long to load. This may be due to a slow connection or large file size.',
          pdfjsError.originalError
        ),
        handled: true,
        action: 'retry',
        message: 'The file may be large. Please wait and try again.',
      };
    } else {
      // Long timeout - likely very large file or server issue
      return {
        error: createPDFJSError(
          PDFJSErrorCode.TIMEOUT,
          'The PDF loading timed out after an extended period. The file may be too large or the server may be unavailable.',
          pdfjsError.originalError
        ),
        handled: true,
        action: 'notify',
        message: 'The file may be too large or the server may be unavailable. Please contact support.',
      };
    }
  }
  
  /**
   * Check if error is a timeout error
   */
  static isTimeoutError(error: unknown): boolean {
    const pdfjsError = parsePDFJSError(error);
    return pdfjsError.code === PDFJSErrorCode.TIMEOUT;
  }
}

/**
 * Composite Error Handler
 * 
 * Combines all specific error handlers into a single handler.
 * 
 * Requirements: 7.2, 7.3, 7.4
 */
export class PDFJSErrorHandler {
  /**
   * Handle any PDF.js error
   */
  static handle(error: unknown, context?: { timeoutDuration?: number }): ErrorHandlerResult {
    // Try network error handler
    if (NetworkErrorHandler.isNetworkError(error)) {
      const result = NetworkErrorHandler.handle(error);
      if (result.handled) return result;
    }
    
    // Try permission error handler
    if (PermissionErrorHandler.isPermissionError(error)) {
      const result = PermissionErrorHandler.handle(error);
      if (result.handled) return result;
    }
    
    // Try file error handler
    if (FileErrorHandler.isFileError(error)) {
      const result = FileErrorHandler.handle(error);
      if (result.handled) return result;
    }
    
    // Try timeout error handler
    if (TimeoutErrorHandler.isTimeoutError(error)) {
      const result = TimeoutErrorHandler.handle(
        error,
        context?.timeoutDuration || 30000
      );
      if (result.handled) return result;
    }
    
    // Fallback to generic error
    const pdfjsError = parsePDFJSError(error);
    return {
      error: pdfjsError,
      handled: true,
      action: pdfjsError.retryable ? 'retry' : 'notify',
      message: pdfjsError.suggestion,
    };
  }
  
  /**
   * Get recommended action for error
   */
  static getRecommendedAction(error: unknown): 'retry' | 'reload' | 'notify' | 'fallback' {
    const result = this.handle(error);
    return result.action || 'notify';
  }
  
  /**
   * Get user-friendly message for error
   */
  static getUserMessage(error: unknown): string {
    const result = this.handle(error);
    return result.message || result.error.suggestion;
  }
}
