/**
 * PDF.js Error Types and Handling
 * 
 * Defines error types, error messages, and error recovery strategies
 * for PDF.js integration.
 * 
 * Requirements: 2.4, 7.1, 7.2, 7.3, 7.4, 7.5
 */

/**
 * PDF.js Error Codes
 * 
 * Requirements: 2.4, 7.1
 */
export enum PDFJSErrorCode {
  // Loading errors
  TIMEOUT = 'TIMEOUT',
  INVALID_PDF = 'INVALID_PDF',
  MISSING_PDF = 'MISSING_PDF',
  NETWORK_ERROR = 'NETWORK_ERROR',
  PASSWORD_REQUIRED = 'PASSWORD_REQUIRED',
  CANCELLED = 'CANCELLED',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
  
  // Rendering errors
  RENDER_ERROR = 'RENDER_ERROR',
  CANVAS_CONTEXT_ERROR = 'CANVAS_CONTEXT_ERROR',
  
  // Library errors
  LIBRARY_UNAVAILABLE = 'LIBRARY_UNAVAILABLE',
  WORKER_INIT_ERROR = 'WORKER_INIT_ERROR',
  
  // Permission errors
  PERMISSION_DENIED = 'PERMISSION_DENIED',
  CORS_ERROR = 'CORS_ERROR',
  
  // File errors
  CORRUPTED_FILE = 'CORRUPTED_FILE',
  UNSUPPORTED_FORMAT = 'UNSUPPORTED_FORMAT',
}

/**
 * PDF.js Error Category
 * 
 * Requirements: 7.2, 7.3, 7.4
 */
export enum PDFJSErrorCategory {
  NETWORK = 'network',
  PERMISSION = 'permission',
  FILE = 'file',
  RENDERING = 'rendering',
  LIBRARY = 'library',
  UNKNOWN = 'unknown',
}

/**
 * PDF.js Error Interface
 * 
 * Requirements: 2.4, 7.1
 */
export interface PDFJSError {
  code: PDFJSErrorCode;
  category: PDFJSErrorCategory;
  message: string;
  userMessage: string;
  suggestion: string;
  recoverable: boolean;
  retryable: boolean;
  originalError?: Error;
}

/**
 * Get error category from error code
 * 
 * Requirements: 7.2, 7.3, 7.4
 */
export function getErrorCategory(code: PDFJSErrorCode): PDFJSErrorCategory {
  switch (code) {
    case PDFJSErrorCode.TIMEOUT:
    case PDFJSErrorCode.NETWORK_ERROR:
    case PDFJSErrorCode.MISSING_PDF:
      return PDFJSErrorCategory.NETWORK;
      
    case PDFJSErrorCode.PERMISSION_DENIED:
    case PDFJSErrorCode.CORS_ERROR:
    case PDFJSErrorCode.PASSWORD_REQUIRED:
      return PDFJSErrorCategory.PERMISSION;
      
    case PDFJSErrorCode.INVALID_PDF:
    case PDFJSErrorCode.CORRUPTED_FILE:
    case PDFJSErrorCode.UNSUPPORTED_FORMAT:
      return PDFJSErrorCategory.FILE;
      
    case PDFJSErrorCode.RENDER_ERROR:
    case PDFJSErrorCode.CANVAS_CONTEXT_ERROR:
      return PDFJSErrorCategory.RENDERING;
      
    case PDFJSErrorCode.LIBRARY_UNAVAILABLE:
    case PDFJSErrorCode.WORKER_INIT_ERROR:
      return PDFJSErrorCategory.LIBRARY;
      
    default:
      return PDFJSErrorCategory.UNKNOWN;
  }
}

/**
 * Get user-friendly error message
 * 
 * Requirements: 2.4, 7.1
 */
export function getUserMessage(code: PDFJSErrorCode): string {
  switch (code) {
    // Network errors - Requirements: 7.2
    case PDFJSErrorCode.TIMEOUT:
      return 'PDF loading timed out';
    case PDFJSErrorCode.NETWORK_ERROR:
      return 'Network error while loading PDF';
    case PDFJSErrorCode.MISSING_PDF:
      return 'PDF file not found';
      
    // Permission errors - Requirements: 7.3
    case PDFJSErrorCode.PERMISSION_DENIED:
      return 'Access denied';
    case PDFJSErrorCode.CORS_ERROR:
      return 'Cross-origin access blocked';
    case PDFJSErrorCode.PASSWORD_REQUIRED:
      return 'PDF is password protected';
      
    // File errors - Requirements: 7.4
    case PDFJSErrorCode.INVALID_PDF:
      return 'Invalid PDF file';
    case PDFJSErrorCode.CORRUPTED_FILE:
      return 'PDF file is corrupted';
    case PDFJSErrorCode.UNSUPPORTED_FORMAT:
      return 'Unsupported PDF format';
      
    // Rendering errors
    case PDFJSErrorCode.RENDER_ERROR:
      return 'Failed to render page';
    case PDFJSErrorCode.CANVAS_CONTEXT_ERROR:
      return 'Canvas initialization failed';
      
    // Library errors
    case PDFJSErrorCode.LIBRARY_UNAVAILABLE:
      return 'PDF viewer unavailable';
    case PDFJSErrorCode.WORKER_INIT_ERROR:
      return 'PDF worker initialization failed';
      
    case PDFJSErrorCode.CANCELLED:
      return 'Operation cancelled';
      
    default:
      return 'An error occurred';
  }
}

/**
 * Get error suggestion for user
 * 
 * Requirements: 2.4, 7.1, 7.2, 7.3, 7.4
 */
export function getErrorSuggestion(code: PDFJSErrorCode): string {
  switch (code) {
    // Network errors - Requirements: 7.2
    case PDFJSErrorCode.TIMEOUT:
      return 'Please check your internet connection and try again. If the problem persists, the file may be too large.';
    case PDFJSErrorCode.NETWORK_ERROR:
      return 'Please check your internet connection and try again.';
    case PDFJSErrorCode.MISSING_PDF:
      return 'The PDF file may have been moved or deleted. The link may have expired.';
      
    // Permission errors - Requirements: 7.3
    case PDFJSErrorCode.PERMISSION_DENIED:
      return 'You may not have permission to view this document. Please contact the document owner.';
    case PDFJSErrorCode.CORS_ERROR:
      return 'The PDF cannot be loaded due to security restrictions. Please contact support.';
    case PDFJSErrorCode.PASSWORD_REQUIRED:
      return 'This PDF requires a password to open. Password-protected PDFs are not currently supported.';
      
    // File errors - Requirements: 7.4
    case PDFJSErrorCode.INVALID_PDF:
      return 'The file is not a valid PDF document. Please ensure you are opening a PDF file.';
    case PDFJSErrorCode.CORRUPTED_FILE:
      return 'The PDF file appears to be corrupted or damaged. Please try re-uploading the file.';
    case PDFJSErrorCode.UNSUPPORTED_FORMAT:
      return 'This PDF uses features that are not currently supported. Please try a different PDF.';
      
    // Rendering errors
    case PDFJSErrorCode.RENDER_ERROR:
      return 'The page could not be rendered. Try refreshing the page or using a different browser.';
    case PDFJSErrorCode.CANVAS_CONTEXT_ERROR:
      return 'Failed to initialize the canvas. Try refreshing the page or using a different browser.';
      
    // Library errors
    case PDFJSErrorCode.LIBRARY_UNAVAILABLE:
      return 'The PDF viewer library is not available. Please refresh the page.';
    case PDFJSErrorCode.WORKER_INIT_ERROR:
      return 'Failed to initialize the PDF worker. Please refresh the page.';
      
    case PDFJSErrorCode.CANCELLED:
      return 'The operation was cancelled. You can try again.';
      
    default:
      return 'Please try again. If the problem persists, contact support.';
  }
}

/**
 * Check if error is recoverable
 * 
 * Requirements: 7.5
 */
export function isRecoverable(code: PDFJSErrorCode): boolean {
  switch (code) {
    // Recoverable errors
    case PDFJSErrorCode.TIMEOUT:
    case PDFJSErrorCode.NETWORK_ERROR:
    case PDFJSErrorCode.CANCELLED:
    case PDFJSErrorCode.RENDER_ERROR:
    case PDFJSErrorCode.LIBRARY_UNAVAILABLE:
    case PDFJSErrorCode.WORKER_INIT_ERROR:
      return true;
      
    // Non-recoverable errors
    case PDFJSErrorCode.INVALID_PDF:
    case PDFJSErrorCode.CORRUPTED_FILE:
    case PDFJSErrorCode.UNSUPPORTED_FORMAT:
    case PDFJSErrorCode.PASSWORD_REQUIRED:
    case PDFJSErrorCode.PERMISSION_DENIED:
    case PDFJSErrorCode.CORS_ERROR:
      return false;
      
    // Potentially recoverable
    case PDFJSErrorCode.MISSING_PDF:
    case PDFJSErrorCode.CANVAS_CONTEXT_ERROR:
      return true;
      
    default:
      return true; // Default to recoverable for unknown errors
  }
}

/**
 * Check if error is retryable
 * 
 * Requirements: 7.5
 */
export function isRetryable(code: PDFJSErrorCode): boolean {
  switch (code) {
    // Retryable errors
    case PDFJSErrorCode.TIMEOUT:
    case PDFJSErrorCode.NETWORK_ERROR:
    case PDFJSErrorCode.MISSING_PDF:
    case PDFJSErrorCode.CANCELLED:
    case PDFJSErrorCode.RENDER_ERROR:
    case PDFJSErrorCode.CANVAS_CONTEXT_ERROR:
    case PDFJSErrorCode.LIBRARY_UNAVAILABLE:
    case PDFJSErrorCode.WORKER_INIT_ERROR:
      return true;
      
    // Non-retryable errors
    case PDFJSErrorCode.INVALID_PDF:
    case PDFJSErrorCode.CORRUPTED_FILE:
    case PDFJSErrorCode.UNSUPPORTED_FORMAT:
    case PDFJSErrorCode.PASSWORD_REQUIRED:
    case PDFJSErrorCode.PERMISSION_DENIED:
    case PDFJSErrorCode.CORS_ERROR:
      return false;
      
    default:
      return true; // Default to retryable for unknown errors
  }
}

/**
 * Create a PDF.js error object
 * 
 * Requirements: 2.4, 7.1
 */
export function createPDFJSError(
  code: PDFJSErrorCode,
  message?: string,
  originalError?: Error
): PDFJSError {
  const category = getErrorCategory(code);
  const userMessage = getUserMessage(code);
  const suggestion = getErrorSuggestion(code);
  const recoverable = isRecoverable(code);
  const retryable = isRetryable(code);
  
  return {
    code,
    category,
    message: message || userMessage,
    userMessage,
    suggestion,
    recoverable,
    retryable,
    originalError,
  };
}

/**
 * Parse error from PDF.js library
 * 
 * Requirements: 2.4, 7.1
 */
export function parsePDFJSError(error: unknown): PDFJSError {
  if (error instanceof Error) {
    const errorName = error.name;
    const errorMessage = error.message.toLowerCase();
    
    // Check for specific PDF.js error types
    if (errorName === 'InvalidPDFException') {
      return createPDFJSError(PDFJSErrorCode.INVALID_PDF, error.message, error);
    }
    
    if (errorName === 'MissingPDFException') {
      return createPDFJSError(PDFJSErrorCode.MISSING_PDF, error.message, error);
    }
    
    if (errorName === 'UnexpectedResponseException') {
      return createPDFJSError(PDFJSErrorCode.NETWORK_ERROR, error.message, error);
    }
    
    if (errorName === 'PasswordException') {
      return createPDFJSError(PDFJSErrorCode.PASSWORD_REQUIRED, error.message, error);
    }
    
    if (errorName === 'AbortException') {
      return createPDFJSError(PDFJSErrorCode.CANCELLED, error.message, error);
    }
    
    if (errorName === 'RenderingCancelledException') {
      return createPDFJSError(PDFJSErrorCode.CANCELLED, error.message, error);
    }
    
    // Check error message for clues
    if (errorMessage.includes('timeout')) {
      return createPDFJSError(PDFJSErrorCode.TIMEOUT, error.message, error);
    }
    
    if (errorMessage.includes('network') || errorMessage.includes('fetch')) {
      return createPDFJSError(PDFJSErrorCode.NETWORK_ERROR, error.message, error);
    }
    
    if (errorMessage.includes('cors') || errorMessage.includes('cross-origin')) {
      return createPDFJSError(PDFJSErrorCode.CORS_ERROR, error.message, error);
    }
    
    if (errorMessage.includes('permission') || errorMessage.includes('denied')) {
      return createPDFJSError(PDFJSErrorCode.PERMISSION_DENIED, error.message, error);
    }
    
    if (errorMessage.includes('corrupt') || errorMessage.includes('damaged')) {
      return createPDFJSError(PDFJSErrorCode.CORRUPTED_FILE, error.message, error);
    }
    
    if (errorMessage.includes('canvas')) {
      return createPDFJSError(PDFJSErrorCode.CANVAS_CONTEXT_ERROR, error.message, error);
    }
    
    if (errorMessage.includes('worker')) {
      return createPDFJSError(PDFJSErrorCode.WORKER_INIT_ERROR, error.message, error);
    }
    
    // Generic error
    return createPDFJSError(PDFJSErrorCode.UNKNOWN_ERROR, error.message, error);
  }
  
  // Unknown error type
  return createPDFJSError(
    PDFJSErrorCode.UNKNOWN_ERROR,
    'An unknown error occurred',
    error instanceof Error ? error : undefined
  );
}

/**
 * Get retry delay based on error code (exponential backoff)
 * 
 * Requirements: 7.5
 */
export function getRetryDelay(code: PDFJSErrorCode, attemptNumber: number): number {
  // Base delay in milliseconds
  const baseDelay = 1000;
  
  // Maximum delay in milliseconds
  const maxDelay = 10000;
  
  // Calculate exponential backoff
  const delay = Math.min(baseDelay * Math.pow(2, attemptNumber - 1), maxDelay);
  
  // Add jitter to prevent thundering herd
  const jitter = Math.random() * 0.3 * delay;
  
  return delay + jitter;
}

/**
 * Get maximum retry attempts based on error code
 * 
 * Requirements: 7.5
 */
export function getMaxRetryAttempts(code: PDFJSErrorCode): number {
  switch (code) {
    // Network errors - more retries
    case PDFJSErrorCode.TIMEOUT:
    case PDFJSErrorCode.NETWORK_ERROR:
      return 3;
      
    // Rendering errors - fewer retries
    case PDFJSErrorCode.RENDER_ERROR:
    case PDFJSErrorCode.CANVAS_CONTEXT_ERROR:
      return 2;
      
    // Library errors - one retry
    case PDFJSErrorCode.LIBRARY_UNAVAILABLE:
    case PDFJSErrorCode.WORKER_INIT_ERROR:
      return 1;
      
    // Other retryable errors
    case PDFJSErrorCode.MISSING_PDF:
    case PDFJSErrorCode.CANCELLED:
      return 2;
      
    // Non-retryable errors
    case PDFJSErrorCode.INVALID_PDF:
    case PDFJSErrorCode.CORRUPTED_FILE:
    case PDFJSErrorCode.UNSUPPORTED_FORMAT:
    case PDFJSErrorCode.PASSWORD_REQUIRED:
    case PDFJSErrorCode.PERMISSION_DENIED:
    case PDFJSErrorCode.CORS_ERROR:
      return 0;
      
    // Unknown errors - default to retryable with moderate attempts
    default:
      return 2;
  }
}
