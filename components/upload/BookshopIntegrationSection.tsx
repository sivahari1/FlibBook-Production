'use client';

import React, { useState, useEffect } from 'react';
import { Input } from '@/components/ui/Input';

/**
 * BookshopIntegrationSection Component
 * Provides UI for adding documents to bookshop during upload
 * Requirements: 1.1, 1.3, 2.1, 2.2, 2.5, 3.1, 3.2, 3.4, 3.5
 */

interface Category {
  id: string;
  name: string;
  group: string;
}

interface BookshopIntegrationSectionProps {
  isEnabled: boolean;
  onToggle: (enabled: boolean) => void;
  category: string;
  onCategoryChange: (category: string) => void;
  price: number;
  onPriceChange: (price: number) => void;
  description: string;
  onDescriptionChange: (description: string) => void;
  errors?: {
    category?: string;
    price?: string;
    description?: string;
  };
}

export const BookshopIntegrationSection: React.FC<BookshopIntegrationSectionProps> = ({
  isEnabled,
  onToggle,
  category,
  onCategoryChange,
  price,
  onPriceChange,
  description,
  onDescriptionChange,
  errors = {},
}) => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoadingCategories, setIsLoadingCategories] = useState(false);
  const [categoryError, setCategoryError] = useState<string>('');

  // Fetch categories on component mount
  useEffect(() => {
    const fetchCategories = async () => {
      setIsLoadingCategories(true);
      setCategoryError('');
      
      try {
        const response = await fetch('/api/bookshop/categories');
        if (!response.ok) {
          throw new Error('Failed to fetch categories');
        }
        
        const data = await response.json();
        if (data.success && data.data.flat) {
          // Convert flat category list to Category objects
          const categoryList: Category[] = data.data.flat.map((cat: string) => ({
            id: cat.toLowerCase().replace(/[^a-z0-9]/g, '-'),
            name: cat,
            group: cat.includes('>') ? cat.split('>')[0].trim() : 'General'
          }));
          setCategories(categoryList);
        }
      } catch (error) {
        console.error('Error fetching categories:', error);
        setCategoryError('Failed to load categories');
      } finally {
        setIsLoadingCategories(false);
      }
    };

    fetchCategories();
  }, []);

  // Handle price input change
  const handlePriceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseFloat(e.target.value) || 0;
    if (value >= 0 && value <= 10000) {
      onPriceChange(value);
    }
  };

  // Group categories by their parent group
  const groupedCategories = categories.reduce((acc, cat) => {
    const group = cat.group;
    if (!acc[group]) {
      acc[group] = [];
    }
    acc[group].push(cat);
    return acc;
  }, {} as Record<string, Category[]>);

  return (
    <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
      <div className="flex items-center space-x-2 mb-4">
        <input
          type="checkbox"
          id="addToBookshop"
          checked={isEnabled}
          onChange={(e) => onToggle(e.target.checked)}
          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
        />
        <label htmlFor="addToBookshop" className="text-sm font-medium text-gray-700">
          Add to Bookshop
        </label>
      </div>

      {isEnabled && (
        <div className="space-y-4">
          {/* Category Selection */}
          <div>
            <label htmlFor="bookshopCategory" className="block text-sm font-medium text-gray-700 mb-1">
              Category <span className="text-red-500">*</span>
            </label>
            {isLoadingCategories ? (
              <div className="text-sm text-gray-500">Loading categories...</div>
            ) : categoryError ? (
              <div className="text-sm text-red-500">{categoryError}</div>
            ) : (
              <select
                id="bookshopCategory"
                value={category}
                onChange={(e) => onCategoryChange(e.target.value)}
                className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 ${
                  errors.category ? 'border-red-500' : 'border-gray-300'
                }`}
              >
                <option value="">Select a category</option>
                {Object.entries(groupedCategories).map(([group, cats]) => (
                  <optgroup key={group} label={group}>
                    {cats.map((cat) => (
                      <option key={cat.id} value={cat.name}>
                        {cat.name}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>
            )}
            {errors.category && (
              <p className="mt-1 text-sm text-red-500">{errors.category}</p>
            )}
          </div>

          {/* Price Input */}
          <div>
            <label htmlFor="bookshopPrice" className="block text-sm font-medium text-gray-700 mb-1">
              Price <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <span className="absolute left-3 top-2 text-gray-500">₹</span>
              <Input
                id="bookshopPrice"
                type="number"
                min="0"
                max="10000"
                step="0.01"
                value={price || ''}
                onChange={handlePriceChange}
                placeholder="0.00 (free content)"
                className={`pl-8 ${errors.price ? 'border-red-500' : ''}`}
              />
            </div>
            {errors.price && (
              <p className="mt-1 text-sm text-red-500">{errors.price}</p>
            )}
            <p className="mt-1 text-xs text-gray-500">
              Enter ₹0.00 for free content. Maximum price: ₹10,000
            </p>
          </div>

          {/* Description */}
          <div>
            <label htmlFor="bookshopDescription" className="block text-sm font-medium text-gray-700 mb-1">
              Bookshop Description (Optional)
            </label>
            <textarea
              id="bookshopDescription"
              value={description}
              onChange={(e) => onDescriptionChange(e.target.value)}
              placeholder="Additional description for bookshop listing..."
              rows={3}
              className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 resize-none ${
                errors.description ? 'border-red-500' : 'border-gray-300'
              }`}
            />
            {errors.description && (
              <p className="mt-1 text-sm text-red-500">{errors.description}</p>
            )}
            <p className="mt-1 text-xs text-gray-500">
              This description will be shown in the bookshop catalog
            </p>
          </div>
        </div>
      )}
    </div>
  );
};