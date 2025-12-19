/**
 * Reliability Error Display Component Tests
 * 
 * Tests for PDF reliability error display with diagnostic information
 * 
 * Requirements: 1.4, 7.1, 7.2, 8.2
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { vi } from 'vitest';
import { ReliabilityErrorDisplay, CompactReliabilityErrorDisplay } from '../ReliabilityErrorDisplay';
import type { RenderError } from '../../../lib/pdf-reliability/types';
import { ErrorType, RenderingMethod, RenderingStage } from '../../../lib/pdf-reliability/types';
const EType = ErrorType;
const Method = RenderingMethod;
const Stage = RenderingStage;
import { it } from 'zod/v4/locales';
import { it } from 'zod/v4/locales';
import { it } from 'zod/v4/locales';
import { it } from 'zod/v4/locales';
import { it } from 'zod/v4/locales';
import { describe } from 'node:test';
import { it } from 'zod/v4/locales';
import { describe } from 'node:test';
import { it } from 'zod/v4/locales';
import { it } from 'zod/v4/locales';
import { it } from 'zod/v4/locales';
import { it } from 'zod/v4/locales';
import { describe } from 'node:test';
import { it } from 'zod/v4/locales';
import { it } from 'zod/v4/locales';
import { it } from 'zod/v4/locales';
import { it } from 'zod/v4/locales';
import { it } from 'zod/v4/locales';
import { it } from 'zod/v4/locales';
import { describe } from 'node:test';
import { it } from 'zod/v4/locales';
import { it } from 'zod/v4/locales';
import { it } from 'zod/v4/locales';
import { describe } from 'node:test';
import { describe } from 'node:test';

// Mock the Button and Modal components
vi.mock('../../ui/Button', () => ({
  Button: ({ children, onClick, isLoading, disabled, ...props }: any) => (
    <button onClick={onClick} disabled={disabled || isLoading} {...props}>
      {isLoading ? 'Loading...' : children}
    </button>
  ),
}));

vi.mock('../../ui/Modal', () => ({
  Modal: ({ isOpen, onClose, title, children }: any) => 
    isOpen ? (
      <div data-testid="modal">
        <div>{title}</div>
        <button onClick={onClose}>Close Modal</button>
        {children}
      </div>
    ) : null,
}));

describe('ReliabilityErrorDisplay', () => {
  const mockNetworkError: RenderError = {
    type: EType.NETWORK_ERROR,
    message: 'Failed to fetch PDF',
    stage: Stage.FETCHING,
    method: Method.PDFJS_CANVAS,
    timestamp: new Date('2023-01-01T12:00:00Z'),
    context: { url: 'https://example.com/test.pdf', status: 404 },
    recoverable: true,
  };

  const mockAuthError: RenderError = {
    type: EType.AUTHENTICATION_ERROR,
    message: 'Password required',
    stage: Stage.PARSING,
    method: Method.PDFJS_CANVAS,
    timestamp: new Date('2023-01-01T12:00:00Z'),
    context: { passwordRequired: true },
    recoverable: true,
  };

  const mockCorruptionError: RenderError = {
    type: EType.CORRUPTION_ERROR,
    message: 'PDF is corrupted',
    stage: Stage.PARSING,
    method: Method.PDFJS_CANVAS,
    timestamp: new Date('2023-01-01T12:00:00Z'),
    context: { corrupted: true },
    recoverable: false,
  };

  describe('Error Display', () => {
    it('should display error title and message', () => {
      render(<ReliabilityErrorDisplay error={mockNetworkError} />);
      
      expect(screen.getByText('Connection Problem')).toBeInTheDocument();
      expect(screen.getByText(/Unable to download the PDF/)).toBeInTheDocument();
    });

    it('should show appropriate icon for error type', () => {
      render(<ReliabilityErrorDisplay error={mockNetworkError} />);
      
      // Should have SVG icon (check for svg element directly)
      const container = screen.getByText('Connection Problem').closest('div');
      const svgElement = container?.querySelector('svg');
      expect(svgElement).toBeInTheDocument();
    });

    it('should display error code information', () => {
      render(<ReliabilityErrorDisplay error={mockNetworkError} />);
      
      expect(screen.getByText(/Error: network-error/)).toBeInTheDocument();
      expect(screen.getByText(/Stage: fetching/)).toBeInTheDocument();
      expect(screen.getByText(/Method: pdfjs-canvas/)).toBeInTheDocument();
    });
  });

  describe('Action Buttons', () => {
    it('should show retry button for recoverable errors', () => {
      const onRetry = vi.fn();
      render(<ReliabilityErrorDisplay error={mockNetworkError} onRetry={onRetry} />);
      
      const retryButton = screen.getByText('Try Again');
      expect(retryButton).toBeInTheDocument();
    });

    it('should call onRetry when retry button clicked', () => {
      const onRetry = vi.fn();
      render(<ReliabilityErrorDisplay error={mockNetworkError} onRetry={onRetry} />);
      
      const retryButton = screen.getByText('Try Again');
      fireEvent.click(retryButton);
      
      expect(onRetry).toHaveBeenCalledTimes(1);
    });

    it('should show download button when callback provided', () => {
      const onDownload = vi.fn();
      render(<ReliabilityErrorDisplay error={mockNetworkError} onDownload={onDownload} />);
      
      expect(screen.getByText('Download PDF')).toBeInTheDocument();
    });

    it('should not show download button for auth errors', () => {
      const onDownload = vi.fn();
      render(<ReliabilityErrorDisplay error={mockAuthError} onDownload={onDownload} />);
      
      expect(screen.queryByText('Download PDF')).not.toBeInTheDocument();
    });

    it('should show dismiss button when callback provided', () => {
      const onDismiss = vi.fn();
      render(<ReliabilityErrorDisplay error={mockNetworkError} onDismiss={onDismiss} />);
      
      expect(screen.getByText('Close')).toBeInTheDocument();
    });

    it('should disable retry button when retrying', () => {
      const onRetry = vi.fn();
      render(
        <ReliabilityErrorDisplay 
          error={mockNetworkError} 
          onRetry={onRetry} 
          isRetrying={true} 
        />
      );
      
      const retryButton = screen.getByText('Loading...');
      expect(retryButton).toBeDisabled();
    });
  });

  describe('Diagnostics Modal', () => {
    it('should show diagnostics button when showDiagnostics is true', () => {
      render(<ReliabilityErrorDisplay error={mockNetworkError} showDiagnostics={true} />);
      
      expect(screen.getByText('View Details')).toBeInTheDocument();
    });

    it('should open diagnostics modal when button clicked', () => {
      render(<ReliabilityErrorDisplay error={mockNetworkError} showDiagnostics={true} />);
      
      const detailsButton = screen.getByText('View Details');
      fireEvent.click(detailsButton);
      
      expect(screen.getByTestId('modal')).toBeInTheDocument();
      expect(screen.getByText('Error Diagnostics')).toBeInTheDocument();
    });

    it('should display error details in modal', () => {
      render(<ReliabilityErrorDisplay error={mockNetworkError} showDiagnostics={true} />);
      
      const detailsButton = screen.getByText('View Details');
      fireEvent.click(detailsButton);
      
      expect(screen.getByText('Error Details')).toBeInTheDocument();
      expect(screen.getByText('network-error')).toBeInTheDocument();
      expect(screen.getByText('fetching')).toBeInTheDocument();
    });

    it('should close modal when close button clicked', () => {
      render(<ReliabilityErrorDisplay error={mockNetworkError} showDiagnostics={true} />);
      
      const detailsButton = screen.getByText('View Details');
      fireEvent.click(detailsButton);
      
      const closeButton = screen.getByText('Close Modal');
      fireEvent.click(closeButton);
      
      expect(screen.queryByTestId('modal')).not.toBeInTheDocument();
    });
  });

  describe('Non-recoverable Errors', () => {
    it('should not show retry button for non-recoverable errors', () => {
      const onRetry = vi.fn();
      render(<ReliabilityErrorDisplay error={mockCorruptionError} onRetry={onRetry} />);
      
      expect(screen.queryByText('Try Again')).not.toBeInTheDocument();
    });
  });
});

describe('CompactReliabilityErrorDisplay', () => {
  const mockError: RenderError = {
    type: EType.NETWORK_ERROR,
    message: 'Network error occurred',
    stage: Stage.FETCHING,
    method: Method.PDFJS_CANVAS,
    timestamp: new Date(),
    context: {},
    recoverable: true,
  };

  it('should render compact error display', () => {
    render(<CompactReliabilityErrorDisplay error={mockError} />);
    
    expect(screen.getByText('Connection Problem')).toBeInTheDocument();
    expect(screen.getByText(/Unable to download the PDF/)).toBeInTheDocument();
  });

  it('should show retry button in compact mode', () => {
    const onRetry = vi.fn();
    render(<CompactReliabilityErrorDisplay error={mockError} onRetry={onRetry} />);
    
    const retryButton = screen.getByText('Try Again');
    expect(retryButton).toBeInTheDocument();
  });

  it('should call onRetry when retry button clicked in compact mode', () => {
    const onRetry = vi.fn();
    render(<CompactReliabilityErrorDisplay error={mockError} onRetry={onRetry} />);
    
    const retryButton = screen.getByText('Try Again');
    fireEvent.click(retryButton);
    
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('should show dismiss button in compact mode', () => {
    const onDismiss = vi.fn();
    render(<CompactReliabilityErrorDisplay error={mockError} onDismiss={onDismiss} />);
    
    expect(screen.getByText('Dismiss')).toBeInTheDocument();
  });

  it('should handle retrying state in compact mode', () => {
    const onRetry = vi.fn();
    render(
      <CompactReliabilityErrorDisplay 
        error={mockError} 
        onRetry={onRetry} 
        isRetrying={true} 
      />
    );
    
    const retryButton = screen.getByText('Loading...');
    expect(retryButton).toBeDisabled();
  });
});