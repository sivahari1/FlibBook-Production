'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ShareManagement } from '@/components/dashboard/ShareManagement';
import AnalyticsClient from './AnalyticsClient';

import { UserRole } from '@/lib/rbac/admin-privileges';

interface DocumentDetailsClientProps {
  documentId: string;
  linkShares: any[];
  emailShares: any[];
  userRole: UserRole;
  totalShareCount: number;
}

export default function DocumentDetailsClient({
  documentId,
  linkShares: initialLinkShares,
  emailShares: initialEmailShares,
  userRole,
  totalShareCount,
}: DocumentDetailsClientProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'analytics' | 'shares'>('analytics');

  const handleSharesChange = () => {
    router.refresh();
  };

  return (
    <div className="space-y-6">
      {/* Tabs */}
      <div className="border-b border-gray-200 dark:border-gray-700">
        <nav className="-mb-px flex space-x-8" aria-label="Tabs">
          <button
            onClick={() => setActiveTab('analytics')}
            className={`
              whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm
              ${
                activeTab === 'analytics'
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
              }
            `}
          >
            <div className="flex items-center">
              <svg
                className="w-5 h-5 mr-2"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                />
              </svg>
              Analytics
            </div>
          </button>
          <button
            onClick={() => setActiveTab('shares')}
            className={`
              whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm
              ${
                activeTab === 'shares'
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
              }
            `}
          >
            <div className="flex items-center">
              <svg
                className="w-5 h-5 mr-2"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"
                />
              </svg>
              Shares ({initialLinkShares.length + initialEmailShares.length})
            </div>
          </button>
        </nav>
      </div>

      {/* Tab Content */}
      <div>
        {activeTab === 'analytics' ? (
          <AnalyticsClient documentId={documentId} />
        ) : (
          <ShareManagement
            documentId={documentId}
            linkShares={initialLinkShares}
            emailShares={initialEmailShares}
            onSharesChange={handleSharesChange}
            userRole={userRole}
            totalShareCount={totalShareCount}
          />
        )}
      </div>
    </div>
  );
}
