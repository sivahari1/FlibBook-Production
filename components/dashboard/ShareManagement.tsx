'use client';

import React, { useState } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { UserRole, getShareQuotaRemaining } from '@/lib/rbac/admin-privileges';

interface LinkShare {
  id: string;
  shareKey: string;
  expiresAt: Date | null;
  isActive: boolean;
  password: string | null;
  maxViews: number | null;
  viewCount: number;
  restrictToEmail: string | null;
  canDownload: boolean;
  createdAt: Date;
}

interface EmailShare {
  id: string;
  sharedWithUser: {
    name: string | null;
    email: string;
  } | null;
  sharedWithEmail: string | null;
  expiresAt: Date | null;
  canDownload: boolean;
  note: string | null;
  createdAt: Date;
}

interface ShareManagementProps {
  documentId: string;
  linkShares: LinkShare[];
  emailShares: EmailShare[];
  onSharesChange: () => void;
  userRole: UserRole;
  totalShareCount: number;
}

export const ShareManagement: React.FC<ShareManagementProps> = ({
  documentId,
  linkShares,
  emailShares,
  onSharesChange,
  userRole,
  totalShareCount,
}) => {
  const [revokingId, setRevokingId] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  
  // Calculate quota information
  const quotaRemaining = getShareQuotaRemaining(userRole, totalShareCount);
  const isUnlimited = quotaRemaining === 'unlimited';

  const formatDate = (date: Date | null) => {
    if (!date) return 'Never';
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const isExpired = (date: Date | null) => {
    if (!date) return false;
    return new Date(date) < new Date();
  };

  const getShareUrl = (shareKey: string) => {
    return `${window.location.origin}/view/${shareKey}`;
  };

  const handleCopyLink = async (shareKey: string) => {
    const url = getShareUrl(shareKey);
    await navigator.clipboard.writeText(url);
    setCopiedKey(shareKey);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleRevokeLinkShare = async (shareId: string) => {
    if (!confirm('Are you sure you want to revoke this share link? This action cannot be undone.')) {
      return;
    }

    setRevokingId(shareId);
    try {
      const response = await fetch(`/api/share/link/${shareId}/revoke`, {
        method: 'PATCH',
      });

      if (!response.ok) {
        throw new Error('Failed to revoke share');
      }

      onSharesChange();
    } catch (error) {
      console.error('Failed to revoke share:', error);
      alert('Failed to revoke share. Please try again.');
    } finally {
      setRevokingId(null);
    }
  };

  const handleRevokeEmailShare = async (shareId: string) => {
    if (!confirm('Are you sure you want to revoke this share? This action cannot be undone.')) {
      return;
    }

    setRevokingId(shareId);
    try {
      const response = await fetch(`/api/share/email/${shareId}/revoke`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to revoke share');
      }

      onSharesChange();
    } catch (error) {
      console.error('Failed to revoke share:', error);
      alert('Failed to revoke share. Please try again.');
    } finally {
      setRevokingId(null);
    }
  };

  const hasShares = linkShares.length > 0 || emailShares.length > 0;

  return (
    <div className="space-y-6">
      {/* Share Quota Status */}
      <Card className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
              Share Quota Status
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Total shares created for this document
            </p>
          </div>
          <div className="text-right">
            <div className="text-3xl font-bold text-gray-900 dark:text-white">
              {totalShareCount}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">
              {isUnlimited ? (
                <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                  <svg
                    className="w-4 h-4 mr-1"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                      clipRule="evenodd"
                    />
                  </svg>
                  Unlimited
                </span>
              ) : (
                <span>
                  {quotaRemaining} remaining
                </span>
              )}
            </div>
          </div>
        </div>
      </Card>

      {!hasShares ? (
        <Card className="p-6">
          <div className="text-center text-gray-500 dark:text-gray-400">
            <svg
              className="mx-auto h-12 w-12 mb-3"
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
            <p>No active shares for this document</p>
          </div>
        </Card>
      ) : (
        <>
      {/* Link Shares */}
      {linkShares.length > 0 && (
        <Card>
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Link Shares ({linkShares.length})
            </h3>
          </div>
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {linkShares.map((share) => (
              <div key={share.id} className="px-6 py-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <code className="text-sm bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">
                        {share.shareKey}
                      </code>
                      {!share.isActive && (
                        <span className="px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">
                          Revoked
                        </span>
                      )}
                      {share.isActive && isExpired(share.expiresAt) && (
                        <span className="px-2 py-1 text-xs font-semibold rounded-full bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200">
                          Expired
                        </span>
                      )}
                      {share.password && (
                        <span className="px-2 py-1 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">
                          Password Protected
                        </span>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-sm text-gray-600 dark:text-gray-400">
                      <div>
                        <span className="font-medium">Created:</span> {formatDate(share.createdAt)}
                      </div>
                      <div>
                        <span className="font-medium">Expires:</span> {formatDate(share.expiresAt)}
                      </div>
                      <div>
                        <span className="font-medium">Views:</span> {share.viewCount}
                        {share.maxViews && ` / ${share.maxViews}`}
                      </div>
                      <div>
                        <span className="font-medium">Download:</span>{' '}
                        {share.canDownload ? 'Allowed' : 'Not Allowed'}
                      </div>
                      {share.restrictToEmail && (
                        <div className="col-span-2">
                          <span className="font-medium">Restricted to:</span> {share.restrictToEmail}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2 ml-4">
                    {share.isActive && (
                      <>
                        {!isExpired(share.expiresAt) && (
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => handleCopyLink(share.shareKey)}
                          >
                            {copiedKey === share.shareKey ? (
                              <>
                                <svg
                                  className="w-4 h-4 mr-1"
                                  fill="currentColor"
                                  viewBox="0 0 20 20"
                                >
                                  <path
                                    fillRule="evenodd"
                                    d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                                    clipRule="evenodd"
                                  />
                                </svg>
                                Copied
                              </>
                            ) : (
                              <>
                                <svg
                                  className="w-4 h-4 mr-1"
                                  fill="none"
                                  stroke="currentColor"
                                  viewBox="0 0 24 24"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                                  />
                                </svg>
                                Copy
                              </>
                            )}
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="danger"
                          onClick={() => handleRevokeLinkShare(share.id)}
                          isLoading={revokingId === share.id}
                          title={isExpired(share.expiresAt) ? "Remove expired share from list" : "Revoke active share"}
                        >
                          {isExpired(share.expiresAt) ? 'Remove' : 'Revoke'}
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Email Shares */}
      {emailShares.length > 0 && (
        <Card>
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Email Shares ({emailShares.length})
            </h3>
          </div>
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {emailShares.map((share) => (
              <div key={share.id} className="px-6 py-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="mb-2 flex items-center gap-2">
                      <span className="text-sm font-medium text-gray-900 dark:text-white">
                        {share.sharedWithUser?.name || 'Unknown User'}
                      </span>
                      <span className="text-sm text-gray-600 dark:text-gray-400">
                        ({share.sharedWithUser?.email || share.sharedWithEmail})
                      </span>
                      {isExpired(share.expiresAt) && (
                        <span className="px-2 py-1 text-xs font-semibold rounded-full bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200">
                          Expired
                        </span>
                      )}
                    </div>
                    {share.note && (
                      <p className="text-sm text-gray-600 dark:text-gray-400 italic mb-2">
                        "{share.note}"
                      </p>
                    )}
                    <div className="grid grid-cols-2 gap-2 text-sm text-gray-600 dark:text-gray-400">
                      <div>
                        <span className="font-medium">Shared:</span> {formatDate(share.createdAt)}
                      </div>
                      <div>
                        <span className="font-medium">Expires:</span> {formatDate(share.expiresAt)}
                      </div>
                      <div>
                        <span className="font-medium">Download:</span>{' '}
                        {share.canDownload ? 'Allowed' : 'Not Allowed'}
                      </div>
                    </div>
                  </div>
                  <div className="ml-4">
                    <Button
                      size="sm"
                      variant="danger"
                      onClick={() => handleRevokeEmailShare(share.id)}
                      isLoading={revokingId === share.id}
                      title={isExpired(share.expiresAt) ? "Remove expired share and clean up access" : "Revoke share and remove from recipient's inbox"}
                    >
                      {isExpired(share.expiresAt) ? 'Remove' : 'Revoke'}
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
      </>
      )}
    </div>
  );
};
