'use client';

import { MyJstudyroomViewerClient } from '@/components/viewers/MyJstudyroomViewerClient';

interface PreviewViewerClientProps {
  documentId: string;
}

/**
 * PreviewViewerClient - Phase 1 Implementation
 * 
 * Simple viewer that uses the unified access API and iframe-based viewing
 * Supports PDF, EPUB, and LINK content types with original file viewing
 */
export default function PreviewViewerClient({ documentId }: PreviewViewerClientProps) {
  return (
    <div className="h-screen">
      <MyJstudyroomViewerClient documentId={documentId} />
    </div>
  );
}
