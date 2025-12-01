import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import MediaUploadModal from '../MediaUploadModal';

describe('MediaUploadModal', () => {
  const mockOnUpload = vi.fn();
  const mockOnClose = vi.fn();

  const defaultProps = {
    mediaType: 'AUDIO' as const,
    selectedText: 'Selected text',
    onUpload: mockOnUpload,
    onClose: mockOnClose,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render upload modal', () => {
      render(<MediaUploadModal {...defaultProps} />);
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    it('should display media type in title', () => {
      render(<MediaUploadModal {...defaultProps} />);
      expect(screen.getByText(/upload audio/i)).toBeInTheDocument();
    });

    it('should render file upload tab', () => {
      render(<MediaUploadModal {...defaultProps} />);
      expect(screen.getByRole('tab', { name: /upload file/i })).toBeInTheDocument();
    });

    it('should render URL input tab', () => {
      render(<MediaUploadModal {...defaultProps} />);
      expect(screen.getByRole('tab', { name: /external url/i })).toBeInTheDocument();
    });

    it('should display selected text preview', () => {
      render(<MediaUploadModal {...defaultProps} />);
      expect(screen.getByText(/selected text/i)).toBeInTheDocument();
    });
  });

  describe('File Upload', () => {
    it('should render file input', () => {
      render(<MediaUploadModal {...defaultProps} />);
      expect(screen.getByLabelText(/choose file/i)).toBeInTheDocument();
    });

    it('should accept audio files for audio type', () => {
      render(<MediaUploadModal {...defaultProps} mediaType="AUDIO" />);
      const fileInput = screen.getByLabelText(/choose file/i) as HTMLInputElement;
      expect(fileInput.accept).toContain('audio/');
    });

    it('should accept video files for video type', () => {
      render(<MediaUploadModal {...defaultProps} mediaType="VIDEO" />);
      const fileInput = screen.getByLabelText(/choose file/i) as HTMLInputElement;
      expect(fileInput.accept).toContain('video/');
    });

    it('should handle file selection', async () => {
      render(<MediaUploadModal {...defaultProps} />);
      const file = new File(['audio content'], 'test.mp3', { type: 'audio/mp3' });
      const fileInput = screen.getByLabelText(/choose file/i) as HTMLInputElement;
      
      fireEvent.change(fileInput, { target: { files: [file] } });
      
      await waitFor(() => {
        expect(screen.getByText(/test.mp3/i)).toBeInTheDocument();
      });
    });

    it('should validate file size', async () => {
      render(<MediaUploadModal {...defaultProps} />);
      const largeFile = new File(['x'.repeat(101 * 1024 * 1024)], 'large.mp3', { type: 'audio/mp3' });
      const fileInput = screen.getByLabelText(/choose file/i) as HTMLInputElement;
      
      fireEvent.change(fileInput, { target: { files: [largeFile] } });
      
      await waitFor(() => {
        expect(screen.getByText(/file too large/i)).toBeInTheDocument();
      });
    });

    it('should validate file type', async () => {
      render(<MediaUploadModal {...defaultProps} mediaType="AUDIO" />);
      const invalidFile = new File(['content'], 'test.txt', { type: 'text/plain' });
      const fileInput = screen.getByLabelText(/choose file/i) as HTMLInputElement;
      
      fireEvent.change(fileInput, { target: { files: [invalidFile] } });
      
      await waitFor(() => {
        expect(screen.getByText(/invalid file type/i)).toBeInTheDocument();
      });
    });

    it('should show upload progress', async () => {
      render(<MediaUploadModal {...defaultProps} />);
      const file = new File(['audio content'], 'test.mp3', { type: 'audio/mp3' });
      const fileInput = screen.getByLabelText(/choose file/i) as HTMLInputElement;
      
      fireEvent.change(fileInput, { target: { files: [file] } });
      
      const uploadButton = screen.getByRole('button', { name: /upload/i });
      fireEvent.click(uploadButton);
      
      await waitFor(() => {
        expect(screen.getByRole('progressbar')).toBeInTheDocument();
      });
    });

    it('should call onUpload with file data', async () => {
      render(<MediaUploadModal {...defaultProps} />);
      const file = new File(['audio content'], 'test.mp3', { type: 'audio/mp3' });
      const fileInput = screen.getByLabelText(/choose file/i) as HTMLInputElement;
      
      fireEvent.change(fileInput, { target: { files: [file] } });
      
      const uploadButton = screen.getByRole('button', { name: /upload/i });
      fireEvent.click(uploadButton);
      
      await waitFor(() => {
        expect(mockOnUpload).toHaveBeenCalledWith(expect.objectContaining({
          file,
          isExternal: false,
        }));
      });
    });
  });

  describe('URL Input', () => {
    it('should render URL input field', () => {
      render(<MediaUploadModal {...defaultProps} />);
      fireEvent.click(screen.getByRole('tab', { name: /external url/i }));
      expect(screen.getByLabelText(/media url/i)).toBeInTheDocument();
    });

    it('should validate URL format', async () => {
      render(<MediaUploadModal {...defaultProps} />);
      fireEvent.click(screen.getByRole('tab', { name: /external url/i }));
      
      const urlInput = screen.getByLabelText(/media url/i);
      fireEvent.change(urlInput, { target: { value: 'invalid-url' } });
      
      const submitButton = screen.getByRole('button', { name: /add/i });
      fireEvent.click(submitButton);
      
      await waitFor(() => {
        expect(screen.getByText(/invalid url/i)).toBeInTheDocument();
      });
    });

    it('should accept YouTube URLs', async () => {
      render(<MediaUploadModal {...defaultProps} mediaType="VIDEO" />);
      fireEvent.click(screen.getByRole('tab', { name: /external url/i }));
      
      const urlInput = screen.getByLabelText(/media url/i);
      fireEvent.change(urlInput, { target: { value: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ' } });
      
      const submitButton = screen.getByRole('button', { name: /add/i });
      fireEvent.click(submitButton);
      
      await waitFor(() => {
        expect(mockOnUpload).toHaveBeenCalledWith(expect.objectContaining({
          url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
          isExternal: true,
        }));
      });
    });

    it('should accept Vimeo URLs', async () => {
      render(<MediaUploadModal {...defaultProps} mediaType="VIDEO" />);
      fireEvent.click(screen.getByRole('tab', { name: /external url/i }));
      
      const urlInput = screen.getByLabelText(/media url/i);
      fireEvent.change(urlInput, { target: { value: 'https://vimeo.com/123456' } });
      
      const submitButton = screen.getByRole('button', { name: /add/i });
      fireEvent.click(submitButton);
      
      await waitFor(() => {
        expect(mockOnUpload).toHaveBeenCalled();
      });
    });

    it('should accept SoundCloud URLs', async () => {
      render(<MediaUploadModal {...defaultProps} mediaType="AUDIO" />);
      fireEvent.click(screen.getByRole('tab', { name: /external url/i }));
      
      const urlInput = screen.getByLabelText(/media url/i);
      fireEvent.change(urlInput, { target: { value: 'https://soundcloud.com/artist/track' } });
      
      const submitButton = screen.getByRole('button', { name: /add/i });
      fireEvent.click(submitButton);
      
      await waitFor(() => {
        expect(mockOnUpload).toHaveBeenCalled();
      });
    });
  });

  describe('Modal Interactions', () => {
    it('should call onClose when close button clicked', () => {
      render(<MediaUploadModal {...defaultProps} />);
      const closeButton = screen.getByRole('button', { name: /close/i });
      fireEvent.click(closeButton);
      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    it('should close on escape key press', () => {
      render(<MediaUploadModal {...defaultProps} />);
      fireEvent.keyDown(document, { key: 'Escape' });
      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    it('should close after successful upload', async () => {
      mockOnUpload.mockResolvedValue({ success: true });
      render(<MediaUploadModal {...defaultProps} />);
      
      const file = new File(['audio content'], 'test.mp3', { type: 'audio/mp3' });
      const fileInput = screen.getByLabelText(/choose file/i) as HTMLInputElement;
      
      fireEvent.change(fileInput, { target: { files: [file] } });
      
      const uploadButton = screen.getByRole('button', { name: /upload/i });
      fireEvent.click(uploadButton);
      
      await waitFor(() => {
        expect(mockOnClose).toHaveBeenCalled();
      });
    });
  });

  describe('Drag and Drop', () => {
    it('should handle file drop', async () => {
      render(<MediaUploadModal {...defaultProps} />);
      const dropZone = screen.getByTestId('drop-zone');
      
      const file = new File(['audio content'], 'test.mp3', { type: 'audio/mp3' });
      const dataTransfer = {
        files: [file],
        types: ['Files'],
      };
      
      fireEvent.drop(dropZone, { dataTransfer });
      
      await waitFor(() => {
        expect(screen.getByText(/test.mp3/i)).toBeInTheDocument();
      });
    });

    it('should highlight drop zone on drag over', () => {
      render(<MediaUploadModal {...defaultProps} />);
      const dropZone = screen.getByTestId('drop-zone');
      
      fireEvent.dragOver(dropZone);
      expect(dropZone).toHaveClass('drag-over');
    });

    it('should remove highlight on drag leave', () => {
      render(<MediaUploadModal {...defaultProps} />);
      const dropZone = screen.getByTestId('drop-zone');
      
      fireEvent.dragOver(dropZone);
      fireEvent.dragLeave(dropZone);
      expect(dropZone).not.toHaveClass('drag-over');
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels', () => {
      render(<MediaUploadModal {...defaultProps} />);
      const dialog = screen.getByRole('dialog');
      expect(dialog).toHaveAttribute('aria-labelledby');
    });

    it('should be keyboard navigable', () => {
      render(<MediaUploadModal {...defaultProps} />);
      const fileTab = screen.getByRole('tab', { name: /upload file/i });
      const urlTab = screen.getByRole('tab', { name: /external url/i });
      
      fileTab.focus();
      expect(document.activeElement).toBe(fileTab);
      
      fireEvent.keyDown(fileTab, { key: 'ArrowRight' });
      expect(document.activeElement).toBe(urlTab);
    });
  });
});
