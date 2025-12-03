/**
 * Property-Based Tests for DocumentCard Preview Link Security Attributes
 * Feature: preview-new-tab, Property 1: Security attributes present
 * Validates: Requirements 1.4, 2.1
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import * as fc from 'fast-check';
import { DocumentCard } from '../DocumentCard';

describe('DocumentCard Preview Link Security', () => {
  describe('Property 1: Security attributes present', () => {
    it('should have target="_blank" and rel="noopener noreferrer" for any document', () => {
      fc.assert(
        fc.property(
          // Generate arbitrary document data
          fc.record({
            id: fc.uuid(),
            title: fc.string({ minLength: 1, maxLength: 100 }),
            filename: fc.string({ minLength: 1, maxLength: 100 }).map(s => s + '.pdf'),
            fileSize: fc.bigInt({ min: 1n, max: 100000000n }),
            createdAt: fc.integer({ min: 1577836800000, max: 1735689600000 }).map(ts => new Date(ts).toISOString()),
            contentType: fc.constantFrom('PDF', 'IMAGE', 'VIDEO', 'LINK', undefined),
            metadata: fc.option(fc.record({
              width: fc.option(fc.integer({ min: 1, max: 10000 })),
              height: fc.option(fc.integer({ min: 1, max: 10000 })),
              duration: fc.option(fc.integer({ min: 1, max: 10000 })),
              domain: fc.option(fc.webUrl().map(url => new URL(url).hostname)),
            }), { nil: undefined }),
            linkUrl: fc.option(fc.webUrl(), { nil: undefined }),
          }),
          (document) => {
            // Render the component with the generated document
            const { unmount } = render(
              <DocumentCard
                document={document}
                onDelete={() => {}}
                onShare={() => {}}
                onViewAnalytics={() => {}}
              />
            );

            // Find the preview link
            const previewLink = screen.getByRole('link', { name: /preview/i });

            // Property: For any document, the preview link must have security attributes
            expect(previewLink).toHaveAttribute('target', '_blank');
            expect(previewLink).toHaveAttribute('rel', 'noopener noreferrer');
            expect(previewLink).toHaveAttribute('href', `/dashboard/documents/${document.id}/preview`);

            unmount();
          }
        ),
        { numRuns: 100 } // Run 100 iterations as specified in design
      );
    });

    it('should be a proper anchor element for any document', () => {
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

            // Property: The preview element must be a proper anchor tag
            expect(previewLink.tagName).toBe('A');

            unmount();
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should maintain security attributes with different content types', () => {
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

            // Property: Security attributes must be present regardless of content type
            expect(previewLink).toHaveAttribute('target', '_blank');
            expect(previewLink).toHaveAttribute('rel', 'noopener noreferrer');

            unmount();
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
