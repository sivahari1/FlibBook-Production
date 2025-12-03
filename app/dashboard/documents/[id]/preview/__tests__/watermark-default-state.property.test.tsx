/**
 * Property-Based Test: Watermark Default State
 * Feature: preview-settings-workflow, Property 1: Watermark optional by default
 * Validates: Requirements 1.2, 2.1, 2.5
 * 
 * Property: For any preview settings page render, the watermark enable control 
 * should be unchecked/disabled by default
 */

import { render, screen, cleanup } from '@testing-library/react';
import PreviewClient from '../PreviewClient';
import '@testing-library/jest-dom';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fc from 'fast-check';

// Mock fetch
global.fetch = vi.fn();

// Mock Next.js Link
vi.mock('next/link', () => ({
  default: ({ children, href }: any) => {
    return <a href={href}>{children}</a>;
  },
}));

// Mock FlipBookContainerWithDRM
vi.mock('@/components/flipbook/FlipBookContainerWithDRM', () => ({
  FlipBookContainerWithDRM: ({ watermarkText, userEmail, showWatermark }: any) => (
    <div data-testid="flipbook-viewer">
      <div data-testid="watermark-text">{watermarkText}</div>
      <div data-testid="user-email">{userEmail}</div>
      <div data-testid="show-watermark">{showWatermark ? 'true' : 'false'}</div>
    </div>
  ),
}));

// Mock ShareDialog
vi.mock('@/components/dashboard/ShareDialog', () => ({
  ShareDialog: ({ isOpen, documentId, documentTitle }: any) => (
    isOpen ? (
      <div data-testid="share-dialog">
        <div data-testid="share-document-id">{documentId}</div>
        <div data-testid="share-document-title">{documentTitle}</div>
      </div>
    ) : null
  ),
}));

describe('PreviewClient - Property: Watermark Optional by Default', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => ({
        pages: [
          {
            pageNumber: 1,
            pageUrl: 'https://example.com/page1.jpg',
            dimensions: { width: 800, height: 1000 },
          },
        ],
      }),
    });
  });

  afterEach(() => {
    cleanup();
  });

  it('Property 1: Watermark checkbox should be unchecked by default for any valid props', () => {
    fc.assert(
      fc.property(
        // Generate arbitrary valid props
        fc.record({
          documentTitle: fc.string({ minLength: 1, maxLength: 100 }),
          pdfUrl: fc.webUrl(),
          userEmail: fc.emailAddress(),
          documentId: fc.string({ minLength: 1, maxLength: 50 }),
        }),
        (props) => {
          // Render the component with generated props
          const { container } = render(<PreviewClient {...props} />);
          
          // Find the watermark enable checkbox
          const checkbox = container.querySelector('input[type="checkbox"][aria-label="Enable watermark"]');
          
          // Property: The checkbox should exist and be unchecked
          expect(checkbox).toBeInTheDocument();
          expect(checkbox).not.toBeChecked();
        }
      ),
      { numRuns: 100 } // Run 100 iterations as specified in design doc
    );
  });

  it('Property 1: Watermark settings should be hidden by default for any valid props', () => {
    fc.assert(
      fc.property(
        // Generate arbitrary valid props
        fc.record({
          documentTitle: fc.string({ minLength: 1, maxLength: 100 }),
          pdfUrl: fc.webUrl(),
          userEmail: fc.emailAddress(),
          documentId: fc.string({ minLength: 1, maxLength: 50 }),
        }),
        (props) => {
          // Render the component with generated props
          render(<PreviewClient {...props} />);
          
          // Property: Watermark type selection should not be visible when watermark is disabled
          // The "Watermark Type" label should not be present
          const watermarkTypeLabel = screen.queryByText('Watermark Type');
          expect(watermarkTypeLabel).not.toBeInTheDocument();
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Property 1: Enable Watermark label should be visible for any valid props', () => {
    fc.assert(
      fc.property(
        // Generate arbitrary valid props
        fc.record({
          documentTitle: fc.string({ minLength: 1, maxLength: 100 }),
          pdfUrl: fc.webUrl(),
          userEmail: fc.emailAddress(),
          documentId: fc.string({ minLength: 1, maxLength: 50 }),
        }),
        (props) => {
          // Render the component with generated props
          const { unmount } = render(<PreviewClient {...props} />);
          
          // Property: The "Enable Watermark" label should always be visible
          expect(screen.getByText('Enable Watermark')).toBeInTheDocument();
          
          // Cleanup after each property test iteration
          unmount();
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Property 1: Help text for watermark should be visible for any valid props', () => {
    fc.assert(
      fc.property(
        // Generate arbitrary valid props
        fc.record({
          documentTitle: fc.string({ minLength: 1, maxLength: 100 }),
          pdfUrl: fc.webUrl(),
          userEmail: fc.emailAddress(),
          documentId: fc.string({ minLength: 1, maxLength: 50 }),
        }),
        (props) => {
          // Render the component with generated props
          const { unmount } = render(<PreviewClient {...props} />);
          
          // Property: The help text should always be visible
          expect(screen.getByText('Add a watermark to protect your content')).toBeInTheDocument();
          
          // Cleanup after each property test iteration
          unmount();
        }
      ),
      { numRuns: 100 }
    );
  });
});
