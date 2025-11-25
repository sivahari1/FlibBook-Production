'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { PaymentModal } from './PaymentModal';

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
  metadata?: any;
  previewUrl?: string;
  linkUrl?: string;
  document: {
    id: string;
    title: string;
    filename: string;
    contentType?: string;
    metadata?: any;
    thumbnailUrl?: string;
    linkUrl?: string;
  };
}

interface BookShopItemCardProps {
  item: BookShopItem;
  onAddToMyJstudyroom: (itemId: string) => void;
}

export function BookShopItemCard({ item, onAddToMyJstudyroom }: BookShopItemCardProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);

  // Get content type from document or item
  const contentType = item.document?.contentType || item.contentType || 'PDF';
  const metadata = item.document?.metadata || item.metadata || {};
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
        if (metadata.domain || linkUrl) {
          const domain = metadata.domain || (linkUrl ? new URL(linkUrl).hostname : '');
          return (
            <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
              <span>🌐 {domain}</span>
            </div>
          );
        }
        break;
    }
    return null;
  };

  const contentTypeBadge = getContentTypeBadge(contentType);

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
        throw new Error(data.error || 'Failed to add document');
      }

      // Notify parent to refresh
      onAddToMyJstudyroom(item.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
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
        {/* Thumbnail Preview */}
        {thumbnailUrl && (
          <div className="relative w-full h-48 bg-gray-100 dark:bg-gray-700">
            <img
              src={thumbnailUrl}
              alt={item.title}
              className="w-full h-full object-cover"
            />
            {/* Content Type Badge Overlay */}
            <div className="absolute top-2 right-2">
              <span className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-md ${contentTypeBadge.color}`}>
                <span>{contentTypeBadge.icon}</span>
                <span>{contentTypeBadge.label}</span>
              </span>
            </div>
          </div>
        )}

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

          {/* Error Message */}
          {error && (
            <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md">
              <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
            </div>
          )}

          {/* Action Button */}
          <Button
            onClick={handleAddClick}
            disabled={item.inMyJstudyroom || loading}
            className="w-full"
            variant={item.inMyJstudyroom ? 'secondary' : 'primary'}
          >
            {loading
              ? 'Adding...'
              : item.inMyJstudyroom
              ? 'Already in My jstudyroom'
              : 'Add to My jstudyroom'}
          </Button>
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
}
