'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { BookShopItemCard } from './BookShopItemCard';
import { getCategoryStructure } from '@/lib/bookshop-categories';
import { ContentMetadata } from '@/lib/types/content';
import { useToast } from '@/components/ui/Toast';

interface BookShopItem {
  id: string;
  documentId: string;
  title: string;
  description: string | null;
  category: string;
  isFree: boolean;
  price: number | null;
  isPublished: boolean;
  inMyJstudyroom: boolean;
  contentType?: string;
  metadata?: ContentMetadata;
  previewUrl?: string;
  linkUrl?: string;
  document: {
    id: string;
    title: string;
    filename: string;
    contentType?: string;
    metadata?: ContentMetadata;
    thumbnailUrl?: string;
    linkUrl?: string;
  };
}

export function BookShop() {
  const [items, setItems] = useState<BookShopItem[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [selectedContentType, setSelectedContentType] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userLimits, setUserLimits] = useState<{
    freeCount: number;
    paidCount: number;
    freeLimit: number;
    paidLimit: number;
  } | null>(null);

  // Toast notifications
  const { showToast, ToastContainer } = useToast();

  // Cache key for BookShop data
  const CACHE_KEY = 'bookshop_items_cache';
  const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  useEffect(() => {
    // Try to load from cache first
    const cachedData = loadFromCache();
    if (cachedData) {
      setItems(cachedData.items);
      const uniqueCategories = Array.from(
        new Set(cachedData.items.map((item: BookShopItem) => item.category))
      ).sort() as string[];
      setCategories(uniqueCategories);
      setLoading(false);
    }
    
    // Always fetch fresh data in background
    fetchItems();
    fetchUserLimits();
    // Empty dependency array is correct here - we only want to fetch once on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Debounce search query (300ms)
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const fetchItems = async (retryAttempt = 0) => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch('/api/bookshop');
      if (!response.ok) {
        if (response.status >= 500 && retryAttempt < 2) {
          // Retry on server errors
          await new Promise(resolve => setTimeout(resolve, 1000 * (retryAttempt + 1)));
          return fetchItems(retryAttempt + 1);
        }
        throw new Error('Failed to fetch book shop items');
      }
      const data = await response.json();
      setItems(data);
      
      // Save to cache
      saveToCache({ items: data });
      
      // Extract unique categories
      const uniqueCategories = Array.from(
        new Set(data.map((item: BookShopItem) => item.category))
      ).sort() as string[];
      setCategories(uniqueCategories);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred';
      setError(errorMessage);
      console.error('Error fetching bookshop items:', err);
    } finally {
      setLoading(false);
    }
  };

  // Cache helper functions
  const loadFromCache = () => {
    if (typeof window === 'undefined') return null;
    
    try {
      const cached = localStorage.getItem(CACHE_KEY);
      if (!cached) return null;
      
      const { data, timestamp } = JSON.parse(cached);
      const now = Date.now();
      
      // Check if cache is still valid
      if (now - timestamp < CACHE_DURATION) {
        return data;
      }
      
      // Cache expired, remove it
      localStorage.removeItem(CACHE_KEY);
      return null;
    } catch (error) {
      console.error('Error loading from cache:', error);
      return null;
    }
  };

  const saveToCache = (data: { items: BookShopItem[] }) => {
    if (typeof window === 'undefined') return;
    
    try {
      const cacheData = {
        data,
        timestamp: Date.now(),
      };
      localStorage.setItem(CACHE_KEY, JSON.stringify(cacheData));
    } catch (error) {
      console.error('Error saving to cache:', error);
    }
  };

  // Memoize filtered results for better performance
  const filteredItems = useMemo(() => {
    let filtered = items;

    if (selectedCategory) {
      filtered = filtered.filter((item) => item.category === selectedCategory);
    }

    if (selectedContentType) {
      filtered = filtered.filter((item) => {
        const contentType = item.document?.contentType || 'PDF';
        return contentType === selectedContentType;
      });
    }

    if (debouncedSearchQuery) {
      const query = debouncedSearchQuery.toLowerCase();
      filtered = filtered.filter(
        (item) =>
          item.title.toLowerCase().includes(query) ||
          item.description?.toLowerCase().includes(query)
      );
    }

    return filtered;
  }, [items, selectedCategory, selectedContentType, debouncedSearchQuery]);

  const fetchUserLimits = async () => {
    try {
      const response = await fetch('/api/member/my-jstudyroom');
      if (!response.ok) {
        throw new Error('Failed to fetch user limits');
      }
      const data = await response.json();
      setUserLimits({
        freeCount: data.counts?.free || 0,
        paidCount: data.counts?.paid || 0,
        freeLimit: 5,
        paidLimit: 5,
      });
    } catch (err) {
      console.error('Error fetching user limits:', err);
      // Set default limits if fetch fails
      setUserLimits({
        freeCount: 0,
        paidCount: 0,
        freeLimit: 5,
        paidLimit: 5,
      });
    }
  };

  const handleAddToMyJstudyroom = async (itemId: string) => {
    // Find the item that was added
    const addedItem = items.find(item => item.id === itemId);
    
    // Show success notification
    if (addedItem) {
      showToast({
        message: `"${addedItem.title}" has been successfully added to your Study Room!`,
        type: 'success',
        duration: 5000
      });
    }
    
    // Refresh items and limits after adding
    await fetchItems();
    await fetchUserLimits();
  };

  if (loading) {
    return (
      <div className="space-y-6">
        {/* Header Skeleton */}
        <div>
          <div className="h-8 w-48 bg-gray-200 dark:bg-gray-700 rounded animate-pulse mb-2"></div>
          <div className="h-4 w-96 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
        </div>

        {/* Filters Skeleton */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 h-10 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
          <div className="sm:w-48 h-10 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
          <div className="sm:w-48 h-10 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
        </div>

        {/* Results Count Skeleton */}
        <div className="h-4 w-32 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>

        {/* Items Grid Skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
              <div className="h-48 bg-gray-200 dark:bg-gray-700 animate-pulse"></div>
              <div className="p-6 space-y-3">
                <div className="h-4 w-24 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
                <div className="h-6 w-full bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
                <div className="h-4 w-full bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
                <div className="h-4 w-3/4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
                <div className="h-10 w-full bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6">
        <div className="flex items-start gap-3">
          <svg
            className="w-6 h-6 text-red-600 dark:text-red-400 flex-shrink-0"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-red-800 dark:text-red-200 mb-2">
              Unable to Load Book Shop
            </h3>
            <p className="text-red-700 dark:text-red-300 mb-4">{error}</p>
            <button
              onClick={() => fetchItems()}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <ToastContainer />
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Book Shop</h2>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Browse and add documents to your personal collection
          </p>
        </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        {/* Search */}
        <div className="flex-1">
          <input
            type="text"
            placeholder="Search by title or description..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
          />
        </div>

        {/* Content Type Filter */}
        <div className="sm:w-48">
          <select
            value={selectedContentType}
            onChange={(e) => setSelectedContentType(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
          >
            <option value="">All Types</option>
            <option value="PDF">📄 Documents</option>
            <option value="IMAGE">🖼️ Images</option>
            <option value="VIDEO">🎥 Videos</option>
            <option value="LINK">🔗 Links</option>
            <option value="AUDIO">🎵 Audio</option>
          </select>
        </div>

        {/* Category Filter */}
        <div className="sm:w-48">
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
          >
            <option value="">All Categories</option>
            {getCategoryStructure().map((cat) => (
              <optgroup key={cat.name} label={cat.name}>
                {cat.subcategories && cat.subcategories.length > 0 ? (
                  cat.subcategories.map((sub) => (
                    <option key={`${cat.name} > ${sub}`} value={`${cat.name} > ${sub}`}>
                      {sub}
                    </option>
                  ))
                ) : (
                  <option value={cat.name}>{cat.name}</option>
                )}
              </optgroup>
            ))}
            {categories.filter(cat => !getCategoryStructure().some(c => 
              c.name === cat || (c.subcategories && c.subcategories.some(s => `${c.name} > ${s}` === cat))
            )).length > 0 && (
              <optgroup label="Other">
                {categories.filter(cat => !getCategoryStructure().some(c => 
                  c.name === cat || (c.subcategories && c.subcategories.some(s => `${c.name} > ${s}` === cat))
                )).map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </optgroup>
            )}
          </select>
        </div>
      </div>

      {/* Results Count */}
      <div className="text-sm text-gray-600 dark:text-gray-400">
        Showing {filteredItems.length} of {items.length} items
      </div>

      {/* Items Grid */}
      {filteredItems.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-600 dark:text-gray-400">
            {searchQuery || selectedCategory
              ? 'No items match your search criteria'
              : 'No items available in the Book Shop'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredItems.map((item) => (
            <BookShopItemCard
              key={item.id}
              item={item}
              onAddToMyJstudyroom={handleAddToMyJstudyroom}
              userLimits={userLimits || undefined}
            />
          ))}
        </div>
      )}
      </div>
    </>
  );
}
