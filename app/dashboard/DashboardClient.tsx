'use client';

import { Card, CardContent, CardHeader } from '@/components/ui/Card';
import { DocumentList } from '@/components/dashboard/DocumentList';
import { UploadButton } from '@/components/dashboard/UploadButton';
import { ContentFilter } from '@/components/dashboard/ContentFilter';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import Link from 'next/link';
import { ContentType } from '@/lib/types/content';

interface Document {
  id: string;
  title: string;
  filename: string;
  fileSize: string;
  createdAt: string;
  contentType?: string;
  metadata?: any;
  linkUrl?: string;
}

interface DashboardClientProps {
  documents: Document[];
  subscription: string;
  documentCount: number;
  maxDocuments: number | string;
  storageUsed: string;
  storageLimit: string;
  storagePercentage: number;
  userRole?: string;
}

export function DashboardClient({
  documents: initialDocuments,
  subscription,
  documentCount,
  maxDocuments,
  storageUsed,
  storageLimit,
  storagePercentage,
  userRole,
}: DashboardClientProps) {
  const router = useRouter();
  const [documents, setDocuments] = useState(initialDocuments);
  const [isLoading, setIsLoading] = useState(false);
  const [filter, setFilter] = useState<{ contentType?: ContentType; searchQuery?: string }>({});

  // Check if user is a reader (should not see this page, but handle gracefully)
  const isReader = userRole === 'READER_USER';

  const handleDocumentsChange = () => {
    router.refresh();
  };

  // Fetch filtered documents
  const fetchFilteredDocuments = async (newFilter: { contentType?: ContentType; searchQuery?: string }) => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (newFilter.contentType) {
        params.append('contentType', newFilter.contentType);
      }
      if (newFilter.searchQuery) {
        params.append('search', newFilter.searchQuery);
      }

      const response = await fetch(`/api/documents?${params.toString()}`);
      if (!response.ok) {
        throw new Error('Failed to fetch documents');
      }

      const data = await response.json();
      setDocuments(data.documents);
    } catch (error) {
      console.error('Error fetching filtered documents:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFilterChange = (newFilter: { contentType?: ContentType; searchQuery?: string }) => {
    setFilter(newFilter);
    fetchFilteredDocuments(newFilter);
  };

  const getSubscriptionBadgeColor = (sub: string) => {
    switch (sub) {
      case 'pro':
        return 'bg-blue-100 text-blue-800';
      case 'enterprise':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStorageBarColor = () => {
    if (storagePercentage >= 90) return 'bg-red-600';
    if (storagePercentage >= 75) return 'bg-yellow-600';
    return 'bg-blue-600';
  };

  return (
    <div className="space-y-6">
      {/* Reader User Message */}
      {isReader && (
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-6">
          <h2 className="text-xl font-semibold text-yellow-900 dark:text-yellow-100 mb-2">
            Reader Account
          </h2>
          <p className="text-yellow-700 dark:text-yellow-300 mb-4">
            Your account is configured as a Reader. You can view documents shared with you, but cannot upload or manage documents.
          </p>
          <Link
            href="/reader"
            className="inline-flex items-center px-4 py-2 bg-yellow-600 hover:bg-yellow-700 text-white rounded-lg transition-colors"
          >
            Go to Reader Dashboard
          </Link>
        </div>
      )}

      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">My Documents</h1>
          <p className="mt-1 text-sm text-gray-600">
            Manage and share your PDF documents securely
          </p>
        </div>
        {!isReader && <UploadButton onUploadSuccess={handleDocumentsChange} />}
      </div>

      {/* Storage and Subscription Info */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Storage Usage Card */}
        <Card>
          <CardHeader>
            <h3 className="text-lg font-semibold text-gray-900">Storage Usage</h3>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">Used</span>
                <span className="font-medium text-gray-900">
                  {storageUsed} / {storageLimit}
                </span>
              </div>
              
              {storageLimit !== 'Unlimited' && (
                <>
                  <div className="w-full bg-gray-200 rounded-full h-3">
                    <div
                      className={`h-3 rounded-full transition-all duration-300 ${getStorageBarColor()}`}
                      style={{ width: `${storagePercentage}%` }}
                    />
                  </div>
                  <p className="text-xs text-gray-500">
                    {storagePercentage.toFixed(1)}% of storage used
                  </p>
                </>
              )}

              {storagePercentage >= 90 && storageLimit !== 'Unlimited' && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3 mt-3">
                  <p className="text-sm text-red-600">
                    You're running low on storage. Consider upgrading your plan.
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Subscription Info Card */}
        <Card>
          <CardHeader>
            <h3 className="text-lg font-semibold text-gray-900">Subscription</h3>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Current Plan</span>
                <span
                  className={`px-3 py-1 rounded-full text-xs font-semibold uppercase ${getSubscriptionBadgeColor(
                    subscription
                  )}`}
                >
                  {subscription}
                </span>
              </div>

              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">Documents</span>
                <span className="font-medium text-gray-900">
                  {documentCount} / {maxDocuments === 'Unlimited' || maxDocuments === Infinity ? 'Unlimited' : maxDocuments}
                </span>
              </div>

              {subscription === 'free' && (
                <div className="pt-3">
                  <Link
                    href="/dashboard/subscription"
                    className="block w-full text-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                  >
                    Upgrade Plan
                  </Link>
                </div>
              )}

              {typeof maxDocuments === 'number' && documentCount >= maxDocuments && maxDocuments !== Infinity && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mt-3">
                  <p className="text-sm text-yellow-700">
                    You've reached your document limit. Upgrade to upload more.
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Documents List */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            Your Documents ({documents.length})
          </h2>
        </div>

        {/* Content Filter */}
        <ContentFilter
          onFilterChange={handleFilterChange}
          currentFilter={filter}
        />

        {/* Loading State */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        ) : (
          <DocumentList
            documents={documents.map(doc => ({
              ...doc,
              fileSize: BigInt(doc.fileSize),
            }))}
            onDocumentsChange={handleDocumentsChange}
          />
        )}
      </div>
    </div>
  );
}
