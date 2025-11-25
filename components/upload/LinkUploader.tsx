'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { LinkProcessor } from '@/lib/link-processor';
import { LinkMetadata } from '@/lib/types/content';

/**
 * Link Uploader Component
 * Handles URL input with validation, metadata fetching, and preview display
 * Allows manual title/description override
 * Requirements: 5.1, 5.3, 9.2
 */

interface LinkUploaderProps {
  onLinkSubmit: (url: string, title: string, description?: string) => void;
  onMetadataFetch?: (metadata: LinkMetadata) => void;
  disabled?: boolean;
  initialUrl?: string;
  initialTitle?: string;
  initialDescription?: string;
}

export const LinkUploader: React.FC<LinkUploaderProps> = ({
  onLinkSubmit,
  onMetadataFetch,
  disabled = false,
  initialUrl = '',
  initialTitle = '',
  initialDescription = '',
}) => {
  const [url, setUrl] = useState(initialUrl);
  const [title, setTitle] = useState(initialTitle);
  const [description, setDescription] = useState(initialDescription);
  const [previewImage, setPreviewImage] = useState<string>('');
  const [domain, setDomain] = useState<string>('');
  const [isValidating, setIsValidating] = useState(false);
  const [isFetchingMetadata, setIsFetchingMetadata] = useState(false);
  const [error, setError] = useState<string>('');
  const [urlError, setUrlError] = useState<string>('');
  const [hasManualOverride, setHasManualOverride] = useState(false);

  const linkProcessor = new LinkProcessor();

  // Validate URL format
  const validateUrl = useCallback((urlString: string): boolean => {
    if (!urlString.trim()) {
      setUrlError('');
      return false;
    }

    const isValid = linkProcessor.isValidUrl(urlString);
    if (!isValid) {
      setUrlError('Please enter a valid HTTP or HTTPS URL');
    } else {
      setUrlError('');
    }
    return isValid;
  }, [linkProcessor]);

  // Fetch metadata from URL
  const fetchMetadata = useCallback(async (urlString: string) => {
    if (!validateUrl(urlString)) {
      return;
    }

    setIsFetchingMetadata(true);
    setError('');

    try {
      const metadata = await linkProcessor.processLink(urlString);

      // Only update if user hasn't manually overridden
      if (!hasManualOverride) {
        if (metadata.title) {
          setTitle(metadata.title);
        }
        if (metadata.description) {
          setDescription(metadata.description);
        }
      }

      if (metadata.previewImage) {
        setPreviewImage(metadata.previewImage);
      }
      if (metadata.domain) {
        setDomain(metadata.domain);
      }

      // Notify parent component
      if (onMetadataFetch && metadata.domain) {
        onMetadataFetch({
          url: urlString,
          title: metadata.title || urlString,
          description: metadata.description,
          previewImage: metadata.previewImage,
          domain: metadata.domain,
          fetchedAt: metadata.fetchedAt,
        });
      }
    } catch (err) {
      console.error('Metadata fetch error:', err);
      setError('Failed to fetch link preview. You can still add the link manually.');
    } finally {
      setIsFetchingMetadata(false);
    }
  }, [linkProcessor, validateUrl, hasManualOverride, onMetadataFetch]);

  // Handle URL input change
  const handleUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newUrl = e.target.value;
    setUrl(newUrl);
    setError('');
    
    // Clear validation error as user types
    if (urlError && newUrl.trim()) {
      setUrlError('');
    }
  };

  // Handle URL blur - validate and fetch metadata
  const handleUrlBlur = () => {
    if (url.trim()) {
      setIsValidating(true);
      const isValid = validateUrl(url);
      setIsValidating(false);

      if (isValid) {
        fetchMetadata(url);
      }
    }
  };

  // Handle manual title change
  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setTitle(e.target.value);
    setHasManualOverride(true);
  };

  // Handle manual description change
  const handleDescriptionChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setDescription(e.target.value);
    setHasManualOverride(true);
  };

  // Handle form submission
  const handleSubmit = () => {
    if (!url.trim()) {
      setError('Please enter a URL');
      return;
    }

    if (!validateUrl(url)) {
      return;
    }

    if (!title.trim()) {
      setError('Please enter a title for the link');
      return;
    }

    onLinkSubmit(url, title, description || undefined);
  };

  // Handle refresh metadata
  const handleRefreshMetadata = () => {
    setHasManualOverride(false);
    fetchMetadata(url);
  };

  return (
    <div className="space-y-4">
      {/* URL Input */}
      <div className="space-y-2">
        <label
          htmlFor="link-url"
          className="block text-sm font-medium text-gray-700 dark:text-gray-300"
        >
          URL <span className="text-red-500">*</span>
        </label>
        <div className="relative">
          <input
            id="link-url"
            type="url"
            value={url}
            onChange={handleUrlChange}
            onBlur={handleUrlBlur}
            disabled={disabled}
            placeholder="https://example.com"
            className={`
              w-full px-4 py-2 border rounded-lg
              bg-white dark:bg-gray-800
              text-gray-900 dark:text-gray-100
              placeholder-gray-400 dark:placeholder-gray-500
              focus:outline-none focus:ring-2 focus:ring-blue-500
              disabled:opacity-50 disabled:cursor-not-allowed
              ${
                urlError
                  ? 'border-red-300 dark:border-red-700'
                  : 'border-gray-300 dark:border-gray-600'
              }
            `}
          />
          {isFetchingMetadata && (
            <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
              <svg
                className="animate-spin h-5 w-5 text-blue-500"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
            </div>
          )}
        </div>
        {urlError && (
          <p className="text-sm text-red-600 dark:text-red-400">{urlError}</p>
        )}
        <p className="text-xs text-gray-500 dark:text-gray-400">
          Enter a valid HTTP or HTTPS URL
        </p>
      </div>

      {/* Link Preview */}
      {url && !urlError && (domain || previewImage) && (
        <div className="bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
          <div className="flex items-start justify-between mb-3">
            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Link Preview
            </h4>
            {!isFetchingMetadata && (
              <button
                type="button"
                onClick={handleRefreshMetadata}
                disabled={disabled}
                className="text-xs text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 disabled:opacity-50"
              >
                Refresh
              </button>
            )}
          </div>

          <div className="flex gap-4">
            {/* Preview Image */}
            {previewImage && (
              <div className="flex-shrink-0">
                <img
                  src={previewImage}
                  alt="Link preview"
                  className="w-24 h-24 object-cover rounded-lg"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                  }}
                />
              </div>
            )}

            {/* Preview Info */}
            <div className="flex-1 min-w-0">
              {domain && (
                <div className="flex items-center gap-2 mb-2">
                  <svg
                    className="w-4 h-4 text-gray-400 flex-shrink-0"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M4.083 9h1.946c.089-1.546.383-2.97.837-4.118A6.004 6.004 0 004.083 9zM10 2a8 8 0 100 16 8 8 0 000-16zm0 2c-.076 0-.232.032-.465.262-.238.234-.497.623-.737 1.182-.389.907-.673 2.142-.766 3.556h3.936c-.093-1.414-.377-2.649-.766-3.556-.24-.56-.5-.948-.737-1.182C10.232 4.032 10.076 4 10 4zm3.971 5c-.089-1.546-.383-2.97-.837-4.118A6.004 6.004 0 0115.917 9h-1.946zm-2.003 2H8.032c.093 1.414.377 2.649.766 3.556.24.56.5.948.737 1.182.233.23.389.262.465.262.076 0 .232-.032.465-.262.238-.234.498-.623.737-1.182.389-.907.673-2.142.766-3.556zm1.166 4.118c.454-1.147.748-2.572.837-4.118h1.946a6.004 6.004 0 01-2.783 4.118zm-6.268 0C6.412 13.97 6.118 12.546 6.03 11H4.083a6.004 6.004 0 002.783 4.118z"
                      clipRule="evenodd"
                    />
                  </svg>
                  <span className="text-xs text-gray-500 dark:text-gray-400 truncate">
                    {domain}
                  </span>
                </div>
              )}
              {isFetchingMetadata && (
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Fetching link preview...
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Title Input */}
      <div className="space-y-2">
        <label
          htmlFor="link-title"
          className="block text-sm font-medium text-gray-700 dark:text-gray-300"
        >
          Title <span className="text-red-500">*</span>
        </label>
        <input
          id="link-title"
          type="text"
          value={title}
          onChange={handleTitleChange}
          disabled={disabled}
          placeholder="Enter a title for this link"
          className="
            w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg
            bg-white dark:bg-gray-800
            text-gray-900 dark:text-gray-100
            placeholder-gray-400 dark:placeholder-gray-500
            focus:outline-none focus:ring-2 focus:ring-blue-500
            disabled:opacity-50 disabled:cursor-not-allowed
          "
        />
        <p className="text-xs text-gray-500 dark:text-gray-400">
          {hasManualOverride
            ? 'Custom title (will not be overwritten by metadata)'
            : 'Auto-filled from link metadata'}
        </p>
      </div>

      {/* Description Input */}
      <div className="space-y-2">
        <label
          htmlFor="link-description"
          className="block text-sm font-medium text-gray-700 dark:text-gray-300"
        >
          Description <span className="text-gray-400">(Optional)</span>
        </label>
        <textarea
          id="link-description"
          value={description}
          onChange={handleDescriptionChange}
          disabled={disabled}
          placeholder="Enter a description for this link"
          rows={3}
          className="
            w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg
            bg-white dark:bg-gray-800
            text-gray-900 dark:text-gray-100
            placeholder-gray-400 dark:placeholder-gray-500
            focus:outline-none focus:ring-2 focus:ring-blue-500
            disabled:opacity-50 disabled:cursor-not-allowed
            resize-none
          "
        />
        <p className="text-xs text-gray-500 dark:text-gray-400">
          {hasManualOverride
            ? 'Custom description (will not be overwritten by metadata)'
            : 'Auto-filled from link metadata'}
        </p>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
          <div className="flex items-start">
            <svg
              className="w-5 h-5 text-red-400 mt-0.5 mr-2 flex-shrink-0"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                clipRule="evenodd"
              />
            </svg>
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          </div>
        </div>
      )}
    </div>
  );
};
