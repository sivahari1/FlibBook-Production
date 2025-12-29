'use client';

import React, { useState, useEffect, useRef } from 'react';
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
  // ✅ Client-safe (JSON) types:
  fileSize: number | null;
  mimeType: string;
  createdAt: string;
  updatedAt: string;
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

  // 🔍 PDF Search state (Phase 2)
  const [searchQuery, setSearchQuery] = useState('');
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [searchResultCount, setSearchResultCount] = useState<number | null>(null);
  const [searchItems, setSearchItems] = useState<Array<{ index: number; snippet: string }>>([]);

  // ✅ Missing in your code: Abort controller ref
  const searchAbortRef = useRef<AbortController | null>(null);

  // ✅ Abort in-flight search on unmount
  useEffect(() => {
    return () => {
      if (searchAbortRef.current) searchAbortRef.current.abort();
    };
  }, []);

  useEffect(() => {
    loadDocumentPages();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [documentData.id]);

  const loadDocumentPages = async () => {
    try {
      setLoading(true);
      setError(null);

      console.log(`🔍 Loading pages for document ${documentData.id} using member-safe API`);

      const response = await fetch(`/api/viewer/documents/${documentData.id}/pages`, {
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!response.ok) {
        console.error('❌ Member-safe API failed:', response.status);

        let errorData: any = {};
        try {
          errorData = await response.json();
        } catch {
          // ignore
        }

        if (response.status === 401) setError('You do not have access to view this document');
        else if (response.status === 403) setError('Access denied - you do not have permission to view this document');
        else if (response.status === 404) setError('Document not found');
        else if (response.status === 409)
          setError(errorData.message || 'Document pages are being generated. Please try again in a moment.');
        else setError(errorData.message || 'Failed to load document pages');

        setPages([]);
        return;
      }

      const data = await response.json();
      const rawPages = Array.isArray(data?.pages) ? data.pages : [];

      if (rawPages.length === 0) {
        console.warn('⚠️ Document has no pages - this document may not be properly converted');
        setPages([]);
        return;
      }

      const normalized = rawPages
        .map((p: any) => ({ pageNumber: Number(p.pageNumber) }))
        .filter((p: any) => Number.isInteger(p.pageNumber) && p.pageNumber > 0)
        .sort((a: any, b: any) => a.pageNumber - b.pageNumber);

      const seen = new Set<number>();
      const unique = normalized.filter((p: any) => {
        if (seen.has(p.pageNumber)) return false;
        seen.add(p.pageNumber);
        return true;
      });

      console.log(`✅ Member-safe API returned ${rawPages.length} rows; rendering ${unique.length} unique pages`);

      const pagesWithProxyUrls: PageData[] = unique.map((p: any) => {
        const proxyUrl = `/api/member/my-jstudyroom/viewer/items/${itemId}/pages/${p.pageNumber}/image`;
        return {
          id: `page-${p.pageNumber}`,
          pageNumber: p.pageNumber,
          imageUrl: proxyUrl,
          pageUrl: proxyUrl,
        };
      });

      setPages(pagesWithProxyUrls);
      console.log(`✅ Loaded ${pagesWithProxyUrls.length} pages with proxy URLs`);
    } catch (err) {
      console.error('❌ Error loading pages:', err);
      setError('Failed to load document');
      setPages([]);
    } finally {
      setLoading(false);
    }
  };

  // 🔍 Run PDF text search
  const runSearch = async () => {
    const q = searchQuery.trim();

    if (!q) {
      setSearchResultCount(null);
      setSearchItems([]);
      setSearchError(null);
      return;
    }

    // Cancel previous request
    if (searchAbortRef.current) {
      searchAbortRef.current.abort();
    }
    const controller = new AbortController();
    searchAbortRef.current = controller;

    try {
      setSearchLoading(true);
      setSearchError(null);

      const res = await fetch('/api/search/pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        signal: controller.signal,
        body: JSON.stringify({ itemId, query: q }),
      });

      // ✅ Prevent "Unexpected token '<'" by ensuring JSON
      const contentType = res.headers.get('content-type') || '';
      if (!contentType.includes('application/json')) {
        const text = await res.text().catch(() => '');
        console.error('Search API returned non-JSON:', res.status, text.slice(0, 200));
        setSearchError('Search API failed. Please check server logs.');
        setSearchResultCount(null);
        setSearchItems([]);
        return;
      }

      const data = await res.json();

      if (!res.ok) {
        setSearchError(data?.error || 'Search failed');
        setSearchResultCount(null);
        setSearchItems([]);
        return;
      }

      setSearchResultCount(Number(data?.matches ?? 0));
      setSearchItems(Array.isArray(data?.items) ? data.items : []);
    } catch (e: any) {
      if (e?.name === 'AbortError') return;
      console.error('Search failed:', e);
      setSearchError('Search failed');
      setSearchResultCount(null);
      setSearchItems([]);
    } finally {
      setSearchLoading(false);
    }
  };

  const onSearchKeyDown: React.KeyboardEventHandler<HTMLInputElement> = (e) => {
    if (e.key === 'Enter') runSearch();
    if (e.key === 'Escape') {
      setSearchQuery('');
      setSearchResultCount(null);
      setSearchItems([]);
      setSearchError(null);
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
            <h2 className="text-2xl font-bold mb-2 text-gray-900 dark:text-white">Error Loading Document</h2>
            <p className="text-gray-600 dark:text-gray-300 mb-4">{error}</p>

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
            <h2 className="text-2xl font-bold mb-2 text-gray-900 dark:text-white">Document Not Available</h2>
            <p className="text-gray-600 dark:text-gray-300 mb-4">
              This document has not been processed yet or is not available for viewing. Please contact support if this
              issue persists.
            </p>

            <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4 mb-4">
              <p className="text-sm text-yellow-800 dark:text-yellow-200">
                <strong>Document:</strong> {documentData.title}
                <br />
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
      {/* Toolbar */}
      <div className="bg-gray-800 border-b border-gray-700 px-4 py-2 flex items-center justify-between flex-shrink-0">
        <h1 className="text-white font-medium truncate max-w-md" title={`${bookShopTitle} - ${documentData.title}`}>
          {bookShopTitle} - {documentData.title}
        </h1>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={onSearchKeyDown}
              placeholder="Search in PDF..."
              className="w-64 px-3 py-1.5 rounded bg-gray-700 text-white placeholder-gray-300 outline-none border border-gray-600 focus:border-gray-400"
            />
            <button
              onClick={runSearch}
              disabled={searchLoading}
              className="px-3 py-1.5 rounded bg-blue-600 text-white hover:bg-blue-500 disabled:opacity-60"
            >
              {searchLoading ? 'Searching...' : 'Search'}
            </button>
          </div>

          <div className="text-xs text-gray-200 min-w-[160px]">
            {searchError ? (
              <span className="text-red-300">{searchError}</span>
            ) : searchResultCount === null ? (
              <span />
            ) : (
              <span>
                Found <b>{searchResultCount}</b> match{searchResultCount === 1 ? '' : 'es'}
              </span>
            )}
          </div>

          <span className="text-gray-300 text-sm">{pages.length} pages</span>

          <Link href="/member/my-jstudyroom">
            <button className="text-white hover:text-gray-300 px-3 py-1 rounded bg-gray-700 hover:bg-gray-600">
              ✕ Close
            </button>
          </Link>
        </div>
      </div>

      {/* Snippet list */}
      {searchItems.length > 0 && (
        <div className="bg-gray-900 border-b border-gray-700 px-4 py-2 text-sm text-gray-200">
          <div className="max-w-4xl mx-auto space-y-1">
            {searchItems.map((it, i) => (
              <div key={`${it.index}-${i}`} className="truncate">
                • {it.snippet}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Pages */}
      <div className="flex-1 overflow-auto bg-gray-800 p-4">
        <div className="max-w-4xl mx-auto space-y-4">
          {pages.map((page, index) => (
            <div key={page.id ?? `page-${index}`} className="relative bg-white rounded-lg shadow-lg overflow-hidden">
              <div className="relative">
                <img
                  src={page.pageUrl ?? page.imageUrl}
                  alt={`Page ${page.pageNumber || index + 1}`}
                  className="w-full h-auto"
                  style={{ maxWidth: '100%', height: 'auto' }}
                  loading="lazy"
                  onError={(e) => {
                    console.error('Image load error for page:', page.pageNumber, page.pageUrl ?? page.imageUrl);
                    e.currentTarget.style.display = 'none';
                  }}
                />

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
              </div>

              <div className="p-2 bg-gray-100 text-center text-sm text-gray-600">Page {page.pageNumber}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
