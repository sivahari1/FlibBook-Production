/**
 * Tests for bookshop category structure and helper functions
 */

import { describe, it, expect } from 'vitest';
import {
  BOOKSHOP_CATEGORIES,
  getAllCategories,
  getCategoryStructure,
  parseCategory,
  getContentTypes,
  getContentTypeLabel,
  CONTENT_TYPE_LABELS
} from '../bookshop-categories';

describe('BookShop Categories', () => {
  describe('BOOKSHOP_CATEGORIES structure', () => {
    it('should include Maths with CBSE subcategories', () => {
      const mathsCategory = BOOKSHOP_CATEGORIES.find(cat => cat.name === 'Maths');
      expect(mathsCategory).toBeDefined();
      expect(mathsCategory?.subcategories).toBeDefined();
      expect(mathsCategory?.subcategories?.length).toBe(10);
      
      // Verify all CBSE standards from 1st to 10th
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
      
      expect(mathsCategory?.subcategories).toEqual(expectedSubcategories);
    });

    it('should include Functional MRI without subcategories', () => {
      const fmriCategory = BOOKSHOP_CATEGORIES.find(cat => cat.name === 'Functional MRI');
      expect(fmriCategory).toBeDefined();
      expect(fmriCategory?.subcategories).toEqual([]);
    });

    it('should include Music without subcategories', () => {
      const musicCategory = BOOKSHOP_CATEGORIES.find(cat => cat.name === 'Music');
      expect(musicCategory).toBeDefined();
      expect(musicCategory?.subcategories).toEqual([]);
    });
  });

  describe('getAllCategories', () => {
    it('should return flat list of all categories', () => {
      const categories = getAllCategories();
      expect(categories).toBeDefined();
      expect(Array.isArray(categories)).toBe(true);
      expect(categories.length).toBeGreaterThan(0);
    });

    it('should format Maths subcategories with parent prefix', () => {
      const categories = getAllCategories();
      
      // Check that Maths subcategories are formatted correctly
      expect(categories).toContain('Maths > CBSE - 1st Standard');
      expect(categories).toContain('Maths > CBSE - 5th Standard');
      expect(categories).toContain('Maths > CBSE - 10th Standard');
    });

    it('should include categories without subcategories', () => {
      const categories = getAllCategories();
      
      expect(categories).toContain('Functional MRI');
      expect(categories).toContain('Music');
    });

    it('should return sorted categories', () => {
      const categories = getAllCategories();
      const sortedCategories = [...categories].sort();
      
      expect(categories).toEqual(sortedCategories);
    });
  });

  describe('getCategoryStructure', () => {
    it('should return hierarchical category structure', () => {
      const structure = getCategoryStructure();
      
      expect(structure).toBeDefined();
      expect(Array.isArray(structure)).toBe(true);
      expect(structure.length).toBe(3);
      expect(structure).toEqual(BOOKSHOP_CATEGORIES);
    });
  });

  describe('parseCategory', () => {
    it('should parse category with subcategory', () => {
      const result = parseCategory('Maths > CBSE - 5th Standard');
      
      expect(result).toEqual({
        parent: 'Maths',
        subcategory: 'CBSE - 5th Standard'
      });
    });

    it('should parse category without subcategory', () => {
      const result = parseCategory('Music');
      
      expect(result).toEqual({
        parent: 'Music'
      });
    });

    it('should handle extra whitespace', () => {
      const result = parseCategory('Maths  >  CBSE - 1st Standard  ');
      
      expect(result).toEqual({
        parent: 'Maths',
        subcategory: 'CBSE - 1st Standard'
      });
    });

    it('should work with all CBSE subcategories', () => {
      for (let i = 1; i <= 10; i++) {
        const ordinal = i === 1 ? '1st' : i === 2 ? '2nd' : i === 3 ? '3rd' : `${i}th`;
        const category = `Maths > CBSE - ${ordinal} Standard`;
        const result = parseCategory(category);
        
        expect(result.parent).toBe('Maths');
        expect(result.subcategory).toBe(`CBSE - ${ordinal} Standard`);
      }
    });
  });

  describe('Content Type Functions', () => {
    it('should have all required content types', () => {
      const types = getContentTypes();
      
      expect(types).toContain('PDF');
      expect(types).toContain('IMAGE');
      expect(types).toContain('VIDEO');
      expect(types).toContain('LINK');
      expect(types).toContain('AUDIO');
    });

    it('should return correct labels for content types', () => {
      expect(getContentTypeLabel('PDF')).toBe('Documents');
      expect(getContentTypeLabel('IMAGE')).toBe('Images');
      expect(getContentTypeLabel('VIDEO')).toBe('Videos');
      expect(getContentTypeLabel('LINK')).toBe('Links');
      expect(getContentTypeLabel('AUDIO')).toBe('Audio');
    });

    it('should return type itself if label not found', () => {
      expect(getContentTypeLabel('UNKNOWN')).toBe('UNKNOWN');
    });
  });
});
