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
  document: {
    id: string;
    title: string;
    filename: string;
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
        {/* Card Header */}
        <div className="p-6">
          {/* Category Badge */}
          <div className="mb-3">
            <span className="inline-block px-3 py-1 text-xs font-medium bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded-full">
              {item.category}
            </span>
          </div>

          {/* Title */}
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2 line-clamp-2">
            {item.title}
          </h3>

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
