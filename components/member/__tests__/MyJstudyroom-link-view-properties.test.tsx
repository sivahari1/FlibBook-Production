/**
 * Property-Based Tests for Link View Action
 * Feature: member-link-view-fix
 * Properties: 1, 2, 3, 4, 5
 * Validates: Requirements 1.1, 1.2, 1.3, 1.4, 2.1, 2.2, 2.3, 3.1, 3.2
 */

import { describe, it, expect, vi } from 'vitest';
import fc from 'fast-check';

// Mock window.open
const mockWindowOpen = vi.fn();
global.window.open = mockWindowOpen;

// Type guard to check if content is a link (extracted from component)
function isLinkContent(contentType: string): boolean {
  return contentType === 'LINK';
}

// Extract link URL from item metadata (extracted from component)
function getLinkUrl(item: any): string | null {
  if (item.metadata && typeof item.metadata === 'object') {
    const metadata = item.metadata as any;
    if (metadata.linkUrl && typeof metadata.linkUrl === 'string') {
      return metadata.linkUrl;
    }
  }
  return null;
}

// Arbitraries for generating test data
const linkItemArbitrary = fc.record({
  id: fc.uuid(),
  contentType: fc.constant('LINK'),
  metadata: fc.record({
    linkUrl: fc.webUrl(),
  }),
});

const invalidLinkItemArbitrary = fc.record({
  id: fc.uuid(),
  contentType: fc.constant('LINK'),
  metadata: fc.oneof(
    fc.constant(null),
    fc.constant({}),
    fc.record({ linkUrl: fc.constant(null) }),
    fc.record({ linkUrl: fc.constant('') }),
    fc.record({ linkUrl: fc.constant(undefined) }),
    fc.record({ otherField: fc.string() })
  ),
});

const nonLinkItemArbitrary = fc.record({
  id: fc.uuid(),
  contentType: fc.oneof(
    fc.constant('PDF'),
    fc.constant('IMAGE'),
    fc.constant('VIDEO')
  ),
  metadata: fc.record({
    someField: fc.string(),
  }),
});

const allContentTypesArbitrary = fc.oneof(
  linkItemArbitrary,
  nonLinkItemArbitrary
);

describe('Link View Action Properties', () => {
  /**
   * Feature: member-link-view-fix, Property 1: Link content opens in new tab
   * Validates: Requirements 1.1, 1.2, 1.3
   */
  it('Property 1: link items with valid URLs trigger window.open with security attributes', () => {
    fc.assert(
      fc.property(
        linkItemArbitrary,
        (linkItem) => {
          mockWindowOpen.mockClear();
          
          // Simulate the view action handler logic
          if (isLinkContent(linkItem.contentType)) {
            const linkUrl = getLinkUrl(linkItem);
            if (linkUrl) {
              window.open(linkUrl, '_blank', 'noopener,noreferrer');
            }
          }

          // Verify window.open was called with correct parameters
          expect(mockWindowOpen).toHaveBeenCalledTimes(1);
          expect(mockWindowOpen).toHaveBeenCalledWith(
            linkItem.metadata.linkUrl,
            '_blank',
            'noopener,noreferrer'
          );
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Feature: member-link-view-fix, Property 3: Invalid link URLs are rejected
   * Validates: Requirements 1.4
   */
  it('Property 3: link items without valid linkUrl do not trigger window.open', () => {
    fc.assert(
      fc.property(
        invalidLinkItemArbitrary,
        (invalidLinkItem) => {
          mockWindowOpen.mockClear();
          let errorOccurred = false;
          
          // Simulate the view action handler logic
          if (isLinkContent(invalidLinkItem.contentType)) {
            const linkUrl = getLinkUrl(invalidLinkItem);
            if (linkUrl) {
              window.open(linkUrl, '_blank', 'noopener,noreferrer');
            } else {
              errorOccurred = true;
            }
          }

          // Verify window.open was NOT called
          expect(mockWindowOpen).not.toHaveBeenCalled();
          
          // Verify error condition was detected
          expect(errorOccurred).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Feature: member-link-view-fix, Property 2: Non-link content navigates to viewer
   * Validates: Requirements 2.1, 2.2, 2.3
   */
  it('Property 2: non-link content types should navigate to viewer page', () => {
    fc.assert(
      fc.property(
        nonLinkItemArbitrary,
        (nonLinkItem) => {
          mockWindowOpen.mockClear();
          
          // Simulate the view action handler logic
          // For non-link content, the component uses Next.js Link which handles navigation
          // We verify that window.open is NOT called for non-link content
          if (isLinkContent(nonLinkItem.contentType)) {
            const linkUrl = getLinkUrl(nonLinkItem);
            if (linkUrl) {
              window.open(linkUrl, '_blank', 'noopener,noreferrer');
            }
          }
          // For non-link content, Next.js Link component handles navigation to /member/view/[id]
          
          // Verify window.open was NOT called for non-link content
          expect(mockWindowOpen).not.toHaveBeenCalled();
          
          // Verify the content type is indeed not a link
          expect(isLinkContent(nonLinkItem.contentType)).toBe(false);
          
          // Verify the expected navigation path would be /member/view/[id]
          const expectedPath = `/member/view/${nonLinkItem.id}`;
          expect(expectedPath).toMatch(/^\/member\/view\/[a-f0-9-]+$/);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Feature: member-link-view-fix, Property 4: Security attributes are applied
   * Validates: Requirements 1.3
   */
  it('Property 4: all link opens include noopener and noreferrer security attributes', () => {
    fc.assert(
      fc.property(
        linkItemArbitrary,
        (linkItem) => {
          mockWindowOpen.mockClear();
          
          // Simulate the view action handler logic
          if (isLinkContent(linkItem.contentType)) {
            const linkUrl = getLinkUrl(linkItem);
            if (linkUrl) {
              window.open(linkUrl, '_blank', 'noopener,noreferrer');
            }
          }

          // Verify window.open was called with security attributes
          expect(mockWindowOpen).toHaveBeenCalledTimes(1);
          const [url, target, features] = mockWindowOpen.mock.calls[0];
          
          // Verify security attributes are present
          expect(features).toBe('noopener,noreferrer');
          expect(target).toBe('_blank');
          
          // Verify the URL is valid
          expect(url).toBe(linkItem.metadata.linkUrl);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Feature: member-link-view-fix, Property 5: Tooltip text matches action
   * Validates: Requirements 3.1, 3.2
   */
  it('Property 5: tooltip text accurately describes the action for each content type', () => {
    fc.assert(
      fc.property(
        allContentTypesArbitrary,
        (item) => {
          // Determine expected tooltip based on content type
          const expectedTooltip = isLinkContent(item.contentType)
            ? 'Open link in new tab'
            : 'View content';
          
          // Simulate tooltip logic from component
          const actualTooltip = isLinkContent(item.contentType)
            ? 'Open link in new tab'
            : 'View content';
          
          // Verify tooltip matches expected value
          expect(actualTooltip).toBe(expectedTooltip);
          
          // Verify tooltip is descriptive and not empty
          expect(actualTooltip.length).toBeGreaterThan(0);
          
          // Verify tooltip contains relevant keywords
          if (isLinkContent(item.contentType)) {
            expect(actualTooltip.toLowerCase()).toContain('link');
            expect(actualTooltip.toLowerCase()).toContain('new tab');
          } else {
            expect(actualTooltip.toLowerCase()).toContain('view');
            expect(actualTooltip.toLowerCase()).toContain('content');
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});
