'use client';

import { useEffect, useState } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import PDFPage from './PDFPage';
import DRMProtection from '../security/DRMProtection';
import DevToolsDetector from '../security/DevToolsDetector';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';

// Configure PDF.js worker - use local worker from node_modules
if (typeof window !== 'undefined') {
  pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
    'pdfjs-dist/build/pdf.worker.min.mjs',
    import.meta.url
  ).toString();
}

interface WatermarkConfig {
  type: 'text' | 'image';
  text?: string;
  image?: string;
  opacity?: number;
  fontSize?: number;
}

interface PDFViewerProps {
  pdfUrl: string;
  requireEmail?: boolean;
  shareKey?: string;
  watermarkConfig?: WatermarkConfig;
}

export default function PDFViewer({ pdfUrl, requireEmail = true, shareKey, watermarkConfig }: PDFViewerProps) {
  const [pdf, setPdf] = useState<pdfjsLib.PDFDocumentProxy | null>(null);
  const [pages, setPages] = useState<pdfjsLib.PDFPageProxy[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [scale, setScale] = useState(1.5);
  const [viewerEmail, setViewerEmail] = useState<string>('');
  const [emailInput, setEmailInput] = useState<string>('');
  const [emailError, setEmailError] = useState<string>('');
  const [showEmailPrompt, setShowEmailPrompt] = useState(requireEmail);
  const [timestamp, setTimestamp] = useState<string>('');

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setEmailError('');

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailInput.trim()) {
      setEmailError('Email is required');
      return;
    }
    if (!emailRegex.test(emailInput)) {
      setEmailError('Please enter a valid email address');
      return;
    }

    // Set viewer email and timestamp
    setViewerEmail(emailInput);
    const now = new Date();
    setTimestamp(now.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    }));
    setShowEmailPrompt(false);

    // Record view analytics if shareKey is provided
    if (shareKey) {
      try {
        await fetch(`/api/share/${shareKey}/view`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            viewerEmail: emailInput,
          }),
        });
        // Silently fail if analytics recording fails - don't block the user
      } catch (error) {
        console.error('Failed to record view analytics:', error);
      }
    }
  };

  useEffect(() => {
    const loadPdf = async () => {
      try {
        setLoading(true);
        setError(null);

        const loadingTask = pdfjsLib.getDocument(pdfUrl);
        const pdfDoc = await loadingTask.promise;
        setPdf(pdfDoc);

        // Load all pages
        const pagePromises: Promise<pdfjsLib.PDFPageProxy>[] = [];
        for (let i = 1; i <= pdfDoc.numPages; i++) {
          pagePromises.push(pdfDoc.getPage(i));
        }

        const loadedPages = await Promise.all(pagePromises);
        setPages(loadedPages);
        setLoading(false);
      } catch (err) {
        console.error('Error loading PDF:', err);
        setError('Failed to load PDF document');
        setLoading(false);
      }
    };

    if (pdfUrl) {
      loadPdf();
    }
  }, [pdfUrl]);

  // Show email prompt before loading PDF
  if (showEmailPrompt) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full mx-4">
          <h2 className="text-2xl font-bold mb-2 text-gray-900">Enter Your Email</h2>
          <p className="text-gray-600 mb-6">
            Please provide your email address to view this document. Your email will be watermarked on each page for security purposes.
          </p>
          <form onSubmit={handleEmailSubmit}>
            <div className="mb-4">
              <Input
                type="email"
                placeholder="your.email@example.com"
                value={emailInput}
                onChange={(e) => setEmailInput(e.target.value)}
                className="w-full"
                autoFocus
              />
              {emailError && (
                <p className="text-red-600 text-sm mt-1">{emailError}</p>
              )}
            </div>
            <Button type="submit" className="w-full">
              Continue to Document
            </Button>
          </form>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading PDF...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="text-red-600 text-6xl mb-4">⚠️</div>
          <h2 className="text-2xl font-bold mb-2 text-gray-900">Error Loading PDF</h2>
          <p className="text-gray-600">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <DRMProtection>
      <DevToolsDetector />
      <div className="bg-gray-100 min-h-screen py-8">
        <div className="max-w-4xl mx-auto px-4">
          {/* Zoom Controls */}
          <div className="bg-white rounded-lg shadow-md p-4 mb-6 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <span className="text-gray-700 font-medium">
                {pdf?.numPages} {pdf?.numPages === 1 ? 'page' : 'pages'}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setScale(Math.max(0.5, scale - 0.25))}
                className="px-3 py-1 bg-gray-200 hover:bg-gray-300 rounded text-gray-700"
                disabled={scale <= 0.5}
              >
                -
              </button>
              <span className="text-gray-700 min-w-[60px] text-center">
                {Math.round(scale * 100)}%
              </span>
              <button
                onClick={() => setScale(Math.min(3, scale + 0.25))}
                className="px-3 py-1 bg-gray-200 hover:bg-gray-300 rounded text-gray-700"
                disabled={scale >= 3}
              >
                +
              </button>
            </div>
          </div>

          {/* PDF Pages */}
          <div className="space-y-4">
            {pages.map((page, index) => (
              <PDFPage
                key={index}
                page={page}
                pageNumber={index + 1}
                scale={scale}
                viewerEmail={viewerEmail}
                timestamp={timestamp}
                watermarkConfig={watermarkConfig}
              />
            ))}
          </div>
        </div>
      </div>
    </DRMProtection>
  );
}
