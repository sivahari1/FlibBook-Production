/**
 * Download Fallback UI Component Tests
 * 
 * Tests for download fallback UI when all rendering methods fail
 * 
 * Requirements: 1.4, 6.4
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import { DownloadFallbackUI, CompactDownloadFallback } from '../DownloadFallbackUI';

// Mock the Button component
vi.mock('../../ui/Button', () => ({
  Button: ({ children, onClick, isLoading, disabled, ...props }: any) => (
    <button onClick={onClick} disabled={disabled || isLoading} {...props}>
      {isLoading ? 'Loading...' : children}
    </button>
  ),
}));

// Mock window.open
const mockWindowOpen = vi.fn();
Object.defineProperty(window, 'open', {
  writable: true,
  value: mockWindowOpen,
});

// Mock document.createElement and related DOM methods
const mockLink = {
  href: '',
  download: '',
  click: vi.fn(),
};

const mockCreateElement = vi.fn().mockReturnValue(mockLink);
const mockAppendChild = vi.fn();
const mockRemoveChild = vi.fn();

Object.defineProperty(document, 'createElement', {
  writable: true,
  value: mockCreateElement,
});

Object.defineProperty(document.body, 'appendChild', {
  writable: true,
  value: mockAppendChild,
});

Object.defineProperty(document.body, 'removeChild', {
  writable: true,
  value: mockRemoveChild,
});

describe('DownloadFallbackUI', () => {
  const defaultProps = {
    pdfUrl: 'https://example.com/test.pdf',
    documentTitle: 'Test Document',
    fileSize: 1024 * 1024, // 1 MB
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Display Elements', () => {
    it('should display fallback title and description', () => {
      render(<DownloadFallbackUI {...defaultProps} />);
      
      expect(screen.getByText('Unable to Display PDF')).toBeInTheDocument();
      expect(screen.getByText(/We couldn't display this PDF in your browser/)).toBeInTheDocument();
    });

    it('should display document information', () => {
      render(<DownloadFallbackUI {...defaultProps} />);
      
      expect(screen.getByText('Test Document')).toBeInTheDocument();
      expect(screen.getByText('1 MB')).toBeInTheDocument();
    });

    it('should display error context when provided', () => {
      render(
        <DownloadFallbackUI 
          {...defaultProps} 
          errorContext="Network timeout occurred" 
        />
      );
      
      expect(screen.getByText('Network timeout occurred')).toBeInTheDocument();
    });
  });

  describe('Download Functionality', () => {
    it('should show download button', () => {
      render(<DownloadFallbackUI {...defaultProps} />);
      
      expect(screen.getByText('Download PDF')).toBeInTheDocument();
    });

    it('should call custom onDownload when provided', async () => {
      const onDownload = vi.fn();
      render(<DownloadFallbackUI {...defaultProps} onDownload={onDownload} />);
      
      const downloadButton = screen.getByText('Download PDF');
      fireEvent.click(downloadButton);
      
      await waitFor(() => {
        expect(onDownload).toHaveBeenCalledWith(defaultProps.pdfUrl);
      });
    });

    it('should trigger default download when no callback provided', async () => {
      render(<DownloadFallbackUI {...defaultProps} />);
      
      const downloadButton = screen.getByText('Download PDF');
      fireEvent.click(downloadButton);
      
      await waitFor(() => {
        expect(mockCreateElement).toHaveBeenCalledWith('a');
        expect(mockLink.href).toBe(defaultProps.pdfUrl);
        expect(mockLink.download).toBe('Test Document.pdf');
        expect(mockAppendChild).toHaveBeenCalledWith(mockLink);
        expect(mockLink.click).toHaveBeenCalled();
        expect(mockRemoveChild).toHaveBeenCalledWith(mockLink);
      });
    });

    it('should show loading state during download', async () => {
      const onDownload = vi.fn().mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)));
      render(<DownloadFallbackUI {...defaultProps} onDownload={onDownload} />);
      
      const downloadButton = screen.getByText('Download PDF');
      fireEvent.click(downloadButton);
      
      expect(screen.getByText('Downloading...')).toBeInTheDocument();
      
      await waitFor(() => {
        expect(screen.getByText('Download PDF')).toBeInTheDocument();
      });
    });
  });

  describe('Open in New Tab', () => {
    it('should show open in new tab button', () => {
      render(<DownloadFallbackUI {...defaultProps} />);
      
      expect(screen.getByText('Open in New Tab')).toBeInTheDocument();
    });

    it('should open PDF in new tab when button clicked', () => {
      render(<DownloadFallbackUI {...defaultProps} />);
      
      const openButton = screen.getByText('Open in New Tab');
      fireEvent.click(openButton);
      
      expect(mockWindowOpen).toHaveBeenCalledWith(
        defaultProps.pdfUrl,
        '_blank',
        'noopener,noreferrer'
      );
    });
  });

  describe('Secondary Actions', () => {
    it('should show retry viewing button when callback provided', () => {
      const onRetryViewing = vi.fn();
      render(<DownloadFallbackUI {...defaultProps} onRetryViewing={onRetryViewing} />);
      
      expect(screen.getByText('Try Viewing Again')).toBeInTheDocument();
    });

    it('should call onRetryViewing when button clicked', () => {
      const onRetryViewing = vi.fn();
      render(<DownloadFallbackUI {...defaultProps} onRetryViewing={onRetryViewing} />);
      
      const retryButton = screen.getByText('Try Viewing Again');
      fireEvent.click(retryButton);
      
      expect(onRetryViewing).toHaveBeenCalledTimes(1);
    });

    it('should show dismiss button when callback provided', () => {
      const onDismiss = vi.fn();
      render(<DownloadFallbackUI {...defaultProps} onDismiss={onDismiss} />);
      
      expect(screen.getByText('Close')).toBeInTheDocument();
    });

    it('should call onDismiss when button clicked', () => {
      const onDismiss = vi.fn();
      render(<DownloadFallbackUI {...defaultProps} onDismiss={onDismiss} />);
      
      const closeButton = screen.getByText('Close');
      fireEvent.click(closeButton);
      
      expect(onDismiss).toHaveBeenCalledTimes(1);
    });
  });
});

describe('CompactDownloadFallback', () => {
  const defaultProps = {
    pdfUrl: 'https://example.com/test.pdf',
    documentTitle: 'Test Document',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render compact fallback display', () => {
    render(<CompactDownloadFallback {...defaultProps} />);
    
    expect(screen.getByText("Can't display PDF in browser")).toBeInTheDocument();
    expect(screen.getByText('Download to view the document')).toBeInTheDocument();
  });

  it('should show download button in compact mode', () => {
    render(<CompactDownloadFallback {...defaultProps} />);
    
    expect(screen.getByText('Download')).toBeInTheDocument();
  });

  it('should call custom onDownload in compact mode', async () => {
    const onDownload = vi.fn();
    render(<CompactDownloadFallback {...defaultProps} onDownload={onDownload} />);
    
    const downloadButton = screen.getByText('Download');
    fireEvent.click(downloadButton);
    
    await waitFor(() => {
      expect(onDownload).toHaveBeenCalledWith(defaultProps.pdfUrl);
    });
  });

  it('should trigger default download in compact mode', async () => {
    render(<CompactDownloadFallback {...defaultProps} />);
    
    const downloadButton = screen.getByText('Download');
    fireEvent.click(downloadButton);
    
    await waitFor(() => {
      expect(mockCreateElement).toHaveBeenCalledWith('a');
      expect(mockLink.click).toHaveBeenCalled();
    });
  });

  it('should show loading state in compact mode', async () => {
    const onDownload = vi.fn().mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)));
    render(<CompactDownloadFallback {...defaultProps} onDownload={onDownload} />);
    
    const downloadButton = screen.getByText('Download');
    fireEvent.click(downloadButton);
    
    expect(screen.getByText('Downloading...')).toBeInTheDocument();
    
    await waitFor(() => {
      expect(screen.getByText('Download')).toBeInTheDocument();
    });
  });

  it('should apply custom className in compact mode', () => {
    const { container } = render(
      <CompactDownloadFallback {...defaultProps} className="custom-class" />
    );
    
    expect(container.firstChild).toHaveClass('custom-class');
  });
});