/**
 * Property-Based Test: Settings State Preservation
 * Feature: preview-settings-workflow, Property 2: Settings state preservation
 * Validates: Requirements 1.3
 * 
 * Property: For any user interaction with preview settings, the configured values 
 * should be preserved in component state until preview is opened or page is navigated away
 */

import { render, screen, cleanup, fireEvent, waitFor } from '@testing-library/react';
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

describe('PreviewClient - Property: Settings State Preservation', () => {
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

  it('Property 2: Watermark text should be preserved after user input', () => {
    fc.assert(
      fc.property(
        // Generate arbitrary valid props and watermark text
        fc.record({
          documentTitle: fc.string({ minLength: 1, maxLength: 100 }),
          pdfUrl: fc.webUrl(),
          userEmail: fc.emailAddress(),
          documentId: fc.string({ minLength: 1, maxLength: 50 }),
          watermarkText: fc.string({ minLength: 1, maxLength: 100 }),
        }),
        (props) => {
          // Render the component
          const { container, unmount } = render(<PreviewClient {...props} />);
          
          // Enable watermark
          const checkbox = container.querySelector('input[type="checkbox"][aria-label="Enable watermark"]');
          expect(checkbox).toBeInTheDocument();
          fireEvent.click(checkbox!);
          
          // Find and update watermark text input
          const textInput = screen.getByPlaceholderText('Enter watermark text');
          fireEvent.change(textInput, { target: { value: props.watermarkText } });
          
          // Property: The input value should be preserved
          expect(textInput).toHaveValue(props.watermarkText);
          
          unmount();
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Property 2: Watermark opacity should be preserved after user adjustment', () => {
    fc.assert(
      fc.property(
        // Generate arbitrary valid props and opacity value
        fc.record({
          documentTitle: fc.string({ minLength: 1, maxLength: 100 }),
          pdfUrl: fc.webUrl(),
          userEmail: fc.emailAddress(),
          documentId: fc.string({ minLength: 1, maxLength: 50 }),
          opacity: fc.double({ min: 0.1, max: 0.8, noNaN: true }),
        }),
        (props) => {
          // Render the component
          const { container, unmount } = render(<PreviewClient {...props} />);
          
          // Enable watermark
          const checkbox = container.querySelector('input[type="checkbox"][aria-label="Enable watermark"]');
          fireEvent.click(checkbox!);
          
          // Find opacity slider
          const opacitySlider = container.querySelector('input[type="range"][min="0.1"][max="0.8"]');
          expect(opacitySlider).toBeInTheDocument();
          
          // Round opacity to nearest 0.1 to match slider step
          const roundedOpacity = Math.round(props.opacity * 10) / 10;
          fireEvent.change(opacitySlider!, { target: { value: roundedOpacity.toString() } });
          
          // Property: The slider value should be preserved
          expect(opacitySlider).toHaveValue(roundedOpacity.toString());
          
          unmount();
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Property 2: Watermark size should be preserved after user adjustment', () => {
    fc.assert(
      fc.property(
        // Generate arbitrary valid props and size value
        fc.record({
          documentTitle: fc.string({ minLength: 1, maxLength: 100 }),
          pdfUrl: fc.webUrl(),
          userEmail: fc.emailAddress(),
          documentId: fc.string({ minLength: 1, maxLength: 50 }),
          size: fc.integer({ min: 12, max: 32 }),
        }),
        (props) => {
          // Render the component
          const { container, unmount } = render(<PreviewClient {...props} />);
          
          // Enable watermark
          const checkbox = container.querySelector('input[type="checkbox"][aria-label="Enable watermark"]');
          fireEvent.click(checkbox!);
          
          // Find size slider
          const sizeSlider = container.querySelector('input[type="range"][min="12"][max="32"]');
          expect(sizeSlider).toBeInTheDocument();
          
          fireEvent.change(sizeSlider!, { target: { value: props.size.toString() } });
          
          // Property: The slider value should be preserved
          expect(sizeSlider).toHaveValue(props.size.toString());
          
          unmount();
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Property 2: Watermark type selection should be preserved after user change', () => {
    fc.assert(
      fc.property(
        // Generate arbitrary valid props
        fc.record({
          documentTitle: fc.string({ minLength: 1, maxLength: 100 }),
          pdfUrl: fc.webUrl(),
          userEmail: fc.emailAddress(),
          documentId: fc.string({ minLength: 1, maxLength: 50 }),
          watermarkType: fc.constantFrom('text', 'image'),
        }),
        (props) => {
          // Render the component
          const { container, unmount } = render(<PreviewClient {...props} />);
          
          // Enable watermark
          const checkbox = container.querySelector('input[type="checkbox"][aria-label="Enable watermark"]');
          fireEvent.click(checkbox!);
          
          // Find and click the appropriate watermark type button
          const typeButton = screen.getByText(
            props.watermarkType === 'text' ? 'Text Watermark' : 'Image Watermark'
          ).closest('button');
          expect(typeButton).toBeInTheDocument();
          fireEvent.click(typeButton!);
          
          // Property: The button should have the selected styling
          expect(typeButton).toHaveClass('border-blue-500', 'bg-blue-50');
          
          unmount();
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Property 2: Enable watermark state should be preserved after toggling', () => {
    fc.assert(
      fc.property(
        // Generate arbitrary valid props
        fc.record({
          documentTitle: fc.string({ minLength: 1, maxLength: 100 }),
          pdfUrl: fc.webUrl(),
          userEmail: fc.emailAddress(),
          documentId: fc.string({ minLength: 1, maxLength: 50 }),
          enableWatermark: fc.boolean(),
        }),
        (props) => {
          // Render the component
          const { container, unmount } = render(<PreviewClient {...props} />);
          
          // Find the watermark enable checkbox
          const checkbox = container.querySelector('input[type="checkbox"][aria-label="Enable watermark"]');
          expect(checkbox).toBeInTheDocument();
          
          // Set checkbox to desired state
          if (props.enableWatermark) {
            if (!checkbox!.checked) {
              fireEvent.click(checkbox!);
            }
          } else {
            if (checkbox!.checked) {
              fireEvent.click(checkbox!);
            }
          }
          
          // Property: The checkbox state should match the desired state
          if (props.enableWatermark) {
            expect(checkbox).toBeChecked();
          } else {
            expect(checkbox).not.toBeChecked();
          }
          
          unmount();
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Property 2: Settings should persist across multiple interactions', () => {
    fc.assert(
      fc.property(
        // Generate arbitrary valid props and multiple setting values
        fc.record({
          documentTitle: fc.string({ minLength: 1, maxLength: 100 }),
          pdfUrl: fc.webUrl(),
          userEmail: fc.emailAddress(),
          documentId: fc.string({ minLength: 1, maxLength: 50 }),
          watermarkText: fc.string({ minLength: 1, maxLength: 100 }),
          opacity: fc.double({ min: 0.1, max: 0.8, noNaN: true }),
          size: fc.integer({ min: 12, max: 32 }),
        }),
        (props) => {
          // Render the component
          const { container, unmount } = render(<PreviewClient {...props} />);
          
          // Enable watermark
          const checkbox = container.querySelector('input[type="checkbox"][aria-label="Enable watermark"]');
          fireEvent.click(checkbox!);
          
          // Set watermark text
          const textInput = screen.getByPlaceholderText('Enter watermark text');
          fireEvent.change(textInput, { target: { value: props.watermarkText } });
          
          // Set opacity
          const opacitySlider = container.querySelector('input[type="range"][min="0.1"][max="0.8"]');
          const roundedOpacity = Math.round(props.opacity * 10) / 10;
          fireEvent.change(opacitySlider!, { target: { value: roundedOpacity.toString() } });
          
          // Set size
          const sizeSlider = container.querySelector('input[type="range"][min="12"][max="32"]');
          fireEvent.change(sizeSlider!, { target: { value: props.size.toString() } });
          
          // Property: All settings should be preserved simultaneously
          expect(textInput).toHaveValue(props.watermarkText);
          expect(opacitySlider).toHaveValue(roundedOpacity.toString());
          expect(sizeSlider).toHaveValue(props.size.toString());
          expect(checkbox).toBeChecked();
          
          unmount();
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Property 2: Watermark settings should remain hidden when watermark is disabled', () => {
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
          // Render the component
          const { container, unmount } = render(<PreviewClient {...props} />);
          
          // Ensure watermark is disabled (default state)
          const checkbox = container.querySelector('input[type="checkbox"][aria-label="Enable watermark"]');
          expect(checkbox).not.toBeChecked();
          
          // Property: Watermark settings should not be visible
          const watermarkTypeLabel = screen.queryByText('Watermark Type');
          expect(watermarkTypeLabel).not.toBeInTheDocument();
          
          unmount();
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Property 2: Watermark settings should become visible when watermark is enabled', () => {
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
          // Render the component
          const { container, unmount } = render(<PreviewClient {...props} />);
          
          // Enable watermark
          const checkbox = container.querySelector('input[type="checkbox"][aria-label="Enable watermark"]');
          fireEvent.click(checkbox!);
          
          // Property: Watermark settings should now be visible
          const watermarkTypeLabel = screen.getByText('Watermark Type');
          expect(watermarkTypeLabel).toBeInTheDocument();
          
          unmount();
        }
      ),
      { numRuns: 100 }
    );
  });
});
