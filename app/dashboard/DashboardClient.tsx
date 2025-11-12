'use client';

import { Card, CardContent, CardHeader } from '@/components/ui/Card';
import { DocumentList } from '@/components/dashboard/DocumentList';
import { UploadButton } from '@/components/dashboard/UploadButton';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface Document {
  id: string;
  title: string;
  filename: string;
  fileSize: string;
  createdAt: string;
}

interface DashboardClientProps {
  documents: Document[];
  subscription: string;
  documentCount: number;
  maxDocuments: number;
  storageUsed: string;
  storageLimit: string;
  storagePercentage: number;
}

export function DashboardClient({
  documents,
  subscription,
  documentCount,
  maxDocuments,
  storageUsed,
  storageLimit,
  storagePercentage,
}: DashboardClientProps) {
  const router = useRouter();

  const handleDocumentsChange = () => {
    router.refresh();
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
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">My Documents</h1>
          <p className="mt-1 text-sm text-gray-600">
            Manage and share your PDF documents securely
          </p>
        </div>
        <UploadButton onUploadSuccess={handleDocumentsChange} />
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
                  {documentCount} / {maxDocuments === Infinity ? '∞' : maxDocuments}
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

              {documentCount >= maxDocuments && maxDocuments !== Infinity && (
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
        <h2 className="text-xl font-semibold text-gray-900 mb-4">
          Your Documents ({documentCount})
        </h2>
        <DocumentList
          documents={documents.map(doc => ({
            ...doc,
            fileSize: BigInt(doc.fileSize),
          }))}
          onDocumentsChange={handleDocumentsChange}
        />
      </div>
    </div>
  );
}
