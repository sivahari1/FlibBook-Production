'use client';

import React from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { MyJstudyroomViewerClient as UnifiedViewer } from '@/components/viewers/MyJstudyroomViewerClient';

interface MyJstudyroomViewerClientProps {
  document: any;
  bookShopTitle: string;
  memberName: string;
  originalItemId: string;
  resolvedDocumentId: string;
}

export function MyJstudyroomViewerClient({
  document: documentData,
  bookShopTitle,
  memberName,
  originalItemId,
  resolvedDocumentId,
}: MyJstudyroomViewerClientProps) {
  return (
    <div className="w-full">
      {/* Header */}
      <div className="px-4 py-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-xl font-semibold truncate">{documentData.title}</h1>
            <p className="text-sm text-gray-500 truncate">
              {bookShopTitle ? `From: ${bookShopTitle}` : 'My StudyRoom'} • {memberName}
            </p>
            {originalItemId !== resolvedDocumentId && (
              <p className="text-xs text-blue-600 mt-1">
                Resolved: {originalItemId} → {resolvedDocumentId}
              </p>
            )}
          </div>

          <Link href="/member/my-jstudyroom">
            <Button variant="secondary">Back</Button>
          </Link>
        </div>
      </div>

      {/* Viewer - Always use the resolved documentId */}
      <div className="px-4 pb-4">
        <UnifiedViewer documentId={resolvedDocumentId} title={documentData.title} />
      </div>
    </div>
  );
}
