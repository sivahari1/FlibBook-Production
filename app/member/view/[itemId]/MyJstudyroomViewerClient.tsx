'use client';

import { useState, useEffect } from 'react';
import UniversalViewer from '@/components/viewers/UniversalViewer';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { EnhancedDocument, ContentType, ContentMetadata } from '@/lib/types/content';

interface Document {
  id: string;
  title: string;
  filename: string;
  contentType: string;
  storagePath: string;
  linkUrl: string | null;
  thumbnailUrl: string | null;
  metadata: any;
  fileSize: bigint | null;
  mimeType: string;
  createdAt: Date;
  updatedAt: Date;
  userId: string;
}

interface MyJstudyroomViewerClientProps {
  document: Document;
  bookShopTitle: string;
  memberName: string;
}

export function MyJstudyroomViewerClient({
  document,
  bookShopTitle,
  memberName,
}: MyJstudyroomViewerClientProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [enhancedDoc, setEnhancedDoc] = useState<EnhancedDocument | null>(null);

  useEffect(() => {
    prepareDocument();
  }, [document.id]);

  const prepareDocument = async () => {
    try {
      setLoading(true);
      setError(null);

      // Convert the document to EnhancedDocument format
      const metadata: ContentMetadata = typeof document.metadata === 'string' 
        ? JSON.parse(document.metadata) 
        : document.metadata || {};

      const enhanced: EnhancedDocument = {
        id: document.id,
        title: document.title,
        filename: document.filename,
        contentType: document.contentType as ContentType,
        fileUrl: document.storagePath,
        linkUrl: document.linkUrl || undefined,
        thumbnailUrl: document.thumbnailUrl || undefined,
        metadata: metadata,
        userId: document.userId,
        fileSize: document.fileSize || undefined,
        storagePath: document.storagePath,
        mimeType: document.mimeType,
        createdAt: document.createdAt,
        updatedAt: document.updatedAt,
      };

      setEnhancedDoc(enhanced);
    } catch (err) {
      console.error('Error preparing document:', err);
      setError('Failed to load document');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100 dark:bg-slate-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-300">Loading content...</p>
        </div>
      </div>
    );
  }

  if (error || !enhancedDoc) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 dark:bg-slate-900">
        <div className="text-center max-w-md mx-auto px-4">
          <div className="text-red-600 dark:text-red-400 text-6xl mb-4">⚠️</div>
          <h2 className="text-2xl font-bold mb-2 text-gray-900 dark:text-white">
            Error Loading Content
          </h2>
          <p className="text-gray-600 dark:text-gray-300 mb-4">
            {error || 'Document not found'}
          </p>
          <Link href="/member/my-jstudyroom">
            <Button>Back to My jstudyroom</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 py-3 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-semibold text-gray-900 dark:text-white truncate">
              {bookShopTitle}
            </h1>
            <p className="text-sm text-gray-600 dark:text-gray-400 truncate">
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

      {/* Universal Viewer with Watermark */}
      <div className="flex-1 overflow-hidden">
        <UniversalViewer
          content={enhancedDoc}
          watermark={{
            text: `jStudyRoom Member - ${memberName}`,
            opacity: 0.3,
            fontSize: 48,
            position: 'center',
          }}
          requireEmail={false}
        />
      </div>
    </div>
  );
}
