import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import FlipBookError from '../FlipBookError';

describe('FlipBookError', () => {
  const mockOnRetry = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render error message', () => {
    render(<FlipBookError message="Failed to load document" />);
    expect(screen.getByText(/failed to load document/i)).toBeInTheDocument();
  });

  it('should render default error message when none provided', () => {
    render(<FlipBookError />);
    expect(screen.getByText(/error/i)).toBeInTheDocument();
  });

  it('should render retry button when onRetry provided', () => {
    render(<FlipBookError message="Error" onRetry={mockOnRetry} />);
    expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
  });

  it('should not render retry button when onRetry not provided', () => {
    render(<FlipBookError message="Error" />);
    expect(screen.queryByRole('button', { name: /retry/i })).not.toBeInTheDocument();
  });

  it('should call onRetry when retry button clicked', () => {
    render(<FlipBookError message="Error" onRetry={mockOnRetry} />);
    const retryButton = screen.getByRole('button', { name: /retry/i });
    fireEvent.click(retryButton);
    expect(mockOnRetry).toHaveBeenCalledTimes(1);
  });

  it('should display error icon', () => {
    render(<FlipBookError message="Error" />);
    expect(screen.getByRole('img', { name: /error/i })).toBeInTheDocument();
  });

  it('should have proper error styling', () => {
    const { container } = render(<FlipBookError message="Error" />);
    const errorContainer = container.firstChild as HTMLElement;
    expect(errorContainer).toHaveClass('error');
  });
});
