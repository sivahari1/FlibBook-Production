'use client';

import { useState } from 'react';
import PDFViewer from '@/components/pdf/PDFViewer';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import Link from 'next/link';

interface PreviewClientProps {
  documentTitle: string;
  pdfUrl: string;
  userEmail: string;
}

export default function PreviewClient({
  documentTitle,
  pdfUrl,
  userEmail,
}: PreviewClientProps) {
  const [showSettings, setShowSettings] = useState(true);
  const [watermarkType, setWatermarkType] = useState<'text' | 'image'>('text');
  const [watermarkText, setWatermarkText] = useState(userEmail);
  const [watermarkImage, setWatermarkImage] = useState<string>('');
  const [watermarkOpacity, setWatermarkOpacity] = useState(0.3);
  const [watermarkSize, setWatermarkSize] = useState(16);
  const [startPreview, setStartPreview] = useState(false);

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
      {/* Settings Button (Floating) */}
      <button
        onClick={() => setShowSettings(true)}
        className="fixed top-4 right-4 z-50 bg-white rounded-full p-3 shadow-lg hover:shadow-xl transition-shadow"
        title="Watermark Settings"
      >
        <svg className="w-6 h-6 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      </button>

      {/* PDF Viewer with Custom Watermark */}
      <PDFViewer
        pdfUrl={pdfUrl}
        requireEmail={false}
        watermarkConfig={{
          type: watermarkType,
          text: watermarkText,
          image: watermarkImage,
          opacity: watermarkOpacity,
          fontSize: watermarkSize,
        }}
      />
    </div>
  );
}
