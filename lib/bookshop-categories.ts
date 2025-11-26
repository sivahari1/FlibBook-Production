/**
 * BookShop Category Structure
 * Hierarchical category system for organizing content
 */

export interface CategoryStructure {
  name: string;
  subcategories?: string[];
}

export const BOOKSHOP_CATEGORIES: CategoryStructure[] = [
  {
    name: 'Maths',
    subcategories: [
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
    ]
  },
  {
    name: 'Functional MRI',
    subcategories: []
  },
  {
    name: 'Music',
    subcategories: []
  }
];

/**
 * Get all categories as a flat list (for dropdowns)
 */
export function getAllCategories(): string[] {
  const categories: string[] = [];
  
  BOOKSHOP_CATEGORIES.forEach(cat => {
    if (cat.subcategories && cat.subcategories.length > 0) {
      // Add subcategories with parent prefix
      cat.subcategories.forEach(sub => {
        categories.push(`${cat.name} > ${sub}`);
      });
    } else {
      // Add parent category only
      categories.push(cat.name);
    }
  });
  
  return categories.sort();
}

/**
 * Get category structure for hierarchical display
 */
export function getCategoryStructure(): CategoryStructure[] {
  return BOOKSHOP_CATEGORIES;
}

/**
 * Parse a category string to get parent and subcategory
 */
export function parseCategory(category: string): { parent: string; subcategory?: string } {
  const parts = category.split(' > ');
  if (parts.length === 2) {
    return {
      parent: parts[0].trim(),
      subcategory: parts[1].trim()
    };
  }
  return {
    parent: category.trim()
  };
}

/**
 * Content type labels for display
 */
export const CONTENT_TYPE_LABELS: Record<string, string> = {
  PDF: 'Documents',
  IMAGE: 'Images',
  VIDEO: 'Videos',
  LINK: 'Links',
  AUDIO: 'Audio'
};

/**
 * Get all content types
 */
export function getContentTypes(): string[] {
  return Object.keys(CONTENT_TYPE_LABELS);
}

/**
 * Get content type label
 */
export function getContentTypeLabel(type: string): string {
  return CONTENT_TYPE_LABELS[type] || type;
}
