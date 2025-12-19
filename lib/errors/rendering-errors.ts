/**
 * Rendering Error Classification System
 * 
 * Comprehensive error handling and diagnostics for document rendering
 * Requirements: 1.3, 2.4, 3.3
 */

/**
 * Rendering Error Types
 * Requirements: 1.3, 2.4
 */
export enum RenderingErrorType {
  // Network-related errors
  NETWORK_TIMEOUT = 'network_timeout',
  NETWORK_FAILURE = 'network_failure',
  NETWORK_UNAVAILABLE = 'network_unavailable',
  
  // PDF parsing errors
  PDF_PARSING_FAILED = 'pdf_parsing_failed',
  PDF_CORRUPTED = 'pdf_corrupted',
  PDF_INVALID_FORMAT = 'pdf_invalid_format',
  PDF_PASSWORD_PROTECTED = 'pdf_password_protected',
  
  // PDF rendering errors
  PDF_RENDERING_FAILED = 'pdf_rendering_failed',
  PDF_PAGE_RENDER_FAILED = 'pdf_page_render_failed',
  PDF_CANVAS_ERROR = 'pdf_canvas_error',
  
  // Browser compatibility errors
  BROWSER_COMPATIBILITY = 'browser_compatibility',
  BROWSER_WEBGL_UNAVAILABLE = 'browser_webgl_unavailable',
  BROWSER_CANVAS_UNAVAILABLE = 'browser_canvas_unavailable',
  
  // Security errors
  SECURITY_CORS_ERROR = 'security_cors_error',
  SECURITY_PERMISSION_DENIED = 'security_permission_denied',
  SECURITY_CSP_VIOLATION = 'security_csp_violation',
  
  // Memory errors
  MEMORY_EXHAUSTED = 'memory_exhausted',
  MEMORY_ALLOCATION_FAILED = 'memory_allocation_failed',
  
  // Generic errors
  UNKNOWN_ERROR = 'unknown_error',
  INITIALIZATION_FAILED = 'initialization_failed',
}

/**
 * Error Severity Levels
 * Requirements: 1.3, 3.3
 */
export enum ErrorSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
}

/**
 * Browser Information Interface
 * Requirements: 2.4, 3.3
 */
export interface BrowserInfo {
  userAgent: string;
  pdfJsVersion?: string;
  supportedFeatures: string[];
  webGLSupported: boolean;
  canvasSupported: boolean;
  memoryLimit?: number;
  availableMemory?: number;
}

/**
 * Document Information Interface
 * Requirements: 2.4, 3.3
 */
export interface DocumentInfo {
  pageCount?: number;
  fileSize?: number;
  version?: string;
  encrypted: boolean;
  hasJavaScript?: boolean;
  hasEmbeddedFiles?: boolean;
  title?: string;
  author?: string;
  creationDate?: Date;
  modificationDate?: Date;
}

/**
 * Performance Metrics Interface
 * Requirements: 2.4, 3.3
 */
export interface PerformanceMetrics {
  loadTime: number;
  renderTime: number;
  memoryUsage: number;
  totalPages?: number;
  renderedPages?: number;
  failedPages?: number;
}

/**
 * Network Context Interface
 * Requirements: 2.4, 3.3
 */
export interface NetworkContext {
  url: string;
  responseStatus?: number;
  responseHeaders?: Record<string, string>;
  loadTime?: number;
  retryAttempts?: number;
  connectionType?: string;
}

/**
 * Rendering Diagnostics Interface
 * Requirements: 2.4, 3.3
 */
export interface RenderingDiagnostics {
  documentId: string;
  pdfUrl: string;
  errorType: RenderingErrorType;
  timestamp: Date;
  browserInfo: BrowserInfo;
  documentInfo?: DocumentInfo;
  performanceMetrics?: PerformanceMetrics;
  networkContext?: NetworkContext;
  additionalContext?: Record<string, any>;
}

/**
 * Rendering Error Interface
 * Requirements: 1.3, 2.4, 3.3
 */
export interface RenderingError extends Error {
  type: RenderingErrorType;
  severity: ErrorSeverity;
  userMessage: string;
  technicalMessage: string;
  suggestion: string;
  recoverable: boolean;
  retryable: boolean;
  diagnostics?: RenderingDiagnostics;
  originalError?: Error;
}

/**
 * Error Recovery Strategy Interface
 * Requirements: 1.3, 3.3
 */
export interface ErrorRecoveryStrategy {
  canRecover(error: RenderingError): boolean;
  recover(error: RenderingError): Promise<RecoveryResult>;
  getFallbackOptions(error: RenderingError): FallbackOption[];
}

/**
 * Recovery Result Interface
 * Requirements: 1.3, 3.3
 */
export interface RecoveryResult {
  success: boolean;
  shouldRetry: boolean;
  fallbackUsed?: string;
  userMessage?: string;
  technicalDetails?: string;
}

/**
 * Fallback Option Interface
 * Requirements: 1.3, 3.3
 */
export interface FallbackOption {
  type: 'retry' | 'alternative_url' | 'download_prompt' | 'browser_update' | 'contact_support';
  description: string;
  action: () => Promise<void>;
  priority: number; // Lower number = higher priority
}

/**
 * Get error severity based on error type
 * Requirements: 1.3, 3.3
 */
export function getErrorSeverity(errorType: RenderingErrorType): ErrorSeverity {
  switch (errorType) {
    // Critical errors that completely block functionality
    case RenderingErrorType.BROWSER_COMPATIBILITY:
    case RenderingErrorType.BROWSER_CANVAS_UNAVAILABLE:
    case RenderingErrorType.MEMORY_EXHAUSTED:
    case RenderingErrorType.INITIALIZATION_FAILED:
      return ErrorSeverity.CRITICAL;
    
    // High severity errors that significantly impact user experience
    case RenderingErrorType.PDF_PARSING_FAILED:
    case RenderingErrorType.PDF_CORRUPTED:
    case RenderingErrorType.PDF_INVALID_FORMAT:
    case RenderingErrorType.PDF_PASSWORD_PROTECTED:
    case RenderingErrorType.SECURITY_PERMISSION_DENIED:
    case RenderingErrorType.SECURITY_CSP_VIOLATION:
      return ErrorSeverity.HIGH;
    
    // Medium severity errors that can often be recovered from
    case RenderingErrorType.NETWORK_TIMEOUT:
    case RenderingErrorType.NETWORK_FAILURE:
    case RenderingErrorType.PDF_RENDERING_FAILED:
    case RenderingErrorType.PDF_PAGE_RENDER_FAILED:
    case RenderingErrorType.SECURITY_CORS_ERROR:
      return ErrorSeverity.MEDIUM;
    
    // Low severity errors that are minor inconveniences
    case RenderingErrorType.BROWSER_WEBGL_UNAVAILABLE:
    case RenderingErrorType.MEMORY_ALLOCATION_FAILED:
    case RenderingErrorType.PDF_CANVAS_ERROR:
      return ErrorSeverity.LOW;
    
    default:
      return ErrorSeverity.MEDIUM;
  }
}

/**
 * Get user-friendly error message
 * Requirements: 1.3, 3.3
 */
export function getUserMessage(errorType: RenderingErrorType): string {
  switch (errorType) {
    // Network errors
    case RenderingErrorType.NETWORK_TIMEOUT:
      return 'The document is taking too long to load';
    case RenderingErrorType.NETWORK_FAILURE:
      return 'Failed to load the document due to network issues';
    case RenderingErrorType.NETWORK_UNAVAILABLE:
      return 'No internet connection available';
    
    // PDF parsing errors
    case RenderingErrorType.PDF_PARSING_FAILED:
      return 'Unable to read the PDF document';
    case RenderingErrorType.PDF_CORRUPTED:
      return 'The PDF file appears to be corrupted';
    case RenderingErrorType.PDF_INVALID_FORMAT:
      return 'The file is not a valid PDF document';
    case RenderingErrorType.PDF_PASSWORD_PROTECTED:
      return 'This PDF is password protected';
    
    // PDF rendering errors
    case RenderingErrorType.PDF_RENDERING_FAILED:
      return 'Failed to display the PDF document';
    case RenderingErrorType.PDF_PAGE_RENDER_FAILED:
      return 'Some pages could not be displayed';
    case RenderingErrorType.PDF_CANVAS_ERROR:
      return 'Display error occurred while rendering';
    
    // Browser compatibility errors
    case RenderingErrorType.BROWSER_COMPATIBILITY:
      return 'Your browser is not compatible with the PDF viewer';
    case RenderingErrorType.BROWSER_WEBGL_UNAVAILABLE:
      return 'Advanced graphics features are not available';
    case RenderingErrorType.BROWSER_CANVAS_UNAVAILABLE:
      return 'Canvas support is required but not available';
    
    // Security errors
    case RenderingErrorType.SECURITY_CORS_ERROR:
      return 'Security restrictions prevent loading this document';
    case RenderingErrorType.SECURITY_PERMISSION_DENIED:
      return 'You do not have permission to view this document';
    case RenderingErrorType.SECURITY_CSP_VIOLATION:
      return 'Security policy prevents loading this document';
    
    // Memory errors
    case RenderingErrorType.MEMORY_EXHAUSTED:
      return 'Not enough memory to display this document';
    case RenderingErrorType.MEMORY_ALLOCATION_FAILED:
      return 'Memory allocation failed during rendering';
    
    // Generic errors
    case RenderingErrorType.INITIALIZATION_FAILED:
      return 'Failed to initialize the document viewer';
    case RenderingErrorType.UNKNOWN_ERROR:
    default:
      return 'An unexpected error occurred';
  }
}

/**
 * Get technical error message for debugging
 * Requirements: 2.4, 3.3
 */
export function getTechnicalMessage(errorType: RenderingErrorType, originalError?: Error): string {
  const baseMessage = `Rendering error: ${errorType}`;
  if (originalError) {
    return `${baseMessage} - ${originalError.message}`;
  }
  return baseMessage;
}

/**
 * Get error suggestion for user
 * Requirements: 1.3, 3.3
 */
export function getErrorSuggestion(errorType: RenderingErrorType): string {
  switch (errorType) {
    // Network errors
    case RenderingErrorType.NETWORK_TIMEOUT:
      return 'Check your internet connection and try again. Large files may take longer to load.';
    case RenderingErrorType.NETWORK_FAILURE:
      return 'Check your internet connection and try refreshing the page.';
    case RenderingErrorType.NETWORK_UNAVAILABLE:
      return 'Please connect to the internet and try again.';
    
    // PDF parsing errors
    case RenderingErrorType.PDF_PARSING_FAILED:
      return 'Try re-uploading the PDF file or contact support if the issue persists.';
    case RenderingErrorType.PDF_CORRUPTED:
      return 'The PDF file may be damaged. Try re-uploading or using a different file.';
    case RenderingErrorType.PDF_INVALID_FORMAT:
      return 'Please ensure you are uploading a valid PDF file.';
    case RenderingErrorType.PDF_PASSWORD_PROTECTED:
      return 'Password-protected PDFs are not currently supported. Please remove the password and try again.';
    
    // PDF rendering errors
    case RenderingErrorType.PDF_RENDERING_FAILED:
      return 'Try refreshing the page or using a different browser.';
    case RenderingErrorType.PDF_PAGE_RENDER_FAILED:
      return 'Some pages may still be viewable. Try scrolling or refreshing the page.';
    case RenderingErrorType.PDF_CANVAS_ERROR:
      return 'Try refreshing the page or clearing your browser cache.';
    
    // Browser compatibility errors
    case RenderingErrorType.BROWSER_COMPATIBILITY:
      return 'Please update your browser or try using Chrome, Firefox, or Safari.';
    case RenderingErrorType.BROWSER_WEBGL_UNAVAILABLE:
      return 'Some features may be limited. Consider updating your browser or graphics drivers.';
    case RenderingErrorType.BROWSER_CANVAS_UNAVAILABLE:
      return 'Please update your browser to view PDF documents.';
    
    // Security errors
    case RenderingErrorType.SECURITY_CORS_ERROR:
      return 'Contact the document owner or administrator for access.';
    case RenderingErrorType.SECURITY_PERMISSION_DENIED:
      return 'Contact the document owner to request viewing permissions.';
    case RenderingErrorType.SECURITY_CSP_VIOLATION:
      return 'Contact your system administrator for assistance.';
    
    // Memory errors
    case RenderingErrorType.MEMORY_EXHAUSTED:
      return 'Try closing other browser tabs or applications to free up memory.';
    case RenderingErrorType.MEMORY_ALLOCATION_FAILED:
      return 'Try refreshing the page or restarting your browser.';
    
    // Generic errors
    case RenderingErrorType.INITIALIZATION_FAILED:
      return 'Try refreshing the page. If the problem persists, contact support.';
    case RenderingErrorType.UNKNOWN_ERROR:
    default:
      return 'Try refreshing the page. If the problem persists, contact support.';
  }
}

/**
 * Check if error is recoverable
 * Requirements: 1.3, 3.3
 */
export function isRecoverable(errorType: RenderingErrorType): boolean {
  switch (errorType) {
    // Recoverable errors
    case RenderingErrorType.NETWORK_TIMEOUT:
    case RenderingErrorType.NETWORK_FAILURE:
    case RenderingErrorType.PDF_RENDERING_FAILED:
    case RenderingErrorType.PDF_PAGE_RENDER_FAILED:
    case RenderingErrorType.PDF_CANVAS_ERROR:
    case RenderingErrorType.MEMORY_ALLOCATION_FAILED:
    case RenderingErrorType.INITIALIZATION_FAILED:
      return true;
    
    // Non-recoverable errors
    case RenderingErrorType.PDF_CORRUPTED:
    case RenderingErrorType.PDF_INVALID_FORMAT:
    case RenderingErrorType.PDF_PASSWORD_PROTECTED:
    case RenderingErrorType.BROWSER_COMPATIBILITY:
    case RenderingErrorType.BROWSER_CANVAS_UNAVAILABLE:
    case RenderingErrorType.SECURITY_PERMISSION_DENIED:
    case RenderingErrorType.SECURITY_CSP_VIOLATION:
    case RenderingErrorType.MEMORY_EXHAUSTED:
      return false;
    
    // Potentially recoverable
    case RenderingErrorType.NETWORK_UNAVAILABLE:
    case RenderingErrorType.PDF_PARSING_FAILED:
    case RenderingErrorType.BROWSER_WEBGL_UNAVAILABLE:
    case RenderingErrorType.SECURITY_CORS_ERROR:
      return true;
    
    default:
      return true; // Default to recoverable for unknown errors
  }
}

/**
 * Check if error is retryable
 * Requirements: 1.3, 3.3
 */
export function isRetryable(errorType: RenderingErrorType): boolean {
  switch (errorType) {
    // Retryable errors
    case RenderingErrorType.NETWORK_TIMEOUT:
    case RenderingErrorType.NETWORK_FAILURE:
    case RenderingErrorType.NETWORK_UNAVAILABLE:
    case RenderingErrorType.PDF_RENDERING_FAILED:
    case RenderingErrorType.PDF_PAGE_RENDER_FAILED:
    case RenderingErrorType.PDF_CANVAS_ERROR:
    case RenderingErrorType.MEMORY_ALLOCATION_FAILED:
    case RenderingErrorType.INITIALIZATION_FAILED:
      return true;
    
    // Non-retryable errors
    case RenderingErrorType.PDF_CORRUPTED:
    case RenderingErrorType.PDF_INVALID_FORMAT:
    case RenderingErrorType.PDF_PASSWORD_PROTECTED:
    case RenderingErrorType.BROWSER_COMPATIBILITY:
    case RenderingErrorType.BROWSER_CANVAS_UNAVAILABLE:
    case RenderingErrorType.SECURITY_PERMISSION_DENIED:
    case RenderingErrorType.SECURITY_CSP_VIOLATION:
    case RenderingErrorType.MEMORY_EXHAUSTED:
      return false;
    
    // Conditionally retryable
    case RenderingErrorType.PDF_PARSING_FAILED:
    case RenderingErrorType.BROWSER_WEBGL_UNAVAILABLE:
    case RenderingErrorType.SECURITY_CORS_ERROR:
      return true;
    
    default:
      return true; // Default to retryable for unknown errors
  }
}

/**
 * Create a rendering error
 * Requirements: 1.3, 2.4, 3.3
 */
export function createRenderingError(
  type: RenderingErrorType,
  message?: string,
  originalError?: Error,
  diagnostics?: RenderingDiagnostics
): RenderingError {
  const severity = getErrorSeverity(type);
  const userMessage = getUserMessage(type);
  const technicalMessage = getTechnicalMessage(type, originalError);
  const suggestion = getErrorSuggestion(type);
  const recoverable = isRecoverable(type);
  const retryable = isRetryable(type);
  
  const error = new Error(message || userMessage) as RenderingError;
  error.name = 'RenderingError';
  error.type = type;
  error.severity = severity;
  error.userMessage = userMessage;
  error.technicalMessage = technicalMessage;
  error.suggestion = suggestion;
  error.recoverable = recoverable;
  error.retryable = retryable;
  error.diagnostics = diagnostics;
  error.originalError = originalError;
  
  return error;
}

/**
 * Parse error from various sources and classify it
 * Requirements: 2.4, 3.3
 */
export function parseRenderingError(
  error: unknown,
  context?: Partial<RenderingDiagnostics>
): RenderingError {
  if (error instanceof Error) {
    const errorName = error.name.toLowerCase();
    const errorMessage = error.message.toLowerCase();
    
    // Check for specific error types
    // Prioritize message content over error name for more accurate classification
    
    // Check for timeout first (most specific)
    if (errorMessage.includes('timeout')) {
      return createRenderingError(RenderingErrorType.NETWORK_TIMEOUT, error.message, error, context as RenderingDiagnostics);
    }
    
    // Check for CORS errors
    if (errorName.includes('cors') || errorMessage.includes('cors')) {
      return createRenderingError(RenderingErrorType.SECURITY_CORS_ERROR, error.message, error, context as RenderingDiagnostics);
    }
    
    // Check for permission errors
    if (errorMessage.includes('permission') || errorMessage.includes('denied')) {
      return createRenderingError(RenderingErrorType.SECURITY_PERMISSION_DENIED, error.message, error, context as RenderingDiagnostics);
    }
    
    // Check for memory errors first
    if (errorMessage.includes('memory')) {
      if (errorMessage.includes('exhausted') || errorMessage.includes('out of memory')) {
        return createRenderingError(RenderingErrorType.MEMORY_EXHAUSTED, error.message, error, context as RenderingDiagnostics);
      }
      return createRenderingError(RenderingErrorType.MEMORY_ALLOCATION_FAILED, error.message, error, context as RenderingDiagnostics);
    }
    
    // Check for worker errors
    if (errorMessage.includes('worker')) {
      return createRenderingError(RenderingErrorType.INITIALIZATION_FAILED, error.message, error, context as RenderingDiagnostics);
    }
    
    // Check for PDF-specific errors before network errors
    if (errorMessage.includes('corrupt') || errorMessage.includes('damaged')) {
      return createRenderingError(RenderingErrorType.PDF_CORRUPTED, error.message, error, context as RenderingDiagnostics);
    }
    
    if ((errorMessage.includes('invalid') && errorMessage.includes('pdf')) || 
        (errorMessage.includes('not') && errorMessage.includes('pdf')) ||
        errorMessage.includes('format not recognized') ||
        errorMessage.includes('unsupported file format')) {
      return createRenderingError(RenderingErrorType.PDF_INVALID_FORMAT, error.message, error, context as RenderingDiagnostics);
    }
    
    // Check for network errors (after more specific checks)
    if (errorName.includes('network') || errorMessage.includes('network')) {
      return createRenderingError(RenderingErrorType.NETWORK_FAILURE, error.message, error, context as RenderingDiagnostics);
    }
    
    if (errorMessage.includes('password') || 
        errorMessage.includes('encrypted') || 
        errorMessage.includes('encryption')) {
      return createRenderingError(RenderingErrorType.PDF_PASSWORD_PROTECTED, error.message, error, context as RenderingDiagnostics);
    }
    
    if (errorMessage.includes('canvas')) {
      return createRenderingError(RenderingErrorType.PDF_CANVAS_ERROR, error.message, error, context as RenderingDiagnostics);
    }
    
    if (errorMessage.includes('render')) {
      return createRenderingError(RenderingErrorType.PDF_RENDERING_FAILED, error.message, error, context as RenderingDiagnostics);
    }
    
    // Generic error
    return createRenderingError(RenderingErrorType.UNKNOWN_ERROR, error.message, error, context as RenderingDiagnostics);
  }
  
  // Unknown error type
  return createRenderingError(
    RenderingErrorType.UNKNOWN_ERROR,
    'An unknown error occurred',
    error instanceof Error ? error : undefined,
    context as RenderingDiagnostics
  );
}

/**
 * Get retry delay based on error type (exponential backoff)
 * Requirements: 1.3, 3.3
 */
export function getRetryDelay(errorType: RenderingErrorType, attemptNumber: number): number {
  // Base delay in milliseconds
  const baseDelay = 1000;
  
  // Maximum delay in milliseconds
  const maxDelay = 30000;
  
  // Error-specific multipliers
  const multiplier = (() => {
    switch (errorType) {
      case RenderingErrorType.NETWORK_TIMEOUT:
        return 2; // Longer delays for timeouts
      case RenderingErrorType.NETWORK_FAILURE:
        return 1.5;
      case RenderingErrorType.PDF_RENDERING_FAILED:
        return 1;
      default:
        return 1;
    }
  })();
  
  // Calculate exponential backoff
  const delay = Math.min(baseDelay * multiplier * Math.pow(2, attemptNumber - 1), maxDelay);
  
  // Add jitter to prevent thundering herd
  const jitter = Math.random() * 0.3 * delay;
  
  return delay + jitter;
}

/**
 * Get maximum retry attempts based on error type
 * Requirements: 1.3, 3.3
 */
export function getMaxRetryAttempts(errorType: RenderingErrorType): number {
  switch (errorType) {
    // Network errors - more retries
    case RenderingErrorType.NETWORK_TIMEOUT:
    case RenderingErrorType.NETWORK_FAILURE:
      return 3;
    
    // Rendering errors - moderate retries
    case RenderingErrorType.PDF_RENDERING_FAILED:
    case RenderingErrorType.PDF_PAGE_RENDER_FAILED:
    case RenderingErrorType.PDF_CANVAS_ERROR:
      return 2;
    
    // Memory errors - one retry
    case RenderingErrorType.MEMORY_ALLOCATION_FAILED:
    case RenderingErrorType.INITIALIZATION_FAILED:
      return 1;
    
    // Network availability - more retries
    case RenderingErrorType.NETWORK_UNAVAILABLE:
      return 5;
    
    // Non-retryable errors
    case RenderingErrorType.PDF_CORRUPTED:
    case RenderingErrorType.PDF_INVALID_FORMAT:
    case RenderingErrorType.PDF_PASSWORD_PROTECTED:
    case RenderingErrorType.BROWSER_COMPATIBILITY:
    case RenderingErrorType.BROWSER_CANVAS_UNAVAILABLE:
    case RenderingErrorType.SECURITY_PERMISSION_DENIED:
    case RenderingErrorType.SECURITY_CSP_VIOLATION:
    case RenderingErrorType.MEMORY_EXHAUSTED:
      return 0;
    
    // Default
    default:
      return 2;
  }
}