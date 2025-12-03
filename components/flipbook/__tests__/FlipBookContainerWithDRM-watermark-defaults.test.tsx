import { render, screen } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { FlipBookContainerWithDRM } from '../FlipBookContainerWithDRM';
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

// Mock FlipBookViewerWithDRM to capture props
let capturedProps: any = null;
vi.mock('../FlipBookViewerWithDRM', () => ({
  FlipBookViewerWithDRM: (props: any) => {
    capturedProps = props;
    return <div data-testid="mock-flipbook-viewer">FlipBookViewerWithDRM</div>;
  },
}));

// Mock DRMProtection
vi.mock('../security/DRMProtection', () => ({
  default: ({ children }: any) => <div data-testid="drm-protection">{children}</div>,
}));

describe('FlipBookContainerWithDRM - Watermark Default Behavior', () => {
  const mockPages = [
    { pageNumber: 1, imageUrl: '/test-page-1.jpg', width: 800, height: 1000 },
    { pageNumber: 2, imageUrl: '/test-page-2.jpg', width: 800, height: 1000 },
  ];

  const baseProps = {
    documentId: 'test-doc-123',
    pages: mockPages,
    userEmail: 'test@example.com',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    capturedProps = null;
  });

  describe('Requirements 1.1, 1.2, 1.3: Default watermark behavior', () => {
    it('should NOT pass watermarkText when showWatermark prop is not provided', () => {
      // Test without showWatermark prop (should default to false)
      render(
        <FlipBookContainerWithDRM
          {...baseProps}
          watermarkText="Test Watermark"
        />
      );

      // Should pass undefined watermarkText to child component
      expect(capturedProps.watermarkText).toBeUndefined();
    });

    it('should NOT pass watermarkText when showWatermark is explicitly false', () => {
      // Test with showWatermark=false
      render(
        <FlipBookContainerWithDRM
          {...baseProps}
          showWatermark={false}
          watermarkText="Test Watermark"
        />
      );

      // Should pass undefined watermarkText to child component
      expect(capturedProps.watermarkText).toBeUndefined();
    });

    it('should pass watermarkText when showWatermark is true', () => {
      // Test with showWatermark=true
      render(
        <FlipBookContainerWithDRM
          {...baseProps}
          showWatermark={true}
          watermarkText="Test Watermark"
        />
      );

      // Should pass the watermarkText to child component
      expect(capturedProps.watermarkText).toBe('Test Watermark');
    });

    it('should NOT pass watermarkText when showWatermark is true but watermarkText is missing', () => {
      // Test with showWatermark=true but no watermarkText
      render(
        <FlipBookContainerWithDRM
          {...baseProps}
          showWatermark={true}
        />
      );

      // Should pass undefined watermarkText (not userEmail)
      expect(capturedProps.watermarkText).toBeUndefined();
    });

    it('should NOT use userEmail as fallback when watermark is disabled', () => {
      // Test that userEmail is not used as fallback when showWatermark is false
      render(
        <FlipBookContainerWithDRM
          {...baseProps}
          showWatermark={false}
          userEmail="fallback@example.com"
          watermarkText="Test Watermark"
        />
      );

      // Should pass undefined watermarkText (not userEmail)
      expect(capturedProps.watermarkText).toBeUndefined();
      // userEmail should still be passed as a separate prop
      expect(capturedProps.userEmail).toBe('fallback@example.com');
    });

    it('should NOT use userEmail as fallback when showWatermark prop is omitted', () => {
      // Test that userEmail is not used as fallback when showWatermark is not provided
      render(
        <FlipBookContainerWithDRM
          {...baseProps}
          userEmail="fallback@example.com"
          watermarkText="Test Watermark"
        />
      );

      // Should pass undefined watermarkText (not userEmail)
      expect(capturedProps.watermarkText).toBeUndefined();
      // userEmail should still be passed as a separate prop
      expect(capturedProps.userEmail).toBe('fallback@example.com');
    });
  });

  describe('Watermark text fallback logic', () => {
    it('should use watermarkText when both watermarkText and userEmail are provided with showWatermark=true', () => {
      render(
        <FlipBookContainerWithDRM
          {...baseProps}
          showWatermark={true}
          watermarkText="Custom Watermark"
          userEmail="user@example.com"
        />
      );

      // Should pass watermarkText, not userEmail
      expect(capturedProps.watermarkText).toBe('Custom Watermark');
      expect(capturedProps.userEmail).toBe('user@example.com');
    });

    it('should NOT pass watermarkText when showWatermark=true but watermarkText is missing', () => {
      render(
        <FlipBookContainerWithDRM
          documentId="test-doc-123"
          pages={mockPages}
          userEmail="test@example.com"
          showWatermark={true}
        />
      );

      // Should pass undefined watermarkText (not userEmail as fallback)
      expect(capturedProps.watermarkText).toBeUndefined();
      expect(capturedProps.userEmail).toBe('test@example.com');
    });

    it('should respect showWatermark=false even when watermarkText is provided', () => {
      render(
        <FlipBookContainerWithDRM
          {...baseProps}
          showWatermark={false}
          watermarkText="Should Not Appear"
        />
      );

      // Should pass undefined watermarkText
      expect(capturedProps.watermarkText).toBeUndefined();
    });
  });

  describe('Edge cases', () => {
    it('should handle empty string watermarkText with showWatermark=true', () => {
      render(
        <FlipBookContainerWithDRM
          {...baseProps}
          showWatermark={true}
          watermarkText=""
        />
      );

      // Empty string should result in undefined watermarkText
      expect(capturedProps.watermarkText).toBeUndefined();
    });

    it('should handle whitespace-only watermarkText with showWatermark=true', () => {
      render(
        <FlipBookContainerWithDRM
          {...baseProps}
          showWatermark={true}
          watermarkText="   "
        />
      );

      // Whitespace should be passed through (component doesn't trim)
      expect(capturedProps.watermarkText).toBe('   ');
    });

    it('should handle undefined showWatermark with undefined watermarkText', () => {
      render(
        <FlipBookContainerWithDRM
          {...baseProps}
        />
      );

      // Should pass undefined watermarkText
      expect(capturedProps.watermarkText).toBeUndefined();
      // userEmail should still be passed
      expect(capturedProps.userEmail).toBe('test@example.com');
    });
  });
});
