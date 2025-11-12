'use client';

import { useEffect, useState } from 'react';
import PDFViewer from '@/components/pdf/PDFViewer';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

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
  
  // Password prompt state
  const [requiresPassword, setRequiresPassword] = useState(false);
  const [password, setPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [validatingPassword, setValidatingPassword] = useState(false);

  // Validate share link
  const validateShareLink = async (pwd?: string) => {
    try {
      setLoading(true);
      setError(null);
      setPasswordError('');

      const url = new URL(`/api/share/${shareKey}`, window.location.origin);
      if (pwd) {
        url.searchParams.set('password', pwd);
      }

      const response = await fetch(url.toString());
      const data = await response.json();

      if (!response.ok) {
        if (response.status === 401 && data.requiresPassword) {
          setRequiresPassword(true);
          setLoading(false);
          return;
        }

        if (response.status === 401 && pwd) {
          setPasswordError('Invalid password');
          setValidatingPassword(false);
          return;
        }

        throw new Error(data.error || 'Failed to validate share link');
      }

      // Successfully validated
      setDocumentData(data);
      setRequiresPassword(false);
      setLoading(false);
    } catch (err) {
      console.error('Share link validation error:', err);
      setError(err instanceof Error ? err.message : 'Failed to load document');
      setLoading(false);
      setValidatingPassword(false);
    }
  };

  // Initial validation on mount
  useEffect(() => {
    if (shareKey) {
      validateShareLink();
    }
  }, [shareKey]);

  // Handle password submission
  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError('');

    if (!password.trim()) {
      setPasswordError('Password is required');
      return;
    }

    setValidatingPassword(true);
    await validateShareLink(password);
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
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
        <div className="bg-white rounded-xl shadow-xl p-8 max-w-md w-full mx-4">
          <div className="text-center mb-6">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Password Required</h2>
            <p className="text-gray-600">
              This document is password protected. Please enter the password to continue.
            </p>
          </div>
          <form onSubmit={handlePasswordSubmit}>
            <div className="mb-6">
              <Input
                type="password"
                placeholder="Enter password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full"
                autoFocus
                disabled={validatingPassword}
              />
              {passwordError && (
                <p className="text-red-600 text-sm mt-2">{passwordError}</p>
              )}
            </div>
            <Button 
              type="submit" 
              className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
              disabled={validatingPassword}
            >
              {validatingPassword ? 'Verifying...' : 'Continue to Document'}
            </Button>
          </form>
        </div>
      </div>
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
