/**
 * Page Annotations Hook
 * Manages loading and caching of annotations per page
 */
import { useState, useEffect, useCallback, useRef } from 'react';
import type { DocumentAnnotation } from '@/lib/types/annotations';

interface UsePageAnnotationsOptions {
  documentId: string;
  currentPage: number;
  preloadNextPage?: boolean;
}

interface PageAnnotationsCache {
  [pageNumber: number]: {
    annotations: DocumentAnnotation[];
    timestamp: number;
  };
}

export function usePageAnnotations({
  documentId,
  currentPage,
  preloadNextPage = true
}: UsePageAnnotationsOptions) {
  const [annotations, setAnnotations] = useState<DocumentAnnotation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const cacheRef = useRef<PageAnnotationsCache>({});
  const loadingPagesRef = useRef<Set<number>>(new Set());

  const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  const fetchPageAnnotations = useCallback(async (pageNumber: number): Promise<DocumentAnnotation[]> => {
    // Check cache first
    const cached = cacheRef.current[pageNumber];
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      return cached.annotations;
    }

    // Prevent duplicate requests
    if (loadingPagesRef.current.has(pageNumber)) {
      // Wait for existing request to complete
      return new Promise((resolve) => {
        const checkInterval = setInterval(() => {
          const nowCached = cacheRef.current[pageNumber];
          if (nowCached || !loadingPagesRef.current.has(pageNumber)) {
            clearInterval(checkInterval);
            resolve(nowCached?.annotations || []);
          }
        }, 50);
        
        // Timeout after 2 seconds
        setTimeout(() => {
          clearInterval(checkInterval);
          resolve([]);
        }, 2000);
      });
    }

    loadingPagesRef.current.add(pageNumber);

    try {
      const params = new URLSearchParams({
        documentId,
        pageNumber: pageNumber.toString(),
        limit: '50' // Limit results per page
      });

      const startTime = Date.now();
      const response = await fetch(`/api/annotations?${params}`, {
        // Enable browser caching
        cache: 'default',
        // Add headers for conditional requests
        headers: {
          'Accept': 'application/json',
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch annotations');
      }

      const data = await response.json();
      const pageAnnotations = data.annotations || [];
      const loadTime = Date.now() - startTime;

      // Log slow loads
      if (loadTime > 1000) {
        console.warn(`Slow annotation load: ${loadTime}ms for page ${pageNumber}`);
      }

      // Update cache
      cacheRef.current[pageNumber] = {
        annotations: pageAnnotations,
        timestamp: Date.now()
      };

      return pageAnnotations;
    } catch (err) {
      console.error(`Error fetching annotations for page ${pageNumber}:`, err);
      return [];
    } finally {
      loadingPagesRef.current.delete(pageNumber);
    }
  }, [documentId, CACHE_DURATION]);

  const loadCurrentPage = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const pageAnnotations = await fetchPageAnnotations(currentPage);
      setAnnotations(pageAnnotations);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load annotations');
    } finally {
      setLoading(false);
    }
  }, [currentPage, fetchPageAnnotations]);

  const preloadNextPageAnnotations = useCallback(async () => {
    if (preloadNextPage) {
      // Preload in background without blocking
      fetchPageAnnotations(currentPage + 1).catch(() => {
        // Silently fail for preloading
      });
    }
  }, [currentPage, preloadNextPage, fetchPageAnnotations]);

  const clearCache = useCallback(() => {
    cacheRef.current = {};
  }, []);

  const refreshCurrentPage = useCallback(() => {
    // Clear cache for current page and reload
    delete cacheRef.current[currentPage];
    loadCurrentPage();
  }, [currentPage, loadCurrentPage]);

  // Load annotations when page changes
  useEffect(() => {
    loadCurrentPage();
  }, [loadCurrentPage]);

  // Preload next page
  useEffect(() => {
    if (!loading && annotations.length >= 0) {
      preloadNextPageAnnotations();
    }
  }, [loading, annotations.length, preloadNextPageAnnotations]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      loadingPagesRef.current.clear();
    };
  }, []);

  return {
    annotations,
    loading,
    error,
    refreshCurrentPage,
    clearCache
  };
}
