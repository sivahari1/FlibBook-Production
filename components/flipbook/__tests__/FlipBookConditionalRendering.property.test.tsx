/**
 * Property-Based Test: Watermark Conditional Rendering
 * Feature: preview-display-fix, Property 5: Watermark conditional rendering
 * Validates: Requirements 5.2
 * 
 * Property: For any preview with watermark disabled, no watermark-related DOM elements 
 * should be rendered in the page
 */

import { render, cleanup } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { FlipBookContainerWithDRM } from '../FlipBookContainerWithDRM';
import * as fc from 'fast-check';
import React from 'react';

// Mock next-auth
vi.mock('next-auth/react', () => ({
  useSession: () => ({
    data: {
      user: {
        id: 'test-user-id',
        email: 'test@example.com',
        role: 'PLATFORM_USER',
      },
    },
    status: 'authenticated',
  }),
  SessionProvider: ({ children }: any) => children,
}));

// Mock FlipBookViewerWithDRM to capture props and render watermark conditionally
let capturedProps: any = null;
vi.mock('../FlipBookViewerWithDRM', () => ({
  FlipBookViewerWithDRM: (props: any) => {
    capturedProps = props;
    return (
      <div data-testid="mock-flipbook-viewer">
        {/* Simulate watermark rendering logic */}
        {props.watermarkText && (
          <div data-testid="watermark-element" aria-label="watermark">
            {props.watermarkText}
          </div>
        )}
        <div data-testid="content">Content</div>
      </div>
    );
  },
}));

// Mock DRMProtection
vi.mock('../security/DRMProtection', () => ({
  default: ({ children }: any) => <div data-testid="drm-protection">{children}</div>,
}));

describe('FlipBookContainerWithDRM - Property: Watermark Conditional Rendering', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    capturedProps = null;
  });

  afterEach(() => {
    cleanup();
  });

  /**
   * Property 5: Watermark conditional rendering
   * For any preview with watermark disabled, no watermark-related DOM elements 
   * should be rendered in the page
   * Validates: Requirements 5.2
   */
  it('Property 5: For any component without showWatermark=true, no watermark DOM elements should be rendered', () => {
    fc.assert(
      fc.property(
        // Generate arbitrary valid component props without watermark enabled
        fc.record({
          documentId: fc.stringMatching(/^[a-zA-Z0-9_-]+$/),
          pages: fc.array(
            fc.record({
              pageNumber: fc.integer({ min: 1, max: 1000 }),
              imageUrl: fc.webUrl(),
              width: fc.integer({ min: 400, max: 2000 }),
              height: fc.integer({ min: 400, max: 3000 }),
            }),
            { minLength: 1, maxLength: 10 }
          ),
          userEmail: fc.emailAddress(),
          watermarkText: fc.option(fc.string({ minLength: 1, maxLength: 100 }), { nil: undefined }),
          // Explicitly NOT including showWatermark or setting it to false
          showWatermark: fc.constantFrom(undefined, false),
        }),
        (props) => {
          // Render the component with generated props
          const { container, unmount } = render(<FlipBookContainerWithDRM {...props} />);
          
          try {
            // Property: No watermark elements should be present in the DOM
            const watermarkElements = container.querySelectorAll('[data-testid="watermark-element"]');
            expect(watermarkElements.length).toBe(0);
            
            // Also check using aria-label
            const watermarkByLabel = container.querySelector('[aria-label="watermark"]');
            expect(watermarkByLabel).toBeNull();
            
            // Verify content is still rendered
            const contentElements = container.querySelectorAll('[data-testid="content"]');
            expect(contentElements.length).toBeGreaterThan(0);
            
            // Verify watermarkText passed to child is undefined
            expect(capturedProps.watermarkText).toBeUndefined();
          } finally {
            unmount();
          }
        }
      ),
      { numRuns: 100 } // Run 100 iterations as specified in design doc
    );
  });

  /**
   * Property 5: Watermark conditional rendering (inverse test)
   * For any preview WITH watermark enabled and text provided,
   * watermark DOM elements SHOULD be rendered
   */
  it('Property 5 (inverse): For any component with showWatermark=true and watermarkText, watermark DOM elements should be rendered', () => {
    fc.assert(
      fc.property(
        // Generate arbitrary valid component props with watermark enabled
        fc.record({
          documentId: fc.stringMatching(/^[a-zA-Z0-9_-]+$/),
          pages: fc.array(
            fc.record({
              pageNumber: fc.integer({ min: 1, max: 1000 }),
              imageUrl: fc.webUrl(),
              width: fc.integer({ min: 400, max: 2000 }),
              height: fc.integer({ min: 400, max: 3000 }),
            }),
            { minLength: 1, maxLength: 10 }
          ),
          userEmail: fc.emailAddress(),
          watermarkText: fc.string({ minLength: 1, maxLength: 100 }),
          showWatermark: fc.constant(true),
        }),
        (props) => {
          // Render the component with generated props
          const { container, unmount } = render(<FlipBookContainerWithDRM {...props} />);
          
          try {
            // Property: Watermark elements SHOULD be present in the DOM
            const watermarkElements = container.querySelectorAll('[data-testid="watermark-element"]');
            expect(watermarkElements.length).toBeGreaterThan(0);
            
            // Also check using aria-label
            const watermarkByLabel = container.querySelector('[aria-label="watermark"]');
            expect(watermarkByLabel).not.toBeNull();
            expect(watermarkByLabel?.textContent).toBe(props.watermarkText);
            
            // Verify content is still rendered
            const contentElements = container.querySelectorAll('[data-testid="content"]');
            expect(contentElements.length).toBeGreaterThan(0);
            
            // Verify watermarkText passed to child matches input
            expect(capturedProps.watermarkText).toBe(props.watermarkText);
          } finally {
            unmount();
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 5: Watermark conditional rendering (edge case - empty string)
   * For any preview with showWatermark=true but empty watermarkText,
   * no watermark DOM elements should be rendered
   */
  it('Property 5 (edge case): For any component with showWatermark=true but empty watermarkText, no watermark DOM elements should be rendered', () => {
    fc.assert(
      fc.property(
        // Generate arbitrary valid component props with empty watermark text
        fc.record({
          documentId: fc.stringMatching(/^[a-zA-Z0-9_-]+$/),
          pages: fc.array(
            fc.record({
              pageNumber: fc.integer({ min: 1, max: 1000 }),
              imageUrl: fc.webUrl(),
              width: fc.integer({ min: 400, max: 2000 }),
              height: fc.integer({ min: 400, max: 3000 }),
            }),
            { minLength: 1, maxLength: 10 }
          ),
          userEmail: fc.emailAddress(),
          watermarkText: fc.constant(''),
          showWatermark: fc.constant(true),
        }),
        (props) => {
          // Render the component with generated props
          const { container, unmount } = render(<FlipBookContainerWithDRM {...props} />);
          
          try {
            // Property: No watermark elements should be present when text is empty
            const watermarkElements = container.querySelectorAll('[data-testid="watermark-element"]');
            expect(watermarkElements.length).toBe(0);
            
            // Also check using aria-label
            const watermarkByLabel = container.querySelector('[aria-label="watermark"]');
            expect(watermarkByLabel).toBeNull();
            
            // Verify content is still rendered
            const contentElements = container.querySelectorAll('[data-testid="content"]');
            expect(contentElements.length).toBeGreaterThan(0);
            
            // Verify watermarkText passed to child is undefined
            expect(capturedProps.watermarkText).toBeUndefined();
          } finally {
            unmount();
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 5: Watermark conditional rendering (consistency check)
   * For any two renders with the same props (watermark disabled),
   * the DOM structure should be consistent (no watermark elements)
   */
  it('Property 5 (consistency): Multiple renders with watermark disabled should consistently have no watermark DOM elements', () => {
    fc.assert(
      fc.property(
        // Generate arbitrary valid component props without watermark
        fc.record({
          documentId: fc.stringMatching(/^[a-zA-Z0-9_-]+$/),
          pages: fc.array(
            fc.record({
              pageNumber: fc.integer({ min: 1, max: 1000 }),
              imageUrl: fc.webUrl(),
              width: fc.integer({ min: 400, max: 2000 }),
              height: fc.integer({ min: 400, max: 3000 }),
            }),
            { minLength: 1, maxLength: 10 }
          ),
          userEmail: fc.emailAddress(),
          watermarkText: fc.option(fc.string({ minLength: 1, maxLength: 100 }), { nil: undefined }),
          showWatermark: fc.constantFrom(undefined, false),
        }),
        (props) => {
          // First render
          const { container: container1, unmount: unmount1 } = render(
            <FlipBookContainerWithDRM {...props} />
          );
          const watermarkCount1 = container1.querySelectorAll('[data-testid="watermark-element"]').length;
          unmount1();
          
          // Second render with same props
          const { container: container2, unmount: unmount2 } = render(
            <FlipBookContainerWithDRM {...props} />
          );
          const watermarkCount2 = container2.querySelectorAll('[data-testid="watermark-element"]').length;
          unmount2();
          
          // Property: Both renders should have the same watermark element count (zero)
          expect(watermarkCount1).toBe(watermarkCount2);
          expect(watermarkCount1).toBe(0);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 5: Watermark conditional rendering (whitespace handling)
   * For any preview with showWatermark=true but whitespace-only watermarkText,
   * watermark should still render (whitespace is valid text)
   */
  it('Property 5 (whitespace): For any component with showWatermark=true and whitespace watermarkText, watermark DOM elements should be rendered', () => {
    fc.assert(
      fc.property(
        // Generate arbitrary valid component props with whitespace watermark text
        fc.record({
          documentId: fc.stringMatching(/^[a-zA-Z0-9_-]+$/),
          pages: fc.array(
            fc.record({
              pageNumber: fc.integer({ min: 1, max: 1000 }),
              imageUrl: fc.webUrl(),
              width: fc.integer({ min: 400, max: 2000 }),
              height: fc.integer({ min: 400, max: 3000 }),
            }),
            { minLength: 1, maxLength: 10 }
          ),
          userEmail: fc.emailAddress(),
          watermarkText: fc.stringMatching(/^\s+$/), // Only whitespace
          showWatermark: fc.constant(true),
        }),
        (props) => {
          // Render the component with generated props
          const { container, unmount } = render(<FlipBookContainerWithDRM {...props} />);
          
          try {
            // Property: Watermark elements SHOULD be present even with whitespace
            // (the component logic treats whitespace as valid text)
            const watermarkElements = container.querySelectorAll('[data-testid="watermark-element"]');
            expect(watermarkElements.length).toBeGreaterThan(0);
            
            // Verify watermarkText passed to child matches input
            expect(capturedProps.watermarkText).toBe(props.watermarkText);
          } finally {
            unmount();
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 5: Watermark conditional rendering (no watermarkText prop)
   * For any preview with showWatermark=true but NO watermarkText prop provided,
   * no watermark DOM elements should be rendered
   */
  it('Property 5 (no text prop): For any component with showWatermark=true but no watermarkText prop, no watermark DOM elements should be rendered', () => {
    fc.assert(
      fc.property(
        // Generate arbitrary valid component props without watermarkText
        fc.record({
          documentId: fc.stringMatching(/^[a-zA-Z0-9_-]+$/),
          pages: fc.array(
            fc.record({
              pageNumber: fc.integer({ min: 1, max: 1000 }),
              imageUrl: fc.webUrl(),
              width: fc.integer({ min: 400, max: 2000 }),
              height: fc.integer({ min: 400, max: 3000 }),
            }),
            { minLength: 1, maxLength: 10 }
          ),
          userEmail: fc.emailAddress(),
          showWatermark: fc.constant(true),
          // Explicitly NOT providing watermarkText
        }),
        (props) => {
          // Render the component with generated props
          const { container, unmount } = render(<FlipBookContainerWithDRM {...props} />);
          
          try {
            // Property: No watermark elements should be present when text is not provided
            const watermarkElements = container.querySelectorAll('[data-testid="watermark-element"]');
            expect(watermarkElements.length).toBe(0);
            
            // Also check using aria-label
            const watermarkByLabel = container.querySelector('[aria-label="watermark"]');
            expect(watermarkByLabel).toBeNull();
            
            // Verify content is still rendered
            const contentElements = container.querySelectorAll('[data-testid="content"]');
            expect(contentElements.length).toBeGreaterThan(0);
            
            // Verify watermarkText passed to child is undefined
            expect(capturedProps.watermarkText).toBeUndefined();
          } finally {
            unmount();
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});
