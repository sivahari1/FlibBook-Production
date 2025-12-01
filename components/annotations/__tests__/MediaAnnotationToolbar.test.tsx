import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import MediaAnnotationToolbar from '../MediaAnnotationToolbar';

describe('MediaAnnotationToolbar', () => {
  const mockOnAddAudio = vi.fn();
  const mockOnAddVideo = vi.fn();
  const mockOnClose = vi.fn();

  const defaultProps = {
    selectedText: 'Selected text content',
    position: { x: 100, y: 200 },
    onAddAudio: mockOnAddAudio,
    onAddVideo: mockOnAddVideo,
    onClose: mockOnClose,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render toolbar with buttons', () => {
      render(<MediaAnnotationToolbar {...defaultProps} />);
      expect(screen.getByRole('button', { name: /add audio/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /add video/i })).toBeInTheDocument();
    });

    it('should display selected text preview', () => {
      render(<MediaAnnotationToolbar {...defaultProps} />);
      expect(screen.getByText(/selected text content/i)).toBeInTheDocument();
    });

    it('should position toolbar at specified coordinates', () => {
      const { container } = render(<MediaAnnotationToolbar {...defaultProps} />);
      const toolbar = container.firstChild as HTMLElement;
      expect(toolbar).toHaveStyle({
        left: '100px',
        top: '200px',
      });
    });

    it('should render close button', () => {
      render(<MediaAnnotationToolbar {...defaultProps} />);
      expect(screen.getByRole('button', { name: /close/i })).toBeInTheDocument();
    });
  });

  describe('Interactions', () => {
    it('should call onAddAudio when audio button clicked', () => {
      render(<MediaAnnotationToolbar {...defaultProps} />);
      const audioButton = screen.getByRole('button', { name: /add audio/i });
      fireEvent.click(audioButton);
      expect(mockOnAddAudio).toHaveBeenCalledTimes(1);
    });

    it('should call onAddVideo when video button clicked', () => {
      render(<MediaAnnotationToolbar {...defaultProps} />);
      const videoButton = screen.getByRole('button', { name: /add video/i });
      fireEvent.click(videoButton);
      expect(mockOnAddVideo).toHaveBeenCalledTimes(1);
    });

    it('should call onClose when close button clicked', () => {
      render(<MediaAnnotationToolbar {...defaultProps} />);
      const closeButton = screen.getByRole('button', { name: /close/i });
      fireEvent.click(closeButton);
      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    it('should close on escape key press', () => {
      render(<MediaAnnotationToolbar {...defaultProps} />);
      fireEvent.keyDown(document, { key: 'Escape' });
      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });
  });

  describe('Text Truncation', () => {
    it('should truncate long selected text', () => {
      const longText = 'A'.repeat(200);
      render(<MediaAnnotationToolbar {...defaultProps} selectedText={longText} />);
      const displayedText = screen.getByText(/A+/);
      expect(displayedText.textContent?.length).toBeLessThan(longText.length);
    });

    it('should show full text for short selections', () => {
      const shortText = 'Short text';
      render(<MediaAnnotationToolbar {...defaultProps} selectedText={shortText} />);
      expect(screen.getByText(shortText)).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels', () => {
      render(<MediaAnnotationToolbar {...defaultProps} />);
      expect(screen.getByRole('button', { name: /add audio/i })).toHaveAttribute('aria-label');
      expect(screen.getByRole('button', { name: /add video/i })).toHaveAttribute('aria-label');
    });

    it('should be keyboard navigable', () => {
      render(<MediaAnnotationToolbar {...defaultProps} />);
      const audioButton = screen.getByRole('button', { name: /add audio/i });
      audioButton.focus();
      expect(document.activeElement).toBe(audioButton);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty selected text', () => {
      render(<MediaAnnotationToolbar {...defaultProps} selectedText="" />);
      expect(screen.getByText(/no text selected/i)).toBeInTheDocument();
    });

    it('should handle negative position coordinates', () => {
      const { container } = render(
        <MediaAnnotationToolbar {...defaultProps} position={{ x: -10, y: -20 }} />
      );
      const toolbar = container.firstChild as HTMLElement;
      // Should adjust to stay within viewport
      expect(toolbar).toHaveStyle({
        left: '0px',
        top: '0px',
      });
    });
  });
});
