/**
 * Unit Tests for Button component asChild functionality
 * Feature: preview-new-tab
 * Validates: Requirements 2.2, 2.3
 */

import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Button } from '../Button';

describe('Button Component', () => {
  describe('asChild functionality', () => {
    it('should render as button element when asChild is false', () => {
      render(<Button>Click me</Button>);
      const button = screen.getByRole('button', { name: /click me/i });
      expect(button.tagName).toBe('BUTTON');
    });

    it('should render as child element when asChild is true', () => {
      render(
        <Button asChild>
          <a href="/test">Link Button</a>
        </Button>
      );
      const link = screen.getByRole('link', { name: /link button/i });
      expect(link.tagName).toBe('A');
      expect(link).toHaveAttribute('href', '/test');
    });

    it('should apply button classes to child element when asChild is true', () => {
      render(
        <Button asChild variant="primary">
          <a href="/test">Link Button</a>
        </Button>
      );
      const link = screen.getByRole('link', { name: /link button/i });
      expect(link.className).toContain('bg-blue-600');
      expect(link.className).toContain('text-white');
      expect(link.className).toContain('font-medium');
      expect(link.className).toContain('rounded-lg');
    });

    it('should preserve child element attributes when asChild is true', () => {
      render(
        <Button asChild>
          <a href="/test" target="_blank" rel="noopener noreferrer">
            Link Button
          </a>
        </Button>
      );
      const link = screen.getByRole('link', { name: /link button/i });
      expect(link).toHaveAttribute('href', '/test');
      expect(link).toHaveAttribute('target', '_blank');
      expect(link).toHaveAttribute('rel', 'noopener noreferrer');
    });

    it('should merge child className with button classes when asChild is true', () => {
      render(
        <Button asChild variant="primary">
          <a href="/test" className="custom-class">
            Link Button
          </a>
        </Button>
      );
      const link = screen.getByRole('link', { name: /link button/i });
      expect(link.className).toContain('bg-blue-600');
      expect(link.className).toContain('custom-class');
    });
  });

  describe('variant styling with asChild', () => {
    it('should apply primary variant styles to child element', () => {
      render(
        <Button asChild variant="primary">
          <a href="/test">Primary Link</a>
        </Button>
      );
      const link = screen.getByRole('link', { name: /primary link/i });
      expect(link.className).toContain('bg-blue-600');
      expect(link.className).toContain('text-white');
    });

    it('should apply secondary variant styles to child element', () => {
      render(
        <Button asChild variant="secondary">
          <a href="/test">Secondary Link</a>
        </Button>
      );
      const link = screen.getByRole('link', { name: /secondary link/i });
      expect(link.className).toContain('bg-gray-200');
      expect(link.className).toContain('text-gray-900');
    });

    it('should apply danger variant styles to child element', () => {
      render(
        <Button asChild variant="danger">
          <a href="/test">Danger Link</a>
        </Button>
      );
      const link = screen.getByRole('link', { name: /danger link/i });
      expect(link.className).toContain('bg-red-600');
      expect(link.className).toContain('text-white');
    });
  });

  describe('size styling with asChild', () => {
    it('should apply small size styles to child element', () => {
      render(
        <Button asChild size="sm">
          <a href="/test">Small Link</a>
        </Button>
      );
      const link = screen.getByRole('link', { name: /small link/i });
      expect(link.className).toContain('px-3');
      expect(link.className).toContain('py-1.5');
      expect(link.className).toContain('text-sm');
    });

    it('should apply medium size styles to child element', () => {
      render(
        <Button asChild size="md">
          <a href="/test">Medium Link</a>
        </Button>
      );
      const link = screen.getByRole('link', { name: /medium link/i });
      expect(link.className).toContain('px-4');
      expect(link.className).toContain('py-2');
      expect(link.className).toContain('text-base');
    });

    it('should apply large size styles to child element', () => {
      render(
        <Button asChild size="lg">
          <a href="/test">Large Link</a>
        </Button>
      );
      const link = screen.getByRole('link', { name: /large link/i });
      expect(link.className).toContain('px-6');
      expect(link.className).toContain('py-3');
      expect(link.className).toContain('text-lg');
    });
  });

  describe('existing button functionality', () => {
    it('should render normal button without asChild', () => {
      render(<Button variant="primary">Normal Button</Button>);
      const button = screen.getByRole('button', { name: /normal button/i });
      expect(button.tagName).toBe('BUTTON');
      expect(button.className).toContain('bg-blue-600');
    });

    it('should handle disabled state', () => {
      render(<Button disabled>Disabled Button</Button>);
      const button = screen.getByRole('button', { name: /disabled button/i });
      expect(button).toBeDisabled();
    });

    it('should handle loading state', () => {
      render(<Button isLoading>Loading Button</Button>);
      const button = screen.getByRole('button');
      expect(button).toBeDisabled();
      expect(button.textContent).toContain('Loading...');
    });

    it('should apply custom className', () => {
      render(<Button className="custom-class">Custom Button</Button>);
      const button = screen.getByRole('button', { name: /custom button/i });
      expect(button.className).toContain('custom-class');
    });
  });

  describe('combined variant and size with asChild', () => {
    it('should apply both variant and size styles correctly', () => {
      render(
        <Button asChild variant="secondary" size="sm">
          <a href="/test">Small Secondary Link</a>
        </Button>
      );
      const link = screen.getByRole('link', { name: /small secondary link/i });
      // Variant styles
      expect(link.className).toContain('bg-gray-200');
      expect(link.className).toContain('text-gray-900');
      // Size styles
      expect(link.className).toContain('px-3');
      expect(link.className).toContain('py-1.5');
      expect(link.className).toContain('text-sm');
    });

    it('should apply all combinations of variants and sizes', () => {
      const variants = ['primary', 'secondary', 'danger'] as const;
      const sizes = ['sm', 'md', 'lg'] as const;

      variants.forEach((variant) => {
        sizes.forEach((size) => {
          const { unmount } = render(
            <Button asChild variant={variant} size={size}>
              <a href="/test">{`${variant}-${size}`}</a>
            </Button>
          );
          const link = screen.getByRole('link');
          expect(link.className).toContain('font-medium');
          expect(link.className).toContain('rounded-lg');
          unmount();
        });
      });
    });
  });
});
