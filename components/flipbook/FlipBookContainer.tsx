'use client';

import { useFlipbook } from '@/hooks/useFlipbook';
import { FlipBookViewer } from './FlipBookViewer';
import { FlipBookLoading } from './FlipBookLoading';
import { FlipBookError } from './FlipBookError';

interface FlipBookContainerProps {
  documentId: string;
  watermarkText?: string;
  userEmail: string;
  allowTextSelection?: boolean;
  onPageChange?: (page: number) => void;
  className?: string;
}

export function FlipBookContainer({
  documentId,
  watermarkText,
  userEmail,
  allowTextSelection = false,
  onPageChange,
  className = '',
}: FlipBookContainerProps) {
  const { pages, isLoading, error, loadPages } = useFlipbook({
    documentId,
    onPageChange,
  });

  if (isLoading) {
    return <FlipBookLoading />;
  }

  if (error) {
    return <FlipBookError error={error} onRetry={loadPages} />;
  }

  if (pages.length === 0) {
    return (
      <FlipBookError 
        error="No pages found for this document" 
        onRetry={loadPages}
      />
    );
  }

  return (
    <FlipBookViewer
      documentId={documentId}
      pages={pages}
      watermarkText={watermarkText}
      userEmail={userEmail}
      allowTextSelection={allowTextSelection}
      onPageChange={onPageChange}
      className={className}
    />
  );
}
