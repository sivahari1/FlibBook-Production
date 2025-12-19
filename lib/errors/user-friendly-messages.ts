/**
 * User-Friendly Error Messages for JStudyRoom Document Viewing
 * 
 * Provides specific, actionable error messages for different failure types
 * to improve user experience and reduce confusion.
 * 
 * Requirements: 3.1, 3.2
 */

import { DocumentErrorType } from '../resilience/document-error-recovery';

/**
 * User-friendly error message interface
 */
export interface UserFriendlyError {
  /** Primary error message for the user */
  title: string;
  /** Detailed explanation of what went wrong */
  message: string;
  /** Actionable steps the user can take */
  actions: ErrorAction[];
  /** Severity level for UI styling */
  severity: 'error' | 'warning' | 'info';
  /** Icon to display with the error */
  icon: string;
  /** Whether this error is recoverable */
  recoverable: boolean;
  /** Estimated time to resolution if known */
  estimatedResolution?: string;
}

/**
 * Error action interface
 */
export interface ErrorAction {
  /** Action label for button/link */
  label: string;
  /** Action type */
  type: 'retry' | 'refresh' | 'navigate' | 'contact' | 'download' | 'external';
  /** Action handler or URL */
  action: string | (() => void | Promise<void>);
  /** Whether this is the primary action */
  primary?: boolean;
  /** Additional styling variant */
  variant?: 'primary' | 'secondary' | 'danger' | 'success';
  /** Whether action is disabled */
  disabled?: boolean;
}

/**
 * Error context for generating contextual messages
 */
export interface ErrorContext {
  documentId?: string;
  documentTitle?: string;
  userId?: string;
  retryCount?: number;
  maxRetries?: number;
  conversionProgress?: number;
  networkStatus?: 'online' | 'offline' | 'slow';
  browserInfo?: {
    name: string;
    version: string;
    mobile: boolean;
  };
}

/**
 * User-friendly error message generator
 */
export class UserFriendlyErrorMessages {
  /**
   * Generate user-friendly error message from error type and context
   */
  static generateErrorMessage(
    errorType: DocumentErrorType,
    originalError?: Error,
    context?: ErrorContext
  ): UserFriendlyError {
    switch (errorType) {
      case DocumentErrorType.NETWORK_FAILURE:
        return this.createNetworkFailureMessage(originalError, context);
      
      case DocumentErrorType.STORAGE_URL_EXPIRED:
        return this.createStorageUrlExpiredMessage(originalError, context);
      
      case DocumentErrorType.CACHE_MISS:
      case DocumentErrorType.PAGES_NOT_FOUND:
        return this.createPagesNotFoundMessage(originalError, context);
      
      case DocumentErrorType.CONVERSION_FAILED:
        return this.createConversionFailedMessage(originalError, context);
      
      case DocumentErrorType.PERMISSION_DENIED:
        return this.createPermissionDeniedMessage(originalError, context);
      
      case DocumentErrorType.DOCUMENT_CORRUPTED:
        return this.createDocumentCorruptedMessage(originalError, context);
      
      case DocumentErrorType.TIMEOUT:
        return this.createTimeoutMessage(originalError, context);
      
      default:
        return this.createGenericErrorMessage(originalError, context);
    }
  }

  /**
   * Network failure error message
   */
  private static createNetworkFailureMessage(
    error?: Error,
    context?: ErrorContext
  ): UserFriendlyError {
    const isOffline = context?.networkStatus === 'offline';
    const isSlow = context?.networkStatus === 'slow';
    
    if (isOffline) {
      return {
        title: 'No Internet Connection',
        message: 'Your device appears to be offline. Please check your internet connection and try again.',
        actions: [
          {
            label: 'Try Again',
            type: 'retry',
            action: 'retry',
            primary: true,
            variant: 'primary'
          },
          {
            label: 'Check Connection',
            type: 'external',
            action: () => window.open('https://www.google.com', '_blank'),
            variant: 'secondary'
          }
        ],
        severity: 'error',
        icon: '📡',
        recoverable: true,
        estimatedResolution: 'Once connection is restored'
      };
    }

    if (isSlow) {
      return {
        title: 'Slow Connection Detected',
        message: 'Your internet connection seems slow. The document may take longer to load than usual.',
        actions: [
          {
            label: 'Continue Waiting',
            type: 'retry',
            action: 'retry',
            primary: true,
            variant: 'primary'
          },
          {
            label: 'Try Again',
            type: 'refresh',
            action: 'refresh',
            variant: 'secondary'
          }
        ],
        severity: 'warning',
        icon: '🐌',
        recoverable: true,
        estimatedResolution: '1-2 minutes'
      };
    }

    return {
      title: 'Connection Problem',
      message: 'We\'re having trouble connecting to our servers. This is usually temporary and resolves quickly.',
      actions: [
        {
          label: 'Try Again',
          type: 'retry',
          action: 'retry',
          primary: true,
          variant: 'primary'
        },
        {
          label: 'Refresh Page',
          type: 'refresh',
          action: 'refresh',
          variant: 'secondary'
        },
        {
          label: 'Check Status',
          type: 'external',
          action: 'https://status.jstudyroom.com',
          variant: 'secondary'
        }
      ],
      severity: 'error',
      icon: '🌐',
      recoverable: true,
      estimatedResolution: '30 seconds to 2 minutes'
    };
  }

  /**
   * Storage URL expired error message
   */
  private static createStorageUrlExpiredMessage(
    error?: Error,
    context?: ErrorContext
  ): UserFriendlyError {
    return {
      title: 'Document Link Expired',
      message: 'The secure link to your document has expired. This happens automatically for security reasons. We can generate a fresh link for you.',
      actions: [
        {
          label: 'Refresh Document',
          type: 'retry',
          action: 'retry',
          primary: true,
          variant: 'primary'
        },
        {
          label: 'Back to Library',
          type: 'navigate',
          action: '/member/my-jstudyroom',
          variant: 'secondary'
        }
      ],
      severity: 'warning',
      icon: '🔗',
      recoverable: true,
      estimatedResolution: 'Immediate'
    };
  }

  /**
   * Pages not found error message
   */
  private static createPagesNotFoundMessage(
    error?: Error,
    context?: ErrorContext
  ): UserFriendlyError {
    const hasProgress = context?.conversionProgress !== undefined;
    
    if (hasProgress && context.conversionProgress! > 0) {
      return {
        title: 'Document Processing In Progress',
        message: `Your document is being prepared for viewing (${context.conversionProgress}% complete). This usually takes a minute or two.`,
        actions: [
          {
            label: 'Continue Waiting',
            type: 'retry',
            action: 'wait',
            primary: true,
            variant: 'primary'
          },
          {
            label: 'Check Progress',
            type: 'refresh',
            action: 'refresh',
            variant: 'secondary'
          }
        ],
        severity: 'info',
        icon: '⏳',
        recoverable: true,
        estimatedResolution: '1-3 minutes'
      };
    }

    return {
      title: 'Document Needs Processing',
      message: 'This document hasn\'t been prepared for viewing yet. We\'ll process it now so you can read it online.',
      actions: [
        {
          label: 'Process Document',
          type: 'retry',
          action: 'convert',
          primary: true,
          variant: 'primary'
        },
        {
          label: 'Download Original',
          type: 'download',
          action: 'download',
          variant: 'secondary'
        },
        {
          label: 'Back to Library',
          type: 'navigate',
          action: '/member/my-jstudyroom',
          variant: 'secondary'
        }
      ],
      severity: 'info',
      icon: '🔄',
      recoverable: true,
      estimatedResolution: '2-5 minutes'
    };
  }

  /**
   * Conversion failed error message
   */
  private static createConversionFailedMessage(
    error?: Error,
    context?: ErrorContext
  ): UserFriendlyError {
    const retryCount = context?.retryCount || 0;
    const maxRetries = context?.maxRetries || 3;
    const canRetry = retryCount < maxRetries;

    if (!canRetry) {
      return {
        title: 'Document Processing Failed',
        message: 'We\'ve tried several times but can\'t process this document for online viewing. You can still download the original file or contact support for help.',
        actions: [
          {
            label: 'Download Original',
            type: 'download',
            action: 'download',
            primary: true,
            variant: 'primary'
          },
          {
            label: 'Contact Support',
            type: 'contact',
            action: 'support',
            variant: 'secondary'
          },
          {
            label: 'Back to Library',
            type: 'navigate',
            action: '/member/my-jstudyroom',
            variant: 'secondary'
          }
        ],
        severity: 'error',
        icon: '❌',
        recoverable: false
      };
    }

    return {
      title: 'Processing Error',
      message: `We encountered an issue while preparing your document (attempt ${retryCount + 1} of ${maxRetries}). This sometimes happens with complex documents.`,
      actions: [
        {
          label: 'Try Again',
          type: 'retry',
          action: 'retry',
          primary: true,
          variant: 'primary'
        },
        {
          label: 'Download Original',
          type: 'download',
          action: 'download',
          variant: 'secondary'
        },
        {
          label: 'Contact Support',
          type: 'contact',
          action: 'support',
          variant: 'secondary'
        }
      ],
      severity: 'warning',
      icon: '⚠️',
      recoverable: true,
      estimatedResolution: '1-2 minutes'
    };
  }

  /**
   * Permission denied error message
   */
  private static createPermissionDeniedMessage(
    error?: Error,
    context?: ErrorContext
  ): UserFriendlyError {
    return {
      title: 'Access Not Allowed',
      message: 'You don\'t have permission to view this document. It may have been removed from your library or your access may have expired.',
      actions: [
        {
          label: 'Back to Library',
          type: 'navigate',
          action: '/member/my-jstudyroom',
          primary: true,
          variant: 'primary'
        },
        {
          label: 'Contact Support',
          type: 'contact',
          action: 'support',
          variant: 'secondary'
        }
      ],
      severity: 'error',
      icon: '🔒',
      recoverable: false
    };
  }

  /**
   * Document corrupted error message
   */
  private static createDocumentCorruptedMessage(
    error?: Error,
    context?: ErrorContext
  ): UserFriendlyError {
    return {
      title: 'Document Damaged',
      message: 'This document appears to be corrupted or damaged. This can happen if the file was incomplete when uploaded or if there was a storage issue.',
      actions: [
        {
          label: 'Try Processing Again',
          type: 'retry',
          action: 'retry',
          primary: true,
          variant: 'primary'
        },
        {
          label: 'Contact Support',
          type: 'contact',
          action: 'support',
          variant: 'secondary'
        },
        {
          label: 'Back to Library',
          type: 'navigate',
          action: '/member/my-jstudyroom',
          variant: 'secondary'
        }
      ],
      severity: 'error',
      icon: '🗂️',
      recoverable: true,
      estimatedResolution: 'May require re-upload'
    };
  }

  /**
   * Timeout error message
   */
  private static createTimeoutMessage(
    error?: Error,
    context?: ErrorContext
  ): UserFriendlyError {
    return {
      title: 'Taking Longer Than Expected',
      message: 'The document is taking longer to load than usual. This might be due to the document size or current server load.',
      actions: [
        {
          label: 'Keep Waiting',
          type: 'retry',
          action: 'wait',
          primary: true,
          variant: 'primary'
        },
        {
          label: 'Try Again',
          type: 'refresh',
          action: 'refresh',
          variant: 'secondary'
        },
        {
          label: 'Download Instead',
          type: 'download',
          action: 'download',
          variant: 'secondary'
        }
      ],
      severity: 'warning',
      icon: '⏰',
      recoverable: true,
      estimatedResolution: '2-5 minutes'
    };
  }

  /**
   * Generic error message for unknown errors
   */
  private static createGenericErrorMessage(
    error?: Error,
    context?: ErrorContext
  ): UserFriendlyError {
    return {
      title: 'Something Went Wrong',
      message: 'We encountered an unexpected issue while loading your document. Our team has been notified and is working on a fix.',
      actions: [
        {
          label: 'Try Again',
          type: 'retry',
          action: 'retry',
          primary: true,
          variant: 'primary'
        },
        {
          label: 'Refresh Page',
          type: 'refresh',
          action: 'refresh',
          variant: 'secondary'
        },
        {
          label: 'Contact Support',
          type: 'contact',
          action: 'support',
          variant: 'secondary'
        }
      ],
      severity: 'error',
      icon: '🤔',
      recoverable: true,
      estimatedResolution: 'Usually resolves within minutes'
    };
  }

  /**
   * Get browser-specific error messages
   */
  static getBrowserSpecificMessage(context?: ErrorContext): UserFriendlyError | null {
    if (!context?.browserInfo) return null;

    const { name, version, mobile } = context.browserInfo;

    // Check for known browser compatibility issues
    if (name === 'Internet Explorer') {
      return {
        title: 'Browser Not Supported',
        message: 'Internet Explorer is not supported for document viewing. Please use a modern browser like Chrome, Firefox, Safari, or Edge.',
        actions: [
          {
            label: 'Download Chrome',
            type: 'external',
            action: 'https://www.google.com/chrome/',
            primary: true,
            variant: 'primary'
          },
          {
            label: 'Download Firefox',
            type: 'external',
            action: 'https://www.mozilla.org/firefox/',
            variant: 'secondary'
          },
          {
            label: 'Download Edge',
            type: 'external',
            action: 'https://www.microsoft.com/edge',
            variant: 'secondary'
          }
        ],
        severity: 'error',
        icon: '🌐',
        recoverable: false
      };
    }

    // Check for mobile-specific issues
    if (mobile && name === 'Safari' && parseFloat(version) < 14) {
      return {
        title: 'Safari Version Too Old',
        message: 'Your Safari version may not support all document viewing features. Please update Safari or try a different browser.',
        actions: [
          {
            label: 'Update Safari',
            type: 'external',
            action: 'https://support.apple.com/safari',
            primary: true,
            variant: 'primary'
          },
          {
            label: 'Try Chrome',
            type: 'external',
            action: 'https://apps.apple.com/app/google-chrome/id535886823',
            variant: 'secondary'
          }
        ],
        severity: 'warning',
        icon: '📱',
        recoverable: true
      };
    }

    return null;
  }

  /**
   * Get contextual help message based on error frequency
   */
  static getContextualHelp(errorType: DocumentErrorType, frequency: number): string | null {
    if (frequency > 3) {
      switch (errorType) {
        case DocumentErrorType.NETWORK_FAILURE:
          return 'If you keep seeing connection errors, try switching to a different network or contact your internet provider.';
        
        case DocumentErrorType.CONVERSION_FAILED:
          return 'Repeated conversion failures might indicate an issue with this specific document. Try re-uploading it or contact support.';
        
        case DocumentErrorType.TIMEOUT:
          return 'Frequent timeouts suggest your connection might be slow. Try viewing documents during off-peak hours.';
        
        default:
          return 'If this error keeps happening, please contact our support team with the document details.';
      }
    }
    return null;
  }
}

/**
 * Error message formatter for different UI contexts
 */
export class ErrorMessageFormatter {
  /**
   * Format error for toast notification
   */
  static formatForToast(error: UserFriendlyError): {
    title: string;
    message: string;
    type: 'error' | 'warning' | 'info';
  } {
    return {
      title: error.title,
      message: error.message,
      type: error.severity === 'error' ? 'error' : error.severity === 'warning' ? 'warning' : 'info'
    };
  }

  /**
   * Format error for full-page display
   */
  static formatForFullPage(error: UserFriendlyError): {
    icon: string;
    title: string;
    message: string;
    actions: ErrorAction[];
    estimatedResolution?: string;
  } {
    return {
      icon: error.icon,
      title: error.title,
      message: error.message,
      actions: error.actions,
      estimatedResolution: error.estimatedResolution
    };
  }

  /**
   * Format error for inline display
   */
  static formatForInline(error: UserFriendlyError): {
    message: string;
    actions: ErrorAction[];
    severity: 'error' | 'warning' | 'info';
  } {
    return {
      message: `${error.icon} ${error.message}`,
      actions: error.actions.filter(action => action.primary),
      severity: error.severity
    };
  }
}

/**
 * Support contact integration
 */
export class SupportContactIntegration {
  /**
   * Generate support contact URL with error context
   */
  static generateSupportUrl(
    error: UserFriendlyError,
    context?: ErrorContext
  ): string {
    const params = new URLSearchParams({
      subject: `Document Viewing Issue: ${error.title}`,
      category: 'document-viewing',
      error_type: error.title,
      document_id: context?.documentId || 'unknown',
      user_id: context?.userId || 'unknown',
      timestamp: new Date().toISOString()
    });

    return `/support/contact?${params.toString()}`;
  }

  /**
   * Generate support email with pre-filled content
   */
  static generateSupportEmail(
    error: UserFriendlyError,
    context?: ErrorContext
  ): string {
    const subject = encodeURIComponent(`Document Viewing Issue: ${error.title}`);
    const body = encodeURIComponent(`
Hello Support Team,

I'm experiencing an issue with document viewing in my JStudyRoom:

Error: ${error.title}
Description: ${error.message}
Document ID: ${context?.documentId || 'Not available'}
Time: ${new Date().toLocaleString()}
Browser: ${context?.browserInfo?.name || 'Unknown'} ${context?.browserInfo?.version || ''}

Please help me resolve this issue.

Thank you!
    `.trim());

    return `mailto:support@jstudyroom.com?subject=${subject}&body=${body}`;
  }
}