'use client';

import { useState, useEffect } from 'react';
import PDFViewer from '@/components/pdf/PDFViewer';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';

interface Document {
  id: string;
  title: string;
  filename: string;
  storagePath: string;
}

interface MyJstudyroomViewerClientProps {
  document: Document;
  bookShopTitle: string;
}

export function MyJstudyroomViewerClient({
  document,
  bookShopTitle,
}: MyJstudyroomViewerClientProps) {
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchDocument();
  }, [document.id]);

  const fetchDocument = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch the document from storage
      // Note: You may need to create a dedicated API endpoint for this
      // For now, we'll use the storage path directly
      setPdfUrl(document.storagePath);
    } catch (err) {
      console.error('Error loading document:', err);
      setError('Failed to load document');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-gray-600 dark:text-gray-400">Loading document...</div>
      </div>
    );
  }

  if (error || !pdfUrl) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <div className="text-red-600 dark:text-red-400 mb-4">
          {error || 'Document not found'}
        </div>
        <Link href="/member/my-jstudyroom">
          <Button>Back to My jstudyroom</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 py-3">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-semibold text-gray-900 dark:text-white">
              {bookShopTitle}
            </h1>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {document.title}
            </p>
          </div>
          <Link href="/member/my-jstudyroom">
            <Button variant="secondary" size="sm">
              Back to My jstudyroom
            </Button>
          </Link>
        </div>
      </div>

      {/* PDF Viewer */}
      <div className="flex-1 overflow-hidden">
        <PDFViewer
          pdfUrl={pdfUrl}
          requireEmail={false}
          watermarkConfig={{
            type: 'text',
            text: 'jstudyroom Member',
            opacity: 0.3,
            fontSize: 48,
          }}
        />
      </div>
    </div>
  );
}
