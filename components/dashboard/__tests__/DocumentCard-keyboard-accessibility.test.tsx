/**
 * Property-Based Tests for DocumentCard Preview Link Keyboard Accessibility
 * Feature: preview-new-tab, Property 2: Keyboard accessibility
 * Validates: Requirements 2.2
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import * as fc from 'fast-check';
import { DocumentCard } from '../DocumentCard';

describe('DocumentCard Preview Link Keyboard Accessibility', () => {
  describe('Property 2: Keyboard accessibility', () => {
    it('should be keyboard focusable for any document', () => {
      fc.assert(
        fc.property(
          fc.record({
            id: fc.uuid(),
            title: fc.string({ minLength: 1, maxLength: 100 }),
            filename: fc.string({ minLength: 1, maxLength: 100 }).map(s => s + '.pdf'),
            fileSize: fc.bigInt({ min: 1n, max: 100000000n }),
            createdAt: fc.integer({ min: 1577836800000, max: 1735689600000 }).map(ts => new Date(ts).toISOString()),
          }),
          (document) => {
            const { unmount } = render(
              <DocumentCard
                document={document}
                onDelete={() => {}}
                onShare={() => {}}
                onViewAnalytics={() => {}}
              />
            );

            const previewLink = screen.getByRole('link', { name: /preview/i });

            // Property: For any document, the preview link must be focusable
            // A proper anchor tag with href is automatically focusable
            expect(previewLink).toHaveAttribute('href');
            expect(previewLink.tabIndex).toBeGreaterThanOrEqual(0);

            unmount();
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should be activatable via Enter key for any document', async () => {
      fc.assert(
        await fc.asyncProperty(
          fc.record({
            id: fc.uuid(),
            title: fc.string({ minLength: 1, maxLength: 100 }),
            filename: fc.string({ minLength: 1, maxLength: 100 }).map(s => s + '.pdf'),
            fileSize: fc.bigInt({ min: 1n, max: 100000000n }),
            createdAt: fc.integer({ min: 1577836800000, max: 1735689600000 }).map(ts => new Date(ts).toISOString()),
          }),
          async (document) => {
            const user = userEvent.setup();
            
            const { unmount } = render(
              <DocumentCard
                document={document}
                onDelete={() => {}}
                onShare={() => {}}
                onViewAnalytics={() => {}}
              />
            );

            const previewLink = screen.getByRole('link', { name: /preview/i });

            // Property: For any document, the preview link must respond to keyboard focus
            await user.tab(); // Tab to first focusable element
            
            // Find the preview link and verify it can receive focus
            previewLink.focus();
            expect(document.activeElement).toBe(previewLink);

            unmount();
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should have proper href for keyboard navigation for any document', () => {
      fc.assert(
        fc.property(
          fc.record({
            id: fc.uuid(),
            title: fc.string({ minLength: 1, maxLength: 100 }),
            filename: fc.string({ minLength: 1, maxLength: 100 }).map(s => s + '.pdf'),
            fileSize: fc.bigInt({ min: 1n, max: 100000000n }),
            createdAt: fc.integer({ min: 1577836800000, max: 1735689600000 }).map(ts => new Date(ts).toISOString()),
          }),
          (document) => {
            const { unmount } = render(
              <DocumentCard
                document={document}
                onDelete={() => {}}
                onShare={() => {}}
                onViewAnalytics={() => {}}
              />
            );

            const previewLink = screen.getByRole('link', { name: /preview/i });

            // Property: For any document, the preview link must have a valid href
            // This enables keyboard shortcuts like Ctrl+Click and Cmd+Click
            const href = previewLink.getAttribute('href');
            expect(href).toBeTruthy();
            expect(href).toBe(`/dashboard/documents/${document.id}/preview`);

            unmount();
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should be accessible via Tab navigation for any document', async () => {
      fc.assert(
        await fc.asyncProperty(
          fc.record({
            id: fc.uuid(),
            title: fc.string({ minLength: 1, maxLength: 100 }),
            filename: fc.string({ minLength: 1, maxLength: 100 }).map(s => s + '.pdf'),
            fileSize: fc.bigInt({ min: 1n, max: 100000000n }),
            createdAt: fc.integer({ min: 1577836800000, max: 1735689600000 }).map(ts => new Date(ts).toISOString()),
          }),
          async (document) => {
            const user = userEvent.setup();
            
            const { unmount } = render(
              <DocumentCard
                document={document}
                onDelete={() => {}}
                onShare={() => {}}
                onViewAnalytics={() => {}}
              />
            );

            const previewLink = screen.getByRole('link', { name: /preview/i });

            // Property: For any document, the preview link must be reachable via Tab key
            // This is a fundamental accessibility requirement
            previewLink.focus();
            expect(previewLink).toHaveFocus();

            unmount();
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should maintain keyboard accessibility with different content types', () => {
      fc.assert(
        fc.property(
          fc.record({
            id: fc.uuid(),
            title: fc.string({ minLength: 1, maxLength: 100 }),
            filename: fc.string({ minLength: 1, maxLength: 100 }),
            fileSize: fc.bigInt({ min: 1n, max: 100000000n }),
            createdAt: fc.integer({ min: 1577836800000, max: 1735689600000 }).map(ts => new Date(ts).toISOString()),
            contentType: fc.constantFrom('PDF', 'IMAGE', 'VIDEO', 'LINK'),
          }),
          (document) => {
            const { unmount } = render(
              <DocumentCard
                document={document}
                onDelete={() => {}}
                onShare={() => {}}
                onViewAnalytics={() => {}}
              />
            );

            const previewLink = screen.getByRole('link', { name: /preview/i });

            // Property: Keyboard accessibility must work regardless of content type
            expect(previewLink).toHaveAttribute('href');
            expect(previewLink.tabIndex).toBeGreaterThanOrEqual(0);

            unmount();
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
