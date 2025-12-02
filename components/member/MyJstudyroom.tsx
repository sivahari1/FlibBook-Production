'use client';

import { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import Link from 'next/link';
import { getContentTypes, getContentTypeLabel } from '@/lib/bookshop-categories';

interface MyJstudyroomItem {
  id: string;
  bookShopItemId: string;
  title: string;
  description?: string;
  category: string;
  isFree: boolean;
  addedAt: string;
  documentId: string;
  documentTitle: string;
  contentType: string;
  metadata: any;
}

interface DocumentCounts {
  free: number;
  paid: number;
  total: number;
}

/**
 * Type guard function to determine if content is a link type.
 * 
 * This function checks if the provided content type is 'LINK', which indicates
 * that the content should be opened in a new tab rather than navigated to the viewer.
 * 
 * @param {string} contentType - The content type to check (e.g., 'PDF', 'IMAGE', 'VIDEO', 'LINK')
 * @returns {boolean} True if the content type is 'LINK', false otherwise
 * 
 * @example
 * if (isLinkContent(item.contentType)) {
 *   // Handle link content
 * }
 */
function isLinkContent(contentType: string): boolean {
  return contentType === 'LINK';
}

/**
 * Extracts the link URL from a My jstudyroom item's metadata.
 * 
 * This function safely navigates the item's metadata structure to retrieve the linkUrl
 * property. It performs type checking to ensure the metadata exists and contains a valid
 * string URL before returning it.
 * 
 * @param {MyJstudyroomItem} item - The My jstudyroom item containing metadata
 * @returns {string | null} The link URL if found and valid, null otherwise
 * 
 * @example
 * const url = getLinkUrl(item);
 * if (url) {
 *   window.open(url, '_blank');
 * }
 */
function getLinkUrl(item: MyJstudyroomItem): string | null {
  // Check metadata for linkUrl
  if (item.metadata && typeof item.metadata === 'object') {
    const metadata = item.metadata as any;
    if (metadata.linkUrl && typeof metadata.linkUrl === 'string') {
      return metadata.linkUrl;
    }
  }
  return null;
}

/**
 * MyJstudyroom Component
 * 
 * Displays and manages a member's personal collection of documents and links.
 * This component provides a comprehensive interface for viewing, filtering, and managing
 * content items that members have added to their study room.
 * 
 * Key Features:
 * - Content-type-aware view actions (links open in new tab, other content navigates to viewer)
 * - Real-time search with debouncing for performance
 * - Multi-criteria filtering (content type, price type)
 * - Document count tracking (free/paid/total with limits)
 * - Error handling with retry mechanisms
 * - Loading states and skeleton UI
 * 
 * View Action Logic:
 * The component implements conditional rendering for the View button based on content type:
 * 
 * 1. For LINK content:
 *    - Renders a Button with onClick handler
 *    - Calls handleViewContent which opens the link in a new tab
 *    - Includes security attributes (noopener, noreferrer)
 *    - Validates link URL exists before opening
 *    - Detects and handles popup blockers
 * 
 * 2. For other content types (PDF, IMAGE, VIDEO):
 *    - Renders a Next.js Link component wrapping the Button
 *    - Navigates to /member/view/[itemId]
 *    - Viewer page applies DRM protection and watermarking
 * 
 * Security Considerations:
 * - Link URLs are validated before opening
 * - Security attributes prevent malicious access to window.opener
 * - Referrer information is not leaked to external sites
 * - Popup blocker detection provides user guidance
 * 
 * Performance Optimizations:
 * - Search query debouncing (300ms) reduces unnecessary filtering
 * - Memoized filtered items prevent redundant calculations
 * - Retry logic with exponential backoff for network errors
 * 
 * @component
 * @example
 * // Usage in a page
 * import { MyJstudyroom } from '@/components/member/MyJstudyroom';
 * 
 * export default function MyJstudyroomPage() {
 *   return <MyJstudyroom />;
 * }
 */

/**
 * Helper function to get content type icon and label with styling.
 * 
 * Returns the appropriate icon, label, and color scheme for each content type.
 * Used for displaying content type badges in the UI.
 * 
 * @param {string} contentType - The content type (PDF, IMAGE, VIDEO, LINK, or other)
 * @returns {Object} Object containing icon (JSX), label (string), and color (CSS classes)
 */
function getContentTypeInfo(contentType: string) {
  switch (contentType) {
    case 'PDF':
      return {
        icon: (
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
          </svg>
        ),
        label: 'PDF',
        color: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
      };
    case 'IMAGE':
      return {
        icon: (
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        ),
        label: 'Image',
        color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400'
      };
    case 'VIDEO':
      return {
        icon: (
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
        ),
        label: 'Video',
        color: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400'
      };
    case 'LINK':
      return {
        icon: (
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
          </svg>
        ),
        label: 'Link',
        color: 'bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-400'
      };
    default:
      return {
        icon: (
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        ),
        label: 'Document',
        color: 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400'
      };
  }
}

export function MyJstudyroom() {
  const [items, setItems] = useState<MyJstudyroomItem[]>([]);
  const [counts, setCounts] = useState<DocumentCounts>({
    free: 0,
    paid: 0,
    total: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [returningId, setReturningId] = useState<string | null>(null);
  
  // Filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');
  const [selectedContentType, setSelectedContentType] = useState<string>('');
  const [selectedPriceType, setSelectedPriceType] = useState<'all' | 'free' | 'paid'>('all');

  useEffect(() => {
    fetchMyJstudyroom();
  }, []);

  // Debounce search query (300ms)
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Filtered items based on search and filters (memoized for performance)
  const filteredItems = useMemo(() => {
    let filtered = [...items];

    // Apply search filter with debounced query
    if (debouncedSearchQuery.trim()) {
      const query = debouncedSearchQuery.toLowerCase();
      filtered = filtered.filter(item => 
        item.title.toLowerCase().includes(query) ||
        (item.description && item.description.toLowerCase().includes(query))
      );
    }

    // Apply content type filter
    if (selectedContentType) {
      filtered = filtered.filter(item => item.contentType === selectedContentType);
    }

    // Apply price type filter
    if (selectedPriceType !== 'all') {
      filtered = filtered.filter(item => 
        selectedPriceType === 'free' ? item.isFree : !item.isFree
      );
    }

    return filtered;
  }, [items, debouncedSearchQuery, selectedContentType, selectedPriceType]);

  // Check if any filters are active
  const hasActiveFilters = debouncedSearchQuery.trim() !== '' || selectedContentType !== '' || selectedPriceType !== 'all';

  // Clear all filters
  const clearFilters = () => {
    setSearchQuery('');
    setSelectedContentType('');
    setSelectedPriceType('all');
  };

  const fetchMyJstudyroom = async (retryAttempt = 0) => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/member/my-jstudyroom');

      if (!response.ok) {
        const data = await response.json();
        
        // Retry on server errors
        if (response.status >= 500 && retryAttempt < 2) {
          await new Promise(resolve => setTimeout(resolve, 1000 * (retryAttempt + 1)));
          return fetchMyJstudyroom(retryAttempt + 1);
        }
        
        throw new Error(data.error || 'Failed to fetch My jstudyroom');
      }

      const data = await response.json();
      setItems(data.items);
      setCounts(data.counts);
    } catch (err) {
      console.error('Error fetching My jstudyroom:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to load My jstudyroom';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Handles the view action for content items based on their content type.
   * 
   * This function implements content-type-aware routing:
   * - For LINK content: Opens the external URL in a new browser tab with security attributes
   * - For other content types (PDF, IMAGE, VIDEO): Navigation is handled by Next.js Link component
   * 
   * Security considerations:
   * - Uses 'noopener' to prevent the new page from accessing window.opener
   * - Uses 'noreferrer' to prevent the referrer header from being sent
   * - Validates that link URLs exist before attempting to open them
   * - Detects and notifies users if popup blockers prevent the link from opening
   * 
   * Error handling:
   * - Displays user-friendly error if link URL is missing
   * - Detects popup blocker and provides guidance to user
   * 
   * @param {MyJstudyroomItem} item - The content item to view
   * @returns {void}
   * 
   * @example
   * // For link content
   * <Button onClick={() => handleViewContent(item)}>View</Button>
   * 
   * @see {@link isLinkContent} for content type detection
   * @see {@link getLinkUrl} for URL extraction
   */
  const handleViewContent = (item: MyJstudyroomItem): void => {
    if (isLinkContent(item.contentType)) {
      // Extract and validate the link URL from metadata
      const linkUrl = getLinkUrl(item);
      if (!linkUrl) {
        // Display error if link URL is missing or invalid
        setError('Link URL not found for this item. Please contact support if this issue persists.');
        return;
      }
      
      // Attempt to open the link in a new tab with security attributes
      // Security attributes:
      // - 'noopener': Prevents the new page from accessing window.opener (XSS protection)
      // - 'noreferrer': Prevents the referrer header from being sent (privacy protection)
      const newWindow = window.open(linkUrl, '_blank', 'noopener,noreferrer');
      
      // Check if popup was blocked by browser
      // window.open returns null if blocked, or the window may be immediately closed
      if (!newWindow || newWindow.closed || typeof newWindow.closed === 'undefined') {
        setError('Popup blocked. Please allow popups for this site and try again.');
      }
    }
    // For non-link content (PDF, IMAGE, VIDEO), Next.js Link component handles navigation
    // to the viewer page where DRM protection and watermarking are applied
  };

  const handleReturn = async (itemId: string, retryAttempt = 0) => {
    if (!confirm('Are you sure you want to return this document? You can add it back later from the Book Shop.')) {
      return;
    }

    try {
      setReturningId(itemId);
      setError(null);

      const response = await fetch(`/api/member/my-jstudyroom/${itemId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const data = await response.json();
        
        // Retry on network errors
        if (response.status >= 500 && retryAttempt < 2) {
          await new Promise(resolve => setTimeout(resolve, 1000 * (retryAttempt + 1)));
          return handleReturn(itemId, retryAttempt + 1);
        }
        
        throw new Error(data.error || 'Failed to return document');
      }

      // Refresh the list
      await fetchMyJstudyroom();
    } catch (err) {
      console.error('Error returning document:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to return document';
      setError(`${errorMessage} Please try again.`);
    } finally {
      setReturningId(null);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        {/* Document Count Indicators Skeleton */}
        <Card className="p-6">
          <div className="h-6 w-48 bg-gray-200 dark:bg-gray-700 rounded animate-pulse mb-4"></div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-gray-100 dark:bg-gray-800 p-4 rounded-lg">
                <div className="h-4 w-32 bg-gray-200 dark:bg-gray-700 rounded animate-pulse mb-2"></div>
                <div className="h-8 w-16 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
              </div>
            ))}
          </div>
        </Card>

        {/* Items Skeleton */}
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1 space-y-3">
                  <div className="h-6 w-64 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
                  <div className="h-4 w-48 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
                </div>
                <div className="flex gap-2 ml-4">
                  <div className="h-9 w-20 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
                  <div className="h-9 w-20 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Document Count Indicators */}
      <Card className="p-6">
        <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">
          My Document Collection
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
            <div className="text-sm text-blue-600 dark:text-blue-400 font-medium">
              Free Documents
            </div>
            <div className="text-2xl font-bold text-blue-700 dark:text-blue-300">
              {counts.free} / 5
            </div>
          </div>
          <div className="bg-purple-50 dark:bg-purple-900/20 p-4 rounded-lg">
            <div className="text-sm text-purple-600 dark:text-purple-400 font-medium">
              Paid Documents
            </div>
            <div className="text-2xl font-bold text-purple-700 dark:text-purple-300">
              {counts.paid} / 5
            </div>
          </div>
          <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg">
            <div className="text-sm text-green-600 dark:text-green-400 font-medium">
              Total Documents
            </div>
            <div className="text-2xl font-bold text-green-700 dark:text-green-300">
              {counts.total} / 10
            </div>
          </div>
        </div>
      </Card>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <svg
              className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5"
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
              <p className="text-red-700 dark:text-red-300">{error}</p>
              <button
                onClick={() => {
                  setError(null);
                  fetchMyJstudyroom();
                }}
                className="mt-2 text-sm text-red-600 dark:text-red-400 underline hover:no-underline"
              >
                Try again
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Filters Section */}
      {items.length > 0 && (
        <Card className="p-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Filter Documents
              </h3>
              {hasActiveFilters && (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={clearFilters}
                >
                  Clear Filters
                </Button>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Search Input */}
              <div>
                <label htmlFor="search" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Search
                </label>
                <div className="relative">
                  <input
                    id="search"
                    type="text"
                    placeholder="Search by title or description..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full px-3 py-2 pl-10 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                  />
                  <svg
                    className="absolute left-3 top-2.5 w-5 h-5 text-gray-400"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                    />
                  </svg>
                </div>
              </div>

              {/* Content Type Filter */}
              <div>
                <label htmlFor="contentType" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Content Type
                </label>
                <select
                  id="contentType"
                  value={selectedContentType}
                  onChange={(e) => setSelectedContentType(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                >
                  <option value="">All Types</option>
                  {getContentTypes().map(type => (
                    <option key={type} value={type}>
                      {getContentTypeLabel(type)}
                    </option>
                  ))}
                </select>
              </div>

              {/* Price Type Filter */}
              <div>
                <label htmlFor="priceType" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Price Type
                </label>
                <select
                  id="priceType"
                  value={selectedPriceType}
                  onChange={(e) => setSelectedPriceType(e.target.value as 'all' | 'free' | 'paid')}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                >
                  <option value="all">All Documents</option>
                  <option value="free">Free Only</option>
                  <option value="paid">Paid Only</option>
                </select>
              </div>
            </div>

            {/* Results Count */}
            <div className="text-sm text-gray-600 dark:text-gray-400">
              Showing {filteredItems.length} of {items.length} documents
            </div>
          </div>
        </Card>
      )}

      {/* Documents List */}
      {items.length === 0 ? (
        <Card className="p-12 text-center">
          <div className="text-gray-500 dark:text-gray-400 mb-4">
            <svg
              className="mx-auto h-12 w-12 mb-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
              />
            </svg>
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              Your bookshelf is empty
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              Add documents from the Book Shop to start building your collection
            </p>
            <Link href="/member/bookshop">
              <Button>Browse Book Shop</Button>
            </Link>
          </div>
        </Card>
      ) : filteredItems.length === 0 ? (
        <Card className="p-12 text-center">
          <div className="text-gray-500 dark:text-gray-400">
            <svg
              className="mx-auto h-12 w-12 mb-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              No documents match your filters
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              Try adjusting your search or filter criteria
            </p>
            {hasActiveFilters && (
              <Button onClick={clearFilters}>Clear Filters</Button>
            )}
          </div>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredItems.map((item) => (
            <Card key={item.id} className="p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                      {item.title}
                    </h3>
                    {(() => {
                      const contentTypeInfo = getContentTypeInfo(item.contentType);
                      return (
                        <span className={`px-2 py-1 text-xs font-medium rounded flex items-center gap-1 ${contentTypeInfo.color}`}>
                          {contentTypeInfo.icon}
                          {contentTypeInfo.label}
                        </span>
                      );
                    })()}
                    <span
                      className={`px-2 py-1 text-xs font-medium rounded ${
                        item.isFree
                          ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                          : 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400'
                      }`}
                    >
                      {item.isFree ? 'Free' : 'Paid'}
                    </span>
                  </div>
                  <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
                    <span className="flex items-center gap-1">
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"
                        />
                      </svg>
                      {item.category}
                    </span>
                    <span className="flex items-center gap-1">
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                        />
                      </svg>
                      Added {new Date(item.addedAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>
                <div className="flex gap-2 ml-4">
                  {/* 
                    Conditional View Button Rendering:
                    
                    For LINK content:
                    - Render Button with onClick handler
                    - Opens external URL in new tab with security attributes
                    - Tooltip indicates "Open link in new tab"
                    
                    For other content types (PDF, IMAGE, VIDEO):
                    - Render Next.js Link wrapping Button
                    - Navigates to viewer page at /member/view/[itemId]
                    - Viewer applies DRM protection and watermarking
                    - Tooltip indicates "View content"
                    
                    This approach ensures links open directly without intermediate pages,
                    while maintaining secure viewing for protected content types.
                  */}
                  {isLinkContent(item.contentType) ? (
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => handleViewContent(item)}
                      title="Open link in new tab"
                    >
                      View
                    </Button>
                  ) : (
                    <Link href={`/member/view/${item.id}`}>
                      <Button
                        variant="primary"
                        size="sm"
                        title="View content"
                      >
                        View
                      </Button>
                    </Link>
                  )}
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => handleReturn(item.id)}
                    disabled={returningId === item.id}
                  >
                    {returningId === item.id ? 'Returning...' : 'Return'}
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
