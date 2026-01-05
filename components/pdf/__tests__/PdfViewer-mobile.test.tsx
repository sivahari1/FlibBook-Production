import { render, screen } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { PdfViewer } from '../PdfViewer';

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(), // deprecated
    removeListener: vi.fn(), // deprecated
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// Mock window.open
const mockWindowOpen = vi.fn();
Object.defineProperty(window, 'open', {
  writable: true,
  value: mockWindowOpen,
});

describe('PdfViewer Mobile Support', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders desktop iframe when not mobile', () => {
    // Mock desktop conditions
    (window.matchMedia as any).mockReturnValue({ matches: false });
    Object.defineProperty(navigator, 'userAgent', {
      writable: true,
      value: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    });

    render(<PdfViewer url="https://example.com/test.pdf" title="Test PDF" />);
    
    expect(screen.getByTitle('Test PDF')).toBeInTheDocument();
    expect(screen.getByText('Open PDF in new tab')).toBeInTheDocument();
  });

  it('renders mobile fallback when screen is small', () => {
    // Mock small screen
    (window.matchMedia as any).mockReturnValue({ matches: true });
    Object.defineProperty(navigator, 'userAgent', {
      writable: true,
      value: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    });

    render(<PdfViewer url="https://example.com/test.pdf" title="Test PDF" />);
    
    expect(screen.getByText('Test PDF')).toBeInTheDocument();
    expect(screen.getByText('PDF inline preview is not supported on mobile. Please open the PDF in a new tab.')).toBeInTheDocument();
    expect(screen.getByText('Open PDF')).toBeInTheDocument();
    expect(screen.getByText('Download')).toBeInTheDocument();
  });

  it('renders mobile fallback when mobile user agent detected', () => {
    // Mock mobile user agent
    (window.matchMedia as any).mockReturnValue({ matches: false });
    Object.defineProperty(navigator, 'userAgent', {
      writable: true,
      value: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15',
    });

    render(<PdfViewer url="https://example.com/test.pdf" title="Test PDF" />);
    
    expect(screen.getByText('Test PDF')).toBeInTheDocument();
    expect(screen.getByText('PDF inline preview is not supported on mobile. Please open the PDF in a new tab.')).toBeInTheDocument();
  });

  it('opens PDF in new tab when Open PDF button is clicked', () => {
    // Mock mobile conditions
    (window.matchMedia as any).mockReturnValue({ matches: true });
    
    render(<PdfViewer url="https://example.com/test.pdf" />);
    
    const openButton = screen.getByText('Open PDF');
    openButton.click();
    
    expect(mockWindowOpen).toHaveBeenCalledWith(
      'https://example.com/test.pdf',
      '_blank',
      'noopener,noreferrer'
    );
  });

  it('returns null when no URL provided', () => {
    const { container } = render(<PdfViewer url="" />);
    expect(container.firstChild).toBeNull();
  });
});