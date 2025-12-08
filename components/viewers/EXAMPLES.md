# SimpleDocumentViewer Examples

This document provides practical examples for common use cases of the SimpleDocumentViewer component.

## Table of Contents

1. [Basic Usage](#basic-usage)
2. [With Watermark](#with-watermark)
3. [Protected Documents](#protected-documents)
4. [Custom Page Loading](#custom-page-loading)
5. [Mobile-Optimized](#mobile-optimized)
6. [With Analytics](#with-analytics)
7. [Multi-Document Viewer](#multi-document-viewer)
8. [Embedded Viewer](#embedded-viewer)
9. [Print-Friendly View](#print-friendly-view)
10. [Collaborative Viewing](#collaborative-viewing)

---

## Basic Usage

The simplest implementation of the document viewer.

```tsx
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import SimpleDocumentViewer from '@/components/viewers/SimpleDocumentViewer';

export default function BasicDocumentViewer({ documentId }: { documentId: string }) {
  const router = useRouter();
  const [pages, setPages] = useState([]);
  const [title, setTitle] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadDocument() {
      try {
        const response = await fetch(`/api/documents/${documentId}`);
        const data = await response.json();
        
        setTitle(data.title);
        setPages(data.pages);
      } catch (error) {
        console.error('Failed to load document:', error);
      } finally {
        setLoading(false);
      }
    }

    loadDocument();
  }, [documentId]);

  if (loading) {
    return <div className="flex items-center justify-center h-screen">Loading...</div>;
  }

  return (
    <SimpleDocumentViewer
      documentId={documentId}
      documentTitle={title}
      pages={pages}
      onClose={() => router.back()}
    />
  );
}
```

---

## With Watermark

Add a watermark overlay to protect document content.

```tsx
'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import SimpleDocumentViewer from '@/components/viewers/SimpleDocumentViewer';

export default function WatermarkedDocumentViewer({ documentId }: { documentId: string }) {
  const { data: session } = useSession();
  const [pages, setPages] = useState([]);
  const [title, setTitle] = useState('');

  useEffect(() => {
    // Load document pages
    fetch(`/api/documents/${documentId}`)
      .then(res => res.json())
      .then(data => {
        setTitle(data.title);
        setPages(data.pages);
      });
  }, [documentId]);

  // Generate watermark text with user info and timestamp
  const watermarkText = session?.user?.email 
    ? `${session.user.email} - ${new Date().toLocaleDateString()}`
    : 'CONFIDENTIAL';

  return (
    <SimpleDocumentViewer
      documentId={documentId}
      documentTitle={title}
      pages={pages}
      watermark={{
        text: watermarkText,
        opacity: 0.3,
        fontSize: 24
      }}
      onClose={() => window.close()}
    />
  );
}
```

---

## Protected Documents

Implement role-based access control with DRM features.

```tsx
'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { redirect } from 'next/navigation';
import SimpleDocumentViewer from '@/components/viewers/SimpleDocumentViewer';

interface DocumentAccess {
  canView: boolean;
  canDownload: boolean;
  watermarkRequired: boolean;
  screenshotPrevention: boolean;
}

export default function ProtectedDocumentViewer({ documentId }: { documentId: string }) {
  const { data: session, status } = useSession();
  const [pages, setPages] = useState([]);
  const [title, setTitle] = useState('');
  const [access, setAccess] = useState<DocumentAccess | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === 'unauthenticated') {
      redirect('/login');
    }

    if (status === 'authenticated') {
      // Check access permissions
      Promise.all([
        fetch(`/api/documents/${documentId}`).then(r => r.json()),
        fetch(`/api/documents/${documentId}/access`).then(r => r.json())
      ]).then(([docData, accessData]) => {
        if (!accessData.canView) {
          redirect('/unauthorized');
        }

        setTitle(docData.title);
        setPages(docData.pages);
        setAccess(accessData);
        setLoading(false);
      });
    }
  }, [documentId, status]);

  if (loading || !access) {
    return <div className="flex items-center justify-center h-screen">Loading...</div>;
  }

  return (
    <SimpleDocumentViewer
      documentId={documentId}
      documentTitle={title}
      pages={pages}
      watermark={access.watermarkRequired ? {
        text: `${session?.user?.name} - ${new Date().toLocaleString()}`,
        opacity: 0.4,
        fontSize: 20
      } : undefined}
      enableScreenshotPrevention={access.screenshotPrevention}
      onClose={() => window.close()}
    />
  );
}
```

---

## Custom Page Loading

Implement custom page loading with authentication and caching.

```tsx
'use client';

import { useState, useEffect, useCallback } from 'react';
import SimpleDocumentViewer from '@/components/viewers/SimpleDocumentViewer';

// Simple in-memory cache
const pageCache = new Map<string, any>();

export default function CustomLoadingViewer({ documentId }: { documentId: string }) {
  const [pages, setPages] = useState([]);
  const [title, setTitle] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadDocumentWithAuth = useCallback(async () => {
    try {
      // Check cache first
      const cacheKey = `doc-${documentId}`;
      if (pageCache.has(cacheKey)) {
        const cached = pageCache.get(cacheKey);
        setTitle(cached.title);
        setPages(cached.pages);
        setLoading(false);
        return;
      }

      // Get auth token
      const token = await getAuthToken();

      // Load document with authentication
      const response = await fetch(`/api/documents/${documentId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to load document: ${response.statusText}`);
      }

      const data = await response.json();

      // Transform pages to include auth tokens in URLs
      const authenticatedPages = data.pages.map((page: any) => ({
        ...page,
        pageUrl: `${page.pageUrl}?token=${token}`
      }));

      // Cache the result
      pageCache.set(cacheKey, {
        title: data.title,
        pages: authenticatedPages
      });

      setTitle(data.title);
      setPages(authenticatedPages);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load document');
    } finally {
      setLoading(false);
    }
  }, [documentId]);

  useEffect(() => {
    loadDocumentWithAuth();
  }, [loadDocumentWithAuth]);

  if (loading) {
    return <div className="flex items-center justify-center h-screen">Loading...</div>;
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-screen">
        <p className="text-red-500 mb-4">{error}</p>
        <button 
          onClick={loadDocumentWithAuth}
          className="px-4 py-2 bg-blue-500 text-white rounded"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <SimpleDocumentViewer
      documentId={documentId}
      documentTitle={title}
      pages={pages}
      onClose={() => window.close()}
    />
  );
}

// Mock auth token function
async function getAuthToken(): Promise<string> {
  // Replace with your actual auth implementation
  return 'mock-auth-token';
}
```

---

## Mobile-Optimized

Optimize the viewer for mobile devices with responsive features.

```tsx
'use client';

import { useState, useEffect } from 'react';
import SimpleDocumentViewer from '@/components/viewers/SimpleDocumentViewer';

export default function MobileOptimizedViewer({ documentId }: { documentId: string }) {
  const [pages, setPages] = useState([]);
  const [title, setTitle] = useState('');
  const [isMobile, setIsMobile] = useState(false);

  // Detect mobile device
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Load optimized images for mobile
  useEffect(() => {
    async function loadDocument() {
      const response = await fetch(`/api/documents/${documentId}`);
      const data = await response.json();

      // Use smaller images on mobile for better performance
      const optimizedPages = data.pages.map((page: any) => ({
        ...page,
        pageUrl: isMobile 
          ? `${page.pageUrl}?w=800&q=75` // Smaller, compressed
          : page.pageUrl // Full quality
      }));

      setTitle(data.title);
      setPages(optimizedPages);
    }

    loadDocument();
  }, [documentId, isMobile]);

  return (
    <SimpleDocumentViewer
      documentId={documentId}
      documentTitle={title}
      pages={pages}
      enableScreenshotPrevention={isMobile} // Enable on mobile for better security
      onClose={() => {
        // Mobile-friendly close behavior
        if (window.history.length > 1) {
          window.history.back();
        } else {
          window.close();
        }
      }}
    />
  );
}
```

---

## With Analytics

Track document viewing analytics.

```tsx
'use client';

import { useState, useEffect, useCallback } from 'react';
import SimpleDocumentViewer from '@/components/viewers/SimpleDocumentViewer';

export default function AnalyticsDocumentViewer({ documentId }: { documentId: string }) {
  const [pages, setPages] = useState([]);
  const [title, setTitle] = useState('');
  const [viewStartTime] = useState(Date.now());

  useEffect(() => {
    // Load document
    fetch(`/api/documents/${documentId}`)
      .then(res => res.json())
      .then(data => {
        setTitle(data.title);
        setPages(data.pages);
      });

    // Track document open
    trackEvent('document_opened', {
      documentId,
      timestamp: new Date().toISOString()
    });

    // Track document close on unmount
    return () => {
      const viewDuration = Date.now() - viewStartTime;
      trackEvent('document_closed', {
        documentId,
        duration: viewDuration,
        timestamp: new Date().toISOString()
      });
    };
  }, [documentId, viewStartTime]);

  const handleClose = useCallback(() => {
    const viewDuration = Date.now() - viewStartTime;
    
    // Track explicit close
    trackEvent('document_closed_by_user', {
      documentId,
      duration: viewDuration,
      timestamp: new Date().toISOString()
    });

    window.close();
  }, [documentId, viewStartTime]);

  return (
    <SimpleDocumentViewer
      documentId={documentId}
      documentTitle={title}
      pages={pages}
      onClose={handleClose}
    />
  );
}

// Analytics tracking function
async function trackEvent(eventName: string, data: any) {
  try {
    await fetch('/api/analytics/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ event: eventName, data })
    });
  } catch (error) {
    console.error('Failed to track event:', error);
  }
}
```

---

## Multi-Document Viewer

Switch between multiple documents without leaving the viewer.

```tsx
'use client';

import { useState, useEffect } from 'react';
import SimpleDocumentViewer from '@/components/viewers/SimpleDocumentViewer';

interface Document {
  id: string;
  title: string;
  pages: any[];
}

export default function MultiDocumentViewer({ documentIds }: { documentIds: string[] }) {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Load all documents
    Promise.all(
      documentIds.map(id =>
        fetch(`/api/documents/${id}`).then(r => r.json())
      )
    ).then(docs => {
      setDocuments(docs);
      setLoading(false);
    });
  }, [documentIds]);

  if (loading || documents.length === 0) {
    return <div className="flex items-center justify-center h-screen">Loading...</div>;
  }

  const currentDoc = documents[currentIndex];
  const hasNext = currentIndex < documents.length - 1;
  const hasPrev = currentIndex > 0;

  return (
    <div className="relative h-screen">
      <SimpleDocumentViewer
        documentId={currentDoc.id}
        documentTitle={`${currentDoc.title} (${currentIndex + 1}/${documents.length})`}
        pages={currentDoc.pages}
        onClose={() => window.close()}
      />

      {/* Document navigation overlay */}
      <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2 z-50">
        <div className="bg-gray-800 rounded-lg shadow-lg px-4 py-2 flex items-center space-x-4">
          <button
            onClick={() => setCurrentIndex(i => i - 1)}
            disabled={!hasPrev}
            className="px-3 py-1 bg-blue-500 text-white rounded disabled:opacity-30"
          >
            Previous Doc
          </button>
          <span className="text-white">
            Document {currentIndex + 1} of {documents.length}
          </span>
          <button
            onClick={() => setCurrentIndex(i => i + 1)}
            disabled={!hasNext}
            className="px-3 py-1 bg-blue-500 text-white rounded disabled:opacity-30"
          >
            Next Doc
          </button>
        </div>
      </div>
    </div>
  );
}
```

---

## Embedded Viewer

Embed the viewer in a page alongside other content.

```tsx
'use client';

import { useState, useEffect } from 'react';
import SimpleDocumentViewer from '@/components/viewers/SimpleDocumentViewer';

export default function EmbeddedViewer({ documentId }: { documentId: string }) {
  const [pages, setPages] = useState([]);
  const [title, setTitle] = useState('');
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    fetch(`/api/documents/${documentId}`)
      .then(res => res.json())
      .then(data => {
        setTitle(data.title);
        setPages(data.pages);
      });
  }, [documentId]);

  if (isFullscreen) {
    return (
      <SimpleDocumentViewer
        documentId={documentId}
        documentTitle={title}
        pages={pages}
        onClose={() => setIsFullscreen(false)}
      />
    );
  }

  return (
    <div className="container mx-auto p-4">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Document info sidebar */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-lg shadow p-4">
            <h2 className="text-xl font-bold mb-4">{title}</h2>
            <div className="space-y-2">
              <p className="text-gray-600">Pages: {pages.length}</p>
              <button
                onClick={() => setIsFullscreen(true)}
                className="w-full px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
              >
                View Fullscreen
              </button>
            </div>
          </div>
        </div>

        {/* Embedded viewer */}
        <div className="lg:col-span-2">
          <div className="bg-gray-100 rounded-lg shadow" style={{ height: '600px' }}>
            <div className="relative h-full">
              <SimpleDocumentViewer
                documentId={documentId}
                documentTitle={title}
                pages={pages}
                onClose={() => {}} // No close in embedded mode
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
```

---

## Print-Friendly View

Prepare documents for printing with optimized layout.

```tsx
'use client';

import { useState, useEffect } from 'react';
import SimpleDocumentViewer from '@/components/viewers/SimpleDocumentViewer';

export default function PrintFriendlyViewer({ documentId }: { documentId: string }) {
  const [pages, setPages] = useState([]);
  const [title, setTitle] = useState('');
  const [isPrintMode, setIsPrintMode] = useState(false);

  useEffect(() => {
    fetch(`/api/documents/${documentId}`)
      .then(res => res.json())
      .then(data => {
        setTitle(data.title);
        setPages(data.pages);
      });
  }, [documentId]);

  const handlePrint = () => {
    setIsPrintMode(true);
    setTimeout(() => {
      window.print();
      setIsPrintMode(false);
    }, 500);
  };

  if (isPrintMode) {
    // Print-optimized layout
    return (
      <div className="print-container">
        <style jsx>{`
          @media print {
            .print-container {
              width: 100%;
            }
            .page-break {
              page-break-after: always;
            }
          }
        `}</style>
        <h1>{title}</h1>
        {pages.map((page, index) => (
          <div key={page.pageNumber} className="page-break">
            <img 
              src={page.pageUrl} 
              alt={`Page ${page.pageNumber}`}
              style={{ width: '100%', height: 'auto' }}
            />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="relative h-screen">
      <SimpleDocumentViewer
        documentId={documentId}
        documentTitle={title}
        pages={pages}
        onClose={() => window.close()}
      />

      {/* Print button overlay */}
      <button
        onClick={handlePrint}
        className="fixed bottom-4 right-4 z-50 px-4 py-2 bg-green-500 text-white rounded-lg shadow-lg hover:bg-green-600"
      >
        Print Document
      </button>
    </div>
  );
}
```

---

## Collaborative Viewing

Enable real-time collaborative viewing with synchronized page positions.

```tsx
'use client';

import { useState, useEffect, useCallback } from 'react';
import SimpleDocumentViewer from '@/components/viewers/SimpleDocumentViewer';

interface ViewerState {
  currentPage: number;
  viewMode: 'continuous' | 'paged';
  zoomLevel: number;
  userId: string;
}

export default function CollaborativeViewer({ 
  documentId, 
  sessionId 
}: { 
  documentId: string;
  sessionId: string;
}) {
  const [pages, setPages] = useState([]);
  const [title, setTitle] = useState('');
  const [viewers, setViewers] = useState<ViewerState[]>([]);
  const [currentUserId] = useState(() => generateUserId());

  useEffect(() => {
    // Load document
    fetch(`/api/documents/${documentId}`)
      .then(res => res.json())
      .then(data => {
        setTitle(data.title);
        setPages(data.pages);
      });

    // Connect to WebSocket for real-time sync
    const ws = new WebSocket(`wss://your-server.com/sessions/${sessionId}`);

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === 'viewer_update') {
        setViewers(data.viewers);
      }
    };

    return () => ws.close();
  }, [documentId, sessionId]);

  const broadcastState = useCallback((state: Partial<ViewerState>) => {
    // Send state update to other viewers
    fetch(`/api/sessions/${sessionId}/broadcast`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: currentUserId,
        ...state
      })
    });
  }, [sessionId, currentUserId]);

  return (
    <div className="relative h-screen">
      <SimpleDocumentViewer
        documentId={documentId}
        documentTitle={title}
        pages={pages}
        onClose={() => window.close()}
      />

      {/* Active viewers indicator */}
      <div className="fixed top-20 right-4 z-50 bg-white rounded-lg shadow-lg p-3">
        <h3 className="text-sm font-semibold mb-2">Active Viewers ({viewers.length})</h3>
        <div className="space-y-1">
          {viewers.map((viewer, index) => (
            <div key={viewer.userId} className="text-xs text-gray-600">
              Viewer {index + 1}: Page {viewer.currentPage}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function generateUserId(): string {
  return `user-${Math.random().toString(36).substr(2, 9)}`;
}
```

---

## Additional Tips

### Performance Optimization

```tsx
// Use React.lazy for code splitting
const SimpleDocumentViewer = lazy(() => import('@/components/viewers/SimpleDocumentViewer'));

// Wrap in Suspense
<Suspense fallback={<LoadingSpinner />}>
  <SimpleDocumentViewer {...props} />
</Suspense>
```

### Error Boundaries

```tsx
class ViewerErrorBoundary extends React.Component {
  state = { hasError: false };

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return <div>Something went wrong. Please refresh.</div>;
    }
    return this.props.children;
  }
}

// Usage
<ViewerErrorBoundary>
  <SimpleDocumentViewer {...props} />
</ViewerErrorBoundary>
```

### Accessibility Enhancement

```tsx
// Add skip link for keyboard users
<a href="#document-content" className="sr-only focus:not-sr-only">
  Skip to document content
</a>
<SimpleDocumentViewer {...props} />
```

---

These examples cover the most common use cases. Adapt them to your specific requirements and combine features as needed.
