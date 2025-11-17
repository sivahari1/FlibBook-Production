'use client';

import { useEffect, useState } from 'react';
import PDFViewer from '@/components/pdf/PDFViewer';
import { PasswordModal } from '@/components/share/PasswordModal';

interface DocumentData {
  document: {
    id: string;
    title: string;
    filename: string;
    fileSize: number;
    mimeType: string;
    createdAt: string;
  };
  shareLink: {
    id: string;
    shareKey: string;
    expiresAt: string | null;
    maxViews: number | null;
    viewCount: number;
    requiresPassword: boolean;
  };
  signedUrl: string;
}

interface ViewerClientProps {
  shareKey: string;
  userEmail: string;
}

export default function ViewerClient({ shareKey, userEmail }: ViewerClientProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [documentData, setDocumentData] = useState<DocumentData | null>(null);
  const [requiresPassword, setRequiresPassword] = useState(false);
  const [canDownload, setCanDownload] = useState(false);

  // Track analytics on mount
  useEffect(() => {
    const trackView = async () => {
      try {
        await fetch(`/api/share/${shareKey}/track`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({}),
        });
      } catch (err) {
        // Silently fail - analytics shouldn't block viewing
        console.error('Failed to track view:', err);
      }
    };

    if (shareKey && documentData) {
      trackView();
    }
  }, [shareKey, documentData]);

  // Validate share link
  const validateShareLink = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/share/${shareKey}`);
      const data = await response.json();

      if (!response.ok) {
        if (data.requiresPassword) {
          setRequiresPassword(true);
          setLoading(false);
          return;
        }

        throw new Error(data.error?.message || 'Failed to validate share link');
      }

      // Successfully validated
      setDocumentData(data);
      setCanDownload(data.canDownload || false);
      setRequiresPassword(false);
      setLoading(false);
    } catch (err) {
      console.error('Share link validation error:', err);
      setError(err instanceof Error ? err.message : 'Failed to load document');
      setLoading(false);
    }
  };

  // Initial validation on mount
  useEffect(() => {
    if (shareKey) {
      validateShareLink();
    }
  }, [shareKey]);

  // Handle password verification success
  const handlePasswordSuccess = () => {
    setRequiresPassword(false);
    validateShareLink();
  };

  // Handle password modal cancel
  const handlePasswordCancel = () => {
    setError('Password required to access this document');
    setRequiresPassword(false);
  };

  // Loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100 dark:bg-slate-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-300">Validating share link...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    const isRevokedError = error.toLowerCase().includes('revoked') || error.toLowerCase().includes('no longer available');
    const isExpiredError = error.toLowerCase().includes('expired');
    const isEmailMismatchError = error.toLowerCase().includes('different email') || error.toLowerCase().includes('email mismatch');
    
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100 dark:bg-slate-900">
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-lg p-8 max-w-md w-full mx-4 text-center">
          <div className="text-red-600 dark:text-red-400 text-6xl mb-4">
            {isRevokedError ? '🚫' : isExpiredError ? '⏰' : isEmailMismatchError ? '✉️' : '⚠️'}
          </div>
          <h2 className="text-2xl font-bold mb-2 text-gray-900 dark:text-white">
            {isRevokedError ? 'Share Revoked' : isExpiredError ? 'Share Expired' : isEmailMismatchError ? 'Wrong Account' : 'Access Denied'}
          </h2>
          <p className="text-gray-600 dark:text-gray-300 mb-6">{error}</p>
          {isRevokedError && (
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
              The document owner has revoked access to this document. It is no longer available for viewing.
            </p>
          )}
          {isExpiredError && (
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
              This share link has expired. Please request a new share link from the document owner.
            </p>
          )}
          {isEmailMismatchError && (
            <div className="text-sm text-gray-500 dark:text-gray-400 mb-4 space-y-2">
              <p>
                This document was shared with a specific email address. You are currently logged in with a different account.
              </p>
              <p className="font-medium text-gray-700 dark:text-gray-300">
                Please log out and sign in with the correct email address to access this document.
              </p>
            </div>
          )}
          {!isEmailMismatchError && (
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Please contact the document owner if you believe this is an error.
            </p>
          )}
        </div>
      </div>
    );
  }

  // Password prompt
  if (requiresPassword) {
    return (
      <PasswordModal
        shareKey={shareKey}
        onSuccess={handlePasswordSuccess}
        onCancel={handlePasswordCancel}
      />
    );
  }

  // Render PDF viewer with document data
  if (documentData) {
    return (
      <div>
        <PDFViewer 
          pdfUrl={documentData.signedUrl}
          requireEmail={false}
          shareKey={shareKey}
          watermarkConfig={{
            type: 'text',
            text: userEmail,
            opacity: 0.3,
            fontSize: 16,
          }}
        />
      </div>
    );
  }

  return null;
}
