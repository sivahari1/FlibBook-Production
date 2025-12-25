'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';

interface DocumentData {
  id: string;
  title: string;
  filename: string;
  contentType: string;
  storagePath: string;
  linkUrl: string | null;
  thumbnailUrl: string | null;
  metadata: any;
  fileSize: bigint | null;
  mimeType: string;
  createdAt: Date;
  updatedAt: Date;
  userId: string;
}

interface PageData {
  id: string;
  pageNumber: number;
  imageUrl: string;
  pageUrl?: string;
  signedUrl?: string;
}

interface MyJstudyroomViewerClientProps {
  document: DocumentData;
  bookShopTitle: string;
  memberName: string;
  itemId: string;
}

export function MyJstudyroomViewerClient({
  document: documentData,
  bookShopTitle,
  memberName,
  itemId,
}: MyJstudyroomViewerClientProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pages, setPages] = useState<PageData[]>([]);

  useEffect(() => {
    loadDocumentPages();
  }, [documentData.id]);

  const loadDocumentPages = async () => {
    try {
      setLoading(true);
      setError(null);

      console.log(`🔍 Loading pages for document ${documentData.id} using member-safe API`);

      // Use the member-safe API endpoint
      const response = await fetch(`/api/viewer/documents/${documentData.id}/pages`, {
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      if (response.ok) {
        const data = await response.json();
        
        // Check if document has no pages
        if (!data.pages || data.pages.length === 0) {
          console.warn('⚠️ Document has no pages - this document may not be properly converted');
          setPages([]);
          return;
        }
        
        console.log(`✅ Member-safe API returned ${data.totalPages} pages`);
        
        // Create page objects with proxy URLs (no blob conversion needed)
        const pagesWithProxyUrls = (data.pages || []).map((page: any) => ({
          id: `page-${page.pageNumber}`,
          pageNumber: page.pageNumber,
          imageUrl: `/api/member/my-jstudyroom/viewer/items/${itemId}/pages/${page.pageNumber}/image`,
          pageUrl: `/api/member/my-jstudyroom/viewer/items/${itemId}/pages/${page.pageNumber}/image`,
        }));
        
        setPages(pagesWithProxyUrls);
        console.log(`✅ Loaded ${pagesWithProxyUrls.length} pages with proxy URLs`);
      } else {
        console.error('❌ Member-safe API failed:', response.status);
        const errorData = await response.json();
        console.error('   Error details:', errorData);
        
        if (response.status === 401) {
          setError('You do not have access to view this document');
        } else if (response.status === 403) {
          setError('Access denied - you do not have permission to view this document');
        } else if (response.status === 404) {
          setError('Document not found');
        } else if (response.status === 409) {
          setError(errorData.message || 'Document pages are being generated. Please try again in a moment.');
        } else {
          setError(errorData.message || 'Failed to load document pages');
        }
      }
    } catch (err) {
      console.error('❌ Error loading pages:', err);
      setError('Failed to load document');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100 dark:bg-slate-900">
        <div className="text-center max-w-md mx-auto px-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-300">Loading document...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 dark:bg-slate-900">
        <div className="max-w-2xl mx-auto px-4 space-y-6">
          <div className="text-center">
            <div className="text-red-600 dark:text-red-400 text-6xl mb-4">⚠️</div>
            <h2 className="text-2xl font-bold mb-2 text-gray-900 dark:text-white">
              Error Loading Document
            </h2>
            <p className="text-gray-600 dark:text-gray-300 mb-4">
              {error}
            </p>
            <div className="flex gap-2 justify-center flex-wrap mb-4">
              <Button onClick={() => loadDocumentPages()} variant="secondary">
                Try Again
              </Button>
              <Link href="/member/my-jstudyroom">
                <Button>Back to My jstudyroom</Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (pages.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 dark:bg-slate-900">
        <div className="max-w-2xl mx-auto px-4 space-y-6">
          <div className="text-center">
            <div className="text-orange-600 dark:text-orange-400 text-6xl mb-4">⚠️</div>
            <h2 className="text-2xl font-bold mb-2 text-gray-900 dark:text-white">
              Document Not Available
            </h2>
            <p className="text-gray-600 dark:text-gray-300 mb-4">
              This document has not been processed yet or is not available for viewing. 
              Please contact support if this issue persists.
            </p>
            <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4 mb-4">
              <p className="text-sm text-yellow-800 dark:text-yellow-200">
                <strong>Document:</strong> {documentData.title}<br/>
                <strong>Status:</strong> No pages available for viewing
              </p>
            </div>
            <div className="flex gap-2 justify-center flex-wrap mb-4">
              <Button onClick={() => loadDocumentPages()} variant="secondary">
                Try Again
              </Button>
              <Link href="/member/my-jstudyroom">
                <Button>Back to My jstudyroom</Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-gray-900 flex flex-col z-50">
      {/* Simple Toolbar */}
      <div className="bg-gray-800 border-b border-gray-700 px-4 py-2 flex items-center justify-between flex-shrink-0">
        <h1 className="text-white font-medium truncate max-w-md" title={`${bookShopTitle} - ${documentData.title}`}>
          {bookShopTitle} - {documentData.title}
        </h1>
        <div className="flex items-center gap-4">
          <span className="text-gray-300 text-sm">
            {pages.length} pages
          </span>
          <Link href="/member/my-jstudyroom">
            <button className="text-white hover:text-gray-300 px-3 py-1 rounded bg-gray-700 hover:bg-gray-600">
              ✕ Close
            </button>
          </Link>
        </div>
      </div>

      {/* Document Pages */}
      <div className="flex-1 overflow-auto bg-gray-800 p-4">
        <div className="max-w-4xl mx-auto space-y-4">
          {pages.map((page, index) => (
            <div key={page.id || index} className="relative bg-white rounded-lg shadow-lg overflow-hidden">
              <div className="relative">
                {page.pageUrl && page.imageUrl ? (
                  <img
                    src={page.pageUrl || page.imageUrl}
                    alt={`Page ${page.pageNumber || index + 1}`}
                    className="w-full h-auto"
                    style={{ maxWidth: '100%', height: 'auto' }}
                    onError={(e) => {
                      console.error('Image load error for page:', page.pageNumber);
                      e.currentTarget.style.display = 'none';
                    }}
                  />
                ) : (
                  <div className="w-full h-96 bg-gray-200 flex items-center justify-center">
                    <div className="text-center text-gray-500">
                      <div className="text-4xl mb-2">⚠️</div>
                      <p>Page {page.pageNumber || index + 1} failed to load</p>
                      <button 
                        onClick={() => loadDocumentPages()}
                        className="mt-2 px-3 py-1 bg-blue-500 text-white rounded text-sm hover:bg-blue-600"
                      >
                        Retry
                      </button>
                    </div>
                  </div>
                )}
                
                {/* Watermark overlay - only show if page loaded successfully */}
                {page.pageUrl && page.imageUrl && (
                  <div
                    className="absolute inset-0 pointer-events-none flex items-center justify-center"
                    style={{
                      background: `repeating-linear-gradient(
                        45deg,
                        transparent,
                        transparent 150px,
                        rgba(0, 0, 0, 0.02) 150px,
                        rgba(0, 0, 0, 0.02) 300px
                      )`,
                    }}
                  >
                    <div
                      className="text-gray-400 font-bold transform rotate-45 select-none"
                      style={{
                        fontSize: '32px',
                        opacity: 0.3,
                        textShadow: '1px 1px 2px rgba(0,0,0,0.1)',
                        userSelect: 'none',
                        pointerEvents: 'none',
                      }}
                    >
                      jStudyRoom - {memberName}
                    </div>
                  </div>
                )}
              </div>
              
              <div className="p-2 bg-gray-100 text-center text-sm text-gray-600">
                Page {page.pageNumber || index + 1}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}