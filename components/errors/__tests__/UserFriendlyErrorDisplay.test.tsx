/**
 * Unit tests for UserFriendlyErrorDisplay component
 * 
 * Tests the rendering and interaction of user-friendly error messages
 * in different display modes.
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { UserFriendlyErrorDisplay, useUserFriendlyError } from '../UserFriendlyErrorDisplay';
import { DocumentErrorType } from '@/lib/resilience/document-error-recovery';

// Mock localStorage
const mockLocalStorage = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};

Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage,
});

// Mock window.open
const mockWindowOpen = jest.fn();
Object.defineProperty(window, 'open', {
  value: mockWindowOpen,
});

// Mock Link component
jest.mock('next/link', () => {
  return function MockLink({ children, href }: { children: React.ReactNode; href: string }) {
    return <a href={href}>{children}</a>;
  };
});

describe('UserFriendlyErrorDisplay', () => {
  const mockContext = {
    documentId: 'test-doc-123',
    documentTitle: 'Test Document.pdf',
    userId: 'user-456',
    retryCount: 1,
    maxRetries: 3,
    networkStatus: 'online' as const,
    browserInfo: {
      name: 'Chrome',
      version: '120',
      mobile: false
    }
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockLocalStorage.getItem.mockReturnValue('1');
  });

  describe('Full Page Mode', () => {
    it('should render network failure error in full page mode', () => {
      render(
        <UserFriendlyErrorDisplay
          errorType={DocumentErrorType.NETWORK_FAILURE}
          context={mockContext}
          mode="fullPage"
        />
      );

      expect(screen.getByText('Connection Problem')).toBeInTheDocument();
      expect(screen.getByText(/trouble connecting to our servers/)).toBeInTheDocument();
      expect(screen.getByText('🌐')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Try Again' })).toBeInTheDocument();
    });

    it('should render conversion failed error with retry count', () => {
      render(
        <UserFriendlyErrorDisplay
          errorType={DocumentErrorType.CONVERSION_FAILED}
          context={mockContext}
          mode="fullPage"
        />
      );

      expect(screen.getByText('Processing Error')).toBeInTheDocument();
      expect(screen.getByText(/attempt 2 of 3/)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Try Again' })).toBeInTheDocument();
    });

    it('should show estimated resolution when available', () => {
      render(
        <UserFriendlyErrorDisplay
          errorType={DocumentErrorType.STORAGE_URL_EXPIRED}
          context={mockContext}
          mode="fullPage"
        />
      );

      expect(screen.getByText(/Estimated resolution:/)).toBeInTheDocument();
      expect(screen.getByText('Immediate')).toBeInTheDocument();
    });

    it('should show contextual help for frequent errors', () => {
      mockLocalStorage.getItem.mockReturnValue('5'); // Frequent error

      render(
        <UserFriendlyErrorDisplay
          errorType={DocumentErrorType.NETWORK_FAILURE}
          context={mockContext}
          mode="fullPage"
        />
      );

      expect(screen.getByText(/💡 Tip:/)).toBeInTheDocument();
      expect(screen.getByText(/switching to a different network/)).toBeInTheDocument();
    });
  });

  describe('Inline Mode', () => {
    it('should render error in inline mode', () => {
      render(
        <UserFriendlyErrorDisplay
          errorType={DocumentErrorType.TIMEOUT}
          context={mockContext}
          mode="inline"
        />
      );

      expect(screen.getByText(/⏰.*taking longer to load/)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Keep Waiting' })).toBeInTheDocument();
    });

    it('should only show primary actions in inline mode', () => {
      render(
        <UserFriendlyErrorDisplay
          errorType={DocumentErrorType.CONVERSION_FAILED}
          context={mockContext}
          mode="inline"
        />
      );

      expect(screen.getByRole('button', { name: 'Try Again' })).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'Download Original' })).not.toBeInTheDocument();
    });
  });

  describe('Toast Mode', () => {
    it('should render error in toast mode', () => {
      render(
        <UserFriendlyErrorDisplay
          errorType={DocumentErrorType.PERMISSION_DENIED}
          context={mockContext}
          mode="toast"
        />
      );

      expect(screen.getByText('Access Not Allowed')).toBeInTheDocument();
      expect(screen.getByText(/don't have permission/)).toBeInTheDocument();
      expect(screen.getByText('🔒')).toBeInTheDocument();
    });

    it('should limit actions in toast mode', () => {
      render(
        <UserFriendlyErrorDisplay
          errorType={DocumentErrorType.CONVERSION_FAILED}
          context={mockContext}
          mode="toast"
        />
      );

      const buttons = screen.getAllByRole('button');
      expect(buttons).toHaveLength(2); // Limited to first 2 actions
    });
  });

  describe('Action Handling', () => {
    it('should call onRetry when retry action is clicked', async () => {
      const mockOnRetry = jest.fn();

      render(
        <UserFriendlyErrorDisplay
          errorType={DocumentErrorType.NETWORK_FAILURE}
          context={mockContext}
          onRetry={mockOnRetry}
          mode="fullPage"
        />
      );

      fireEvent.click(screen.getByRole('button', { name: 'Try Again' }));

      await waitFor(() => {
        expect(mockOnRetry).toHaveBeenCalledTimes(1);
      });
    });

    it('should call onRefresh when refresh action is clicked', async () => {
      const mockOnRefresh = jest.fn();

      render(
        <UserFriendlyErrorDisplay
          errorType={DocumentErrorType.NETWORK_FAILURE}
          context={mockContext}
          onRefresh={mockOnRefresh}
          mode="fullPage"
        />
      );

      fireEvent.click(screen.getByRole('button', { name: 'Refresh Page' }));

      await waitFor(() => {
        expect(mockOnRefresh).toHaveBeenCalledTimes(1);
      });
    });

    it('should call onDownload when download action is clicked', async () => {
      const mockOnDownload = jest.fn();

      render(
        <UserFriendlyErrorDisplay
          errorType={DocumentErrorType.PAGES_NOT_FOUND}
          context={mockContext}
          onDownload={mockOnDownload}
          mode="fullPage"
        />
      );

      fireEvent.click(screen.getByRole('button', { name: 'Download Original' }));

      await waitFor(() => {
        expect(mockOnDownload).toHaveBeenCalledTimes(1);
      });
    });

    it('should call onConvert when convert action is clicked', async () => {
      const mockOnConvert = jest.fn();

      render(
        <UserFriendlyErrorDisplay
          errorType={DocumentErrorType.PAGES_NOT_FOUND}
          context={mockContext}
          onConvert={mockOnConvert}
          mode="fullPage"
        />
      );

      fireEvent.click(screen.getByRole('button', { name: 'Process Document' }));

      await waitFor(() => {
        expect(mockOnConvert).toHaveBeenCalledTimes(1);
      });
    });

    it('should open external links when external action is clicked', () => {
      render(
        <UserFriendlyErrorDisplay
          errorType={DocumentErrorType.NETWORK_FAILURE}
          context={mockContext}
          mode="fullPage"
        />
      );

      fireEvent.click(screen.getByRole('button', { name: 'Check Status' }));

      expect(mockWindowOpen).toHaveBeenCalledWith('https://status.jstudyroom.com', '_blank');
    });

    it('should show loading state during action execution', async () => {
      const mockOnRetry = jest.fn(() => new Promise(resolve => setTimeout(resolve, 100)));

      render(
        <UserFriendlyErrorDisplay
          errorType={DocumentErrorType.NETWORK_FAILURE}
          context={mockContext}
          onRetry={mockOnRetry}
          mode="fullPage"
        />
      );

      fireEvent.click(screen.getByRole('button', { name: 'Try Again' }));

      expect(screen.getByText('Loading...')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Loading/ })).toBeDisabled();

      await waitFor(() => {
        expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
      });
    });
  });

  describe('Browser-Specific Messages', () => {
    it('should show IE not supported message', () => {
      const ieContext = {
        ...mockContext,
        browserInfo: { name: 'Internet Explorer', version: '11', mobile: false }
      };

      render(
        <UserFriendlyErrorDisplay
          errorType={DocumentErrorType.NETWORK_FAILURE}
          context={ieContext}
          mode="fullPage"
        />
      );

      expect(screen.getByText('Browser Not Supported')).toBeInTheDocument();
      expect(screen.getByText(/Internet Explorer is not supported/)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Download Chrome' })).toBeInTheDocument();
    });

    it('should show Safari mobile warning', () => {
      const safariContext = {
        ...mockContext,
        browserInfo: { name: 'Safari', version: '13', mobile: true }
      };

      render(
        <UserFriendlyErrorDisplay
          errorType={DocumentErrorType.NETWORK_FAILURE}
          context={safariContext}
          mode="fullPage"
        />
      );

      expect(screen.getByText('Safari Version Too Old')).toBeInTheDocument();
      expect(screen.getByText(/Safari version may not support/)).toBeInTheDocument();
    });
  });

  describe('Support Integration', () => {
    it('should generate support URL when contact support is clicked', () => {
      render(
        <UserFriendlyErrorDisplay
          errorType={DocumentErrorType.CONVERSION_FAILED}
          context={{ ...mockContext, retryCount: 3 }} // Max retries reached
          mode="fullPage"
        />
      );

      fireEvent.click(screen.getByRole('button', { name: 'Contact Support' }));

      expect(mockWindowOpen).toHaveBeenCalledWith(
        expect.stringContaining('/support/contact'),
        '_blank'
      );
    });

    it('should show email support link', () => {
      render(
        <UserFriendlyErrorDisplay
          errorType={DocumentErrorType.NETWORK_FAILURE}
          context={mockContext}
          mode="fullPage"
        />
      );

      expect(screen.getByText('Email Support')).toBeInTheDocument();
      expect(screen.getByText('View Help Guide')).toBeInTheDocument();
    });
  });

  describe('Error Frequency Tracking', () => {
    it('should track error frequency in localStorage', () => {
      render(
        <UserFriendlyErrorDisplay
          errorType={DocumentErrorType.NETWORK_FAILURE}
          context={mockContext}
          mode="fullPage"
        />
      );

      expect(mockLocalStorage.getItem).toHaveBeenCalledWith(
        'error_network_failure_test-doc-123'
      );
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
        'error_network_failure_test-doc-123',
        '2'
      );
    });
  });
});

describe('useUserFriendlyError hook', () => {
  function TestComponent() {
    const { currentError, showError, clearError } = useUserFriendlyError();

    return (
      <div>
        <div data-testid="current-error">
          {currentError ? currentError.type : 'none'}
        </div>
        <button
          onClick={() => showError(
            DocumentErrorType.NETWORK_FAILURE,
            new Error('Test error'),
            { documentId: 'test' }
          )}
        >
          Show Error
        </button>
        <button onClick={clearError}>Clear Error</button>
      </div>
    );
  }

  it('should manage error state correctly', () => {
    render(<TestComponent />);

    expect(screen.getByTestId('current-error')).toHaveTextContent('none');

    fireEvent.click(screen.getByRole('button', { name: 'Show Error' }));
    expect(screen.getByTestId('current-error')).toHaveTextContent('network_failure');

    fireEvent.click(screen.getByRole('button', { name: 'Clear Error' }));
    expect(screen.getByTestId('current-error')).toHaveTextContent('none');
  });
});