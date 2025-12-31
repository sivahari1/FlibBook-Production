'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { PdfViewer } from '@/components/pdf/PdfViewer';

interface DocumentData {
  id: string;
  title: string;
  filename: string;
  contentType: string;
  storagePath: string;
  linkUrl: string | null;
  thumbnailUrl: string | null;
  metadata: any;
  // ✅ Client-safe (JSON) types:
  fileSize: number | null;
  mimeType: string;
  createdAt: string;
  updatedAt: string;
  userId: string;
}

interface MyJstudyroomViewerClientProps {
  document: DocumentData;
  bookShopTitle: string;
  memberName: string;
  itemId: string;
}

export function MyJstudyroomViewerClient({
  document: documentData,
  bookShopTitle,
  memberName,
  itemId,
}: MyJstudyroomViewerClientProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [signedUrl, setSignedUrl] = useState<string | null>(null);

  useEffect(() => {
    loadPdfUrl();
  }, [documentData.id]);

  const loadPdfUrl = async () => {
    try {
      setLoading(true);
      setError(null);

      console.log(`🔍 Loading PDF URL for document ${documentData.id}`);

      // Use the new secure PDF access API
      const response = await fetch(`/api/member/documents/${documentData.id}/pdf`, {
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!response.ok) {
        console.error('❌ PDF access API failed:', response.status);

        let errorData: any = {};
        try {
          errorData = await response.json();
        } catch {
          // ignore
        }

        if (response.status === 401) setError('You do not have access to view this document');
        else if (response.status === 403) setError('Access denied - you do not have permission to view this document');
        else if (response.status === 404) setError('Document not found');
        else setError(errorData.error || 'Failed to load PDF document');

        return;
      }

      const data = await response.json();
      
      if (!data.ok || !data.url) {
        setError('Failed to get PDF access URL');
        return;
      }

      setSignedUrl(data.url);
      console.log(`✅ PDF signed URL obtained successfully`);

    } catch (err) {
      console.error('❌ Error loading PDF URL:', err);
      setError('Failed to load document');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    window.location.href = '/member/my-jstudyroom';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100 dark:bg-slate-900">
        <div className="text-center max-w-md mx-auto px-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-300">Loading document...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 dark:bg-slate-900">
        <div className="max-w-2xl mx-auto px-4 space-y-6">
          <div className="text-center">
            <div className="text-red-600 dark:text-red-400 text-6xl mb-4">⚠️</div>
            <h2 className="text-2xl font-bold mb-2 text-gray-900 dark:text-white">Error Loading Document</h2>
            <p className="text-gray-600 dark:text-gray-300 mb-4">{error}</p>

            <div className="flex gap-2 justify-center flex-wrap mb-4">
              <Button onClick={() => loadPdfUrl()} variant="secondary">
                Try Again
              </Button>
              <Link href="/member/my-jstudyroom">
                <Button>Back to My jstudyroom</Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!signedUrl) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 dark:bg-slate-900">
        <div className="max-w-2xl mx-auto px-4 space-y-6">
          <div className="text-center">
            <div className="text-orange-600 dark:text-orange-400 text-6xl mb-4">⚠️</div>
            <h2 className="text-2xl font-bold mb-2 text-gray-900 dark:text-white">Document Not Available</h2>
            <p className="text-gray-600 dark:text-gray-300 mb-4">
              This document is not available for viewing. Please contact support if this issue persists.
            </p>

            <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4 mb-4">
              <p className="text-sm text-yellow-800 dark:text-yellow-200">
                <strong>Document:</strong> {documentData.title}
                <br />
                <strong>Status:</strong> PDF not accessible
              </p>
            </div>

            <div className="flex gap-2 justify-center flex-wrap mb-4">
              <Button onClick={() => loadPdfUrl()} variant="secondary">
                Try Again
              </Button>
              <Link href="/member/my-jstudyroom">
                <Button>Back to My jstudyroom</Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Render the professional PDF.js viewer
  return (
    <PdfViewer
      signedUrl={signedUrl}
      documentTitle={`${bookShopTitle} - ${documentData.title}`}
      memberName={memberName}
      onClose={handleClose}
    />
  );
}
