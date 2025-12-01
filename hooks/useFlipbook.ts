import { useState, useCallback, useEffect } from 'react';
import type { FlipbookPage, FlipbookConversion } from '@/lib/types/flipbook';

interface UseFlipbookOptions {
  documentId: string;
  onPageChange?: (page: number) => void;
}

interface UseFlipbookReturn {
  pages: FlipbookPage[];
  currentPage: number;
  totalPages: number;
  isLoading: boolean;
  error: string | null;
  loadPages: () => Promise<void>;
  goToPage: (page: number) => void;
}

export function useFlipbook({ documentId, onPageChange }: UseFlipbookOptions): UseFlipbookReturn {
  const [pages, setPages] = useState<FlipbookPage[]>([]);
  const [currentPage, setCurrentPage] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadPages = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch(`/api/documents/${documentId}/convert-flipbook`);
      
      if (!response.ok) {
        throw new Error('Failed to load flipbook pages');
      }

      const data: { success: boolean; data: FlipbookConversion } = await response.json();
      
      if (data.success && data.data.pages) {
        setPages(data.data.pages);
      } else {
        throw new Error('Invalid response format');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      console.error('Error loading flipbook pages:', err);
    } finally {
      setIsLoading(false);
    }
  }, [documentId]);

  const goToPage = useCallback((page: number) => {
    if (page >= 0 && page < pages.length) {
      setCurrentPage(page);
      onPageChange?.(page);
    }
  }, [pages.length, onPageChange]);

  useEffect(() => {
    if (documentId) {
      loadPages();
    }
  }, [documentId, loadPages]);

  return {
    pages,
    currentPage,
    totalPages: pages.length,
    isLoading,
    error,
    loadPages,
    goToPage,
  };
}
