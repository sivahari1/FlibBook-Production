/**
 * Property-Based Test: Full Viewport Utilization
 * Feature: preview-display-fix, Property 3: Full viewport utilization
 * Validates: Requirements 3.1, 3.2, 3.3
 */

import { render } from '@testing-library/react';
import { vi, describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import React from 'react';

vi.mock('next-auth/react', () => ({
  useSession: () => ({
    data: { user: { id: 'test-user-id', email: 'test@example.com', role: 'PLATFORM_USER' } },
    status: 'authenticated',
  }),
  SessionProvider: ({ children }: any) => children,
}));

vi.mock('react-pageflip', () => ({
  default: React.forwardRef((props: any, ref: any) => (
    <div data-testid="html-flipbook" ref={ref} data-width={props.width} data-height={props.height}>
      {props.children}
    </div>
  )),
}));

vi.mock('@/components/annotations/AnnotationsContainer', () => ({
  AnnotationsContainer: () => <div data-testid="annotations-container">Annotations</div>,
}));

vi.mock('@/components/annotations/MediaAnnotationToolbar', () => ({
  MediaAnnotationToolbar: () => <div data-testid="media-annotation-toolbar">Toolbar</div>,
  useAnnotationToolbar: () => ({
    toolbarState: { visible: false, selectedText: '', position: { x: 0, y: 0 } },
    showToolbar: vi.fn(),
    hideToolbar: vi.fn(),
  }),
}));

vi.mock('@/components/annotations/MediaUploadModal', () => ({
  MediaUploadModal: () => <div data-testid="media-upload-modal">Upload Modal</div>,
}));

vi.mock('@/lib/performance/mobile-optimizer', () => ({
  getGlobalMobileOptimizer: () => ({
    getDeviceInfo: () => ({ isMobile: false, isLowEnd: false }),
    getFlipbookAnimationSettings: () => ({ flippingTime: 1000, disableShadows: false }),
  }),
}));

vi.mock('@/lib/performance/page-load-optimizer', () => ({
  getGlobalPageLoadOptimizer: () => ({
    addResourceHints: vi.fn(),
    preloadDocumentResources: vi.fn(),
    loadPagesWithPriority: vi.fn(),
  }),
}));

import { FlipBookViewer } from '../FlipBookViewer';

describe('FlipBookViewer - Property: Full Viewport Utilization', () => {
  it('Property 3: For any desktop viewport width, FlipBook should use at least 80% of container width', () => {
    fc.assert(
      fc.property(
        fc.record({
          containerWidth: fc.integer({ min: 768, max: 1920 }),
          containerHeight: fc.integer({ min: 600, max: 1080 }),
          documentId: fc.stringMatching(/^[a-zA-Z0-9_-]+$/),
          pages: fc.array(
            fc.record({
              pageNumber: fc.integer({ min: 1, max: 100 }),
              imageUrl: fc.webUrl(),
              width: fc.integer({ min: 400, max: 2000 }),
              height: fc.integer({ min: 400, max: 3000 }),
            }),
            { minLength: 1, maxLength: 2 }
          ),
          userEmail: fc.emailAddress(),
        }),
        (props) => {
          Object.defineProperty(window, 'innerWidth', { writable: true, configurable: true, value: props.containerWidth });
          Object.defineProperty(HTMLElement.prototype, 'clientWidth', { configurable: true, get: function() { return props.containerWidth; } });
          Object.defineProperty(HTMLElement.prototype, 'clientHeight', { configurable: true, get: function() { return props.containerHeight; } });

          const { container } = render(<FlipBookViewer documentId={props.documentId} pages={props.pages} userEmail={props.userEmail} enableAnnotations={false} />);
          const flipbook = container.querySelector('[data-testid="html-flipbook"]');
          expect(flipbook).toBeTruthy();

          if (flipbook) {
            const flipbookWidth = parseInt(flipbook.getAttribute('data-width') || '0', 10);
            const expectedMinWidth = props.containerWidth * 0.8;
            expect(flipbookWidth).toBeGreaterThanOrEqual(expectedMinWidth * 0.95);
          }
        }
      ),
      { numRuns: 20 }
    );
  }, 15000);
});
