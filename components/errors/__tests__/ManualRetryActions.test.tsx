/**
 * Unit Tests for ManualRetryActions Component
 * 
 * Tests the manual retry mechanisms for different error scenarios
 * 
 * Task 5.3: Add manual retry mechanisms - Testing
 * Requirements: 2.4, 3.2
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ManualRetryActions } from '../ManualRetryActions';
import { DocumentErrorType } from '@/lib/resilience/document-error-recovery';

import { vi } from 'vitest';

// Mock the Button component
vi.mock('@/components/ui/Button', () => ({
  Button: ({ children, onClick, disabled, variant, className }: any) => (
    <button
      onClick={onClick}
      disabled={disabled}
      data-variant={variant}
      className={className}
    >
      {children}
    </button>
  ),
}));

describe('ManualRetryActions', () => {
  const defaultProps = {
    errorType: DocumentErrorType.CONVERSION_FAILED,
    documentId: 'test-doc-123',
    retryCount: 0,
    maxRetries: 3,
    isConverting: false,
  };

  const mockCallbacks = {
    onRetryConversion: vi.fn(),
    onRefresh: vi.fn(),
    onReportProblem: vi.fn(),
    onDownload: vi.fn(),
    onClearCacheRetry: vi.fn(),
    onManualRecovery: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Conversion Failed Error', () => {
    it('should render retry options for conversion failures', () => {
      render(
        <ManualRetryActions
          {...defaultProps}
          errorType={DocumentErrorType.CONVERSION_FAILED}
          {...mockCallbacks}
        />
      );

      expect(screen.getByText('Conversion Failed:')).toBeInTheDocument();
      expect(screen.getByText('Retry Conversion')).toBeInTheDocument();
      expect(screen.getByText('Clear Cache & Retry')).toBeInTheDocument();
      expect(screen.getByText('Download Original')).toBeInTheDocument();
    });

    it('should call onRetryConversion when retry button is clicked', async () => {
      render(
        <ManualRetryActions
          {...defaultProps}
          errorType={DocumentErrorType.CONVERSION_FAILED}
          {...mockCallbacks}
        />
      );

      fireEvent.click(screen.getByText('Retry Conversion'));
      await waitFor(() => {
        expect(mockCallbacks.onRetryConversion).toHaveBeenCalledTimes(1);
      });
    });

    it('should show report problem button when max retries reached', () => {
      render(
        <ManualRetryActions
          {...defaultProps}
          errorType={DocumentErrorType.CONVERSION_FAILED}
          retryCount={3}
          maxRetries={3}
          {...mockCallbacks}
        />
      );

      expect(screen.getByText('Report Problem')).toBeInTheDocument();
      expect(screen.queryByText('Retry Conversion')).not.toBeInTheDocument();
    });

    it('should display retry count when retries have been attempted', () => {
      render(
        <ManualRetryActions
          {...defaultProps}
          errorType={DocumentErrorType.CONVERSION_FAILED}
          retryCount={2}
          maxRetries={3}
          {...mockCallbacks}
        />
      );

      expect(screen.getByText('Retry attempts: 2/3')).toBeInTheDocument();
    });
  });

  describe('Network Failure Error', () => {
    it('should render network-specific retry options', () => {
      render(
        <ManualRetryActions
          {...defaultProps}
          errorType={DocumentErrorType.NETWORK_FAILURE}
          {...mockCallbacks}
        />
      );

      expect(screen.getByText('Network Issue:')).toBeInTheDocument();
      expect(screen.getByText('Try Again')).toBeInTheDocument();
      expect(screen.getByText('Force Refresh')).toBeInTheDocument();
      expect(screen.getByText('Download Instead')).toBeInTheDocument();
      expect(screen.getByText('Report Connection Issue')).toBeInTheDocument();
    });

    it('should call onRefresh when try again button is clicked', async () => {
      render(
        <ManualRetryActions
          {...defaultProps}
          errorType={DocumentErrorType.NETWORK_FAILURE}
          {...mockCallbacks}
        />
      );

      fireEvent.click(screen.getByText('Try Again'));
      await waitFor(() => {
        expect(mockCallbacks.onRefresh).toHaveBeenCalledTimes(1);
      });
    });
  });

  describe('Storage URL Expired Error', () => {
    it('should render storage-specific retry options', () => {
      render(
        <ManualRetryActions
          {...defaultProps}
          errorType={DocumentErrorType.STORAGE_URL_EXPIRED}
          {...mockCallbacks}
        />
      );

      expect(screen.getByText('Link Expired:')).toBeInTheDocument();
      expect(screen.getByText('Refresh Link')).toBeInTheDocument();
      expect(screen.getByText('Manual Recovery')).toBeInTheDocument();
    });
  });

  describe('Pages Not Found Error', () => {
    it('should render processing options for missing pages', () => {
      render(
        <ManualRetryActions
          {...defaultProps}
          errorType={DocumentErrorType.PAGES_NOT_FOUND}
          {...mockCallbacks}
        />
      );

      expect(screen.getByText('Pages Missing:')).toBeInTheDocument();
      expect(screen.getByText('Process Document')).toBeInTheDocument();
      expect(screen.getByText('Download Original')).toBeInTheDocument();
      expect(screen.getByText('Report Issue')).toBeInTheDocument();
    });

    it('should disable process button when converting', () => {
      render(
        <ManualRetryActions
          {...defaultProps}
          errorType={DocumentErrorType.PAGES_NOT_FOUND}
          isConverting={true}
          {...mockCallbacks}
        />
      );

      const processButton = screen.getByText('Process Document');
      expect(processButton).toBeDisabled();
    });
  });

  describe('Timeout Error', () => {
    it('should render timeout-specific options', () => {
      render(
        <ManualRetryActions
          {...defaultProps}
          errorType={DocumentErrorType.TIMEOUT}
          {...mockCallbacks}
        />
      );

      expect(screen.getByText('Timeout:')).toBeInTheDocument();
      expect(screen.getByText('Keep Waiting')).toBeInTheDocument();
      expect(screen.getByText('Start Over')).toBeInTheDocument();
      expect(screen.getByText('Download Instead')).toBeInTheDocument();
    });
  });

  describe('Document Corrupted Error', () => {
    it('should render corruption-specific options', () => {
      render(
        <ManualRetryActions
          {...defaultProps}
          errorType={DocumentErrorType.DOCUMENT_CORRUPTED}
          {...mockCallbacks}
        />
      );

      expect(screen.getByText('Document Issue:')).toBeInTheDocument();
      expect(screen.getByText('Try Processing Again')).toBeInTheDocument();
      expect(screen.getByText('Report Corrupted File')).toBeInTheDocument();
    });
  });

  describe('Permission Denied Error', () => {
    it('should render permission-specific options', () => {
      render(
        <ManualRetryActions
          {...defaultProps}
          errorType={DocumentErrorType.PERMISSION_DENIED}
          {...mockCallbacks}
        />
      );

      expect(screen.getByText('Access Denied:')).toBeInTheDocument();
      expect(screen.getByText('Refresh Access')).toBeInTheDocument();
      expect(screen.getByText('Report Access Issue')).toBeInTheDocument();
    });
  });

  describe('Unknown Error', () => {
    it('should render generic retry options for unknown errors', () => {
      render(
        <ManualRetryActions
          {...defaultProps}
          errorType={DocumentErrorType.UNKNOWN}
          {...mockCallbacks}
        />
      );

      expect(screen.getByText('Unknown Issue:')).toBeInTheDocument();
      expect(screen.getByText('Try Again')).toBeInTheDocument();
      expect(screen.getByText('Manual Recovery')).toBeInTheDocument();
      expect(screen.getByText('Report Problem')).toBeInTheDocument();
    });
  });

  describe('Loading States', () => {
    it('should show loading state when action is in progress', async () => {
      const slowCallback = vi.fn(() => new Promise(resolve => setTimeout(resolve, 100)));
      
      render(
        <ManualRetryActions
          {...defaultProps}
          errorType={DocumentErrorType.CONVERSION_FAILED}
          onRetryConversion={slowCallback}
          {...mockCallbacks}
        />
      );

      fireEvent.click(screen.getByText('Retry Conversion'));
      
      // Should show loading state
      expect(screen.getByText('Working...')).toBeInTheDocument();
      
      // Wait for action to complete
      await waitFor(() => {
        expect(screen.queryByText('Working...')).not.toBeInTheDocument();
      });
    });

    it('should disable buttons during loading', async () => {
      const slowCallback = vi.fn(() => new Promise(resolve => setTimeout(resolve, 100)));
      
      render(
        <ManualRetryActions
          {...defaultProps}
          errorType={DocumentErrorType.CONVERSION_FAILED}
          onRetryConversion={slowCallback}
          {...mockCallbacks}
        />
      );

      fireEvent.click(screen.getByText('Retry Conversion'));
      
      // All buttons should be disabled during loading
      const buttons = screen.getAllByRole('button');
      buttons.forEach(button => {
        expect(button).toBeDisabled();
      });
    });
  });

  describe('Callback Handling', () => {
    it('should call onReportProblem when report problem button is clicked', async () => {
      render(
        <ManualRetryActions
          {...defaultProps}
          errorType={DocumentErrorType.NETWORK_FAILURE}
          {...mockCallbacks}
        />
      );

      fireEvent.click(screen.getByText('Report Connection Issue'));
      await waitFor(() => {
        expect(mockCallbacks.onReportProblem).toHaveBeenCalledTimes(1);
      });
    });

    it('should call onDownload when download button is clicked', async () => {
      render(
        <ManualRetryActions
          {...defaultProps}
          errorType={DocumentErrorType.CONVERSION_FAILED}
          {...mockCallbacks}
        />
      );

      fireEvent.click(screen.getByText('Download Original'));
      await waitFor(() => {
        expect(mockCallbacks.onDownload).toHaveBeenCalledTimes(1);
      });
    });

    it('should call onClearCacheRetry when clear cache button is clicked', async () => {
      render(
        <ManualRetryActions
          {...defaultProps}
          errorType={DocumentErrorType.CONVERSION_FAILED}
          {...mockCallbacks}
        />
      );

      fireEvent.click(screen.getByText('Clear Cache & Retry'));
      await waitFor(() => {
        expect(mockCallbacks.onClearCacheRetry).toHaveBeenCalledTimes(1);
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle callback errors gracefully', async () => {
      const errorCallback = vi.fn(() => Promise.reject(new Error('Test error')));
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      render(
        <ManualRetryActions
          {...defaultProps}
          errorType={DocumentErrorType.CONVERSION_FAILED}
          onRetryConversion={errorCallback}
          {...mockCallbacks}
        />
      );

      fireEvent.click(screen.getByText('Retry Conversion'));
      
      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalledWith('Action Retry Conversion failed:', expect.any(Error));
      });

      consoleSpy.mockRestore();
    });
  });

  describe('Accessibility', () => {
    it('should have proper button roles and labels', () => {
      render(
        <ManualRetryActions
          {...defaultProps}
          errorType={DocumentErrorType.CONVERSION_FAILED}
          {...mockCallbacks}
        />
      );

      const buttons = screen.getAllByRole('button');
      expect(buttons.length).toBeGreaterThan(0);
      
      buttons.forEach(button => {
        expect(button).toHaveTextContent(/\S/); // Should have non-empty text content
      });
    });

    it('should show help text for user guidance', () => {
      render(
        <ManualRetryActions
          {...defaultProps}
          errorType={DocumentErrorType.CONVERSION_FAILED}
          {...mockCallbacks}
        />
      );

      expect(screen.getByText(/💡.*Tip:/)).toBeInTheDocument();
    });
  });
});