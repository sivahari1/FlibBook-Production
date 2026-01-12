'use client';

import { useEffect, useMemo, useState } from 'react';
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
  viewerType: 'FLIPBOOK' | 'DIRECT' | 'LINK' | 'UNSUPPORTED';
  documentId: string;
  conversionStatus?: string;
  pageCount?: number;
  type: 'PDF' | 'EPUB' | 'LINK' | 'FLIPBOOK' | 'UNSUPPORTED';
  url: string;
  reason?: string;
}

interface Props {
  documentId: string;
  title?: string;
}

function CenterMessage({
  title,
  message,
  variant = 'info',
}: {
  title: string;
  message: string;
  variant?: 'info' | 'error';
}) {
  return (
    <div className="flex items-center justify-center min-h-[400px] bg-gray-50 rounded-lg">
      <div className="text-center p-6 max-w-xl">
        <h3 className={`text-lg font-semibold mb-2 ${variant === 'error' ? 'text-red-700' : 'text-gray-900'}`}>
          {title}
        </h3>
        <p className="text-gray-700 break-words">{message}</p>
      </div>
    </div>
  );
}

export function MyJstudyroomViewerClient({ documentId, title }: Props) {
  const { data: session } = useSession();
  const [viewerData, setViewerData] = useState<ViewerData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!documentId) return;

    let cancelled = false;

    (async () => {
      try {
        setLoading(true);
        setError(null);

        const res = await fetch(`/api/viewer/document/${documentId}/access`, {
          credentials: 'include',
          cache: 'no-store',
        });

        if (!res.ok) {
          if (res.status === 401) throw new Error('You need to be logged in to view this document.');
          if (res.status === 403) throw new Error('Access denied for this document.');
          if (res.status === 404) throw new Error('Document not found.');
          const body = await res.json().catch(() => ({} as any));
          throw new Error(body?.error || 'Failed to load document');
        }

        const data: ViewerData = await res.json();
        if (!cancelled) setViewerData(data);
      } catch (e) {
        console.error(e);
        if (!cancelled) setError(e instanceof Error ? e.message : 'Failed to load document');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [documentId]);

  const adminPdfViewerUrl = useMemo(() => {
    if (!viewerData || viewerData.viewerType !== 'DIRECT' || !viewerData.url) return null;

    // Use the proxy with the signed PDF URL from viewerData.url
    const proxied = `/api/pdf/proxy?url=${encodeURIComponent(viewerData.url)}`;

    // Build the PDF.js viewer URL with fit-to-width zoom as default
    const pdfJsUrl = `/web/viewer.html?file=${encodeURIComponent(proxied)}#zoom=page-width`;

    return pdfJsUrl;
  }, [viewerData]);

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

  if (error) return <CenterMessage variant="error" title="Error Loading Document" message={error} />;
  if (!viewerData) return <CenterMessage title="No Document Data" message="Unable to load document information." />;

  // 5️⃣ CLIENT-SIDE: RENDER BY viewerType (NOT type)
  if (viewerData.viewerType === "FLIPBOOK") {
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
  }

  if (viewerData.viewerType === "DIRECT") {
    if (!adminPdfViewerUrl) {
      return (
        <CenterMessage
          variant="error"
          title="PDF Viewer Error"
          message="Unable to generate PDF viewer URL."
        />
      );
    }

    // Render PDF viewer in full-viewport layout below the header
    const HEADER_H = 64; // h-16 = 64px for the navigation header

    return (
      <div
        className="fixed left-0 right-0 bottom-0"
        style={{ top: HEADER_H }}
      >
        <iframe
          src={adminPdfViewerUrl}
          title="PDF Preview"
          className="w-full h-full border-0 block"
          style={{ display: "block" }}
        />
      </div>
    );
  }

  if (viewerData.viewerType === "LINK") {
    if (!viewerData.url) return <CenterMessage variant="error" title="Link missing" message="No URL returned for LINK." />;
    return <LinkViewer url={viewerData.url} title={title} />;
  }

  if (viewerData.viewerType === "UNSUPPORTED") {
    return <CenterMessage title="Unsupported Content Type" message={viewerData.reason || "This document type is not supported."} />;
  }

  return <CenterMessage title="Unsupported Content Type" message="This document type is not supported." />;
}
