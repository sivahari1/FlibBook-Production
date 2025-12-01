'use client';

import { useState, useEffect } from 'react';
import { ContentType, EnhancedDocument, WatermarkConfig, ViewerAnalyticsEvent } from '@/lib/types/content';
import ImageViewer from './ImageViewer';
import VideoPlayer from './VideoPlayer';
import LinkPreview from './LinkPreview';
import { FlipBookContainerWithDRM } from '../flipbook/FlipBookContainerWithDRM';

interface PageData {
  pageNumber: number;
  pageUrl: string;
  dimensions: {
    width: number;
    height: number;
  };
}

interface FlipBookWrapperProps {
  documentId: string;
  watermarkText: string;
  userEmail: string;
  allowTextSelection: boolean;
  enableScreenshotPrevention: boolean;
  showWatermark: boolean;
}

function FlipBookWrapper({
  documentId,
  watermarkText,
  userEmail,
  allowTextSelection,
  enableScreenshotPrevention,
  showWatermark,
}: FlipBookWrapperProps) {
  const [pages, setPages] = useState<PageData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchPages = async () => {
      try {
        setLoading(true);
        setError(null);

        const response = await fetch(`/api/documents/${documentId}/pages`);
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.message || 'Failed to load document pages');
        }

        if (!data.pages || data.pages.length === 0) {
          throw new Error('Document has no pages. Please convert the document first.');
        }

        setPages(data.pages);
        setLoading(false);
      } catch (err) {
        console.error('Error fetching pages:', err);
        setError(err instanceof Error ? err.message : 'Failed to load pages');
        setLoading(false);
      }
    };

    if (documentId) {
      fetchPages();
    }
  }, [documentId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <p className="text-white">Loading document pages...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500">
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-lg p-8 max-w-md w-full mx-4 text-center">
          <div className="text-red-600 dark:text-red-400 text-6xl mb-4">⚠️</div>
          <h2 className="text-2xl font-bold mb-2 text-gray-900 dark:text-white">
            Failed to Load Document
          </h2>
          <p className="text-gray-600 dark:text-gray-300 mb-6">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  // Transform pages to the format expected by FlipBookContainerWithDRM
  const transformedPages = pages.map(page => ({
    pageNumber: page.pageNumber,
    imageUrl: page.pageUrl,
    width: page.dimensions.width || 800,
    height: page.dimensions.height || 1000,
  }));

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500">
      <FlipBookContainerWithDRM
        documentId={documentId}
        pages={transformedPages}
        watermarkText={watermarkText}
        userEmail={userEmail}
        allowTextSelection={allowTextSelection}
        enableScreenshotPrevention={enableScreenshotPrevention}
        showWatermark={showWatermark}
      />
    </div>
  );
}

interface UniversalViewerProps {
  content: EnhancedDocument;
  watermark?: WatermarkConfig;
  onAnalytics?: (event: ViewerAnalyticsEvent) => void;
  requireEmail?: boolean;
  shareKey?: string;
}

export default function UniversalViewer({
  content,
  watermark,
  onAnalytics,
  requireEmail = false,
  shareKey
}: UniversalViewerProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Track view analytics on mount
  useEffect(() => {
    if (onAnalytics) {
      onAnalytics({
        documentId: content.id,
        contentType: content.contentType,
        action: 'view',
        timestamp: new Date(),
        metadata: {
          title: content.title,
          shareKey
        }
      });
    }
    setLoading(false);
  }, [content.id, content.contentType, content.title, shareKey, onAnalytics]);

  // Validate content has required fields
  useEffect(() => {
    if (!content.contentType) {
      setError('Content type is missing');
      setLoading(false);
      return;
    }

    // Validate content-specific requirements
    switch (content.contentType) {
      case ContentType.PDF:
      case ContentType.IMAGE:
      case ContentType.VIDEO:
        if (!content.fileUrl) {
          setError('File URL is missing for this content');
          setLoading(false);
        }
        break;
      case ContentType.LINK:
        if (!content.linkUrl) {
          setError('Link URL is missing for this content');
          setLoading(false);
        }
        break;
      default:
        setError(`Unsupported content type: ${content.contentType}`);
        setLoading(false);
    }
  }, [content]);

  // Loading state
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

  // Error state
  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100 dark:bg-slate-900">
        <div className="text-center max-w-md mx-auto px-4">
          <div className="text-red-600 dark:text-red-400 text-6xl mb-4">⚠️</div>
          <h2 className="text-2xl font-bold mb-2 text-gray-900 dark:text-white">
            Error Loading Content
          </h2>
          <p className="text-gray-600 dark:text-gray-300 mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
          >
            Reload Page
          </button>
        </div>
      </div>
    );
  }

  // Route to appropriate viewer based on content type
  switch (content.contentType) {
    case ContentType.PDF:
      return (
        <FlipBookWrapper
          documentId={content.id}
          watermarkText={watermark?.text || 'Protected Document'}
          userEmail={watermark?.text || 'User'}
          allowTextSelection={!requireEmail}
          enableScreenshotPrevention={true}
          showWatermark={!!watermark}
        />
      );

    case ContentType.IMAGE:
      return (
        <ImageViewer
          imageUrl={content.fileUrl!}
          metadata={{
            width: content.metadata.width || 0,
            height: content.metadata.height || 0,
            fileSize: content.metadata.fileSize || 0,
            mimeType: content.metadata.mimeType || 'image/jpeg'
          }}
          watermark={watermark}
          allowZoom={true}
          allowDownload={false}
          title={content.title}
        />
      );

    case ContentType.VIDEO:
      return (
        <VideoPlayer
          videoUrl={content.fileUrl!}
          metadata={{
            duration: content.metadata.duration || 0,
            width: content.metadata.width || 0,
            height: content.metadata.height || 0,
            fileSize: content.metadata.fileSize || 0,
            mimeType: content.metadata.mimeType || 'video/mp4',
            bitrate: content.metadata.bitrate,
            codec: content.metadata.codec
          }}
          watermark={watermark}
          autoplay={false}
          controls={true}
          title={content.title}
        />
      );

    case ContentType.LINK:
      return (
        <LinkPreview
          linkUrl={content.linkUrl!}
          metadata={{
            url: content.linkUrl!,
            title: content.metadata.title || content.title,
            description: content.metadata.description,
            previewImage: content.metadata.previewImage || content.thumbnailUrl,
            domain: content.metadata.domain || new URL(content.linkUrl!).hostname,
            fetchedAt: content.metadata.fetchedAt
          }}
          allowDirectAccess={true}
          title={content.title}
        />
      );

    default:
      return (
        <div className="flex items-center justify-center min-h-screen bg-gray-100 dark:bg-slate-900">
          <div className="text-center max-w-md mx-auto px-4">
            <div className="text-yellow-600 dark:text-yellow-400 text-6xl mb-4">⚠️</div>
            <h2 className="text-2xl font-bold mb-2 text-gray-900 dark:text-white">
              Unsupported Content Type
            </h2>
            <p className="text-gray-600 dark:text-gray-300">
              The content type "{content.contentType}" is not supported by this viewer.
            </p>
          </div>
        </div>
      );
  }
}
