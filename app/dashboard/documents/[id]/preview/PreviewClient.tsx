'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import Link from 'next/link';
import { ShareDialog } from '@/components/dashboard/ShareDialog';
import { FlipBookContainerWithDRM } from '@/components/flipbook/FlipBookContainerWithDRM';

interface PageData {
  pageNumber: number;
  pageUrl: string;
  dimensions: {
    width: number;
    height: number;
  };
}

interface FlipBookViewerWrapperProps {
  documentId: string;
  watermarkText: string;
  userEmail: string;
  allowTextSelection: boolean;
  enableScreenshotPrevention: boolean;
  showWatermark: boolean;
}

function FlipBookViewerWrapper({
  documentId,
  watermarkText,
  userEmail,
  allowTextSelection,
  enableScreenshotPrevention,
  showWatermark,
}: FlipBookViewerWrapperProps) {
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

        // If no pages exist, trigger conversion automatically
        if (!data.pages || data.pages.length === 0) {
          console.log('No pages found, triggering conversion...');
          
          // Call conversion API
          const convertResponse = await fetch('/api/documents/convert', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ documentId }),
          });

          const convertData = await convertResponse.json();

          if (!convertResponse.ok) {
            throw new Error(convertData.message || 'Failed to convert document');
          }

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
          } else {
            throw new Error('Document conversion completed but no pages were generated');
          }
        } else {
          setPages(data.pages);
        }

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
          <p className="text-white text-lg font-medium mb-2">Loading document pages...</p>
          <p className="text-white text-sm opacity-80">This may take a moment if the document needs to be converted</p>
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

interface PreviewClientProps {
  documentTitle: string;
  pdfUrl: string;
  userEmail: string;
  documentId: string;
}

export default function PreviewClient({
  documentTitle,
  pdfUrl,
  userEmail,
  documentId,
}: PreviewClientProps) {
  const [showSettings, setShowSettings] = useState(true);
  const [watermarkType, setWatermarkType] = useState<'text' | 'image'>('text');
  const [watermarkText, setWatermarkText] = useState(userEmail);
  const [watermarkImage, setWatermarkImage] = useState<string>('');
  const [watermarkOpacity, setWatermarkOpacity] = useState(0.3);
  const [watermarkSize, setWatermarkSize] = useState(16);
  const [startPreview, setStartPreview] = useState(false);
  const [showShareDialog, setShowShareDialog] = useState(false);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Check file type
      if (!file.type.startsWith('image/')) {
        alert('Please upload an image file');
        return;
      }
      
      // Check file size (max 2MB)
      if (file.size > 2 * 1024 * 1024) {
        alert('Image size should be less than 2MB');
        return;
      }

      const reader = new FileReader();
      reader.onload = (event) => {
        setWatermarkImage(event.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleStartPreview = () => {
    if (watermarkType === 'text' && !watermarkText.trim()) {
      alert('Please enter watermark text');
      return;
    }
    if (watermarkType === 'image' && !watermarkImage) {
      alert('Please upload a watermark image');
      return;
    }
    setShowSettings(false);
    setStartPreview(true);
  };

  if (showSettings) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 py-12">
        <div className="max-w-2xl mx-auto px-4">
          {/* Header */}
          <div className="mb-8">
            <Link
              href="/dashboard"
              className="inline-flex items-center text-blue-600 hover:text-blue-700 mb-4"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Back to Dashboard
            </Link>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Preview Document
            </h1>
            <p className="text-gray-600">{documentTitle}</p>
          </div>

          {/* Watermark Settings Card */}
          <div className="bg-white rounded-xl shadow-lg p-8">
            <h2 className="text-2xl font-bold mb-6 text-gray-900">
              Watermark Settings
            </h2>

            {/* Watermark Type Selection */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Watermark Type
              </label>
              <div className="grid grid-cols-2 gap-4">
                <button
                  onClick={() => setWatermarkType('text')}
                  className={`p-4 rounded-lg border-2 transition-all ${
                    watermarkType === 'text'
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <svg className="w-8 h-8 mx-auto mb-2 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <span className="font-medium">Text Watermark</span>
                </button>
                <button
                  onClick={() => setWatermarkType('image')}
                  className={`p-4 rounded-lg border-2 transition-all ${
                    watermarkType === 'image'
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <svg className="w-8 h-8 mx-auto mb-2 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <span className="font-medium">Image Watermark</span>
                </button>
              </div>
            </div>

            {/* Text Watermark Settings */}
            {watermarkType === 'text' && (
              <div className="space-y-4 mb-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Watermark Text
                  </label>
                  <Input
                    type="text"
                    value={watermarkText}
                    onChange={(e) => setWatermarkText(e.target.value)}
                    placeholder="Enter watermark text"
                    className="w-full"
                  />
                  <p className="text-sm text-gray-500 mt-1">
                    This text will appear diagonally across each page
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Font Size: {watermarkSize}px
                  </label>
                  <input
                    type="range"
                    min="12"
                    max="32"
                    value={watermarkSize}
                    onChange={(e) => setWatermarkSize(Number(e.target.value))}
                    className="w-full"
                  />
                </div>
              </div>
            )}

            {/* Image Watermark Settings */}
            {watermarkType === 'image' && (
              <div className="space-y-4 mb-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Upload Watermark Image
                  </label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                  />
                  <p className="text-sm text-gray-500 mt-1">
                    PNG, JPG, or GIF (max 2MB). Transparent backgrounds work best.
                  </p>
                </div>

                {watermarkImage && (
                  <div className="mt-4">
                    <p className="text-sm font-medium text-gray-700 mb-2">Preview:</p>
                    <div className="border-2 border-gray-200 rounded-lg p-4 bg-gray-50">
                      <img
                        src={watermarkImage}
                        alt="Watermark preview"
                        className="max-w-xs max-h-32 mx-auto"
                        style={{ opacity: watermarkOpacity }}
                      />
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Opacity Control */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Opacity: {Math.round(watermarkOpacity * 100)}%
              </label>
              <input
                type="range"
                min="0.1"
                max="0.8"
                step="0.1"
                value={watermarkOpacity}
                onChange={(e) => setWatermarkOpacity(Number(e.target.value))}
                className="w-full"
              />
              <p className="text-sm text-gray-500 mt-1">
                Adjust the transparency of the watermark
              </p>
            </div>

            {/* Preview Button */}
            <Button
              onClick={handleStartPreview}
              className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
              Start Preview
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative">
      {/* Floating Action Buttons */}
      <div className="fixed top-4 right-4 z-50 flex gap-2">
        {/* Share Button */}
        <button
          onClick={() => setShowShareDialog(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white rounded-full p-3 shadow-lg hover:shadow-xl transition-all"
          title="Share Document"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
          </svg>
        </button>

        {/* Settings Button */}
        <button
          onClick={() => setShowSettings(true)}
          className="bg-white hover:bg-gray-50 rounded-full p-3 shadow-lg hover:shadow-xl transition-all"
          title="Watermark Settings"
        >
          <svg className="w-6 h-6 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </button>
      </div>

      {/* Share Dialog */}
      <ShareDialog
        documentId={documentId}
        documentTitle={documentTitle}
        isOpen={showShareDialog}
        onClose={() => setShowShareDialog(false)}
      />

      {/* FlipBook Viewer with Custom Watermark */}
      <FlipBookViewerWrapper
        documentId={documentId}
        watermarkText={watermarkText}
        userEmail={userEmail}
        allowTextSelection={true}
        enableScreenshotPrevention={false}
        showWatermark={true}
      />
    </div>
  );
}
