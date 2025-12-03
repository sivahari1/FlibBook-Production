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
  const [enableWatermark, setEnableWatermark] = useState(false);
  const [watermarkType, setWatermarkType] = useState<'text' | 'image'>('text');
  const [watermarkText, setWatermarkText] = useState(userEmail);
  const [watermarkImage, setWatermarkImage] = useState<string>('');
  const [watermarkOpacity, setWatermarkOpacity] = useState(0.3);
  const [watermarkSize, setWatermarkSize] = useState(16);
  const [startPreview, setStartPreview] = useState(false);
  const [showShareDialog, setShowShareDialog] = useState(false);
  
  // Error handling states
  const [validationErrors, setValidationErrors] = useState<{
    watermarkText?: string;
    watermarkImage?: string;
  }>({});
  const [isGeneratingPreview, setIsGeneratingPreview] = useState(false);
  const [popupBlockedError, setPopupBlockedError] = useState(false);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Clear previous errors
      setValidationErrors(prev => ({ ...prev, watermarkImage: undefined }));
      
      // Check file type
      if (!file.type.startsWith('image/')) {
        setValidationErrors(prev => ({
          ...prev,
          watermarkImage: 'Please upload a valid image file (PNG, JPG, GIF)'
        }));
        return;
      }
      
      // Check file size (max 2MB)
      if (file.size > 2 * 1024 * 1024) {
        setValidationErrors(prev => ({
          ...prev,
          watermarkImage: 'Image size must be less than 2MB'
        }));
        return;
      }

      const reader = new FileReader();
      reader.onload = (event) => {
        setWatermarkImage(event.target?.result as string);
      };
      reader.onerror = () => {
        setValidationErrors(prev => ({
          ...prev,
          watermarkImage: 'Failed to read image file. Please try again.'
        }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleStartPreview = () => {
    // Clear previous errors
    setValidationErrors({});
    setPopupBlockedError(false);
    
    // Validate watermark settings if enabled
    const errors: { watermarkText?: string; watermarkImage?: string } = {};
    
    if (enableWatermark) {
      if (watermarkType === 'text' && !watermarkText.trim()) {
        errors.watermarkText = 'Please enter watermark text';
      }
      if (watermarkType === 'image' && !watermarkImage) {
        errors.watermarkImage = 'Please upload a watermark image';
      }
    }
    
    // If there are validation errors, display them and stop
    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors);
      return;
    }

    // Show loading state
    setIsGeneratingPreview(true);

    try {
      // Build URL with settings as query parameters
      const params = new URLSearchParams({
        watermark: enableWatermark.toString(),
        ...(enableWatermark && watermarkType === 'text' && {
          watermarkText,
          watermarkSize: watermarkSize.toString(),
          watermarkOpacity: watermarkOpacity.toString(),
        }),
        ...(enableWatermark && watermarkType === 'image' && {
          watermarkImage: encodeURIComponent(watermarkImage),
          watermarkOpacity: watermarkOpacity.toString(),
        }),
      });

      // Open preview in new tab with settings
      const previewUrl = `/dashboard/documents/${documentId}/view?${params.toString()}`;
      const newWindow = window.open(previewUrl, '_blank', 'noopener,noreferrer');

      // Small delay to check if popup was blocked
      setTimeout(() => {
        setIsGeneratingPreview(false);
        
        // Handle popup blocker scenario
        if (!newWindow || newWindow.closed || typeof newWindow.closed === 'undefined') {
          setPopupBlockedError(true);
        }
      }, 100);
    } catch (error) {
      console.error('Error opening preview:', error);
      setIsGeneratingPreview(false);
      setValidationErrors({
        watermarkText: 'Failed to open preview. Please try again.'
      });
    }
  };

  const handleRetryPreview = () => {
    setPopupBlockedError(false);
    handleStartPreview();
  };

  const handleOpenInSameTab = () => {
    const params = new URLSearchParams({
      watermark: enableWatermark.toString(),
      ...(enableWatermark && watermarkType === 'text' && {
        watermarkText,
        watermarkSize: watermarkSize.toString(),
        watermarkOpacity: watermarkOpacity.toString(),
      }),
      ...(enableWatermark && watermarkType === 'image' && {
        watermarkImage: encodeURIComponent(watermarkImage),
        watermarkOpacity: watermarkOpacity.toString(),
      }),
    });

    window.location.href = `/dashboard/documents/${documentId}/view?${params.toString()}`;
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
              Preview Settings
            </h2>

            {/* Popup Blocker Error Message */}
            {popupBlockedError && (
              <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg" role="alert" aria-live="polite">
                <div className="flex items-start">
                  <svg className="w-5 h-5 text-yellow-600 mt-0.5 mr-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  <div className="flex-1">
                    <h3 className="text-sm font-medium text-yellow-800 mb-1">
                      Popup Blocked
                    </h3>
                    <p className="text-sm text-yellow-700 mb-3">
                      Your browser blocked the preview window. Please allow popups for this site or choose an alternative option.
                    </p>
                    <div className="flex gap-2">
                      <button
                        onClick={handleRetryPreview}
                        className="px-3 py-1.5 text-sm bg-yellow-600 text-white rounded hover:bg-yellow-700 transition-colors"
                      >
                        Retry
                      </button>
                      <button
                        onClick={handleOpenInSameTab}
                        className="px-3 py-1.5 text-sm bg-white text-yellow-700 border border-yellow-300 rounded hover:bg-yellow-50 transition-colors"
                      >
                        Open in Same Tab
                      </button>
                      <button
                        onClick={() => setPopupBlockedError(false)}
                        className="px-3 py-1.5 text-sm text-yellow-700 hover:text-yellow-800"
                      >
                        Dismiss
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Watermark Enable/Disable Toggle */}
            <div className="mb-6">
              <label className="flex items-center space-x-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={enableWatermark}
                  onChange={(e) => setEnableWatermark(e.target.checked)}
                  className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500 focus:ring-2 focus:ring-offset-2"
                  aria-label="Enable watermark"
                  aria-describedby="watermark-help-text"
                />
                <span className="text-sm font-medium text-gray-700">
                  Enable Watermark
                </span>
              </label>
              <p id="watermark-help-text" className="text-sm text-gray-500 mt-1 ml-8">
                Add a watermark to protect your content
              </p>
            </div>

            {/* Show watermark settings only if enabled */}
            {enableWatermark && (
              <div className="space-y-6">
                {/* Watermark Type Selection */}
                <div role="group" aria-labelledby="watermark-type-label">
                  <label id="watermark-type-label" className="block text-sm font-medium text-gray-700 mb-3">
                    Watermark Type
                  </label>
                  <div className="grid grid-cols-2 gap-4">
                <button
                  type="button"
                  onClick={() => setWatermarkType('text')}
                  className={`p-4 rounded-lg border-2 transition-all ${
                    watermarkType === 'text'
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                  aria-pressed={watermarkType === 'text'}
                  aria-label="Select text watermark"
                >
                  <svg className="w-8 h-8 mx-auto mb-2 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <span className="font-medium">Text Watermark</span>
                </button>
                <button
                  type="button"
                  onClick={() => setWatermarkType('image')}
                  className={`p-4 rounded-lg border-2 transition-all ${
                    watermarkType === 'image'
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                  aria-pressed={watermarkType === 'image'}
                  aria-label="Select image watermark"
                >
                  <svg className="w-8 h-8 mx-auto mb-2 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
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
                    id="watermark-text-input"
                    type="text"
                    value={watermarkText}
                    onChange={(e) => {
                      setWatermarkText(e.target.value);
                      // Clear error when user starts typing
                      if (validationErrors.watermarkText) {
                        setValidationErrors(prev => ({ ...prev, watermarkText: undefined }));
                      }
                    }}
                    placeholder="Enter watermark text"
                    className={`w-full ${validationErrors.watermarkText ? 'border-red-500 focus:ring-red-500' : ''}`}
                    aria-invalid={!!validationErrors.watermarkText}
                    aria-describedby={validationErrors.watermarkText ? 'watermark-text-error' : 'watermark-text-help'}
                    aria-label="Watermark text"
                  />
                  {validationErrors.watermarkText && (
                    <p id="watermark-text-error" className="text-sm text-red-600 mt-1" role="alert">
                      {validationErrors.watermarkText}
                    </p>
                  )}
                  {!validationErrors.watermarkText && (
                    <p id="watermark-text-help" className="text-sm text-gray-500 mt-1">
                      This text will appear diagonally across each page
                    </p>
                  )}
                </div>

                <div>
                  <label htmlFor="watermark-font-size" className="block text-sm font-medium text-gray-700 mb-2">
                    Font Size: {watermarkSize}px
                  </label>
                  <input
                    id="watermark-font-size"
                    type="range"
                    min="12"
                    max="32"
                    value={watermarkSize}
                    onChange={(e) => setWatermarkSize(Number(e.target.value))}
                    className="w-full"
                    aria-label={`Watermark font size: ${watermarkSize} pixels`}
                    aria-valuemin={12}
                    aria-valuemax={32}
                    aria-valuenow={watermarkSize}
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
                    id="watermark-image-upload"
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className={`block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 ${
                      validationErrors.watermarkImage ? 'border border-red-500 rounded-lg' : ''
                    }`}
                    aria-invalid={!!validationErrors.watermarkImage}
                    aria-describedby={validationErrors.watermarkImage ? 'watermark-image-error' : 'watermark-image-help'}
                    aria-label="Upload watermark image"
                  />
                  {validationErrors.watermarkImage && (
                    <p id="watermark-image-error" className="text-sm text-red-600 mt-1" role="alert">
                      {validationErrors.watermarkImage}
                    </p>
                  )}
                  {!validationErrors.watermarkImage && (
                    <p id="watermark-image-help" className="text-sm text-gray-500 mt-1">
                      PNG, JPG, or GIF (max 2MB). Transparent backgrounds work best.
                    </p>
                  )}
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
                <div>
              <label htmlFor="watermark-opacity" className="block text-sm font-medium text-gray-700 mb-2">
                Opacity: {Math.round(watermarkOpacity * 100)}%
              </label>
              <input
                id="watermark-opacity"
                type="range"
                min="0.1"
                max="0.8"
                step="0.1"
                value={watermarkOpacity}
                onChange={(e) => setWatermarkOpacity(Number(e.target.value))}
                className="w-full"
                aria-label={`Watermark opacity: ${Math.round(watermarkOpacity * 100)} percent`}
                aria-valuemin={10}
                aria-valuemax={80}
                aria-valuenow={Math.round(watermarkOpacity * 100)}
                aria-describedby="opacity-help-text"
              />
              <p id="opacity-help-text" className="text-sm text-gray-500 mt-1">
                Adjust the transparency of the watermark
              </p>
                </div>
              </div>
            )}

            {/* ARIA Live Region for Validation Errors */}
            <div 
              role="alert" 
              aria-live="assertive" 
              aria-atomic="true"
              className="sr-only"
            >
              {validationErrors.watermarkText && `Error: ${validationErrors.watermarkText}`}
              {validationErrors.watermarkImage && `Error: ${validationErrors.watermarkImage}`}
            </div>

            {/* Preview Button */}
            <Button
              onClick={handleStartPreview}
              disabled={isGeneratingPreview}
              className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
              aria-busy={isGeneratingPreview}
              aria-label="Preview document in new tab"
            >
              {isGeneratingPreview ? (
                <>
                  <svg className="animate-spin h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" aria-hidden="true">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Opening Preview...
                </>
              ) : (
                <>
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                  Preview in New Tab
                  <span className="sr-only">(opens in new tab)</span>
                </>
              )}
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
        showWatermark={enableWatermark}
      />
    </div>
  );
}
