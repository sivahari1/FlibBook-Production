import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import AnnotationMarker from '../AnnotationMarker';

describe('AnnotationMarker', () => {
  const mockOnClick = vi.fn();

  const audioAnnotation = {
    id: 'audio-1',
    mediaType: 'AUDIO' as const,
    selectedText: 'Audio annotation',
    position: { x: 100, y: 200 },
  };

  const videoAnnotation = {
    id: 'video-1',
    mediaType: 'VIDEO' as const,
    selectedText: 'Video annotation',
    position: { x: 150, y: 250 },
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render audio marker icon', () => {
      render(<AnnotationMarker annotation={audioAnnotation} onClick={mockOnClick} />);
      expect(screen.getByText('🎵')).toBeInTheDocument();
    });

    it('should render video marker icon', () => {
      render(<AnnotationMarker annotation={videoAnnotation} onClick={mockOnClick} />);
      expect(screen.getByText('🎬')).toBeInTheDocument();
    });

    it('should position marker at specified coordinates', () => {
      const { container } = render(<AnnotationMarker annotation={audioAnnotation} onClick={mockOnClick} />);
      const marker = container.firstChild as HTMLElement;
      expect(marker).toHaveStyle({
        left: '100px',
        top: '200px',
      });
    });

    it('should render as button', () => {
      render(<AnnotationMarker annotation={audioAnnotation} onClick={mockOnClick} />);
      expect(screen.getByRole('button')).toBeInTheDocument();
    });
  });

  describe('Interactions', () => {
    it('should call onClick when marker clicked', () => {
      render(<AnnotationMarker annotation={audioAnnotation} onClick={mockOnClick} />);
      const marker = screen.getByRole('button');
      fireEvent.click(marker);
      expect(mockOnClick).toHaveBeenCalledWith(audioAnnotation);
    });

    it('should show tooltip on hover', async () => {
      render(<AnnotationMarker annotation={audioAnnotation} onClick={mockOnClick} />);
      const marker = screen.getByRole('button');
      fireEvent.mouseEnter(marker);
      expect(await screen.findByRole('tooltip')).toBeInTheDocument();
    });

    it('should display annotation text in tooltip', async () => {
      render(<AnnotationMarker annotation={audioAnnotation} onClick={mockOnClick} />);
      const marker = screen.getByRole('button');
      fireEvent.mouseEnter(marker);
      expect(await screen.findByText(/audio annotation/i)).toBeInTheDocument();
    });

    it('should hide tooltip on mouse leave', async () => {
      render(<AnnotationMarker annotation={audioAnnotation} onClick={mockOnClick} />);
      const marker = screen.getByRole('button');
      fireEvent.mouseEnter(marker);
      await screen.findByRole('tooltip');
      fireEvent.mouseLeave(marker);
      expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
    });
  });

  describe('Styling', () => {
    it('should have hover effect', () => {
      const { container } = render(<AnnotationMarker annotation={audioAnnotation} onClick={mockOnClick} />);
      const marker = container.firstChild as HTMLElement;
      expect(marker).toHaveClass('marker');
    });

    it('should have different styles for audio and video', () => {
      const { container: audioContainer } = render(
        <AnnotationMarker annotation={audioAnnotation} onClick={mockOnClick} />
      );
      const { container: videoContainer } = render(
        <AnnotationMarker annotation={videoAnnotation} onClick={mockOnClick} />
      );
      
      const audioMarker = audioContainer.firstChild as HTMLElement;
      const videoMarker = videoContainer.firstChild as HTMLElement;
      
      expect(audioMarker.className).not.toBe(videoMarker.className);
    });

    it('should scale on hover', () => {
      const { container } = render(<AnnotationMarker annotation={audioAnnotation} onClick={mockOnClick} />);
      const marker = container.firstChild as HTMLElement;
      fireEvent.mouseEnter(marker);
      expect(marker).toHaveStyle({ transform: 'scale(1.2)' });
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA label', () => {
      render(<AnnotationMarker annotation={audioAnnotation} onClick={mockOnClick} />);
      const marker = screen.getByRole('button');
      expect(marker).toHaveAttribute('aria-label', expect.stringContaining('audio'));
    });

    it('should be keyboard accessible', () => {
      render(<AnnotationMarker annotation={audioAnnotation} onClick={mockOnClick} />);
      const marker = screen.getByRole('button');
      marker.focus();
      expect(document.activeElement).toBe(marker);
    });

    it('should trigger onClick on Enter key', () => {
      render(<AnnotationMarker annotation={audioAnnotation} onClick={mockOnClick} />);
      const marker = screen.getByRole('button');
      fireEvent.keyDown(marker, { key: 'Enter' });
      expect(mockOnClick).toHaveBeenCalledWith(audioAnnotation);
    });

    it('should trigger onClick on Space key', () => {
      render(<AnnotationMarker annotation={audioAnnotation} onClick={mockOnClick} />);
      const marker = screen.getByRole('button');
      fireEvent.keyDown(marker, { key: ' ' });
      expect(mockOnClick).toHaveBeenCalledWith(audioAnnotation);
    });
  });

  describe('Tooltip Content', () => {
    it('should truncate long text in tooltip', async () => {
      const longTextAnnotation = {
        ...audioAnnotation,
        selectedText: 'A'.repeat(200),
      };
      render(<AnnotationMarker annotation={longTextAnnotation} onClick={mockOnClick} />);
      const marker = screen.getByRole('button');
      fireEvent.mouseEnter(marker);
      const tooltip = await screen.findByRole('tooltip');
      expect(tooltip.textContent?.length).toBeLessThan(200);
    });

    it('should show media type in tooltip', async () => {
      render(<AnnotationMarker annotation={audioAnnotation} onClick={mockOnClick} />);
      const marker = screen.getByRole('button');
      fireEvent.mouseEnter(marker);
      expect(await screen.findByText(/audio/i)).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('should handle missing position gracefully', () => {
      const noPositionAnnotation = { ...audioAnnotation, position: undefined };
      const { container } = render(<AnnotationMarker annotation={noPositionAnnotation} onClick={mockOnClick} />);
      const marker = container.firstChild as HTMLElement;
      expect(marker).toHaveStyle({ left: '0px', top: '0px' });
    });

    it('should handle empty selected text', async () => {
      const emptyTextAnnotation = { ...audioAnnotation, selectedText: '' };
      render(<AnnotationMarker annotation={emptyTextAnnotation} onClick={mockOnClick} />);
      const marker = screen.getByRole('button');
      fireEvent.mouseEnter(marker);
      expect(await screen.findByText(/no text/i)).toBeInTheDocument();
    });
  });
});
