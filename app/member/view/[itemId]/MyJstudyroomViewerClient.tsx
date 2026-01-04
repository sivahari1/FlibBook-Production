'use client';

import React from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { MyJstudyroomViewerClient as UnifiedViewer } from '@/components/viewers/MyJstudyroomViewerClient';

interface DocumentData {
  id: string;
  title: string;
  filename: string;
  contentType: string;
  storagePath: string;
  linkUrl: string | null;
  thumbnailUrl: string | null;
  metadata: any;
  fileSize: number | null;
  mimeType: string;
  createdAt: string;
  updatedAt: string;
  userId: string;
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
  return (
    <div className="w-full min-h-[calc(100vh-120px)]">
      {/* Header */}
      <div className="w-full flex flex-col gap-3 md:flex-row md:items-center md:justify-between mb-4">
        <div className="min-w-0">
          <h1 className="text-xl font-semibold truncate">{documentData.title}</h1>
          <p className="text-sm text-gray-500 truncate">
            {bookShopTitle ? `From: ${bookShopTitle}` : 'My StudyRoom'} • {memberName}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Link href="/member/my-jstudyroom">
            <Button variant="secondary">Back</Button>
          </Link>
        </div>
      </div>

      {/* Unified Viewer */}
      <div className="w-full" style={{ height: 'calc(100vh - 180px)', minHeight: '600px' }}>
        <UnifiedViewer 
          documentId={documentData.id} 
          title={documentData.title}
        />
      </div>
    </div>
  );
}