'use client';

import { useState, useEffect } from 'react';
import ImageViewer from '@/components/viewers/ImageViewer';
import VideoPlayer from '@/components/viewers/VideoPlayer';
import LinkPreview from '@/components/viewers/LinkPreview';
import SimpleDocumentViewer, { WatermarkSettings } from '@/components/viewers/SimpleDocumentViewer';
import { ContentType, ImageMetadata, VideoMetadata, LinkMetadata, WatermarkConfig } from '@/lib/types/content';

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
}

/**
 * PreviewViewerClient
 * 
 * Universal preview viewer that routes to appropriate viewer based on content type
 * Applies watermark settings to all viewer types
 * Uses PDF.js rendering for PDFs to avoid iframe blocking (Requirements: 2.1)
 * 
 * Requirements: 2.1, 3.2, 3.3, 4.1, 4.2, 4.3, 4.4
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
}: PreviewViewerClientProps) {
  const [loading] = useState(false);
  const [error] = useState<string | null>(null);

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
  const watermarkConfig: WatermarkSettings | undefined = enableWatermark
    ? {
        text: watermarkText || userEmail,
        opacity: watermarkOpacity || 0.3,
        fontSize: watermarkSize || 16,
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

  // Loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <p className="text-white text-lg font-medium mb-2">Loading content...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500">
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-lg p-8 max-w-md w-full mx-4 text-center">
          <div className="text-red-600 dark:text-red-400 text-6xl mb-4">⚠️</div>
          <h2 className="text-2xl font-bold mb-2 text-gray-900 dark:text-white">
            Failed to Load Content
          </h2>
          <p className="text-gray-600 dark:text-gray-300 mb-6">{error}</p>
          <button
            onClick={() => window.location.href = '/dashboard'}
            className="px-4 py-2 bg-gray-200 dark:bg-slate-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-slate-600 transition-colors"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  // Route to appropriate viewer based on content type
  switch (contentType) {
    case ContentType.PDF:
      if (!pdfUrl) {
        return (
          <div className="flex items-center justify-center min-h-screen bg-gray-100 dark:bg-slate-900">
            <div className="bg-white dark:bg-slate-800 rounded-lg shadow-lg p-8 max-w-md w-full mx-4 text-center">
              <div className="text-red-600 dark:text-red-400 text-6xl mb-4">⚠️</div>
              <h2 className="text-2xl font-bold mb-2 text-gray-900 dark:text-white">
                PDF Not Available
              </h2>
              <p className="text-gray-600 dark:text-gray-300 mb-6">
                The PDF URL could not be generated. The file may be missing or corrupted.
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

      console.log('[PreviewViewerClient] Rendering SimpleDocumentViewer with PDF URL:', {
        enableWatermark,
        watermarkText: watermarkConfig?.text ? '***' : undefined,
        hasPdfUrl: !!pdfUrl,
        pdfUrlLength: pdfUrl?.length,
        pdfUrlStart: pdfUrl?.substring(0, 50),
      });

      // Validate PDF URL before rendering
      if (!pdfUrl || pdfUrl.trim() === '') {
        console.error('[PreviewViewerClient] PDF URL is empty or invalid');
        return (
          <div className="flex items-center justify-center min-h-screen bg-gray-100 dark:bg-slate-900">
            <div className="bg-white dark:bg-slate-800 rounded-lg shadow-lg p-8 max-w-md w-full mx-4 text-center">
              <div className="text-red-600 dark:text-red-400 text-6xl mb-4">⚠️</div>
              <h2 className="text-2xl font-bold mb-2 text-gray-900 dark:text-white">
                PDF URL Missing
              </h2>
              <p className="text-gray-600 dark:text-gray-300 mb-6">
                The PDF URL is missing or invalid. Please try refreshing the page.
              </p>
              <button
                onClick={() => window.location.reload()}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors mr-2"
              >
                Refresh Page
              </button>
              <button
                onClick={() => window.location.href = '/dashboard'}
                className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
              >
                Back to Dashboard
              </button>
            </div>
          </div>
        );
      }

      return (
        <SimpleDocumentViewer
          documentId={documentId}
          documentTitle={documentTitle}
          pdfUrl={pdfUrl}
          watermark={watermarkConfig}
          enableScreenshotPrevention={true}
          onClose={() => window.location.href = '/dashboard'}
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
