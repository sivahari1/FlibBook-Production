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
      <div className="flex items-center justify-center min-h-screen bg-gray-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Validating share link...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full mx-4 text-center">
          <div className="text-red-600 text-6xl mb-4">⚠️</div>
          <h2 className="text-2xl font-bold mb-2 text-gray-900">Access Denied</h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <p className="text-sm text-gray-500">
            Please contact the document owner if you believe this is an error.
          </p>
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
