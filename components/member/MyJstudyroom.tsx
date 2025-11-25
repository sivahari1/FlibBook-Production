'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import Link from 'next/link';

interface MyJstudyroomItem {
  id: string;
  bookShopItemId: string;
  title: string;
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

// Helper function to get content type icon and label
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

  useEffect(() => {
    fetchMyJstudyroom();
  }, []);

  const fetchMyJstudyroom = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/member/my-jstudyroom');

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to fetch My jstudyroom');
      }

      const data = await response.json();
      setItems(data.items);
      setCounts(data.counts);
    } catch (err) {
      console.error('Error fetching My jstudyroom:', err);
      setError(err instanceof Error ? err.message : 'Failed to load My jstudyroom');
    } finally {
      setLoading(false);
    }
  };

  const handleReturn = async (itemId: string) => {
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
        throw new Error(data.error || 'Failed to return document');
      }

      // Refresh the list
      await fetchMyJstudyroom();
    } catch (err) {
      console.error('Error returning document:', err);
      setError(err instanceof Error ? err.message : 'Failed to return document');
    } finally {
      setReturningId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="text-gray-600 dark:text-gray-400">Loading My jstudyroom...</div>
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
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded">
          {error}
        </div>
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
      ) : (
        <div className="space-y-4">
          {items.map((item) => (
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
                  <Link href={`/member/view/${item.id}`}>
                    <Button variant="primary" size="sm">
                      View
                    </Button>
                  </Link>
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
