/**
 * Manual Conversion Trigger Component Tests
 * 
 * Tests for the ManualConversionTrigger component including UI interactions,
 * API calls, and various conversion scenarios.
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ManualConversionTrigger } from '../ManualConversionTrigger';

// Mock fetch
global.fetch = jest.fn();
const mockFetch = fetch as jest.MockedFunction<typeof fetch>;

describe('ManualConversionTrigger', () => {
  const mockDocumentId = 'doc-123';
  const mockOnConversionStarted = jest.fn();
  const mockOnClose = jest.fn();

  const mockConversionOptions = {
    documentId: 'doc-123',
    documentTitle: 'Test Document.pdf',
    contentType: 'application/pdf',
    convertible: true,
    existingPages: 0,
    hasPages: false,
    queue: {
      depth: 2,
      activeJobs: 1,
      averageProcessingTime: 45000,
      estimatedWaitTime: 30000,
    },
    options: {
      availablePriorities: ['high', 'normal', 'low'],
      canForceReconvert: false,
      recommendedPriority: 'high',
    },
  };

  const mockConversionResult = {
    success: true,
    data: {
      documentId: 'doc-123',
      documentTitle: 'Test Document.pdf',
      conversionId: 'job-456',
      priority: 'high',
      force: false,
      queue: {
        position: 1,
        estimatedWaitTime: 30000,
        estimatedWaitTimeFormatted: '30 seconds',
      },
      status: {
        stage: 'queued',
        progress: 0,
        message: 'Conversion queued successfully',
      },
    },
    message: 'Document conversion queued with high priority',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockFetch.mockClear();
  });

  it('should render trigger button', () => {
    render(
      <ManualConversionTrigger
        documentId={mockDocumentId}
        onConversionStarted={mockOnConversionStarted}
        onClose={mockOnClose}
      />
    );

    expect(screen.getByText('Manual Convert')).toBeInTheDocument();
  });

  it('should open modal and load conversion options when button is clicked', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true, data: mockConversionOptions }),
    } as Response);

    render(
      <ManualConversionTrigger
        documentId={mockDocumentId}
        onConversionStarted={mockOnConversionStarted}
        onClose={mockOnClose}
      />
    );

    fireEvent.click(screen.getByText('Manual Convert'));

    expect(screen.getByText('Manual Document Conversion')).toBeInTheDocument();
    expect(screen.getByText('Loading conversion options...')).toBeInTheDocument();

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith('/api/documents/doc-123/convert');
    });

    await waitFor(() => {
      expect(screen.getByText('Test Document.pdf')).toBeInTheDocument();
      expect(screen.getByText('application/pdf')).toBeInTheDocument();
      expect(screen.getByText('Yes')).toBeInTheDocument(); // Convertible
    });
  });

  it('should display document information correctly', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true, data: mockConversionOptions }),
    } as Response);

    render(
      <ManualConversionTrigger
        documentId={mockDocumentId}
        onConversionStarted={mockOnConversionStarted}
        onClose={mockOnClose}
      />
    );

    fireEvent.click(screen.getByText('Manual Convert'));

    await waitFor(() => {
      expect(screen.getByText('Test Document.pdf')).toBeInTheDocument();
      expect(screen.getByText('application/pdf')).toBeInTheDocument();
      expect(screen.getByText('0')).toBeInTheDocument(); // Existing pages
    });
  });

  it('should show priority options with descriptions', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true, data: mockConversionOptions }),
    } as Response);

    render(
      <ManualConversionTrigger
        documentId={mockDocumentId}
        onConversionStarted={mockOnConversionStarted}
        onClose={mockOnClose}
      />
    );

    fireEvent.click(screen.getByText('Manual Convert'));

    await waitFor(() => {
      expect(screen.getByText('High')).toBeInTheDocument();
      expect(screen.getByText('Normal')).toBeInTheDocument();
      expect(screen.getByText('Low')).toBeInTheDocument();
      expect(screen.getByText('Process immediately (for urgent documents)')).toBeInTheDocument();
      expect(screen.getByText('Standard processing time')).toBeInTheDocument();
      expect(screen.getByText('Process when system is less busy')).toBeInTheDocument();
    });
  });

  it('should show force reconversion option when document has existing pages', async () => {
    const optionsWithPages = {
      ...mockConversionOptions,
      existingPages: 5,
      hasPages: true,
      options: {
        ...mockConversionOptions.options,
        canForceReconvert: true,
        recommendedPriority: 'normal',
      },
    };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true, data: optionsWithPages }),
    } as Response);

    render(
      <ManualConversionTrigger
        documentId={mockDocumentId}
        onConversionStarted={mockOnConversionStarted}
        onClose={mockOnClose}
      />
    );

    fireEvent.click(screen.getByText('Manual Convert'));

    await waitFor(() => {
      expect(screen.getByText('Force Reconversion')).toBeInTheDocument();
      expect(screen.getByText('5')).toBeInTheDocument(); // Existing pages
    });
  });

  it('should show current conversion status when in progress', async () => {
    const optionsWithConversion = {
      ...mockConversionOptions,
      currentConversion: {
        jobId: 'job-active',
        status: 'processing',
        progress: 65,
        estimatedCompletion: new Date(Date.now() + 30000).toISOString(),
        startedAt: new Date(Date.now() - 45000).toISOString(),
      },
    };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true, data: optionsWithConversion }),
    } as Response);

    render(
      <ManualConversionTrigger
        documentId={mockDocumentId}
        onConversionStarted={mockOnConversionStarted}
        onClose={mockOnClose}
      />
    );

    fireEvent.click(screen.getByText('Manual Convert'));

    await waitFor(() => {
      expect(screen.getByText('Conversion In Progress')).toBeInTheDocument();
      expect(screen.getByText('processing')).toBeInTheDocument();
      expect(screen.getByText('65%')).toBeInTheDocument();
    });
  });

  it('should show warning for non-convertible documents', async () => {
    const nonConvertibleOptions = {
      ...mockConversionOptions,
      contentType: 'image/jpeg',
      convertible: false,
    };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true, data: nonConvertibleOptions }),
    } as Response);

    render(
      <ManualConversionTrigger
        documentId={mockDocumentId}
        onConversionStarted={mockOnConversionStarted}
        onClose={mockOnClose}
      />
    );

    fireEvent.click(screen.getByText('Manual Convert'));

    await waitFor(() => {
      expect(screen.getByText('No')).toBeInTheDocument(); // Convertible
      expect(screen.getByText('This document type cannot be converted to pages. Only PDF documents support conversion.')).toBeInTheDocument();
    });
  });

  it('should trigger conversion with selected options', async () => {
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: mockConversionOptions }),
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockConversionResult,
      } as Response);

    render(
      <ManualConversionTrigger
        documentId={mockDocumentId}
        onConversionStarted={mockOnConversionStarted}
        onClose={mockOnClose}
      />
    );

    fireEvent.click(screen.getByText('Manual Convert'));

    await waitFor(() => {
      expect(screen.getByText('Start Conversion')).toBeInTheDocument();
    });

    // Select normal priority
    fireEvent.click(screen.getByLabelText(/Normal/));

    // Add reason
    fireEvent.change(screen.getByPlaceholderText('Why are you manually triggering this conversion?'), {
      target: { value: 'Previous conversion failed' },
    });

    // Start conversion
    fireEvent.click(screen.getByText('Start Conversion'));

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith('/api/documents/doc-123/convert', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          priority: 'normal',
          force: false,
          reason: 'Previous conversion failed',
        }),
      });
    });

    await waitFor(() => {
      expect(screen.getByText('Conversion Started')).toBeInTheDocument();
      expect(screen.getByText('Document conversion queued with high priority')).toBeInTheDocument();
      expect(mockOnConversionStarted).toHaveBeenCalledWith(mockConversionResult);
    });
  });

  it('should handle force reconversion', async () => {
    const optionsWithPages = {
      ...mockConversionOptions,
      existingPages: 3,
      hasPages: true,
      options: {
        ...mockConversionOptions.options,
        canForceReconvert: true,
      },
    };

    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: optionsWithPages }),
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ ...mockConversionResult, data: { ...mockConversionResult.data!, force: true } }),
      } as Response);

    render(
      <ManualConversionTrigger
        documentId={mockDocumentId}
        onConversionStarted={mockOnConversionStarted}
        onClose={mockOnClose}
      />
    );

    fireEvent.click(screen.getByText('Manual Convert'));

    await waitFor(() => {
      expect(screen.getByText('Force Reconversion')).toBeInTheDocument();
    });

    // Enable force reconversion
    fireEvent.click(screen.getByLabelText(/Force Reconversion/));

    // Start conversion
    fireEvent.click(screen.getByText('Start Conversion'));

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith('/api/documents/doc-123/convert', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          priority: 'high',
          force: true,
          reason: undefined,
        }),
      });
    });
  });

  it('should handle API errors gracefully', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: 'Document not found' }),
    } as Response);

    render(
      <ManualConversionTrigger
        documentId={mockDocumentId}
        onConversionStarted={mockOnConversionStarted}
        onClose={mockOnClose}
      />
    );

    fireEvent.click(screen.getByText('Manual Convert'));

    await waitFor(() => {
      expect(screen.getByText('Error')).toBeInTheDocument();
      expect(screen.getByText('Document not found')).toBeInTheDocument();
    });
  });

  it('should handle conversion trigger errors', async () => {
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: mockConversionOptions }),
      } as Response)
      .mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: 'Conversion already in progress' }),
      } as Response);

    render(
      <ManualConversionTrigger
        documentId={mockDocumentId}
        onConversionStarted={mockOnConversionStarted}
        onClose={mockOnClose}
      />
    );

    fireEvent.click(screen.getByText('Manual Convert'));

    await waitFor(() => {
      expect(screen.getByText('Start Conversion')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Start Conversion'));

    await waitFor(() => {
      expect(screen.getByText('Error')).toBeInTheDocument();
      expect(screen.getByText('Conversion already in progress')).toBeInTheDocument();
    });
  });

  it('should close modal and reset state', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true, data: mockConversionOptions }),
    } as Response);

    render(
      <ManualConversionTrigger
        documentId={mockDocumentId}
        onConversionStarted={mockOnConversionStarted}
        onClose={mockOnClose}
      />
    );

    fireEvent.click(screen.getByText('Manual Convert'));

    await waitFor(() => {
      expect(screen.getByText('Manual Document Conversion')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Cancel'));

    expect(mockOnClose).toHaveBeenCalled();
  });

  it('should format wait times correctly', async () => {
    const optionsWithLongWait = {
      ...mockConversionOptions,
      queue: {
        ...mockConversionOptions.queue,
        estimatedWaitTime: 125000, // 2 minutes 5 seconds
      },
    };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true, data: optionsWithLongWait }),
    } as Response);

    render(
      <ManualConversionTrigger
        documentId={mockDocumentId}
        onConversionStarted={mockOnConversionStarted}
        onClose={mockOnClose}
      />
    );

    fireEvent.click(screen.getByText('Manual Convert'));

    await waitFor(() => {
      expect(screen.getByText('2 minutes')).toBeInTheDocument();
    });
  });

  it('should disable button when loading', () => {
    render(
      <ManualConversionTrigger
        documentId={mockDocumentId}
        onConversionStarted={mockOnConversionStarted}
        onClose={mockOnClose}
      />
    );

    const button = screen.getByText('Manual Convert');
    expect(button).not.toBeDisabled();

    // Mock a slow response to test loading state
    mockFetch.mockImplementation(() => new Promise(() => {})); // Never resolves

    fireEvent.click(button);
    
    // Button should be disabled while modal is loading
    expect(button).toBeDisabled();
  });
});