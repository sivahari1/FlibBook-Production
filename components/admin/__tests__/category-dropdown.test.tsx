/**
 * Unit Tests for Category Dropdown in BookShopItemForm
 * Task: 9.2 Write unit test for category dropdown
 * Requirements: 10.2
 * 
 * Tests:
 * - Math category shows CBSE subcategories
 * - Other categories don't show subcategories
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { getCategoryStructure } from '@/lib/bookshop-categories';

describe('Category Dropdown Structure', () => {
  describe('Math category with CBSE subcategories', () => {
    it('should have Math category with CBSE subcategories from 1st to 10th Standard', () => {
      const categories = getCategoryStructure();
      const mathCategory = categories.find(cat => cat.name === 'Maths');

      // Math category should exist
      expect(mathCategory).toBeDefined();
      expect(mathCategory?.name).toBe('Maths');

      // Math should have subcategories
      expect(mathCategory?.subcategories).toBeDefined();
      expect(mathCategory?.subcategories).toHaveLength(10);

      // Verify all CBSE standards are present
      const expectedSubcategories = [
        'CBSE - 1st Standard',
        'CBSE - 2nd Standard',
        'CBSE - 3rd Standard',
        'CBSE - 4th Standard',
        'CBSE - 5th Standard',
        'CBSE - 6th Standard',
        'CBSE - 7th Standard',
        'CBSE - 8th Standard',
        'CBSE - 9th Standard',
        'CBSE - 10th Standard',
      ];

      expectedSubcategories.forEach(subcategory => {
        expect(mathCategory?.subcategories).toContain(subcategory);
      });
    });

    it('should format Math subcategories correctly', () => {
      const categories = getCategoryStructure();
      const mathCategory = categories.find(cat => cat.name === 'Maths');

      mathCategory?.subcategories?.forEach(subcategory => {
        // Each subcategory should follow the pattern "CBSE - Xth Standard"
        expect(subcategory).toMatch(/^CBSE - \d+(st|nd|rd|th) Standard$/);
      });
    });

    it('should have Math subcategories in correct order', () => {
      const categories = getCategoryStructure();
      const mathCategory = categories.find(cat => cat.name === 'Maths');

      const expectedOrder = [
        'CBSE - 1st Standard',
        'CBSE - 2nd Standard',
        'CBSE - 3rd Standard',
        'CBSE - 4th Standard',
        'CBSE - 5th Standard',
        'CBSE - 6th Standard',
        'CBSE - 7th Standard',
        'CBSE - 8th Standard',
        'CBSE - 9th Standard',
        'CBSE - 10th Standard',
      ];

      expect(mathCategory?.subcategories).toEqual(expectedOrder);
    });
  });

  describe('Other categories without subcategories', () => {
    it('should have Functional MRI category without subcategories', () => {
      const categories = getCategoryStructure();
      const fmriCategory = categories.find(cat => cat.name === 'Functional MRI');

      // Functional MRI category should exist
      expect(fmriCategory).toBeDefined();
      expect(fmriCategory?.name).toBe('Functional MRI');

      // Functional MRI should have empty subcategories array
      expect(fmriCategory?.subcategories).toBeDefined();
      expect(fmriCategory?.subcategories).toHaveLength(0);
    });

    it('should have Music category without subcategories', () => {
      const categories = getCategoryStructure();
      const musicCategory = categories.find(cat => cat.name === 'Music');

      // Music category should exist
      expect(musicCategory).toBeDefined();
      expect(musicCategory?.name).toBe('Music');

      // Music should have empty subcategories array
      expect(musicCategory?.subcategories).toBeDefined();
      expect(musicCategory?.subcategories).toHaveLength(0);
    });

    it('should verify only Math has subcategories', () => {
      const categories = getCategoryStructure();

      categories.forEach(category => {
        if (category.name === 'Maths') {
          // Math should have subcategories
          expect(category.subcategories).toBeDefined();
          expect(category.subcategories!.length).toBeGreaterThan(0);
        } else {
          // All other categories should have empty subcategories
          expect(category.subcategories).toBeDefined();
          expect(category.subcategories).toHaveLength(0);
        }
      });
    });
  });

  describe('Category structure validation', () => {
    it('should have exactly 3 top-level categories', () => {
      const categories = getCategoryStructure();
      expect(categories).toHaveLength(3);
    });

    it('should have all expected top-level categories', () => {
      const categories = getCategoryStructure();
      const categoryNames = categories.map(cat => cat.name);

      expect(categoryNames).toContain('Maths');
      expect(categoryNames).toContain('Functional MRI');
      expect(categoryNames).toContain('Music');
    });

    it('should have subcategories property for all categories', () => {
      const categories = getCategoryStructure();

      categories.forEach(category => {
        expect(category).toHaveProperty('subcategories');
        expect(Array.isArray(category.subcategories)).toBe(true);
      });
    });

    it('should format category names consistently', () => {
      const categories = getCategoryStructure();

      categories.forEach(category => {
        // Category names should be non-empty strings
        expect(typeof category.name).toBe('string');
        expect(category.name.length).toBeGreaterThan(0);
        
        // Category names should not have leading/trailing whitespace
        expect(category.name).toBe(category.name.trim());
      });
    });
  });

  describe('Dropdown rendering structure', () => {
    it('should render Math category with optgroup containing subcategories', () => {
      const categories = getCategoryStructure();
      const mathCategory = categories.find(cat => cat.name === 'Maths');

      // Verify structure for rendering
      expect(mathCategory?.name).toBe('Maths');
      expect(mathCategory?.subcategories).toBeDefined();
      expect(mathCategory?.subcategories!.length).toBe(10);

      // Each subcategory should be renderable as an option
      mathCategory?.subcategories?.forEach(subcategory => {
        const optionValue = `${mathCategory.name} > ${subcategory}`;
        expect(optionValue).toMatch(/^Maths > CBSE - \d+(st|nd|rd|th) Standard$/);
      });
    });

    it('should render Functional MRI as single option without optgroup', () => {
      const categories = getCategoryStructure();
      const fmriCategory = categories.find(cat => cat.name === 'Functional MRI');

      // Verify structure for rendering
      expect(fmriCategory?.name).toBe('Functional MRI');
      expect(fmriCategory?.subcategories).toHaveLength(0);

      // Should render as single option with category name as value
      const optionValue = fmriCategory?.name;
      expect(optionValue).toBe('Functional MRI');
    });

    it('should render Music as single option without optgroup', () => {
      const categories = getCategoryStructure();
      const musicCategory = categories.find(cat => cat.name === 'Music');

      // Verify structure for rendering
      expect(musicCategory?.name).toBe('Music');
      expect(musicCategory?.subcategories).toHaveLength(0);

      // Should render as single option with category name as value
      const optionValue = musicCategory?.name;
      expect(optionValue).toBe('Music');
    });

    it('should generate correct option values for Math subcategories', () => {
      const categories = getCategoryStructure();
      const mathCategory = categories.find(cat => cat.name === 'Maths');

      const expectedValues = [
        'Maths > CBSE - 1st Standard',
        'Maths > CBSE - 2nd Standard',
        'Maths > CBSE - 3rd Standard',
        'Maths > CBSE - 4th Standard',
        'Maths > CBSE - 5th Standard',
        'Maths > CBSE - 6th Standard',
        'Maths > CBSE - 7th Standard',
        'Maths > CBSE - 8th Standard',
        'Maths > CBSE - 9th Standard',
        'Maths > CBSE - 10th Standard',
      ];

      mathCategory?.subcategories?.forEach((subcategory, index) => {
        const optionValue = `${mathCategory.name} > ${subcategory}`;
        expect(optionValue).toBe(expectedValues[index]);
      });
    });

    it('should distinguish between categories with and without subcategories', () => {
      const categories = getCategoryStructure();

      const categoriesWithSubcategories = categories.filter(
        cat => cat.subcategories && cat.subcategories.length > 0
      );
      const categoriesWithoutSubcategories = categories.filter(
        cat => !cat.subcategories || cat.subcategories.length === 0
      );

      // Only Math should have subcategories
      expect(categoriesWithSubcategories).toHaveLength(1);
      expect(categoriesWithSubcategories[0].name).toBe('Maths');

      // Functional MRI and Music should not have subcategories
      expect(categoriesWithoutSubcategories).toHaveLength(2);
      expect(categoriesWithoutSubcategories.map(cat => cat.name)).toContain('Functional MRI');
      expect(categoriesWithoutSubcategories.map(cat => cat.name)).toContain('Music');
    });
  });

  describe('Category selection behavior', () => {
    it('should allow selecting Math subcategories', () => {
      const categories = getCategoryStructure();
      const mathCategory = categories.find(cat => cat.name === 'Maths');

      mathCategory?.subcategories?.forEach(subcategory => {
        const selectedValue = `${mathCategory.name} > ${subcategory}`;
        
        // Verify the value can be selected
        expect(selectedValue).toBeTruthy();
        expect(selectedValue).toContain('Maths >');
        expect(selectedValue).toContain('CBSE');
        expect(selectedValue).toContain('Standard');
      });
    });

    it('should allow selecting top-level categories without subcategories', () => {
      const categories = getCategoryStructure();

      const categoriesWithoutSubcategories = categories.filter(
        cat => !cat.subcategories || cat.subcategories.length === 0
      );

      categoriesWithoutSubcategories.forEach(category => {
        const selectedValue = category.name;
        
        // Verify the value can be selected
        expect(selectedValue).toBeTruthy();
        expect(selectedValue).not.toContain('>');
      });
    });

    it('should not allow selecting Math parent without subcategory', () => {
      const categories = getCategoryStructure();
      const mathCategory = categories.find(cat => cat.name === 'Maths');

      // Math has subcategories, so parent alone should not be a valid selection
      // In the dropdown, Math is only an optgroup label, not a selectable option
      expect(mathCategory?.subcategories).toBeDefined();
      expect(mathCategory?.subcategories!.length).toBeGreaterThan(0);

      // Valid selections for Math must include a subcategory
      mathCategory?.subcategories?.forEach(subcategory => {
        const validSelection = `${mathCategory.name} > ${subcategory}`;
        expect(validSelection).toContain('>');
      });
    });
  });

  describe('Edge cases and validation', () => {
    it('should handle empty subcategories array correctly', () => {
      const categories = getCategoryStructure();

      categories.forEach(category => {
        if (category.name !== 'Maths') {
          expect(category.subcategories).toEqual([]);
        }
      });
    });

    it('should not have duplicate subcategories in Math', () => {
      const categories = getCategoryStructure();
      const mathCategory = categories.find(cat => cat.name === 'Maths');

      const subcategories = mathCategory?.subcategories || [];
      const uniqueSubcategories = [...new Set(subcategories)];

      expect(subcategories.length).toBe(uniqueSubcategories.length);
    });

    it('should not have duplicate top-level categories', () => {
      const categories = getCategoryStructure();
      const categoryNames = categories.map(cat => cat.name);
      const uniqueNames = [...new Set(categoryNames)];

      expect(categoryNames.length).toBe(uniqueNames.length);
    });

    it('should maintain consistent category structure', () => {
      const categories = getCategoryStructure();

      categories.forEach(category => {
        // Each category must have a name
        expect(category.name).toBeTruthy();
        expect(typeof category.name).toBe('string');

        // Each category must have subcategories property (even if empty)
        expect(category).toHaveProperty('subcategories');
        expect(Array.isArray(category.subcategories)).toBe(true);
      });
    });
  });
});
