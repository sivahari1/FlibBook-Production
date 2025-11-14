'use client';

import React, { useState } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { useRouter } from 'next/navigation';

interface InboxItem {
  id: string;
  document: {
    id: string;
    title: string;
    filename: string;
  };
  sharedBy: {
    name: string | null;
    email: string;
  };
  createdAt: string;
  expiresAt?: string;
  canDownload: boolean;
  note?: string;
  type: 'link' | 'email';
}

interface InboxClientProps {
  initialShares: InboxItem[];
}

type SortField = 'createdAt' | 'title' | 'sharedBy';
type SortOrder = 'asc' | 'desc';

export function InboxClient({ initialShares }: InboxClientProps) {
  const router = useRouter();
  const [shares, setShares] = useState<InboxItem[]>(initialShares);
  const [sortField, setSortField] = useState<SortField>('createdAt');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadingShareId, setLoadingShareId] = useState<string | null>(null);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      const response = await fetch('/api/inbox');
      if (response.ok) {
        const data = await response.json();
        setShares(data.shares || []);
      }
    } catch (error) {
      console.error('Failed to refresh inbox:', error);
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleViewDocument = async (shareId: string, documentId: string) => {
    setLoadingShareId(shareId);
    setError(null);
    
    try {
      // Create a temporary view session for this email share
      const response = await fetch(`/api/share/email/${shareId}/view`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        if (data.viewUrl) {
          // Redirect to the secure view URL
          router.push(data.viewUrl);
        } else {
          setError('Failed to generate view URL');
        }
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to access document');
      }
    } catch (err) {
      setError('Failed to access document');
      console.error('Error accessing shared document:', err);
    } finally {
      setLoadingShareId(null);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getTimeUntilExpiration = (expiresAt?: string) => {
    if (!expiresAt) return 'Never';

    const now = new Date();
    const expiry = new Date(expiresAt);
    const diff = expiry.getTime() - now.getTime();

    if (diff <= 0) return 'Expired';

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

    if (days > 0) return `${days} day${days > 1 ? 's' : ''}`;
    if (hours > 0) return `${hours} hour${hours > 1 ? 's' : ''}`;
    return 'Less than 1 hour';
  };

  // Sort shares
  const sortedShares = [...shares].sort((a, b) => {
    let comparison = 0;

    switch (sortField) {
      case 'createdAt':
        comparison =
          new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        break;
      case 'title':
        comparison = a.document.title.localeCompare(b.document.title);
        break;
      case 'sharedBy':
        const nameA = a.sharedBy.name || a.sharedBy.email;
        const nameB = b.sharedBy.name || b.sharedBy.email;
        comparison = nameA.localeCompare(nameB);
        break;
    }

    return sortOrder === 'asc' ? comparison : -comparison;
  });

  if (shares.length === 0) {
    return (
      <Card className="p-12">
        <div className="text-center">
          <svg
            className="mx-auto h-16 w-16 text-gray-400 dark:text-gray-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
            />
          </svg>
          <h3 className="mt-4 text-lg font-medium text-gray-900 dark:text-white">
            No shared documents
          </h3>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            Documents shared with you will appear here.
          </p>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Error Message */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <div className="flex">
            <svg className="h-5 w-5 text-red-400" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
            <div className="ml-3">
              <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
            </div>
            <button
              onClick={() => setError(null)}
              className="ml-auto text-red-500 hover:text-red-700"
            >
              <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* Actions Bar */}
      <div className="flex justify-between items-center">
        <p className="text-sm text-gray-600 dark:text-gray-400">
          {shares.length} document{shares.length !== 1 ? 's' : ''} shared with you
        </p>
        <Button
          onClick={handleRefresh}
          variant="secondary"
          size="sm"
          isLoading={isRefreshing}
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
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
            />
          </svg>
          Refresh
        </Button>
      </div>

      {/* Desktop Table View */}
      <div className="hidden md:block">
        <Card>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-800">
                <tr>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700"
                    onClick={() => handleSort('title')}
                  >
                    <div className="flex items-center">
                      Document
                      {sortField === 'title' && (
                        <svg
                          className={`ml-1 w-4 h-4 ${
                            sortOrder === 'asc' ? 'transform rotate-180' : ''
                          }`}
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path
                            fillRule="evenodd"
                            d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                            clipRule="evenodd"
                          />
                        </svg>
                      )}
                    </div>
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700"
                    onClick={() => handleSort('sharedBy')}
                  >
                    <div className="flex items-center">
                      Shared By
                      {sortField === 'sharedBy' && (
                        <svg
                          className={`ml-1 w-4 h-4 ${
                            sortOrder === 'asc' ? 'transform rotate-180' : ''
                          }`}
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path
                            fillRule="evenodd"
                            d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                            clipRule="evenodd"
                          />
                        </svg>
                      )}
                    </div>
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700"
                    onClick={() => handleSort('createdAt')}
                  >
                    <div className="flex items-center">
                      Received
                      {sortField === 'createdAt' && (
                        <svg
                          className={`ml-1 w-4 h-4 ${
                            sortOrder === 'asc' ? 'transform rotate-180' : ''
                          }`}
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path
                            fillRule="evenodd"
                            d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                            clipRule="evenodd"
                          />
                        </svg>
                      )}
                    </div>
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider"
                  >
                    Expires
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider"
                  >
                    Download
                  </th>
                  <th scope="col" className="relative px-6 py-3">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
                {sortedShares.map((share) => (
                  <tr
                    key={share.id}
                    className="hover:bg-gray-50 dark:hover:bg-gray-800"
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center">
                        <svg
                          className="w-8 h-8 text-red-500 mr-3"
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path
                            fillRule="evenodd"
                            d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z"
                            clipRule="evenodd"
                          />
                        </svg>
                        <div>
                          <div className="text-sm font-medium text-gray-900 dark:text-white">
                            {share.document.title}
                          </div>
                          <div className="text-sm text-gray-500 dark:text-gray-400">
                            {share.document.filename}
                          </div>
                          {share.note && (
                            <div className="text-xs text-gray-500 dark:text-gray-400 mt-1 italic">
                              "{share.note}"
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900 dark:text-white">
                        {share.sharedBy.name || 'Unknown'}
                      </div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        {share.sharedBy.email}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {formatDate(share.createdAt)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {getTimeUntilExpiration(share.expiresAt)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {share.canDownload ? (
                        <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                          Yes
                        </span>
                      ) : (
                        <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300">
                          No
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <Button
                        size="sm"
                        variant="primary"
                        onClick={() =>
                          handleViewDocument(share.id, share.document.id)
                        }
                        isLoading={loadingShareId === share.id}
                        disabled={loadingShareId !== null}
                      >
                        {loadingShareId === share.id ? 'Loading...' : 'View'}
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      {/* Mobile Card View */}
      <div className="md:hidden space-y-4">
        {sortedShares.map((share) => (
          <Card key={share.id} className="p-4">
            <div className="space-y-3">
              <div className="flex items-start">
                <svg
                  className="w-10 h-10 text-red-500 mr-3 flex-shrink-0"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z"
                    clipRule="evenodd"
                  />
                </svg>
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-medium text-gray-900 dark:text-white truncate">
                    {share.document.title}
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                    {share.document.filename}
                  </p>
                </div>
              </div>

              {share.note && (
                <p className="text-xs text-gray-600 dark:text-gray-400 italic">
                  "{share.note}"
                </p>
              )}

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-gray-500 dark:text-gray-400">
                    Shared by:
                  </span>
                  <p className="text-gray-900 dark:text-white font-medium">
                    {share.sharedBy.name || share.sharedBy.email}
                  </p>
                </div>
                <div>
                  <span className="text-gray-500 dark:text-gray-400">
                    Received:
                  </span>
                  <p className="text-gray-900 dark:text-white font-medium">
                    {formatDate(share.createdAt)}
                  </p>
                </div>
                <div>
                  <span className="text-gray-500 dark:text-gray-400">
                    Expires:
                  </span>
                  <p className="text-gray-900 dark:text-white font-medium">
                    {getTimeUntilExpiration(share.expiresAt)}
                  </p>
                </div>
                <div>
                  <span className="text-gray-500 dark:text-gray-400">
                    Download:
                  </span>
                  <p className="text-gray-900 dark:text-white font-medium">
                    {share.canDownload ? 'Yes' : 'No'}
                  </p>
                </div>
              </div>

              <Button
                variant="primary"
                className="w-full"
                onClick={() =>
                  handleViewDocument(share.id, share.document.id)
                }
                isLoading={loadingShareId === share.id}
                disabled={loadingShareId !== null}
              >
                {loadingShareId === share.id ? 'Loading...' : 'View Document'}
              </Button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
