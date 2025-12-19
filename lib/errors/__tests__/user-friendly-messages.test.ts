/**
 * Unit tests for User-Friendly Error Messages
 * 
 * Tests the generation of user-friendly error messages for different
 * document viewing failure scenarios.
 */

import { 
  UserFriendlyErrorMessages, 
  ErrorMessageFormatter,
  SupportContactIntegration,
  UserFriendlyError,
  ErrorContext
} from '../user-friendly-messages';
import { DocumentErrorType } from '../../resilience/document-error-recovery';

describe('UserFriendlyErrorMessages', () => {
  const mockContext: ErrorContext = {
    documentId: 'test-doc-123',
    documentTitle: 'Test Document.pdf',
    userId: 'user-456',
    retryCount: 1,
    maxRetries: 3,
    conversionProgress: 50,
    networkStatus: 'online',
    browserInfo: {
      name: 'Chrome',
      version: '120',
      mobile: false
    }
  };

  describe('generateErrorMessage', () => {
    it('should generate network failure message', () => {
      const error = UserFriendlyErrorMessages.generateErrorMessage(
        DocumentErrorType.NETWORK_FAILURE,
        new Error('Network request failed'),
        mockContext
      );

      expect(error.title).toBe('Connection Problem');
      expect(error.message).toContain('trouble connecting');
      expect(error.severity).toBe('error');
      expect(error.recoverable).toBe(true);
      expect(error.actions).toHaveLength(3);
      expect(error.actions[0].label).toBe('Try Again');
      expect(error.actions[0].type).toBe('retry');
    });

    it('should generate offline network message', () => {
      const offlineContext = { ...mockContext, networkStatus: 'offline' as const };
      const error = UserFriendlyErrorMessages.generateErrorMessage(
        DocumentErrorType.NETWORK_FAILURE,
        new Error('Network request failed'),
        offlineContext
      );

      expect(error.title).toBe('No Internet Connection');
      expect(error.message).toContain('appears to be offline');
      expect(error.icon).toBe('📡');
    });

    it('should generate slow connection message', () => {
      const slowContext = { ...mockContext, networkStatus: 'slow' as const };
      const error = UserFriendlyErrorMessages.generateErrorMessage(
        DocumentErrorType.NETWORK_FAILURE,
        new Error('Network request failed'),
        slowContext
      );

      expect(error.title).toBe('Slow Connection Detected');
      expect(error.message).toContain('connection seems slow');
      expect(error.severity).toBe('warning');
    });

    it('should generate storage URL expired message', () => {
      const error = UserFriendlyErrorMessages.generateErrorMessage(
        DocumentErrorType.STORAGE_URL_EXPIRED,
        new Error('Signed URL expired'),
        mockContext
      );

      expect(error.title).toBe('Document Link Expired');
      expect(error.message).toContain('secure link to your document has expired');
      expect(error.severity).toBe('warning');
      expect(error.estimatedResolution).toBe('Immediate');
    });

    it('should generate pages not found message with conversion progress', () => {
      const progressContext = { ...mockContext, conversionProgress: 75 };
      const error = UserFriendlyErrorMessages.generateErrorMessage(
        DocumentErrorType.PAGES_NOT_FOUND,
        new Error('Pages not found'),
        progressContext
      );

      expect(error.title).toBe('Document Processing In Progress');
      expect(error.message).toContain('75% complete');
      expect(error.severity).toBe('info');
      expect(error.icon).toBe('⏳');
    });

    it('should generate pages not found message without progress', () => {
      const noProgressContext = { ...mockContext, conversionProgress: undefined };
      const error = UserFriendlyErrorMessages.generateErrorMessage(
        DocumentErrorType.PAGES_NOT_FOUND,
        new Error('Pages not found'),
        noProgressContext
      );

      expect(error.title).toBe('Document Needs Processing');
      expect(error.message).toContain('hasn\'t been prepared for viewing');
      expect(error.actions).toHaveLength(3);
      expect(error.actions[0].label).toBe('Process Document');
    });

    it('should generate conversion failed message with retries available', () => {
      const error = UserFriendlyErrorMessages.generateErrorMessage(
        DocumentErrorType.CONVERSION_FAILED,
        new Error('Conversion failed'),
        mockContext
      );

      expect(error.title).toBe('Processing Error');
      expect(error.message).toContain('attempt 2 of 3');
      expect(error.severity).toBe('warning');
      expect(error.recoverable).toBe(true);
    });

    it('should generate conversion failed message with no retries left', () => {
      const maxRetriesContext = { ...mockContext, retryCount: 3 };
      const error = UserFriendlyErrorMessages.generateErrorMessage(
        DocumentErrorType.CONVERSION_FAILED,
        new Error('Conversion failed'),
        maxRetriesContext
      );

      expect(error.title).toBe('Document Processing Failed');
      expect(error.message).toContain('tried several times');
      expect(error.severity).toBe('error');
      expect(error.recoverable).toBe(false);
      expect(error.actions[0].label).toBe('Download Original');
    });

    it('should generate permission denied message', () => {
      const error = UserFriendlyErrorMessages.generateErrorMessage(
        DocumentErrorType.PERMISSION_DENIED,
        new Error('Access denied'),
        mockContext
      );

      expect(error.title).toBe('Access Not Allowed');
      expect(error.message).toContain('don\'t have permission');
      expect(error.severity).toBe('error');
      expect(error.recoverable).toBe(false);
      expect(error.icon).toBe('🔒');
    });

    it('should generate document corrupted message', () => {
      const error = UserFriendlyErrorMessages.generateErrorMessage(
        DocumentErrorType.DOCUMENT_CORRUPTED,
        new Error('Document corrupted'),
        mockContext
      );

      expect(error.title).toBe('Document Damaged');
      expect(error.message).toContain('appears to be corrupted');
      expect(error.severity).toBe('error');
      expect(error.recoverable).toBe(true);
      expect(error.estimatedResolution).toBe('May require re-upload');
    });

    it('should generate timeout message', () => {
      const error = UserFriendlyErrorMessages.generateErrorMessage(
        DocumentErrorType.TIMEOUT,
        new Error('Request timeout'),
        mockContext
      );

      expect(error.title).toBe('Taking Longer Than Expected');
      expect(error.message).toContain('taking longer to load');
      expect(error.severity).toBe('warning');
      expect(error.icon).toBe('⏰');
    });

    it('should generate generic error message for unknown errors', () => {
      const error = UserFriendlyErrorMessages.generateErrorMessage(
        DocumentErrorType.UNKNOWN,
        new Error('Unknown error'),
        mockContext
      );

      expect(error.title).toBe('Something Went Wrong');
      expect(error.message).toContain('unexpected issue');
      expect(error.severity).toBe('error');
      expect(error.recoverable).toBe(true);
      expect(error.icon).toBe('🤔');
    });
  });

  describe('getBrowserSpecificMessage', () => {
    it('should return IE not supported message', () => {
      const ieContext = {
        ...mockContext,
        browserInfo: { name: 'Internet Explorer', version: '11', mobile: false }
      };

      const error = UserFriendlyErrorMessages.getBrowserSpecificMessage(ieContext);

      expect(error).not.toBeNull();
      expect(error!.title).toBe('Browser Not Supported');
      expect(error!.message).toContain('Internet Explorer is not supported');
      expect(error!.recoverable).toBe(false);
    });

    it('should return Safari mobile warning for old versions', () => {
      const oldSafariContext = {
        ...mockContext,
        browserInfo: { name: 'Safari', version: '13', mobile: true }
      };

      const error = UserFriendlyErrorMessages.getBrowserSpecificMessage(oldSafariContext);

      expect(error).not.toBeNull();
      expect(error!.title).toBe('Safari Version Too Old');
      expect(error!.message).toContain('Safari version may not support');
      expect(error!.severity).toBe('warning');
    });

    it('should return null for supported browsers', () => {
      const error = UserFriendlyErrorMessages.getBrowserSpecificMessage(mockContext);
      expect(error).toBeNull();
    });

    it('should return null when no browser info provided', () => {
      const noBrowserContext = { ...mockContext, browserInfo: undefined };
      const error = UserFriendlyErrorMessages.getBrowserSpecificMessage(noBrowserContext);
      expect(error).toBeNull();
    });
  });

  describe('getContextualHelp', () => {
    it('should return help for frequent network failures', () => {
      const help = UserFriendlyErrorMessages.getContextualHelp(
        DocumentErrorType.NETWORK_FAILURE,
        5
      );

      expect(help).toContain('keep seeing connection errors');
      expect(help).toContain('switching to a different network');
    });

    it('should return help for frequent conversion failures', () => {
      const help = UserFriendlyErrorMessages.getContextualHelp(
        DocumentErrorType.CONVERSION_FAILED,
        4
      );

      expect(help).toContain('Repeated conversion failures');
      expect(help).toContain('re-uploading it');
    });

    it('should return help for frequent timeouts', () => {
      const help = UserFriendlyErrorMessages.getContextualHelp(
        DocumentErrorType.TIMEOUT,
        6
      );

      expect(help).toContain('Frequent timeouts');
      expect(help).toContain('off-peak hours');
    });

    it('should return generic help for other frequent errors', () => {
      const help = UserFriendlyErrorMessages.getContextualHelp(
        DocumentErrorType.PERMISSION_DENIED,
        4
      );

      expect(help).toContain('keeps happening');
      expect(help).toContain('contact our support team');
    });

    it('should return null for infrequent errors', () => {
      const help = UserFriendlyErrorMessages.getContextualHelp(
        DocumentErrorType.NETWORK_FAILURE,
        2
      );

      expect(help).toBeNull();
    });
  });
});

describe('ErrorMessageFormatter', () => {
  const mockError: UserFriendlyError = {
    title: 'Test Error',
    message: 'This is a test error message',
    actions: [
      { label: 'Retry', type: 'retry', action: 'retry', primary: true, variant: 'primary' },
      { label: 'Cancel', type: 'navigate', action: '/back', variant: 'secondary' }
    ],
    severity: 'error',
    icon: '⚠️',
    recoverable: true,
    estimatedResolution: '2 minutes'
  };

  describe('formatForToast', () => {
    it('should format error for toast display', () => {
      const toast = ErrorMessageFormatter.formatForToast(mockError);

      expect(toast.title).toBe('Test Error');
      expect(toast.message).toBe('This is a test error message');
      expect(toast.type).toBe('error');
    });

    it('should map warning severity correctly', () => {
      const warningError = { ...mockError, severity: 'warning' as const };
      const toast = ErrorMessageFormatter.formatForToast(warningError);

      expect(toast.type).toBe('warning');
    });

    it('should map info severity correctly', () => {
      const infoError = { ...mockError, severity: 'info' as const };
      const toast = ErrorMessageFormatter.formatForToast(infoError);

      expect(toast.type).toBe('info');
    });
  });

  describe('formatForFullPage', () => {
    it('should format error for full page display', () => {
      const fullPage = ErrorMessageFormatter.formatForFullPage(mockError);

      expect(fullPage.icon).toBe('⚠️');
      expect(fullPage.title).toBe('Test Error');
      expect(fullPage.message).toBe('This is a test error message');
      expect(fullPage.actions).toHaveLength(2);
      expect(fullPage.estimatedResolution).toBe('2 minutes');
    });
  });

  describe('formatForInline', () => {
    it('should format error for inline display', () => {
      const inline = ErrorMessageFormatter.formatForInline(mockError);

      expect(inline.message).toBe('⚠️ This is a test error message');
      expect(inline.actions).toHaveLength(1); // Only primary actions
      expect(inline.actions[0].label).toBe('Retry');
      expect(inline.severity).toBe('error');
    });
  });
});

describe('SupportContactIntegration', () => {
  const mockError: UserFriendlyError = {
    title: 'Test Error',
    message: 'This is a test error',
    actions: [],
    severity: 'error',
    icon: '⚠️',
    recoverable: true
  };

  const mockContext: ErrorContext = {
    documentId: 'doc-123',
    userId: 'user-456'
  };

  describe('generateSupportUrl', () => {
    it('should generate support URL with error context', () => {
      const url = SupportContactIntegration.generateSupportUrl(mockError, mockContext);

      expect(url).toContain('/support/contact');
      expect(url).toContain('subject=Document+Viewing+Issue%3A+Test+Error');
      expect(url).toContain('document_id=doc-123');
      expect(url).toContain('user_id=user-456');
      expect(url).toContain('category=document-viewing');
    });

    it('should handle missing context gracefully', () => {
      const url = SupportContactIntegration.generateSupportUrl(mockError);

      expect(url).toContain('/support/contact');
      expect(url).toContain('document_id=unknown');
      expect(url).toContain('user_id=unknown');
    });
  });

  describe('generateSupportEmail', () => {
    it('should generate support email with pre-filled content', () => {
      const email = SupportContactIntegration.generateSupportEmail(mockError, mockContext);

      expect(email).toMatch(/^mailto:support@jstudyroom\.com/);
      expect(email).toContain('subject=Document%20Viewing%20Issue%3A%20Test%20Error');
      expect(email).toContain('Error%3A%20Test%20Error');
      expect(email).toContain('Document%20ID%3A%20doc-123');
    });

    it('should handle missing context in email', () => {
      const email = SupportContactIntegration.generateSupportEmail(mockError);

      expect(email).toContain('Document%20ID%3A%20Not%20available');
      expect(email).toContain('Browser%3A%20Unknown');
    });
  });
});