/**
 * Example usage of UniversalViewer component
 * Demonstrates different content types and configurations
 */

import UniversalViewer from './UniversalViewer';
import { ContentType, EnhancedDocument } from '@/lib/types/content';

// Example 1: PDF Document
export function PDFExample() {
  const pdfContent: EnhancedDocument = {
    id: 'doc-123',
    title: 'Sample PDF Document',
    contentType: ContentType.PDF,
    fileUrl: 'https://example.com/documents/sample.pdf',
    thumbnailUrl: 'https://example.com/thumbnails/sample.jpg',
    metadata: {
      fileSize: 1024000,
      mimeType: 'application/pdf'
    },
    userId: 'user-456',
    createdAt: new Date(),
    updatedAt: new Date()
  };

  return (
    <UniversalViewer
      content={pdfContent}
      watermark={{
        text: 'viewer@example.com',
        opacity: 0.3,
        fontSize: 16
      }}
      requireEmail={true}
      shareKey="share-abc123"
    />
  );
}

// Example 2: Image Document
export function ImageExample() {
  const imageContent: EnhancedDocument = {
    id: 'img-456',
    title: 'Beautiful Landscape',
    contentType: ContentType.IMAGE,
    fileUrl: 'https://example.com/images/landscape.jpg',
    thumbnailUrl: 'https://example.com/thumbnails/landscape.jpg',
    metadata: {
      width: 1920,
      height: 1080,
      fileSize: 512000,
      mimeType: 'image/jpeg'
    },
    userId: 'user-456',
    createdAt: new Date(),
    updatedAt: new Date()
  };

  return (
    <UniversalViewer
      content={imageContent}
      watermark={{
        text: 'viewer@example.com',
        opacity: 0.2
      }}
      onAnalytics={(event) => {
        console.log('Image viewed:', event);
      }}
    />
  );
}

// Example 3: Video Document
export function VideoExample() {
  const videoContent: EnhancedDocument = {
    id: 'vid-789',
    title: 'Tutorial Video',
    contentType: ContentType.VIDEO,
    fileUrl: 'https://example.com/videos/tutorial.mp4',
    thumbnailUrl: 'https://example.com/thumbnails/tutorial.jpg',
    metadata: {
      duration: 300, // 5 minutes
      width: 1280,
      height: 720,
      fileSize: 10240000,
      mimeType: 'video/mp4',
      codec: 'h264'
    },
    userId: 'user-456',
    createdAt: new Date(),
    updatedAt: new Date()
  };

  return (
    <UniversalViewer
      content={videoContent}
      watermark={{
        text: 'viewer@example.com',
        opacity: 0.3,
        fontSize: 14
      }}
      onAnalytics={(event) => {
        console.log('Video event:', event);
      }}
    />
  );
}

// Example 4: Link Document
export function LinkExample() {
  const linkContent: EnhancedDocument = {
    id: 'link-012',
    title: 'Useful Resource',
    contentType: ContentType.LINK,
    linkUrl: 'https://example.com/resource',
    thumbnailUrl: 'https://example.com/og-image.jpg',
    metadata: {
      domain: 'example.com',
      title: 'Useful Resource - Example Site',
      description: 'A comprehensive guide to building amazing applications',
      previewImage: 'https://example.com/og-image.jpg',
      fetchedAt: new Date()
    },
    userId: 'user-456',
    createdAt: new Date(),
    updatedAt: new Date()
  };

  return (
    <UniversalViewer
      content={linkContent}
      onAnalytics={(event) => {
        console.log('Link viewed:', event);
      }}
    />
  );
}

// Example 5: Dynamic Content Loading
export function DynamicContentExample({ contentId }: { contentId: string }) {
  const [content, setContent] = React.useState<EnhancedDocument | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    fetch(`/api/content/${contentId}`)
      .then(res => {
        if (!res.ok) throw new Error('Failed to load content');
        return res.json();
      })
      .then(data => {
        setContent(data);
        setLoading(false);
      })
      .catch(err => {
        setError(err.message);
        setLoading(false);
      });
  }, [contentId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading content...</p>
        </div>
      </div>
    );
  }

  if (error || !content) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="text-red-600 text-6xl mb-4">⚠️</div>
          <h2 className="text-2xl font-bold mb-2">Error</h2>
          <p className="text-gray-600">{error || 'Content not found'}</p>
        </div>
      </div>
    );
  }

  return (
    <UniversalViewer
      content={content}
      watermark={{
        text: 'viewer@example.com',
        opacity: 0.3
      }}
      onAnalytics={(event) => {
        // Send analytics to backend
        fetch('/api/analytics', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(event)
        });
      }}
    />
  );
}

// Example 6: With Custom Analytics Handler
export function AnalyticsExample() {
  const handleAnalytics = (event: ViewerAnalyticsEvent) => {
    // Track different actions
    switch (event.action) {
      case 'view':
        console.log('Content viewed:', event.documentId);
        break;
      case 'download':
        console.log('Content downloaded:', event.documentId);
        break;
      case 'zoom':
        console.log('Content zoomed:', event.metadata);
        break;
      case 'play':
        console.log('Video played:', event.documentId);
        break;
      case 'pause':
        console.log('Video paused:', event.documentId);
        break;
      case 'fullscreen':
        console.log('Fullscreen toggled:', event.documentId);
        break;
    }

    // Send to analytics service
    if (typeof window !== 'undefined' && window.gtag) {
      window.gtag('event', event.action, {
        event_category: 'content_viewer',
        event_label: event.contentType,
        value: event.documentId
      });
    }
  };

  const content: EnhancedDocument = {
    id: 'doc-analytics',
    title: 'Analytics Example',
    contentType: ContentType.PDF,
    fileUrl: 'https://example.com/documents/sample.pdf',
    metadata: {},
    userId: 'user-456',
    createdAt: new Date(),
    updatedAt: new Date()
  };

  return (
    <UniversalViewer
      content={content}
      onAnalytics={handleAnalytics}
    />
  );
}

// Example 7: Error Handling
export function ErrorHandlingExample() {
  // Content with missing required field
  const invalidContent: EnhancedDocument = {
    id: 'invalid-123',
    title: 'Invalid Content',
    contentType: ContentType.PDF,
    // Missing fileUrl - will trigger error
    metadata: {},
    userId: 'user-456',
    createdAt: new Date(),
    updatedAt: new Date()
  };

  return (
    <UniversalViewer
      content={invalidContent}
      // Will show error: "File URL is missing for this content"
    />
  );
}

// Example 8: All Content Types in a Grid
export function ContentGridExample({ contents }: { contents: EnhancedDocument[] }) {
  const [selectedContent, setSelectedContent] = React.useState<EnhancedDocument | null>(null);

  if (selectedContent) {
    return (
      <div>
        <button
          onClick={() => setSelectedContent(null)}
          className="mb-4 px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded"
        >
          ← Back to Grid
        </button>
        <UniversalViewer
          content={selectedContent}
          watermark={{
            text: 'viewer@example.com',
            opacity: 0.3
          }}
        />
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4">
      {contents.map(content => (
        <div
          key={content.id}
          onClick={() => setSelectedContent(content)}
          className="border rounded-lg p-4 cursor-pointer hover:shadow-lg transition-shadow"
        >
          {content.thumbnailUrl && (
            <img
              src={content.thumbnailUrl}
              alt={content.title}
              className="w-full h-48 object-cover rounded mb-2"
            />
          )}
          <h3 className="font-bold">{content.title}</h3>
          <p className="text-sm text-gray-600">{content.contentType}</p>
        </div>
      ))}
    </div>
  );
}
