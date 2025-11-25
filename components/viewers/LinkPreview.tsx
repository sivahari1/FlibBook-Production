'use client';

import { useState } from 'react';
import { LinkMetadata } from '@/lib/types/content';

interface LinkPreviewProps {
  linkUrl: string;
  metadata: LinkMetadata;
  allowDirectAccess: boolean;
  title?: string;
}

export default function LinkPreview({
  linkUrl,
  metadata,
  allowDirectAccess,
  title
}: LinkPreviewProps) {
  const [imageError, setImageError] = useState(false);

  // Handle image load error
  const handleImageError = () => {
    setImageError(true);
  };

  // Open link in new tab
  const openLink = () => {
    if (allowDirectAccess) {
      window.open(linkUrl, '_blank', 'noopener,noreferrer');
    }
  };

  return (
    <div className="bg-gray-100 dark:bg-slate-900 min-h-screen py-8">
      <div className="max-w-4xl mx-auto px-4">
        {/* Header with title */}
        {title && (
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-md p-4 mb-4">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              {title}
            </h1>
          </div>
        )}

        {/* Link Preview Card */}
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-md overflow-hidden">
          {/* Preview Image */}
          {metadata.previewImage && !imageError && (
            <div className="w-full h-64 bg-gray-200 dark:bg-slate-700 overflow-hidden">
              <img
                src={metadata.previewImage}
                alt={metadata.title}
                onError={handleImageError}
                className="w-full h-full object-cover"
              />
            </div>
          )}

          {/* Content */}
          <div className="p-6">
            {/* Domain Badge */}
            <div className="mb-4">
              <span className="inline-flex items-center gap-2 px-3 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded-full text-sm font-medium">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M12.586 4.586a2 2 0 112.828 2.828l-3 3a2 2 0 01-2.828 0 1 1 0 00-1.414 1.414 4 4 0 005.656 0l3-3a4 4 0 00-5.656-5.656l-1.5 1.5a1 1 0 101.414 1.414l1.5-1.5zm-5 5a2 2 0 012.828 0 1 1 0 101.414-1.414 4 4 0 00-5.656 0l-3 3a4 4 0 105.656 5.656l1.5-1.5a1 1 0 10-1.414-1.414l-1.5 1.5a2 2 0 11-2.828-2.828l3-3z" clipRule="evenodd" />
                </svg>
                {metadata.domain}
              </span>
            </div>

            {/* Title */}
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">
              {metadata.title}
            </h2>

            {/* Description */}
            {metadata.description && (
              <p className="text-gray-700 dark:text-gray-300 mb-6 leading-relaxed">
                {metadata.description}
              </p>
            )}

            {/* URL Display */}
            <div className="mb-6 p-3 bg-gray-100 dark:bg-slate-700 rounded-lg">
              <p className="text-sm text-gray-600 dark:text-gray-400 break-all font-mono">
                {linkUrl}
              </p>
            </div>

            {/* Action Button */}
            {allowDirectAccess ? (
              <button
                onClick={openLink}
                className="w-full sm:w-auto px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                <span>Visit Link</span>
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M11 3a1 1 0 100 2h2.586l-6.293 6.293a1 1 0 101.414 1.414L15 6.414V9a1 1 0 102 0V4a1 1 0 00-1-1h-5z" />
                  <path d="M5 5a2 2 0 00-2 2v8a2 2 0 002 2h8a2 2 0 002-2v-3a1 1 0 10-2 0v3H5V7h3a1 1 0 000-2H5z" />
                </svg>
              </button>
            ) : (
              <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                <p className="text-sm text-yellow-800 dark:text-yellow-200">
                  Direct access to this link is restricted. Please contact the content owner for access.
                </p>
              </div>
            )}

            {/* Metadata Footer */}
            {metadata.fetchedAt && (
              <div className="mt-6 pt-4 border-t border-gray-200 dark:border-slate-700">
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Preview fetched on {new Date(metadata.fetchedAt).toLocaleDateString()}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Info Box */}
        <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
          <div className="flex items-start gap-3">
            <svg className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
            <div className="text-sm text-blue-800 dark:text-blue-200">
              <p className="font-medium mb-1">External Link</p>
              <p>This content is hosted on an external website. {allowDirectAccess ? 'Click "Visit Link" to open it in a new tab.' : 'Access is currently restricted.'}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
