'use client';

import { useState, useEffect } from 'react';
import { FlipBookContainerWithDRM } from '@/components/flipbook/FlipBookContainerWithDRM';
import ImageViewer from '@/components/viewers/ImageViewer';
import VideoPlayer from '@/components/viewers/VideoPlayer';
import LinkPreview from '@/components/viewers/LinkPreview';
import { ContentType, ImageMetadata, VideoMetadata, LinkMetadata, WatermarkConfig } from '@/lib/types/content';

interface PageData {
  pageNumber: number;
  pageUrl: string;
  dimensions: {
    width: number;
    height: number;
  };
}

interface PreviewViewerClientProps {
  documentId: string;
  documentTitle: string;
  contentType: ContentType;
  userEmail: string;
  enableWatermark: boolean;
  watermarkText: string;
  watermarkOpacity: number;
  watermarkSize: number;
  watermarkImage?: string;
  // Content-specific props
  pdfUrl?: string;
  imageUrl?: string;
  videoUrl?: string;
  linkUrl?: string;
  metadata?: any;
  initialPages?: PageData[];
}

/**
 * PreviewViewerClient
 * 
 * Universal preview viewer that routes to appropriate viewer based on content type
 * Applies watermark settings to all viewer types
 * 
 * Requirements: 3.2, 3.3, 4.1, 4.2, 4.3, 4.4
 */
export default function PreviewViewerClient({
  documentId,
  documentTitle,
  contentType,
  userEmail,
  enableWatermark,
  watermarkText,
  watermarkOpacity,
  watermarkSize,
  watermarkImage,
  pdfUrl,
  imageUrl,
  videoUrl,
  linkUrl,
  metadata,
  initialPages = [],
}: PreviewViewerClientProps) {
  const [pages, setPages] = useState<PageData[]>(initialPages);
  const [loading, setLoading] = useState(contentType === ContentType.PDF && initialPages.length === 0);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  // Debug logging for received props
  useEffect(() => {
    console.log('[PreviewViewerClient] Watermark Settings:', {
      enableWatermark,
      watermarkText: watermarkText ? '***' : '(empty)',
      watermarkOpacity,
      watermarkSize,
      hasWatermarkImage: !!watermarkImage,
      contentType,
    });
  }, [enableWatermark, watermarkText, watermarkOpacity, watermarkSize, watermarkImage, contentType]);

  // Prepare watermark configuration
  const watermarkConfig: WatermarkConfig | undefined = enableWatermark
    ? {
        text: watermarkText || userEmail,
        opacity: watermarkOpacity,
        fontSize: watermarkSize,
      }
    : undefined;

  // Log the final watermark config
  useEffect(() => {
    console.log('[PreviewViewerClient] Final Watermark Config:', 
      watermarkConfig ? { 
        hasText: !!watermarkConfig.text, 
        opacity: watermarkConfig.opacity,
        fontSize: watermarkConfig.fontSize 
      } : 'disabled'
    );
  }, [watermarkConfig]);

  // Fetch pages for PDF content type only if not provided initially
  useEffect(() => {
    if (contentType !== ContentType.PDF) return;
    
    // If we already have pages from server, don't fetch again
    if (initialPages.length > 0) {
      console.log('[Client] Using initial pages from server:', initialPages.length);
      return;
    }

    const fetchPages = async () => {
      try {
        setLoading(true);
        setError(null);

        console.log('[Client] No initial pages, triggering conversion...');
        
        // Call conversion API directly since we have no pages
        const convertResponse = await fetch('/api/documents/convert', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ documentId }),
        });

        if (!convertResponse.ok) {
          const convertData = await convertResponse.json();
          throw new Error(convertData.message || 'Failed to convert document. Please try again.');
        }
        
        const convertData = await convertResponse.json();

        // Use the page URLs from conversion response
        if (convertData.pageUrls && convertData.pageUrls.length > 0) {
          const convertedPages = convertData.pageUrls.map((url: string, index: number) => ({
            pageNumber: index + 1,
            pageUrl: url,
            dimensions: {
              width: 1200,
              height: 1600,
            },
          }));
          setPages(convertedPages);
          console.log('[Client] Conversion complete:', convertedPages.length, 'pages');
        } else {
          throw new Error('Document conversion completed but no pages were generated');
        }

        setLoading(false);
        setRetryCount(0); // Reset retry count on success
      } catch (err) {
        console.error('[Client] Error during conversion:', err);
        setError(err instanceof Error ? err.message : 'Failed to load pages. Please try again.');
        setLoading(false);
      }
    };

    fetchPages();
  }, [documentId, contentType, retryCount, initialPages.length]);

  // Loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <p className="text-white text-lg font-medium mb-2">Loading content...</p>
          <p className="text-white text-sm opacity-80">
            {contentType === ContentType.PDF && 'This may take a moment if the document needs to be converted'}
          </p>
        </div>
      </div>
    );
  }

  // Error state with retry functionality
  if (error) {
    const isAccessError = error.includes('Access denied') || error.includes('not found');
    
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500">
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-lg p-8 max-w-md w-full mx-4 text-center">
          <div className="text-red-600 dark:text-red-400 text-6xl mb-4">⚠️</div>
          <h2 className="text-2xl font-bold mb-2 text-gray-900 dark:text-white">
            Failed to Load Content
          </h2>
          <p className="text-gray-600 dark:text-gray-300 mb-6">{error}</p>
          <div className="flex gap-3 justify-center">
            {!isAccessError && (
              <button
                onClick={() => setRetryCount(prev => prev + 1)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center"
                aria-label="Retry loading content"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Retry
              </button>
            )}
            <button
              onClick={() => window.location.href = '/dashboard'}
              className="px-4 py-2 bg-gray-200 dark:bg-slate-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-slate-600 transition-colors"
            >
              Back to Dashboard
            </button>
          </div>
          {retryCount > 0 && !isAccessError && (
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-4">
              Retry attempt {retryCount}
            </p>
          )}
        </div>
      </div>
    );
  }

  // Route to appropriate viewer based on content type
  switch (contentType) {
    case ContentType.PDF:
      // Transform pages to the format expected by FlipBookContainerWithDRM
      const transformedPages = pages.map(page => ({
        pageNumber: page.pageNumber,
        imageUrl: page.pageUrl,
        width: page.dimensions.width || 800,
        height: page.dimensions.height || 1000,
      }));

      console.log('[PreviewViewerClient] Rendering FlipBook with watermark:', {
        enableWatermark,
        watermarkText: watermarkConfig?.text ? '***' : undefined,
        pagesCount: transformedPages.length,
      });

      return (
        <FlipBookContainerWithDRM
          documentId={documentId}
          pages={transformedPages}
          watermarkText={enableWatermark ? (watermarkConfig?.text || userEmail) : undefined}
          userEmail={userEmail}
          allowTextSelection={true}
          enableScreenshotPrevention={false}
          showWatermark={enableWatermark}
          enableWatermark={enableWatermark}
        />
      );

    case ContentType.IMAGE:
      if (!imageUrl) {
        return (
          <div className="flex items-center justify-center min-h-screen bg-gray-100 dark:bg-slate-900">
            <div className="bg-white dark:bg-slate-800 rounded-lg shadow-lg p-8 max-w-md w-full mx-4 text-center">
              <div className="text-red-600 dark:text-red-400 text-6xl mb-4">⚠️</div>
              <h2 className="text-2xl font-bold mb-2 text-gray-900 dark:text-white">
                Image Not Available
              </h2>
              <p className="text-gray-600 dark:text-gray-300 mb-6">
                The image URL could not be generated. The file may be missing or corrupted.
              </p>
              <button
                onClick={() => window.location.href = '/dashboard'}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Back to Dashboard
              </button>
            </div>
          </div>
        );
      }

      const imageMetadata: ImageMetadata = {
        width: metadata?.width || 0,
        height: metadata?.height || 0,
        fileSize: metadata?.fileSize || 0,
        mimeType: metadata?.mimeType || 'image/jpeg',
      };

      return (
        <ImageViewer
          imageUrl={imageUrl}
          metadata={imageMetadata}
          watermark={watermarkConfig}
          allowZoom={true}
          allowDownload={false}
          title={documentTitle}
        />
      );

    case ContentType.VIDEO:
      if (!videoUrl) {
        return (
          <div className="flex items-center justify-center min-h-screen bg-gray-100 dark:bg-slate-900">
            <div className="bg-white dark:bg-slate-800 rounded-lg shadow-lg p-8 max-w-md w-full mx-4 text-center">
              <div className="text-red-600 dark:text-red-400 text-6xl mb-4">⚠️</div>
              <h2 className="text-2xl font-bold mb-2 text-gray-900 dark:text-white">
                Video Not Available
              </h2>
              <p className="text-gray-600 dark:text-gray-300 mb-6">
                The video URL could not be generated. The file may be missing or corrupted.
              </p>
              <button
                onClick={() => window.location.href = '/dashboard'}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Back to Dashboard
              </button>
            </div>
          </div>
        );
      }

      const videoMetadata: VideoMetadata = {
        duration: metadata?.duration || 0,
        width: metadata?.width || 0,
        height: metadata?.height || 0,
        fileSize: metadata?.fileSize || 0,
        mimeType: metadata?.mimeType || 'video/mp4',
        bitrate: metadata?.bitrate,
        codec: metadata?.codec,
      };

      return (
        <VideoPlayer
          videoUrl={videoUrl}
          metadata={videoMetadata}
          watermark={watermarkConfig}
          autoplay={false}
          controls={true}
          title={documentTitle}
        />
      );

    case ContentType.LINK:
      if (!linkUrl) {
        return (
          <div className="flex items-center justify-center min-h-screen bg-gray-100 dark:bg-slate-900">
            <div className="bg-white dark:bg-slate-800 rounded-lg shadow-lg p-8 max-w-md w-full mx-4 text-center">
              <div className="text-red-600 dark:text-red-400 text-6xl mb-4">⚠️</div>
              <h2 className="text-2xl font-bold mb-2 text-gray-900 dark:text-white">
                Link Not Available
              </h2>
              <p className="text-gray-600 dark:text-gray-300 mb-6">
                The link URL is missing or invalid.
              </p>
              <button
                onClick={() => window.location.href = '/dashboard'}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Back to Dashboard
              </button>
            </div>
          </div>
        );
      }

      const linkMetadata: LinkMetadata = {
        url: linkUrl,
        title: metadata?.title || documentTitle,
        description: metadata?.description,
        previewImage: metadata?.previewImage,
        domain: metadata?.domain || new URL(linkUrl).hostname,
        fetchedAt: metadata?.fetchedAt,
      };

      return (
        <LinkPreview
          linkUrl={linkUrl}
          metadata={linkMetadata}
          allowDirectAccess={true}
          title={documentTitle}
        />
      );

    default:
      return (
        <div className="flex items-center justify-center min-h-screen bg-gray-100 dark:bg-slate-900">
          <div className="text-center">
            <div className="text-yellow-600 dark:text-yellow-400 text-6xl mb-4">⚠️</div>
            <h2 className="text-2xl font-bold mb-2 text-gray-900 dark:text-white">
              Unsupported Content Type
            </h2>
            <p className="text-gray-600 dark:text-gray-300">
              Content type "{contentType}" is not supported for preview
            </p>
          </div>
        </div>
      );
  }
}
