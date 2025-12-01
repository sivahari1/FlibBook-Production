import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import FlipBookLoading from '../FlipBookLoading';

describe('FlipBookLoading', () => {
  it('should render loading spinner', () => {
    render(<FlipBookLoading />);
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('should display loading message', () => {
    render(<FlipBookLoading />);
    expect(screen.getByText(/loading/i)).toBeInTheDocument();
  });

  it('should have proper accessibility attributes', () => {
    render(<FlipBookLoading />);
    const spinner = screen.getByRole('status');
    expect(spinner).toHaveAttribute('aria-live', 'polite');
  });

  it('should render with custom message', () => {
    render(<FlipBookLoading message="Converting pages..." />);
    expect(screen.getByText(/converting pages/i)).toBeInTheDocument();
  });
});
