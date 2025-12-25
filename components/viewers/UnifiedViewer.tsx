'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { ContentType, EnhancedDocument, WatermarkConfig, ViewerAnalyticsEvent } from '@/lib/types/content';
import ImageViewer from './ImageViewer';
import VideoPlayer from './VideoPlayer';
import LinkPreview from './LinkPreview';
import SimpleDocumentViewer from './SimpleDocumentViewer';
import LoadingProgressIndicator from './LoadingProgressIndicator';
import { useLoadingStateManager, createLoadingContextId } from '@/lib/loading-state-manager';
import { LoadProgress } from './SimpleDocumentViewer';

interface DRMSettings {
  enableScreenshotPrevention: boolean;
  allowTextSelection: boolean;
  allowPrinting: boolean;
  allowDownload: boolean;
  watermarkRequired: boolean;
}

interface UnifiedViewerProps {
  content: EnhancedDocument;
  watermark?: WatermarkConfig;
  drmSettings?: DRMSettings;
  onAnalytics?: (event: ViewerAnalyticsEvent) => void;
  requireEmail?: boolean;
  shareKey?: string;
  onClose?: () => void;
  documentTitle?: string;
}

function UnifiedViewer({
  content,
  watermark,
  drmSettings,
  onAnalytics,
  requireEmail = false,
  shareKey,
  onClose,
  documentTitle
}: UnifiedViewerProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [loadingProgress, setLoadingProgress] = useState<LoadProgress | null>(null);

  // Loading state management for consistency
  const contextId = useMemo(() => createLoadingContextId('unified-viewer', content.id), [content.id]);
  const loadingStateManager = useLoadingStateManager(contextId, content.id);
  
  // Memoize the loading state manager to prevent unnecessary re-renders
  const stableLoadingStateManager = useMemo(() => loadingStateManager, [contextId, content.id]);

  // Default DRM settings
  const defaultDRMSettings: DRMSettings = {
    enableScreenshotPrevention: true,
    allowTextSelection: !requireEmail,
    allowPrinting: false,
    allowDownload: false,
    watermarkRequired: !!watermark,
  };

  const effectiveDRMSettings = { ...defaultDRMSettings, ...drmSettings };

  // Track view analytics and initialize loading state on mount
  useEffect(() => {
    // Initialize loading state
    const initialProgress: LoadProgress = {
      documentId: content.id,
      loaded: 0,
      total: 100,
      percentage: 0,
      status: 'loading'
    };
    setLoadingProgress(initialProgress);
    stableLoadingStateManager.updateLoadingState(initialProgress);

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

    // Simulate loading completion for non-PDF content
    const timer = setTimeout(() => {
      const completeProgress: LoadProgress = {
        documentId: content.id,
        loaded: 100,
        total: 100,
        percentage: 100,
        status: 'complete'
      };
      setLoadingProgress(completeProgress);
      stableLoadingStateManager.updateLoadingState(completeProgress);
      setLoading(false);
    }, 500);

    return () => clearTimeout(timer);
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

  // Loading state with consistent progress indicator
  if (loading && loadingProgress) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100 dark:bg-slate-900">
        <div className="text-center max-w-md mx-auto px-4">
          <LoadingProgressIndicator 
            progress={loadingProgress}
            showDetails={true}
            className="mb-4"
          />
          <p className="text-gray-600 dark:text-gray-300">Loading {content.contentType} content...</p>
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
        <SimpleDocumentViewer
          documentId={content.id}
          documentTitle={documentTitle || content.title}
          // Don't pass pdfUrl - let SimpleDocumentViewer use canonical API
          watermark={watermark ? {
            text: watermark.text,
            opacity: watermark.opacity || 0.3,
            fontSize: watermark.fontSize || 48,
            position: 'center' as const,
            color: watermark.color || 'rgba(0, 0, 0, 0.3)'
          } : undefined}
          enableScreenshotPrevention={effectiveDRMSettings.enableScreenshotPrevention}
          enableReliabilityFeatures={true}
          enableDRMProtection={true}
          allowTextSelection={effectiveDRMSettings.allowTextSelection}
          allowPrinting={effectiveDRMSettings.allowPrinting}
          allowDownload={effectiveDRMSettings.allowDownload}
          enableFlipbookNavigation={true}
          showPageNumbers={true}
          enableZoom={true}
          onClose={onClose}
          onRenderingError={(error, diagnostics) => {
            console.error('PDF rendering error:', error, diagnostics);
            if (onAnalytics) {
              onAnalytics({
                documentId: content.id,
                contentType: content.contentType,
                action: 'view',
                timestamp: new Date(),
                metadata: {
                  error: error.message,
                  diagnostics: diagnostics ? JSON.stringify(diagnostics) : undefined
                }
              });
            }
          }}
          onLoadProgress={(progress) => {
            // Update unified viewer loading state
            setLoadingProgress(progress);
            stableLoadingStateManager.updateLoadingState(progress);

            if (onAnalytics && progress.status === 'complete') {
              onAnalytics({
                documentId: content.id,
                contentType: content.contentType,
                action: 'view',
                timestamp: new Date(),
                metadata: {
                  loadTime: Date.now() - progress.loaded
                }
              });
            }
          }}
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
          allowDownload={effectiveDRMSettings.allowDownload}
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
              The content type &quot;{content.contentType}&quot; is not supported by this viewer.
            </p>
          </div>
        </div>
      );
  }
}

UnifiedViewer.displayName = 'UnifiedViewer';

export default UnifiedViewer;