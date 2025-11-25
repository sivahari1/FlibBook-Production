/**
 * LinkUploader Component Tests
 * Tests URL validation, metadata fetching, and manual overrides
 */
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { LinkUploader } from '../LinkUploader';
import { LinkProcessor } from '@/lib/link-processor';
import { expect } from 'vitest';
import { expect } from 'vitest';
import { expect } from 'vitest';
import { it } from 'vitest';
import { expect } from 'vitest';
import { expect } from 'vitest';
import { expect } from 'vitest';
import { it } from 'vitest';
import { expect } from 'vitest';
import { it } from 'vitest';
import { expect } from 'vitest';
import { it } from 'vitest';
import { expect } from 'vitest';
import { it } from 'vitest';
import { expect } from 'vitest';
import { expect } from 'vitest';
import { it } from 'vitest';
import { expect } from 'vitest';
import { expect } from 'vitest';
import { it } from 'vitest';
import { expect } from 'vitest';
import { expect } from 'vitest';
import { it } from 'vitest';
import { expect } from 'vitest';
import { expect } from 'vitest';
import { expect } from 'vitest';
import { it } from 'vitest';
import { expect } from 'vitest';
import { it } from 'vitest';
import { expect } from 'vitest';
import { expect } from 'vitest';
import { it } from 'vitest';
import { expect } from 'vitest';
import { expect } from 'vitest';
import { it } from 'vitest';
import { beforeEach } from 'vitest';
import { describe } from 'vitest';

// Mock the LinkProcessor
vi.mock('@/lib/link-processor');

describe('LinkUploader', () => {
  const mockOnLinkSubmit = jest.fn();
  const mockOnMetadataFetch = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders URL input field', () => {
    render(<LinkUploader onLinkSubmit={mockOnLinkSubmit} />);
    
    const urlInput = screen.getByLabelText(/URL/i);
    expect(urlInput).toBeInTheDocument();
    expect(urlInput).toHaveAttribute('type', 'url');
  });

  it('renders title and description fields', () => {
    render(<LinkUploader onLinkSubmit={mockOnLinkSubmit} />);
    
    expect(screen.getByLabelText(/Title/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Description/i)).toBeInTheDocument();
  });

  it('validates URL format on blur', async () => {
    const mockIsValidUrl = jest.fn().mockReturnValue(false);
    (LinkProcessor as jest.Mock).mockImplementation(() => ({
      isValidUrl: mockIsValidUrl,
    }));

    render(<LinkUploader onLinkSubmit={mockOnLinkSubmit} />);
    
    const urlInput = screen.getByLabelText(/URL/i);
    fireEvent.change(urlInput, { target: { value: 'invalid-url' } });
    fireEvent.blur(urlInput);

    await waitFor(() => {
      expect(screen.getByText(/Please enter a valid HTTP or HTTPS URL/i)).toBeInTheDocument();
    });
  });

  it('fetches metadata when valid URL is entered', async () => {
    const mockMetadata = {
      title: 'Test Title',
      description: 'Test Description',
      domain: 'example.com',
      previewImage: 'https://example.com/image.jpg',
      fetchedAt: new Date(),
    };

    const mockIsValidUrl = jest.fn().mockReturnValue(true);
    const mockProcessLink = jest.fn().mockResolvedValue(mockMetadata);
    
    (LinkProcessor as jest.Mock).mockImplementation(() => ({
      isValidUrl: mockIsValidUrl,
      processLink: mockProcessLink,
    }));

    render(
      <LinkUploader
        onLinkSubmit={mockOnLinkSubmit}
        onMetadataFetch={mockOnMetadataFetch}
      />
    );
    
    const urlInput = screen.getByLabelText(/URL/i);
    fireEvent.change(urlInput, { target: { value: 'https://example.com' } });
    fireEvent.blur(urlInput);

    await waitFor(() => {
      expect(mockProcessLink).toHaveBeenCalledWith('https://example.com');
    });

    await waitFor(() => {
      expect(mockOnMetadataFetch).toHaveBeenCalledWith({
        url: 'https://example.com',
        title: 'Test Title',
        description: 'Test Description',
        domain: 'example.com',
        previewImage: 'https://example.com/image.jpg',
        fetchedAt: expect.any(Date),
      });
    });
  });

  it('allows manual title override', async () => {
    const mockMetadata = {
      title: 'Auto Title',
      domain: 'example.com',
    };

    const mockIsValidUrl = jest.fn().mockReturnValue(true);
    const mockProcessLink = jest.fn().mockResolvedValue(mockMetadata);
    
    (LinkProcessor as jest.Mock).mockImplementation(() => ({
      isValidUrl: mockIsValidUrl,
      processLink: mockProcessLink,
    }));

    render(<LinkUploader onLinkSubmit={mockOnLinkSubmit} />);
    
    // Enter URL and let it fetch metadata
    const urlInput = screen.getByLabelText(/URL/i);
    fireEvent.change(urlInput, { target: { value: 'https://example.com' } });
    fireEvent.blur(urlInput);

    await waitFor(() => {
      const titleInput = screen.getByLabelText(/Title/i) as HTMLInputElement;
      expect(titleInput.value).toBe('Auto Title');
    });

    // Manually override the title
    const titleInput = screen.getByLabelText(/Title/i);
    fireEvent.change(titleInput, { target: { value: 'Custom Title' } });

    expect((titleInput as HTMLInputElement).value).toBe('Custom Title');
  });

  it('allows manual description override', async () => {
    const mockMetadata = {
      title: 'Test Title',
      description: 'Auto Description',
      domain: 'example.com',
    };

    const mockIsValidUrl = jest.fn().mockReturnValue(true);
    const mockProcessLink = jest.fn().mockResolvedValue(mockMetadata);
    
    (LinkProcessor as jest.Mock).mockImplementation(() => ({
      isValidUrl: mockIsValidUrl,
      processLink: mockProcessLink,
    }));

    render(<LinkUploader onLinkSubmit={mockOnLinkSubmit} />);
    
    // Enter URL and let it fetch metadata
    const urlInput = screen.getByLabelText(/URL/i);
    fireEvent.change(urlInput, { target: { value: 'https://example.com' } });
    fireEvent.blur(urlInput);

    await waitFor(() => {
      const descInput = screen.getByLabelText(/Description/i) as HTMLTextAreaElement;
      expect(descInput.value).toBe('Auto Description');
    });

    // Manually override the description
    const descInput = screen.getByLabelText(/Description/i);
    fireEvent.change(descInput, { target: { value: 'Custom Description' } });

    expect((descInput as HTMLTextAreaElement).value).toBe('Custom Description');
  });

  it('displays preview image when available', async () => {
    const mockMetadata = {
      title: 'Test Title',
      domain: 'example.com',
      previewImage: 'https://example.com/preview.jpg',
    };

    const mockIsValidUrl = jest.fn().mockReturnValue(true);
    const mockProcessLink = jest.fn().mockResolvedValue(mockMetadata);
    
    (LinkProcessor as jest.Mock).mockImplementation(() => ({
      isValidUrl: mockIsValidUrl,
      processLink: mockProcessLink,
    }));

    render(<LinkUploader onLinkSubmit={mockOnLinkSubmit} />);
    
    const urlInput = screen.getByLabelText(/URL/i);
    fireEvent.change(urlInput, { target: { value: 'https://example.com' } });
    fireEvent.blur(urlInput);

    await waitFor(() => {
      const previewImg = screen.getByAltText('Link preview');
      expect(previewImg).toBeInTheDocument();
      expect(previewImg).toHaveAttribute('src', 'https://example.com/preview.jpg');
    });
  });

  it('displays domain in preview', async () => {
    const mockMetadata = {
      title: 'Test Title',
      domain: 'example.com',
    };

    const mockIsValidUrl = jest.fn().mockReturnValue(true);
    const mockProcessLink = jest.fn().mockResolvedValue(mockMetadata);
    
    (LinkProcessor as jest.Mock).mockImplementation(() => ({
      isValidUrl: mockIsValidUrl,
      processLink: mockProcessLink,
    }));

    render(<LinkUploader onLinkSubmit={mockOnLinkSubmit} />);
    
    const urlInput = screen.getByLabelText(/URL/i);
    fireEvent.change(urlInput, { target: { value: 'https://example.com' } });
    fireEvent.blur(urlInput);

    await waitFor(() => {
      expect(screen.getByText('example.com')).toBeInTheDocument();
    });
  });

  it('shows loading state while fetching metadata', async () => {
    const mockIsValidUrl = jest.fn().mockReturnValue(true);
    const mockProcessLink = jest.fn().mockImplementation(
      () => new Promise((resolve) => setTimeout(() => resolve({ domain: 'example.com' }), 100))
    );
    
    (LinkProcessor as jest.Mock).mockImplementation(() => ({
      isValidUrl: mockIsValidUrl,
      processLink: mockProcessLink,
    }));

    render(<LinkUploader onLinkSubmit={mockOnLinkSubmit} />);
    
    const urlInput = screen.getByLabelText(/URL/i);
    fireEvent.change(urlInput, { target: { value: 'https://example.com' } });
    fireEvent.blur(urlInput);

    // Check for loading spinner
    await waitFor(() => {
      const spinner = document.querySelector('.animate-spin');
      expect(spinner).toBeInTheDocument();
    });
  });

  it('handles metadata fetch errors gracefully', async () => {
    const mockIsValidUrl = jest.fn().mockReturnValue(true);
    const mockProcessLink = jest.fn().mockRejectedValue(new Error('Fetch failed'));
    
    (LinkProcessor as jest.Mock).mockImplementation(() => ({
      isValidUrl: mockIsValidUrl,
      processLink: mockProcessLink,
    }));

    render(<LinkUploader onLinkSubmit={mockOnLinkSubmit} />);
    
    const urlInput = screen.getByLabelText(/URL/i);
    fireEvent.change(urlInput, { target: { value: 'https://example.com' } });
    fireEvent.blur(urlInput);

    await waitFor(() => {
      expect(screen.getByText(/Failed to fetch link preview/i)).toBeInTheDocument();
    });
  });

  it('respects disabled prop', () => {
    render(<LinkUploader onLinkSubmit={mockOnLinkSubmit} disabled={true} />);
    
    const urlInput = screen.getByLabelText(/URL/i);
    const titleInput = screen.getByLabelText(/Title/i);
    const descInput = screen.getByLabelText(/Description/i);

    expect(urlInput).toBeDisabled();
    expect(titleInput).toBeDisabled();
    expect(descInput).toBeDisabled();
  });

  it('accepts initial values', () => {
    render(
      <LinkUploader
        onLinkSubmit={mockOnLinkSubmit}
        initialUrl="https://example.com"
        initialTitle="Initial Title"
        initialDescription="Initial Description"
      />
    );
    
    const urlInput = screen.getByLabelText(/URL/i) as HTMLInputElement;
    const titleInput = screen.getByLabelText(/Title/i) as HTMLInputElement;
    const descInput = screen.getByLabelText(/Description/i) as HTMLTextAreaElement;

    expect(urlInput.value).toBe('https://example.com');
    expect(titleInput.value).toBe('Initial Title');
    expect(descInput.value).toBe('Initial Description');
  });
});
