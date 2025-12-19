/**
 * Unit Tests for ProblemReportModal Component
 * 
 * Tests the problem reporting functionality for persistent failures
 * 
 * Task 5.3: Add manual retry mechanisms - Problem reporting testing
 * Requirements: 2.4, 3.2
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ProblemReportModal } from '../ProblemReportModal';
import { DocumentErrorType } from '@/lib/resilience/document-error-recovery';

import { vi } from 'vitest';

// Mock the Modal and Button components
vi.mock('@/components/ui/Modal', () => ({
  Modal: ({ children, isOpen, onClose, title }: any) => 
    isOpen ? (
      <div data-testid="modal">
        <h2>{title}</h2>
        <button onClick={onClose} data-testid="modal-close">Close</button>
        {children}
      </div>
    ) : null,
}));

vi.mock('@/components/ui/Button', () => ({
  Button: ({ children, onClick, disabled, variant, type }: any) => (
    <button
      onClick={onClick}
      disabled={disabled}
      data-variant={variant}
      type={type}
    >
      {children}
    </button>
  ),
}));

// Mock fetch
global.fetch = vi.fn();

describe('ProblemReportModal', () => {
  const defaultProps = {
    isOpen: true,
    onClose: jest.fn(),
    errorType: DocumentErrorType.CONVERSION_FAILED,
    documentId: 'test-doc-123',
    documentTitle: 'Test Document',
    errorContext: {
      documentId: 'test-doc-123',
      documentTitle: 'Test Document',
      userId: 'user-123',
      retryCount: 2,
      maxRetries: 3,
      browserInfo: {
        name: 'Chrome',
        version: '91.0',
        mobile: false
      }
    },
    errorMessage: 'Conversion failed after multiple attempts'
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (fetch as any).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ success: true, reportId: 'report-123' })
    });
  });

  describe('Modal Rendering', () => {
    it('should render when isOpen is true', () => {
      render(<ProblemReportModal {...defaultProps} />);
      
      expect(screen.getByTestId('modal')).toBeInTheDocument();
      expect(screen.getByText('Report Problem')).toBeInTheDocument();
    });

    it('should not render when isOpen is false', () => {
      render(<ProblemReportModal {...defaultProps} isOpen={false} />);
      
      expect(screen.queryByTestId('modal')).not.toBeInTheDocument();
    });

    it('should call onClose when close button is clicked', () => {
      const onClose = vi.fn();
      render(<ProblemReportModal {...defaultProps} onClose={onClose} />);
      
      fireEvent.click(screen.getByTestId('modal-close'));
      expect(onClose).toHaveBeenCalledTimes(1);
    });
  });

  describe('Form Fields', () => {
    it('should render all required form fields', () => {
      render(<ProblemReportModal {...defaultProps} />);
      
      expect(screen.getByLabelText('Problem Category')).toBeInTheDocument();
      expect(screen.getByLabelText('Describe the Problem')).toBeInTheDocument();
      expect(screen.getByLabelText('Steps to Reproduce (Optional)')).toBeInTheDocument();
      expect(screen.getByLabelText('Urgency Level')).toBeInTheDocument();
      expect(screen.getByLabelText('How should we contact you?')).toBeInTheDocument();
    });

    it('should pre-select category based on error type', () => {
      render(<ProblemReportModal {...defaultProps} errorType={DocumentErrorType.CONVERSION_FAILED} />);
      
      const categorySelect = screen.getByLabelText('Problem Category') as HTMLSelectElement;
      expect(categorySelect.value).toBe('document-conversion');
    });

    it('should show contact info field when contact method is selected', () => {
      render(<ProblemReportModal {...defaultProps} />);
      
      const contactSelect = screen.getByLabelText('How should we contact you?') as HTMLSelectElement;
      fireEvent.change(contactSelect, { target: { value: 'email' } });
      
      expect(screen.getByLabelText('Email Address')).toBeInTheDocument();
    });

    it('should hide contact info field when "no contact" is selected', () => {
      render(<ProblemReportModal {...defaultProps} />);
      
      const contactSelect = screen.getByLabelText('How should we contact you?') as HTMLSelectElement;
      fireEvent.change(contactSelect, { target: { value: 'none' } });
      
      expect(screen.queryByLabelText('Email Address')).not.toBeInTheDocument();
      expect(screen.queryByLabelText('Phone Number')).not.toBeInTheDocument();
    });
  });

  describe('Technical Details', () => {
    it('should display technical details section', () => {
      render(<ProblemReportModal {...defaultProps} />);
      
      expect(screen.getByText('Technical Details (Automatically Included)')).toBeInTheDocument();
      expect(screen.getByText('Test Document')).toBeInTheDocument();
      expect(screen.getByText('test-doc-123')).toBeInTheDocument();
      expect(screen.getByText('CONVERSION_FAILED')).toBeInTheDocument();
      expect(screen.getByText('Chrome 91.0')).toBeInTheDocument();
    });

    it('should handle missing technical details gracefully', () => {
      render(
        <ProblemReportModal
          {...defaultProps}
          documentTitle={undefined}
          errorContext={undefined}
          errorMessage={undefined}
        />
      );
      
      expect(screen.getByText('Unknown')).toBeInTheDocument();
    });
  });

  describe('Form Submission', () => {
    it('should submit form with correct data', async () => {
      render(<ProblemReportModal {...defaultProps} />);
      
      // Fill out form
      const descriptionField = screen.getByLabelText('Describe the Problem');
      fireEvent.change(descriptionField, { target: { value: 'Document won\'t load' } });
      
      const stepsField = screen.getByLabelText('Steps to Reproduce (Optional)');
      fireEvent.change(stepsField, { target: { value: '1. Click view\n2. Wait\n3. Error appears' } });
      
      // Submit form
      fireEvent.click(screen.getByText('Submit Report'));
      
      await waitFor(() => {
        expect(fetch).toHaveBeenCalledWith('/api/support/problem-report', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: expect.stringContaining('Document won\'t load')
        });
      });
    });

    it('should show loading state during submission', async () => {
      (fetch as any).mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)));
      
      render(<ProblemReportModal {...defaultProps} />);
      
      const descriptionField = screen.getByLabelText('Describe the Problem');
      fireEvent.change(descriptionField, { target: { value: 'Test description' } });
      
      fireEvent.click(screen.getByText('Submit Report'));
      
      expect(screen.getByText('Submitting...')).toBeInTheDocument();
      expect(screen.getByText('Submit Report')).toBeDisabled();
    });

    it('should show success message after successful submission', async () => {
      render(<ProblemReportModal {...defaultProps} />);
      
      const descriptionField = screen.getByLabelText('Describe the Problem');
      fireEvent.change(descriptionField, { target: { value: 'Test description' } });
      
      fireEvent.click(screen.getByText('Submit Report'));
      
      await waitFor(() => {
        expect(screen.getByText('Thank You!')).toBeInTheDocument();
        expect(screen.getByText(/Your problem report has been submitted successfully/)).toBeInTheDocument();
      });
    });

    it('should handle submission errors gracefully', async () => {
      (fetch as any).mockRejectedValue(new Error('Network error'));
      const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});
      
      render(<ProblemReportModal {...defaultProps} />);
      
      const descriptionField = screen.getByLabelText('Describe the Problem');
      fireEvent.change(descriptionField, { target: { value: 'Test description' } });
      
      fireEvent.click(screen.getByText('Submit Report'));
      
      await waitFor(() => {
        expect(alertSpy).toHaveBeenCalledWith(
          'Failed to submit report. Please try again or contact support directly.'
        );
      });
      
      alertSpy.mockRestore();
    });

    it('should require description field', () => {
      render(<ProblemReportModal {...defaultProps} />);
      
      const descriptionField = screen.getByLabelText('Describe the Problem');
      expect(descriptionField).toHaveAttribute('required');
    });
  });

  describe('Category Selection', () => {
    const errorTypeToCategory = [
      [DocumentErrorType.CONVERSION_FAILED, 'document-conversion'],
      [DocumentErrorType.NETWORK_FAILURE, 'connection-issue'],
      [DocumentErrorType.STORAGE_URL_EXPIRED, 'access-issue'],
      [DocumentErrorType.PAGES_NOT_FOUND, 'missing-content'],
      [DocumentErrorType.TIMEOUT, 'performance-issue'],
      [DocumentErrorType.DOCUMENT_CORRUPTED, 'file-corruption'],
      [DocumentErrorType.PERMISSION_DENIED, 'access-denied'],
      [DocumentErrorType.UNKNOWN, 'other'],
    ];

    it.each(errorTypeToCategory)(
      'should pre-select correct category for %s error type',
      (errorType, expectedCategory) => {
        render(<ProblemReportModal {...defaultProps} errorType={errorType} />);
        
        const categorySelect = screen.getByLabelText('Problem Category') as HTMLSelectElement;
        expect(categorySelect.value).toBe(expectedCategory);
      }
    );
  });

  describe('Contact Method Handling', () => {
    it('should show email field when email contact is selected', () => {
      render(<ProblemReportModal {...defaultProps} />);
      
      const contactSelect = screen.getByLabelText('How should we contact you?');
      fireEvent.change(contactSelect, { target: { value: 'email' } });
      
      expect(screen.getByLabelText('Email Address')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('your@email.com')).toBeInTheDocument();
    });

    it('should show phone field when phone contact is selected', () => {
      render(<ProblemReportModal {...defaultProps} />);
      
      const contactSelect = screen.getByLabelText('How should we contact you?');
      fireEvent.change(contactSelect, { target: { value: 'phone' } });
      
      expect(screen.getByLabelText('Phone Number')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('+1 (555) 123-4567')).toBeInTheDocument();
    });
  });

  describe('Form Validation', () => {
    it('should validate email format when email contact is selected', () => {
      render(<ProblemReportModal {...defaultProps} />);
      
      const contactSelect = screen.getByLabelText('How should we contact you?');
      fireEvent.change(contactSelect, { target: { value: 'email' } });
      
      const emailField = screen.getByLabelText('Email Address');
      expect(emailField).toHaveAttribute('type', 'email');
    });

    it('should validate phone format when phone contact is selected', () => {
      render(<ProblemReportModal {...defaultProps} />);
      
      const contactSelect = screen.getByLabelText('How should we contact you?');
      fireEvent.change(contactSelect, { target: { value: 'phone' } });
      
      const phoneField = screen.getByLabelText('Phone Number');
      expect(phoneField).toHaveAttribute('type', 'tel');
    });
  });

  describe('Accessibility', () => {
    it('should have proper form labels', () => {
      render(<ProblemReportModal {...defaultProps} />);
      
      const labels = [
        'Problem Category',
        'Describe the Problem',
        'Steps to Reproduce (Optional)',
        'Urgency Level',
        'How should we contact you?'
      ];
      
      labels.forEach(label => {
        expect(screen.getByLabelText(label)).toBeInTheDocument();
      });
    });

    it('should have proper button roles', () => {
      render(<ProblemReportModal {...defaultProps} />);
      
      const submitButton = screen.getByText('Submit Report');
      const cancelButton = screen.getByText('Cancel');
      
      expect(submitButton).toHaveAttribute('type', 'submit');
      expect(cancelButton).toHaveAttribute('type', 'button');
    });
  });
});