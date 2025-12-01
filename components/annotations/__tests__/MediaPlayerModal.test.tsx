import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import MediaPlayerModal from '../MediaPlayerModal';

describe('MediaPlayerModal', () => {
  const mockOnClose = vi.fn();

  const audioAnnotation = {
    id: 'audio-1',
    mediaType: 'AUDIO' as const,
    mediaUrl: 'https://example.com/audio.mp3',
    selectedText: 'Audio annotation text',
    isExternal: false,
  };

  const videoAnnotation = {
    id: 'video-1',
    mediaType: 'VIDEO' as const,
    mediaUrl: 'https://example.com/video.mp4',
    selectedText: 'Video annotation text',
    isExternal: false,
  };

  const externalAnnotation = {
    id: 'youtube-1',
    mediaType: 'VIDEO' as const,
    mediaUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    selectedText: 'YouTube video',
    isExternal: true,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render modal with audio player', () => {
      render(<MediaPlayerModal annotation={audioAnnotation} onClose={mockOnClose} />);
      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.getByTestId('audio-player')).toBeInTheDocument();
    });

    it('should render modal with video player', () => {
      render(<MediaPlayerModal annotation={videoAnnotation} onClose={mockOnClose} />);
      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.getByTestId('video-player')).toBeInTheDocument();
    });

    it('should display annotation text', () => {
      render(<MediaPlayerModal annotation={audioAnnotation} onClose={mockOnClose} />);
      expect(screen.getByText(/audio annotation text/i)).toBeInTheDocument();
    });

    it('should render close button', () => {
      render(<MediaPlayerModal annotation={audioAnnotation} onClose={mockOnClose} />);
      expect(screen.getByRole('button', { name: /close/i })).toBeInTheDocument();
    });

    it('should display watermark', () => {
      render(<MediaPlayerModal annotation={audioAnnotation} onClose={mockOnClose} watermark="Test User" />);
      expect(screen.getByText(/test user/i)).toBeInTheDocument();
    });
  });

  describe('Audio Player', () => {
    it('should render audio controls', () => {
      render(<MediaPlayerModal annotation={audioAnnotation} onClose={mockOnClose} />);
      const audio = screen.getByTestId('audio-player') as HTMLAudioElement;
      expect(audio).toHaveAttribute('controls');
    });

    it('should disable download for audio', () => {
      render(<MediaPlayerModal annotation={audioAnnotation} onClose={mockOnClose} />);
      const audio = screen.getByTestId('audio-player') as HTMLAudioElement;
      expect(audio).toHaveAttribute('controlsList', 'nodownload');
    });

    it('should prevent right-click on audio player', () => {
      render(<MediaPlayerModal annotation={audioAnnotation} onClose={mockOnClose} />);
      const audio = screen.getByTestId('audio-player');
      const contextMenuEvent = new MouseEvent('contextmenu', { bubbles: true, cancelable: true });
      const preventDefaultSpy = vi.spyOn(contextMenuEvent, 'preventDefault');
      audio.dispatchEvent(contextMenuEvent);
      expect(preventDefaultSpy).toHaveBeenCalled();
    });
  });

  describe('Video Player', () => {
    it('should render video controls', () => {
      render(<MediaPlayerModal annotation={videoAnnotation} onClose={mockOnClose} />);
      const video = screen.getByTestId('video-player') as HTMLVideoElement;
      expect(video).toHaveAttribute('controls');
    });

    it('should disable download for video', () => {
      render(<MediaPlayerModal annotation={videoAnnotation} onClose={mockOnClose} />);
      const video = screen.getByTestId('video-player') as HTMLVideoElement;
      expect(video).toHaveAttribute('controlsList', 'nodownload');
    });

    it('should prevent right-click on video player', () => {
      render(<MediaPlayerModal annotation={videoAnnotation} onClose={mockOnClose} />);
      const video = screen.getByTestId('video-player');
      const contextMenuEvent = new MouseEvent('contextmenu', { bubbles: true, cancelable: true });
      const preventDefaultSpy = vi.spyOn(contextMenuEvent, 'preventDefault');
      video.dispatchEvent(contextMenuEvent);
      expect(preventDefaultSpy).toHaveBeenCalled();
    });
  });

  describe('External Media', () => {
    it('should render external media player for YouTube', () => {
      render(<MediaPlayerModal annotation={externalAnnotation} onClose={mockOnClose} />);
      expect(screen.getByTestId('external-player')).toBeInTheDocument();
    });

    it('should embed YouTube video with proper parameters', () => {
      render(<MediaPlayerModal annotation={externalAnnotation} onClose={mockOnClose} />);
      const iframe = screen.getByTestId('external-player') as HTMLIFrameElement;
      expect(iframe.src).toContain('youtube.com/embed');
      expect(iframe.src).toContain('rel=0'); // No related videos
    });
  });

  describe('Modal Interactions', () => {
    it('should call onClose when close button clicked', () => {
      render(<MediaPlayerModal annotation={audioAnnotation} onClose={mockOnClose} />);
      const closeButton = screen.getByRole('button', { name: /close/i });
      fireEvent.click(closeButton);
      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    it('should close on escape key press', () => {
      render(<MediaPlayerModal annotation={audioAnnotation} onClose={mockOnClose} />);
      fireEvent.keyDown(document, { key: 'Escape' });
      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    it('should close when clicking backdrop', () => {
      render(<MediaPlayerModal annotation={audioAnnotation} onClose={mockOnClose} />);
      const backdrop = screen.getByTestId('modal-backdrop');
      fireEvent.click(backdrop);
      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    it('should not close when clicking modal content', () => {
      render(<MediaPlayerModal annotation={audioAnnotation} onClose={mockOnClose} />);
      const modalContent = screen.getByRole('dialog');
      fireEvent.click(modalContent);
      expect(mockOnClose).not.toHaveBeenCalled();
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA attributes', () => {
      render(<MediaPlayerModal annotation={audioAnnotation} onClose={mockOnClose} />);
      const dialog = screen.getByRole('dialog');
      expect(dialog).toHaveAttribute('aria-modal', 'true');
      expect(dialog).toHaveAttribute('aria-labelledby');
    });

    it('should trap focus within modal', () => {
      render(<MediaPlayerModal annotation={audioAnnotation} onClose={mockOnClose} />);
      const closeButton = screen.getByRole('button', { name: /close/i });
      closeButton.focus();
      expect(document.activeElement).toBe(closeButton);
    });

    it('should restore focus on close', async () => {
      const button = document.createElement('button');
      document.body.appendChild(button);
      button.focus();

      const { unmount } = render(<MediaPlayerModal annotation={audioAnnotation} onClose={mockOnClose} />);
      unmount();

      await waitFor(() => {
        expect(document.activeElement).toBe(button);
      });

      document.body.removeChild(button);
    });
  });

  describe('Error Handling', () => {
    it('should handle media load errors', async () => {
      render(<MediaPlayerModal annotation={audioAnnotation} onClose={mockOnClose} />);
      const audio = screen.getByTestId('audio-player');
      fireEvent.error(audio);
      await waitFor(() => {
        expect(screen.getByText(/failed to load media/i)).toBeInTheDocument();
      });
    });

    it('should display error message for invalid media URL', () => {
      const invalidAnnotation = { ...audioAnnotation, mediaUrl: '' };
      render(<MediaPlayerModal annotation={invalidAnnotation} onClose={mockOnClose} />);
      expect(screen.getByText(/invalid media/i)).toBeInTheDocument();
    });
  });
});
