import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import LazyPageLoader from '../LazyPageLoader';
import { PageData } from '../SimpleDocumentViewer';

// Mock the lazy loading hook
vi.mock('@/hooks/useLazyPageLoading', () => ({
  useLazyPageLoading: vi.fn(() => ({
    pageStates: new Map([
      [1, { pageNumber: 1, status: 'idle', priority: 'immediate' }],
      [2, { pageNumber: 2, status: 'idle', priority: 'high' }],
      [3, { pageNumber: 3, status: 'idle', priority: 'normal' }],
    ]),
    updatePageState: vi.fn(),
    shouldLoadPage: vi.fn(() => true),
    calculatePagePriority: vi.fn((pageNum) => 
      pageNum === 1 ? 'immediate' : 
      pageNum === 2 ? 'high' : 'normal'
    ),
  })),
}));

// Mock IntersectionObserver
const mockIntersectionObserver = vi.fn();
mockIntersectionObserver.mockReturnValue({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
});
window.IntersectionObserver = mockIntersectionObserver;

// Mock performance.now
Object.defineProperty(window, 'performance', {
  value: { now: vi.fn(() => 1000) },
  writable: true,
});

describe('LazyPageLoader', () => {
  const mockPage: PageData = {
    pageNumber: 1,
    pageUrl: 'https://example.com/page1.jpg',
    dimensions: { width: 800, height: 1000 },
  };

  const defaultProps = {
    page: mockPage,
    currentPage: 1,
    totalPages: 10,
    zoomLevel: 1.0,
    isVisible: true,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('rendering states', () => {
    it('should render idle state initially', () => {
      render(<LazyPageLoader {...defaultProps} />);
      
      expect(screen.getByTestId('lazy-page-1')).toBeInTheDocument();
      expect(screen.getByText('Page 1')).toBeInTheDocument();
      expect(screen.getByText('Priority: immediate')).toBeInTheDocument();
    });

    it('should render loading state', () => {
      const { useLazyPageLoading } = require('@/hooks/useLazyPageLoading');
      useLazyPageLoading.mockReturnValue({
        pageStates: new Map([
          [1, { pageNumber: 1, status: 'loading', priority: 'immediate' }],
        ]),
        updatePageState: vi.fn(),
        shouldLoadPage: vi.fn(() => true),
        calculatePagePriority: vi.fn(() => 'immediate'),
      });

      render(<LazyPageLoader {...defaultProps} />);
      
      expect(screen.getByText('Loading page 1...')).toBeInTheDocument();
    });

    it('should render error state with retry button', () => {
      const { useLazyPageLoading } = require('@/hooks/useLazyPageLoading');
      useLazyPageLoading.mockReturnValue({
        pageStates: new Map([
          [1, { 
            pageNumber: 1, 
            status: 'error', 
            priority: 'immediate',
            error: 'Failed to load page 1',
          }],
        ]),
        updatePageState: vi.fn(),
        shouldLoadPage: vi.fn(() => true),
        calculatePagePriority: vi.fn(() => 'immediate'),
      });

      render(<LazyPageLoader {...defaultProps} />);
      
      expect(screen.getByText('Failed to load page 1')).toBeInTheDocument();
      expect(screen.getByText('Retry (0/3)')).toBeInTheDocument();
    });
  });

  describe('priority handling', () => {
    it('should display correct priority in development mode', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      render(<LazyPageLoader {...defaultProps} />);
      
      expect(screen.getByText('P1 | immediate | idle')).toBeInTheDocument();

      process.env.NODE_ENV = originalEnv;
    });
  });

  describe('accessibility', () => {
    it('should have proper ARIA attributes', () => {
      render(<LazyPageLoader {...defaultProps} />);
      
      const container = screen.getByTestId('lazy-page-1');
      expect(container).toHaveAttribute('role', 'img');
      expect(container).toHaveAttribute('aria-label', 'Page 1 of document');
    });
  });

  describe('intersection observer', () => {
    it('should set up intersection observer for viewport detection', () => {
      render(<LazyPageLoader {...defaultProps} />);
      
      expect(mockIntersectionObserver).toHaveBeenCalledWith(
        expect.any(Function),
        {
          rootMargin: '200px',
          threshold: 0.1,
        }
      );
    });
  });
});