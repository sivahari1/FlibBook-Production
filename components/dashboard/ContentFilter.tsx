'use client';

import { useState } from 'react';
import { ContentType } from '@/lib/types/content';

interface ContentFilterProps {
  onFilterChange: (filter: { contentType?: ContentType; searchQuery?: string }) => void;
  currentFilter: { contentType?: ContentType; searchQuery?: string };
}

export const ContentFilter: React.FC<ContentFilterProps> = ({
  onFilterChange,
  currentFilter,
}) => {
  const [searchQuery, setSearchQuery] = useState(currentFilter.searchQuery || '');
  const [contentType, setContentType] = useState<ContentType | 'ALL'>(
    currentFilter.contentType || 'ALL'
  );

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value;
    setSearchQuery(query);
    onFilterChange({
      contentType: contentType === 'ALL' ? undefined : contentType,
      searchQuery: query || undefined,
    });
  };

  const handleContentTypeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const type = e.target.value as ContentType | 'ALL';
    setContentType(type);
    onFilterChange({
      contentType: type === 'ALL' ? undefined : type,
      searchQuery: searchQuery || undefined,
    });
  };

  const handleClearFilters = () => {
    setSearchQuery('');
    setContentType('ALL');
    onFilterChange({});
  };

  const hasActiveFilters = searchQuery || contentType !== 'ALL';

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 mb-6">
      <div className="flex flex-col sm:flex-row gap-4">
        {/* Search Input */}
        <div className="flex-1">
          <label htmlFor="search" className="sr-only">
            Search documents
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <svg
                className="h-5 w-5 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
            </div>
            <input
              type="text"
              id="search"
              value={searchQuery}
              onChange={handleSearchChange}
              placeholder="Search by title, filename, or description..."
              className="block w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        {/* Content Type Filter */}
        <div className="sm:w-48">
          <label htmlFor="contentType" className="sr-only">
            Filter by content type
          </label>
          <select
            id="contentType"
            value={contentType}
            onChange={handleContentTypeChange}
            className="block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="ALL">All Types</option>
            <option value={ContentType.PDF}>PDF</option>
            <option value={ContentType.IMAGE}>Image</option>
            <option value={ContentType.VIDEO}>Video</option>
            <option value={ContentType.LINK}>Link</option>
          </select>
        </div>

        {/* Clear Filters Button */}
        {hasActiveFilters && (
          <button
            onClick={handleClearFilters}
            className="sm:w-auto px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors flex items-center justify-center"
          >
            <svg
              className="w-4 h-4 mr-2"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
            Clear
          </button>
        )}
      </div>

      {/* Active Filters Display */}
      {hasActiveFilters && (
        <div className="mt-3 flex flex-wrap gap-2">
          {contentType !== 'ALL' && (
            <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
              Type: {contentType}
              <button
                onClick={() => {
                  setContentType('ALL');
                  onFilterChange({
                    searchQuery: searchQuery || undefined,
                  });
                }}
                className="ml-2 hover:text-blue-600 dark:hover:text-blue-400"
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                    clipRule="evenodd"
                  />
                </svg>
              </button>
            </span>
          )}
          {searchQuery && (
            <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
              Search: "{searchQuery}"
              <button
                onClick={() => {
                  setSearchQuery('');
                  onFilterChange({
                    contentType: contentType === 'ALL' ? undefined : contentType,
                  });
                }}
                className="ml-2 hover:text-green-600 dark:hover:text-green-400"
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                    clipRule="evenodd"
                  />
                </svg>
              </button>
            </span>
          )}
        </div>
      )}
    </div>
  );
};
