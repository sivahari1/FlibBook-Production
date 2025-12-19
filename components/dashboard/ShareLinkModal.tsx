'use client';

import React, { useState, useEffect } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

interface ShareLink {
  id: string;
  shareKey: string;
  expiresAt: Date | null;
  isActive: boolean;
  hasPassword?: boolean;
  maxViews: number | null;
  viewCount: number;
  createdAt: Date;
}

interface ShareLinkModalProps {
  isOpen: boolean;
  onClose: () => void;
  documentId: string;
  documentTitle: string;
}

export const ShareLinkModal: React.FC<ShareLinkModalProps> = ({
  isOpen,
  onClose,
  documentId,
  documentTitle,
}) => {
  const [shareLinks, setShareLinks] = useState<ShareLink[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Form state
  const [expiresAt, setExpiresAt] = useState('');
  const [password, setPassword] = useState('');
  const [maxViews, setMaxViews] = useState('');

  // Fetch existing share links when modal opens
  useEffect(() => {
    if (isOpen) {
      fetchShareLinks();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, documentId]);

  const fetchShareLinks = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/documents/${documentId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch share links');
      }
      const data = await response.json();
      setShareLinks(data.shareLinks || []);
    } catch (err) {
      console.error('Error fetching share links:', err);
      setError('Failed to load share links');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateShareLink = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsCreating(true);
    setError(null);

    try {
      const body: {
        expiresAt?: string;
        password?: string;
        maxViews?: number;
      } = {};
      
      if (expiresAt) {
        body.expiresAt = new Date(expiresAt).toISOString();
      }
      
      if (password) {
        body.password = password;
      }
      
      if (maxViews) {
        body.maxViews = parseInt(maxViews, 10);
      }

      const response = await fetch(`/api/documents/${documentId}/share`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create share link');
      }

      const newShareLink = await response.json();
      
      // Add new share link to the list
      setShareLinks([newShareLink, ...shareLinks]);
      
      // Reset form
      setExpiresAt('');
      setPassword('');
      setMaxViews('');
      
      // Copy the new share URL to clipboard
      await copyToClipboard(newShareLink.shareUrl, newShareLink.shareKey);
    } catch (err) {
      console.error('Error creating share link:', err);
      setError(err instanceof Error ? err.message : 'Failed to create share link');
    } finally {
      setIsCreating(false);
    }
  };

  const handleDeactivate = async (shareLinkId: string) => {
    if (!confirm('Are you sure you want to deactivate this share link? It will no longer be accessible.')) {
      return;
    }

    try {
      const response = await fetch(`/api/share-links/${shareLinkId}`, {
        method: 'PATCH',
      });

      if (!response.ok) {
        throw new Error('Failed to deactivate share link');
      }

      // Update the share link in the list
      setShareLinks(shareLinks.map(link => 
        link.id === shareLinkId ? { ...link, isActive: false } : link
      ));
    } catch (err) {
      console.error('Error deactivating share link:', err);
      alert('Failed to deactivate share link. Please try again.');
    }
  };

  const copyToClipboard = async (url: string, shareKey: string) => {
    try {
      await navigator.clipboard.writeText(url);
      setCopiedKey(shareKey);
      setTimeout(() => setCopiedKey(null), 2000);
    } catch (err) {
      console.error('Failed to copy to clipboard:', err);
      alert('Failed to copy link to clipboard');
    }
  };

  const formatDate = (date: Date | null): string => {
    if (!date) return 'Never';
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getShareUrl = (shareKey: string): string => {
    const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
    return `${baseUrl}/view/${shareKey}`;
  };

  const getMinDateTime = (): string => {
    const now = new Date();
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    return now.toISOString().slice(0, 16);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Share: ${documentTitle}`} size="lg">
      <div className="space-y-6">
        {/* Create New Share Link Form */}
        <div className="bg-gray-50 p-4 rounded-lg">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Create New Share Link</h3>
          <form onSubmit={handleCreateShareLink} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                type="datetime-local"
                label="Expiration Date (Optional)"
                value={expiresAt}
                onChange={(e) => setExpiresAt(e.target.value)}
                min={getMinDateTime()}
                helperText="Leave empty for no expiration"
              />
              <Input
                type="number"
                label="Max Views (Optional)"
                value={maxViews}
                onChange={(e) => setMaxViews(e.target.value)}
                min="1"
                placeholder="Unlimited"
                helperText="Leave empty for unlimited views"
              />
            </div>
            <Input
              type="password"
              label="Password (Optional)"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Leave empty for no password"
              helperText="Viewers will need this password to access"
            />
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
                {error}
              </div>
            )}
            <Button
              type="submit"
              variant="primary"
              isLoading={isCreating}
              className="w-full"
            >
              Create Share Link
            </Button>
          </form>
        </div>

        {/* Existing Share Links */}
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Existing Share Links</h3>
          {isLoading ? (
            <div className="text-center py-8 text-gray-500">Loading share links...</div>
          ) : shareLinks.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No share links yet. Create one above to get started.
            </div>
          ) : (
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {shareLinks.map((link) => (
                <div
                  key={link.id}
                  className={`border rounded-lg p-4 ${
                    link.isActive ? 'bg-white border-gray-200' : 'bg-gray-50 border-gray-300'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      {/* Status Badge */}
                      <div className="flex items-center space-x-2 mb-2">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            link.isActive
                              ? 'bg-green-100 text-green-800'
                              : 'bg-gray-100 text-gray-800'
                          }`}
                        >
                          {link.isActive ? 'Active' : 'Inactive'}
                        </span>
                        <span className="text-xs text-gray-500">
                          Created {formatDate(link.createdAt)}
                        </span>
                      </div>

                      {/* Share URL */}
                      <div className="flex items-center space-x-2 mb-2">
                        <code className="flex-1 text-sm bg-gray-100 px-3 py-2 rounded border border-gray-200 truncate">
                          {getShareUrl(link.shareKey)}
                        </code>
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => copyToClipboard(getShareUrl(link.shareKey), link.shareKey)}
                          disabled={!link.isActive}
                        >
                          {copiedKey === link.shareKey ? (
                            <>
                              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                              </svg>
                              Copied
                            </>
                          ) : (
                            <>
                              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                              </svg>
                              Copy
                            </>
                          )}
                        </Button>
                      </div>

                      {/* Link Details */}
                      <div className="flex flex-wrap gap-4 text-sm text-gray-600">
                        <div className="flex items-center">
                          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                          Views: {link.viewCount}{link.maxViews ? ` / ${link.maxViews}` : ''}
                        </div>
                        <div className="flex items-center">
                          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                          Expires: {formatDate(link.expiresAt)}
                        </div>
                        {link.hasPassword && (
                          <div className="flex items-center">
                            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                            </svg>
                            Password Protected
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    {link.isActive && (
                      <Button
                        size="sm"
                        variant="danger"
                        onClick={() => handleDeactivate(link.id)}
                        className="ml-4"
                      >
                        Deactivate
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
};
