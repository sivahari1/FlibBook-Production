'use client';

import { useState, memo } from 'react';
import { Button } from '@/components/ui/Button';
import { PaymentModal } from './PaymentModal';
import { ContentMetadata } from '@/lib/types/content';

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

interface BookShopItemCardProps {
  item: BookShopItem;
  onAddToMyJstudyroom: (itemId: string) => void;
  userLimits?: {
    freeCount: number;
    paidCount: number;
    freeLimit: number;
    paidLimit: number;
  };
}

const BookShopItemCardComponent = ({ item, onAddToMyJstudyroom, userLimits }: BookShopItemCardProps) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [isOptimisticallyAdded, setIsOptimisticallyAdded] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const MAX_RETRIES = 2;

  // Get content type from document or item
  const contentType = item.document?.contentType || item.contentType || 'PDF';
  const metadata: ContentMetadata = item.document?.metadata || item.metadata || {};
  const thumbnailUrl = item.document?.thumbnailUrl || item.previewUrl;
  const linkUrl = item.document?.linkUrl || item.linkUrl;

  // Helper function to get content type badge info
  const getContentTypeBadge = (type: string) => {
    switch (type) {
      case 'PDF':
        return { label: 'PDF', color: 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200', icon: '📄' };
      case 'IMAGE':
        return { label: 'Image', color: 'bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200', icon: '🖼️' };
      case 'VIDEO':
        return { label: 'Video', color: 'bg-indigo-100 dark:bg-indigo-900 text-indigo-800 dark:text-indigo-200', icon: '🎥' };
      case 'LINK':
        return { label: 'Link', color: 'bg-teal-100 dark:bg-teal-900 text-teal-800 dark:text-teal-200', icon: '🔗' };
      case 'AUDIO':
        return { label: 'Audio', color: 'bg-pink-100 dark:bg-pink-900 text-pink-800 dark:text-pink-200', icon: '🎵' };
      default:
        return { label: 'Document', color: 'bg-gray-100 dark:bg-gray-900 text-gray-800 dark:text-gray-200', icon: '📄' };
    }
  };

  // Helper function to format duration (seconds to mm:ss)
  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Helper function to format file size
  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  // Get type-specific metadata display
  const getMetadataDisplay = () => {
    switch (contentType) {
      case 'VIDEO':
        if (metadata.duration) {
          return (
            <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
              <span>⏱️ Duration: {formatDuration(metadata.duration)}</span>
            </div>
          );
        }
        break;
      case 'IMAGE':
        if (metadata.width && metadata.height) {
          return (
            <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
              <span>📐 {metadata.width} × {metadata.height}</span>
            </div>
          );
        }
        break;
      case 'LINK':
        if (linkUrl) {
          try {
            const url = new URL(linkUrl);
            const domain = metadata.domain || url.hostname;
            return (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                  <span>🌐 {domain}</span>
                </div>
                <div className="text-xs text-blue-600 dark:text-blue-400 truncate">
                  <a href={linkUrl} target="_blank" rel="noopener noreferrer" className="hover:underline">
                    {linkUrl}
                  </a>
                </div>
                {metadata.title && metadata.title !== item.title && (
                  <div className="text-xs text-gray-500 dark:text-gray-500 italic">
                    {metadata.title}
                  </div>
                )}
              </div>
            );
          } catch (e) {
            return (
              <div className="text-xs text-blue-600 dark:text-blue-400 truncate">
                <a href={linkUrl} target="_blank" rel="noopener noreferrer" className="hover:underline">
                  {linkUrl}
                </a>
              </div>
            );
          }
        }
        break;
      case 'AUDIO':
        if (metadata.duration) {
          return (
            <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
              <span>⏱️ Duration: {formatDuration(metadata.duration)}</span>
            </div>
          );
        }
        break;
    }
    return null;
  };

  const contentTypeBadge = getContentTypeBadge(contentType);

  // Check if user is at limit
  const isAtLimit = userLimits
    ? item.isFree
      ? userLimits.freeCount >= userLimits.freeLimit
      : userLimits.paidCount >= userLimits.paidLimit
    : false;

  // Check if item is in study room (including optimistic state)
  const isInStudyRoom = item.inMyJstudyroom || isOptimisticallyAdded;

  const handleAddClick = async () => {
    if (item.isFree) {
      // Handle free document addition
      await handleAddFreeDocument();
    } else {
      // Handle paid document (payment flow)
      handlePaidDocument();
    }
  };

  const handleAddFreeDocument = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Optimistic update
      setIsOptimisticallyAdded(true);

      const response = await fetch('/api/member/my-jstudyroom', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          bookShopItemId: item.id,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        // Rollback optimistic update
        setIsOptimisticallyAdded(false);
        
        // Handle specific error cases
        if (response.status === 400 && data.error?.includes('limit')) {
          throw new Error(`Free item limit reached (5/5). Remove an item from your Study Room to add more.`);
        } else if (response.status === 409) {
          throw new Error('This item is already in your Study Room.');
        } else if (response.status === 404) {
          throw new Error('This item is no longer available.');
        } else {
          throw new Error(data.error || 'Failed to add document');
        }
      }

      // Success - notify parent to refresh
      onAddToMyJstudyroom(item.id);
    } catch (err) {
      // Rollback optimistic update on error
      setIsOptimisticallyAdded(false);
      
      const errorMessage = err instanceof Error ? err.message : 'An error occurred';
      setError(errorMessage);
      
      // Log error for debugging
      console.error('Error adding free document:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleRetry = () => {
    setError(null);
    setRetryCount(prev => prev + 1);
    handleAddFreeDocument();
  };

  const handlePaidDocument = () => {
    setError(null);
    setShowPaymentModal(true);
  };

  const handlePaymentSuccess = () => {
    // Notify parent to refresh
    onAddToMyJstudyroom(item.id);
  };

  const formatPrice = (priceInPaise: number) => {
    const rupees = priceInPaise / 100;
    return `₹${rupees.toFixed(2)}`;
  };

  return (
    <>
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-shadow">
        {/* Thumbnail Preview with Lazy Loading and Placeholder */}
        <div className="relative w-full h-48 bg-gray-100 dark:bg-gray-700">
          {thumbnailUrl ? (
            <img
              src={thumbnailUrl}
              alt={item.title}
              loading="lazy"
              className="w-full h-full object-cover"
              onError={(e) => {
                // Hide broken image and show placeholder
                e.currentTarget.style.display = 'none';
                const placeholder = e.currentTarget.nextElementSibling as HTMLElement;
                if (placeholder) placeholder.style.display = 'flex';
              }}
            />
          ) : null}
          
          {/* Placeholder for missing/broken thumbnails */}
          <div 
            className={`${thumbnailUrl ? 'hidden' : 'flex'} w-full h-full items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-800`}
            style={{ display: thumbnailUrl ? 'none' : 'flex' }}
          >
            <div className="text-center">
              <div className="text-4xl mb-2">{contentTypeBadge.icon}</div>
              <div className="text-sm font-medium text-gray-600 dark:text-gray-400">
                {contentTypeBadge.label}
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                No preview available
              </div>
            </div>
          </div>

          {/* Content Type Badge Overlay */}
          <div className="absolute top-2 right-2">
            <span className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-md ${contentTypeBadge.color}`}>
              <span>{contentTypeBadge.icon}</span>
              <span>{contentTypeBadge.label}</span>
            </span>
          </div>
        </div>

        {/* Card Content */}
        <div className="p-6">
          {/* Badges Row */}
          <div className="flex flex-wrap items-center gap-2 mb-3">
            {/* Category Badge */}
            <span className="inline-block px-3 py-1 text-xs font-medium bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded-full">
              {item.category}
            </span>
            
            {/* Content Type Badge (if no thumbnail) */}
            {!thumbnailUrl && (
              <span className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-md ${contentTypeBadge.color}`}>
                <span>{contentTypeBadge.icon}</span>
                <span>{contentTypeBadge.label}</span>
              </span>
            )}
          </div>

          {/* Title */}
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2 line-clamp-2">
            {item.title}
          </h3>

          {/* Type-Specific Metadata */}
          {getMetadataDisplay() && (
            <div className="mb-3">
              {getMetadataDisplay()}
            </div>
          )}

          {/* Description */}
          {item.description && (
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4 line-clamp-3">
              {item.description}
            </p>
          )}

          {/* Price Badge */}
          <div className="mb-4">
            {item.isFree ? (
              <span className="inline-flex items-center px-3 py-1 text-sm font-semibold bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 rounded-md">
                Free
              </span>
            ) : (
              <span className="inline-flex items-center px-3 py-1 text-sm font-semibold bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200 rounded-md">
                Paid - {item.price ? formatPrice(item.price) : 'N/A'}
              </span>
            )}
          </div>

          {/* Error Message with Retry */}
          {error && (
            <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md">
              <div className="flex items-start gap-2">
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
                  <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
                  {/* Show retry button for network errors */}
                  {!error.includes('limit') && !error.includes('already') && retryCount < MAX_RETRIES && (
                    <button
                      onClick={handleRetry}
                      className="mt-2 text-xs text-red-700 dark:text-red-300 underline hover:no-underline"
                    >
                      Try again
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* In My Study Room Badge */}
          {isInStudyRoom && (
            <div className="mb-4">
              <span className="inline-flex items-center px-3 py-1 text-sm font-semibold bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded-md">
                {isOptimisticallyAdded && !item.inMyJstudyroom ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-3 w-3" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Adding...
                  </>
                ) : (
                  '✓ In My Study Room'
                )}
              </span>
            </div>
          )}

          {/* Action Button */}
          <Button
            onClick={handleAddClick}
            disabled={isInStudyRoom || loading || isAtLimit}
            className="w-full"
            variant={isInStudyRoom ? 'secondary' : 'primary'}
          >
            {loading
              ? 'Adding...'
              : isInStudyRoom
              ? 'In My Study Room'
              : isAtLimit
              ? `${item.isFree ? 'Free' : 'Paid'} Limit Reached`
              : 'Add to My Study Room'}
          </Button>

          {/* Limit Warning */}
          {isAtLimit && !isInStudyRoom && (
            <div className="mt-2 p-2 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-md">
              <p className="text-xs text-amber-800 dark:text-amber-300 text-center">
                <strong>Limit Reached:</strong> You've used all {item.isFree ? userLimits?.freeLimit : userLimits?.paidLimit} {item.isFree ? 'free' : 'paid'} slots. 
                Remove an item from your Study Room to add more.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Payment Modal */}
      {!item.isFree && item.price && (
        <PaymentModal
          isOpen={showPaymentModal}
          onClose={() => setShowPaymentModal(false)}
          bookShopItem={{
            id: item.id,
            title: item.title,
            description: item.description,
            category: item.category,
            price: item.price,
          }}
          onSuccess={handlePaymentSuccess}
        />
      )}
    </>
  );
};

// Export memoized component for performance optimization
export const BookShopItemCard = memo(BookShopItemCardComponent);
