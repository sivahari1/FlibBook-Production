'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';

const PdfViewer = dynamic(
  () => import('@/components/pdf/PdfViewer').then(m => m.PdfViewer),
  { ssr: false }
);

const EpubViewer = dynamic(
  () => import('./EpubViewer').then(m => ({ default: m.EpubViewer })),
  { ssr: false }
);

const LinkViewer = dynamic(
  () => import('./LinkViewer').then(m => ({ default: m.LinkViewer })),
  { ssr: false }
);

interface ViewerData {
  type: 'PDF' | 'EPUB' | 'LINK';
  url: string;
}

interface MyJstudyroomViewerClientProps {
  documentId: string;
  title?: string;
}

export function MyJstudyroomViewerClient({ documentId, title }: MyJstudyroomViewerClientProps) {
  const [viewerData, setViewerData] = useState<ViewerData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchViewerData() {
      try {
        setLoading(true);
        setError(null);

        const response = await fetch(`/api/viewer/document/${documentId}/access`);
        
        if (!response.ok) {
          if (response.status === 401) {
            throw new Error('You need to be logged in to view this document.');
          } else if (response.status === 403) {
            throw new Error('You do not have permission to view this document. Make sure it\'s added to your study room.');
          } else if (response.status === 404) {
            throw new Error('Document not found.');
          } else {
            throw new Error('Failed to load document. Please try again.');
          }
        }

        const data = await response.json();
        setViewerData(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An unexpected error occurred');
      } finally {
        setLoading(false);
      }
    }

    fetchViewerData();
  }, [documentId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading document...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full bg-gray-50 p-8">
        <div className="text-center max-w-md">
          <div className="mb-6">
            <svg 
              className="mx-auto h-16 w-16 text-red-400" 
              fill="none" 
              viewBox="0 0 24 24" 
              stroke="currentColor"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={1} 
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" 
              />
            </svg>
          </div>
          
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            Unable to Load Document
          </h3>
          
          <p className="text-gray-600 mb-6">
            {error}
          </p>
          
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (!viewerData) {
    return (
      <div className="flex items-center justify-center h-full bg-gray-50">
        <p className="text-gray-600">No document data available</p>
      </div>
    );
  }

  // Render appropriate viewer based on content type
  switch (viewerData.type) {
    case 'PDF':
      return <PdfViewer url={viewerData.url} title={title} />;
    
    case 'EPUB':
      return (
        <div className="h-full w-full">
          <EpubViewer url={viewerData.url} title={title} />
        </div>
      );
    
    case 'LINK':
      return (
        <div className="h-full w-full">
          <LinkViewer url={viewerData.url} title={title} />
        </div>
      );
    
    default:
      return (
        <div className="flex items-center justify-center h-full bg-gray-50">
          <p className="text-gray-600">Unsupported document type</p>
        </div>
      );
  }
}