'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { useSession } from 'next-auth/react';

const FlipBookViewer = dynamic(
  () => import('@/components/flipbook/FlipBookViewer').then((m) => ({ default: m.FlipBookViewer })),
  { ssr: false }
);

const EpubViewer = dynamic(
  () => import('./EpubViewer').then((m) => ({ default: m.EpubViewer })),
  { ssr: false }
);

const LinkViewer = dynamic(
  () => import('./LinkViewer').then((m) => ({ default: m.LinkViewer })),
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
  const { data: session } = useSession();
  const [viewerData, setViewerData] = useState<ViewerData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!documentId) return;

    let cancelled = false;

    async function fetchViewerData() {
      try {
        setLoading(true);
        setError(null);

        // IMPORTANT: keep this endpoint if it exists in your app.
        // If your new flipbook flow does NOT use this endpoint, change it accordingly.
        const response = await fetch(`/api/viewer/document/${documentId}/access`, {
          credentials: 'include',
          cache: 'no-store',
        });

        if (!response.ok) {
          if (response.status === 401) throw new Error('You need to be logged in to view this document.');
          if (response.status === 403)
            throw new Error("You do not have permission to view this document. Make sure it's added to your study room.");
          if (response.status === 404) throw new Error('Document not found.');

          const errorData = await response.json().catch(() => ({} as any));
          throw new Error(errorData?.error || 'Failed to load document');
        }

        const data: ViewerData = await response.json();

        if (!cancelled) {
          setViewerData(data);
        }
      } catch (err) {
        console.error('Error fetching viewer data:', err);
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load document');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchViewerData();

    return () => {
      cancelled = true;
    };
  }, [documentId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px] bg-gray-50 rounded-lg">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading document...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[400px] bg-gray-50 rounded-lg">
        <div className="text-center p-6">
          <div className="text-red-500 mb-4">
            <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 19.5c-.77.833.192 2.5 1.732 2.5z"
              />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Error Loading Document</h3>
          <p className="text-gray-600">{error}</p>
        </div>
      </div>
    );
  }

  if (!viewerData) {
    return (
      <div className="flex items-center justify-center min-h-[400px] bg-gray-50 rounded-lg">
        <div className="text-center p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No Document Data</h3>
          <p className="text-gray-600">Unable to load document information.</p>
        </div>
      </div>
    );
  }

  switch (viewerData.type) {
    case 'PDF':
      // Flipbook-style rendering (page images)
      return (
        <div className="w-full">
          <FlipBookViewer
            documentId={documentId}
            title={title}
            userEmail={session?.user?.email || undefined}
            className="w-full"
          />
        </div>
      );

    case 'EPUB':
      return (
        <div className="w-full">
          <EpubViewer url={viewerData.url} title={title} />
        </div>
      );

    case 'LINK':
      return (
        <div className="w-full">
          <LinkViewer url={viewerData.url} title={title} />
        </div>
      );

    default:
      return (
        <div className="flex items-center justify-center min-h-[400px] bg-gray-50 rounded-lg">
          <div className="text-center p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Unsupported Content Type</h3>
            <p className="text-gray-600">This document type is not supported.</p>
          </div>
        </div>
      );
  }
}
