# SimpleDocumentViewer Integration Guide

## Overview

This guide covers how to integrate the SimpleDocumentViewer into your application, including setup, configuration, and best practices for different use cases.

## Installation and Setup

### Prerequisites

Ensure your project has the following dependencies:

```json
{
  "dependencies": {
    "react": "^18.0.0",
    "next": "^14.0.0",
    "lucide-react": "^0.263.0",
    "tailwindcss": "^3.0.0"
  }
}
```

### File Structure

The viewer consists of these main files:

```
components/viewers/
├── SimpleDocumentViewer.tsx     # Main viewer component
├── ViewerToolbar.tsx           # Navigation toolbar
├── ContinuousScrollView.tsx    # Continuous scroll mode
├── PagedView.tsx              # Paged view mode
├── WatermarkOverlay.tsx       # Watermark overlay
├── LoadingSpinner.tsx         # Loading indicator
├── ViewerError.tsx            # Error display
└── __tests__/                 # Test files

hooks/
├── useKeyboardNavigation.ts   # Keyboard shortcuts
└── useTouchGestures.ts       # Touch gestures

lib/
└── viewer-preferences.ts      # Preferences management
```

## Basic Integration

### Simple Usage

```tsx
import SimpleDocumentViewer from '@/components/viewers/SimpleDocumentViewer';

function DocumentPage({ documentId }: { documentId: string }) {
  const [pages, setPages] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Fetch document pages
    fetchDocumentPages(documentId)
      .then(setPages)
      .finally(() => setLoading(false));
  }, [documentId]);

  if (loading) return <div>Loading...</div>;

  return (
    <SimpleDocumentViewer
      documentId={documentId}
      documentTitle="My Document"
      pages={pages}
      onClose={() => router.back()}
    />
  );
}
```

### With Error Handling

```tsx
function DocumentViewerWithErrorHandling({ documentId }: { documentId: string }) {
  const [pages, setPages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchDocumentPages(documentId)
      .then(setPages)
      .catch(setError)
      .finally(() => setLoading(false));
  }, [documentId]);

  if (loading) return <LoadingSpinner />;
  if (error) return <ErrorDisplay error={error} />;

  return (
    <SimpleDocumentViewer
      documentId={documentId}
      documentTitle="My Document"
      pages={pages}
      onClose={() => router.back()}
    />
  );
}
```

## Advanced Integration

### With Watermarks

```tsx
function SecureDocumentViewer({ documentId, userRole }: Props) {
  const [pages, setPages] = useState([]);
  const [watermarkSettings, setWatermarkSettings] = useState(null);

  useEffect(() => {
    // Fetch document and determine watermark based on user role
    Promise.all([
      fetchDocumentPages(documentId),
      fetchWatermarkSettings(documentId, userRole)
    ]).then(([pagesData, watermark]) => {
      setPages(pagesData);
      setWatermarkSettings(watermark);
    });
  }, [documentId, userRole]);

  return (
    <SimpleDocumentViewer
      documentId={documentId}
      documentTitle="Confidential Document"
      pages={pages}
      watermark={watermarkSettings}
      enableScreenshotPrevention={userRole !== 'admin'}
      onClose={() => router.back()}
    />
  );
}
```

### With Custom Page Loading

```tsx
function CustomPageLoader({ documentId }: { documentId: string }) {
  const [pages, setPages] = useState([]);

  // Custom page loading with authentication
  const loadPages = useCallback(async () => {
    const token = await getAuthToken();
    const response = await fetch(`/api/documents/${documentId}/pages`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to load pages: ${response.statusText}`);
    }

    const data = await response.json();
    return data.pages.map((page, index) => ({
      pageNumber: index + 1,
      pageUrl: page.url,
      dimensions: page.dimensions
    }));
  }, [documentId]);

  useEffect(() => {
    loadPages().then(setPages).catch(console.error);
  }, [loadPages]);

  return (
    <SimpleDocumentViewer
      documentId={documentId}
      documentTitle="Protected Document"
      pages={pages}
      onClose={() => router.back()}
    />
  );
}
```

## Server-Side Integration

### API Endpoints

Create these API endpoints to support the viewer:

#### Document Pages Endpoint

```typescript
// app/api/documents/[id]/pages/route.ts
import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const documentId = params.id;
    
    // Fetch document pages from your database
    const pages = await getDocumentPages(documentId);
    
    return NextResponse.json({
      pages: pages.map(page => ({
        pageNumber: page.number,
        pageUrl: `/api/documents/${documentId}/pages/${page.number}`,
        dimensions: {
          width: page.width,
          height: page.height
        }
      }))
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch pages' },
      { status: 500 }
    );
  }
}
```

#### Individual Page Endpoint

```typescript
// app/api/documents/[id]/pages/[pageNum]/route.ts
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string; pageNum: string } }
) {
  try {
    const { id: documentId, pageNum } = params;
    
    // Get page image from storage
    const pageImage = await getPageImage(documentId, parseInt(pageNum));
    
    return new NextResponse(pageImage, {
      headers: {
        'Content-Type': 'image/jpeg',
        'Cache-Control': 'public, max-age=3600'
      }
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Page not found' },
      { status: 404 }
    );
  }
}
```

### Database Schema

Example Prisma schema for document storage:

```prisma
model Document {
  id          String   @id @default(cuid())
  title       String
  totalPages  Int
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  
  pages       DocumentPage[]
  shares      DocumentShare[]
  
  @@map("documents")
}

model DocumentPage {
  id         String   @id @default(cuid())
  documentId String
  pageNumber Int
  imageUrl   String
  width      Int
  height     Int
  
  document   Document @relation(fields: [documentId], references: [id])
  
  @@unique([documentId, pageNumber])
  @@map("document_pages")
}
```

## Next.js Integration

### Page Component

```tsx
// app/documents/[id]/view/page.tsx
import { Suspense } from 'react';
import DocumentViewer from './DocumentViewer';
import LoadingSpinner from '@/components/ui/LoadingSpinner';

interface PageProps {
  params: { id: string };
  searchParams: { [key: string]: string | string[] | undefined };
}

export default function DocumentViewPage({ params }: PageProps) {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <DocumentViewer documentId={params.id} />
    </Suspense>
  );
}
```

### Client Component

```tsx
// app/documents/[id]/view/DocumentViewer.tsx
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import SimpleDocumentViewer from '@/components/viewers/SimpleDocumentViewer';

export default function DocumentViewer({ documentId }: { documentId: string }) {
  const router = useRouter();
  const [document, setDocument] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/documents/${documentId}`)
      .then(res => res.json())
      .then(setDocument)
      .finally(() => setLoading(false));
  }, [documentId]);

  if (loading) return <LoadingSpinner />;
  if (!document) return <div>Document not found</div>;

  return (
    <SimpleDocumentViewer
      documentId={documentId}
      documentTitle={document.title}
      pages={document.pages}
      onClose={() => router.back()}
    />
  );
}
```

## Authentication Integration

### Protected Routes

```tsx
import { useSession } from 'next-auth/react';
import { redirect } from 'next/navigation';

function ProtectedDocumentViewer({ documentId }: { documentId: string }) {
  const { data: session, status } = useSession();

  if (status === 'loading') return <LoadingSpinner />;
  if (status === 'unauthenticated') redirect('/login');

  return (
    <SimpleDocumentViewer
      documentId={documentId}
      documentTitle="Protected Document"
      pages={pages}
      onClose={() => router.back()}
    />
  );
}
```

### Role-Based Access

```tsx
function RoleBasedViewer({ documentId, requiredRole }: Props) {
  const { user } = useAuth();
  const [hasAccess, setHasAccess] = useState(false);

  useEffect(() => {
    checkDocumentAccess(documentId, user.id, requiredRole)
      .then(setHasAccess);
  }, [documentId, user.id, requiredRole]);

  if (!hasAccess) {
    return <AccessDenied />;
  }

  return (
    <SimpleDocumentViewer
      documentId={documentId}
      documentTitle="Restricted Document"
      pages={pages}
      watermark={{
        text: `${user.name} - ${new Date().toLocaleDateString()}`,
        opacity: 0.3,
        fontSize: 16
      }}
      onClose={() => router.back()}
    />
  );
}
```

## Performance Optimization

### Lazy Loading

```tsx
import dynamic from 'next/dynamic';

const SimpleDocumentViewer = dynamic(
  () => import('@/components/viewers/SimpleDocumentViewer'),
  {
    loading: () => <LoadingSpinner />,
    ssr: false // Disable SSR for better performance
  }
);
```

### Image Optimization

```tsx
// Optimize page URLs for Next.js Image component
const optimizedPages = pages.map(page => ({
  ...page,
  pageUrl: `/api/documents/${documentId}/pages/${page.pageNumber}?w=800&q=75`
}));
```

### Caching Strategy

```typescript
// Implement caching for better performance
const cache = new Map();

async function getCachedPages(documentId: string) {
  if (cache.has(documentId)) {
    return cache.get(documentId);
  }

  const pages = await fetchDocumentPages(documentId);
  cache.set(documentId, pages);
  
  // Cache for 5 minutes
  setTimeout(() => cache.delete(documentId), 5 * 60 * 1000);
  
  return pages;
}
```

## Mobile Optimization

### Responsive Layout

```tsx
function ResponsiveDocumentViewer({ documentId }: { documentId: string }) {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  return (
    <SimpleDocumentViewer
      documentId={documentId}
      documentTitle="Mobile Document"
      pages={pages}
      // Mobile-specific props
      enableScreenshotPrevention={isMobile}
      onClose={() => router.back()}
    />
  );
}
```

### Touch Optimization

```css
/* Add to your global CSS for better touch experience */
.document-viewer {
  touch-action: pan-y pinch-zoom;
  -webkit-overflow-scrolling: touch;
}

.viewer-button {
  min-height: 44px;
  min-width: 44px;
}
```

## Error Handling

### Global Error Boundary

```tsx
class DocumentViewerErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Document viewer error:', error, errorInfo);
    // Log to error reporting service
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="error-fallback">
          <h2>Something went wrong with the document viewer</h2>
          <button onClick={() => this.setState({ hasError: false })}>
            Try again
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
```

### Network Error Handling

```tsx
function NetworkAwareViewer({ documentId }: { documentId: string }) {
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (!isOnline) {
    return <OfflineMessage />;
  }

  return (
    <SimpleDocumentViewer
      documentId={documentId}
      documentTitle="Network-Aware Document"
      pages={pages}
      onClose={() => router.back()}
    />
  );
}
```

## Testing Integration

### Unit Tests

```tsx
import { render, screen } from '@testing-library/react';
import SimpleDocumentViewer from '@/components/viewers/SimpleDocumentViewer';

const mockPages = [
  {
    pageNumber: 1,
    pageUrl: '/test-page-1.jpg',
    dimensions: { width: 800, height: 1200 }
  }
];

test('renders document viewer with pages', () => {
  render(
    <SimpleDocumentViewer
      documentId="test-doc"
      documentTitle="Test Document"
      pages={mockPages}
    />
  );

  expect(screen.getByText('Test Document')).toBeInTheDocument();
  expect(screen.getByText('Page 1 of 1')).toBeInTheDocument();
});
```

### Integration Tests

```tsx
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

test('navigation works correctly', async () => {
  const user = userEvent.setup();
  
  render(
    <SimpleDocumentViewer
      documentId="test-doc"
      documentTitle="Test Document"
      pages={multiplePages}
    />
  );

  // Test next page navigation
  await user.click(screen.getByTestId('next-page-button'));
  
  await waitFor(() => {
    expect(screen.getByText('Page 2 of 3')).toBeInTheDocument();
  });
});
```

## Deployment Considerations

### Environment Variables

```bash
# .env.local
NEXT_PUBLIC_DOCUMENT_API_URL=https://api.example.com
DOCUMENT_STORAGE_BUCKET=my-documents
WATERMARK_SECRET_KEY=your-secret-key
```

### Build Optimization

```javascript
// next.config.js
module.exports = {
  images: {
    domains: ['your-document-storage-domain.com'],
    formats: ['image/webp', 'image/avif'],
  },
  experimental: {
    optimizeCss: true,
  },
};
```

### CDN Configuration

```javascript
// Configure CDN for document images
const CDN_BASE_URL = process.env.NEXT_PUBLIC_CDN_URL;

const optimizePageUrl = (pageUrl) => {
  if (CDN_BASE_URL) {
    return `${CDN_BASE_URL}${pageUrl}`;
  }
  return pageUrl;
};
```

This integration guide provides a comprehensive foundation for implementing the SimpleDocumentViewer in various scenarios. Adapt the examples to your specific use case and requirements.