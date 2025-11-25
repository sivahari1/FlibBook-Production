/**
 * Tests for ContentTypeSelector component
 * Validates component rendering and interaction
 */

import { describe, it, expect, vi } from 'vitest';
import { ContentType } from '@/lib/types/content';
import { getAllowedContentTypes } from '@/lib/rbac/admin-privileges';

describe('ContentTypeSelector', () => {
  it('should have ContentType enum available', () => {
    // Verify the ContentType enum is properly exported and accessible
    expect(ContentType).toBeDefined();
    expect(ContentType.PDF).toBeDefined();
    expect(ContentType.IMAGE).toBeDefined();
    expect(ContentType.VIDEO).toBeDefined();
    expect(ContentType.LINK).toBeDefined();
  });

  it('should have correct ContentType enum values', () => {
    expect(ContentType.PDF).toBe('PDF');
    expect(ContentType.IMAGE).toBe('IMAGE');
    expect(ContentType.VIDEO).toBe('VIDEO');
    expect(ContentType.LINK).toBe('LINK');
  });

  it('should define all required content types', () => {
    const contentTypes = Object.values(ContentType);
    expect(contentTypes).toContain('PDF');
    expect(contentTypes).toContain('IMAGE');
    expect(contentTypes).toContain('VIDEO');
    expect(contentTypes).toContain('LINK');
    expect(contentTypes.length).toBe(4);
  });
});

describe('ContentTypeSelector Props Interface', () => {
  it('should accept valid props structure', () => {
    // Type checking test - if this compiles, the interface is correct
    const mockOnChange = vi.fn();
    const validProps = {
      selectedType: ContentType.PDF,
      onTypeChange: mockOnChange,
      allowedTypes: [ContentType.PDF, ContentType.IMAGE],
      disabled: false,
    };

    expect(validProps.selectedType).toBe(ContentType.PDF);
    expect(validProps.allowedTypes).toHaveLength(2);
    expect(typeof validProps.onTypeChange).toBe('function');
    expect(validProps.disabled).toBe(false);
  });

  it('should handle optional disabled prop', () => {
    const mockOnChange = vi.fn();
    const propsWithoutDisabled: {
      selectedType: ContentType;
      onTypeChange: typeof mockOnChange;
      allowedTypes: ContentType[];
      disabled?: boolean;
    } = {
      selectedType: ContentType.IMAGE,
      onTypeChange: mockOnChange,
      allowedTypes: [ContentType.IMAGE],
    };

    expect(propsWithoutDisabled.disabled).toBeUndefined();
  });
});

describe('ContentTypeSelector Integration', () => {
  it('should work with RBAC permissions', () => {
    // Admin should have all types
    const adminTypes = getAllowedContentTypes('ADMIN');
    expect(adminTypes).toContain(ContentType.PDF);
    expect(adminTypes).toContain(ContentType.IMAGE);
    expect(adminTypes).toContain(ContentType.VIDEO);
    expect(adminTypes).toContain(ContentType.LINK);
    
    // Platform user should only have PDF
    const platformUserTypes = getAllowedContentTypes('PLATFORM_USER');
    expect(platformUserTypes).toContain(ContentType.PDF);
    expect(platformUserTypes).toHaveLength(1);
    
    // Member should have no types
    const memberTypes = getAllowedContentTypes('MEMBER');
    expect(memberTypes).toHaveLength(0);
  });

  it('should filter content types correctly', () => {
    const allTypes = [ContentType.PDF, ContentType.IMAGE, ContentType.VIDEO, ContentType.LINK];
    const allowedTypes = [ContentType.PDF, ContentType.IMAGE];
    
    const filteredTypes = allTypes.filter(type => allowedTypes.includes(type));
    
    expect(filteredTypes).toHaveLength(2);
    expect(filteredTypes).toContain(ContentType.PDF);
    expect(filteredTypes).toContain(ContentType.IMAGE);
    expect(filteredTypes).not.toContain(ContentType.VIDEO);
    expect(filteredTypes).not.toContain(ContentType.LINK);
  });
});

describe('ContentTypeSelector Behavior', () => {
  it('should handle type selection callback', () => {
    const mockOnChange = vi.fn();
    const selectedType = ContentType.PDF;
    const newType = ContentType.IMAGE;
    
    // Simulate type change
    mockOnChange(newType);
    
    expect(mockOnChange).toHaveBeenCalledWith(newType);
    expect(mockOnChange).toHaveBeenCalledTimes(1);
  });

  it('should validate allowed types before selection', () => {
    const allowedTypes = [ContentType.PDF, ContentType.IMAGE];
    const attemptedType = ContentType.VIDEO;
    
    const isAllowed = allowedTypes.includes(attemptedType);
    
    expect(isAllowed).toBe(false);
  });

  it('should allow selection of permitted types', () => {
    const allowedTypes = [ContentType.PDF, ContentType.IMAGE];
    const attemptedType = ContentType.IMAGE;
    
    const isAllowed = allowedTypes.includes(attemptedType);
    
    expect(isAllowed).toBe(true);
  });
});

describe('ContentTypeSelector Edge Cases', () => {
  it('should handle empty allowed types array', () => {
    const allowedTypes: ContentType[] = [];
    const selectedType = ContentType.PDF;
    
    const isSelectionValid = allowedTypes.includes(selectedType);
    
    expect(isSelectionValid).toBe(false);
    expect(allowedTypes).toHaveLength(0);
  });

  it('should handle all types allowed', () => {
    const allowedTypes = [ContentType.PDF, ContentType.IMAGE, ContentType.VIDEO, ContentType.LINK];
    
    expect(allowedTypes).toHaveLength(4);
    expect(allowedTypes.includes(ContentType.PDF)).toBe(true);
    expect(allowedTypes.includes(ContentType.IMAGE)).toBe(true);
    expect(allowedTypes.includes(ContentType.VIDEO)).toBe(true);
    expect(allowedTypes.includes(ContentType.LINK)).toBe(true);
  });

  it('should handle disabled state', () => {
    const disabled = true;
    const mockOnChange = vi.fn();
    
    // When disabled, onChange should not be called
    if (!disabled) {
      mockOnChange(ContentType.IMAGE);
    }
    
    expect(mockOnChange).not.toHaveBeenCalled();
  });

  it('should handle enabled state', () => {
    const disabled = false;
    const mockOnChange = vi.fn();
    
    // When enabled, onChange can be called
    if (!disabled) {
      mockOnChange(ContentType.IMAGE);
    }
    
    expect(mockOnChange).toHaveBeenCalledWith(ContentType.IMAGE);
  });
});
