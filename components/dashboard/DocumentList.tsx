'use client';

import { useState } from 'react';
import { DocumentCard } from './DocumentCard';
import { ShareLinkModal } from './ShareLinkModal';
import { useRouter } from 'next/navigation';

interface Document {
  id: string;
  title: string;
  filename: string;
  fileSize: bigint;
  createdAt: string;
}

interface DocumentListProps {
  documents: Document[];
  onDocumentsChange: () => void;
}

export const DocumentList: React.FC<DocumentListProps> = ({
  documents,
  onDocumentsChange,
}) => {
  const router = useRouter();
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState<{ id: string; title: string } | null>(null);

  const handleDelete = async (id: string) => {
    const response = await fetch(`/api/documents/${id}`, {
      method: 'DELETE',
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to delete document');
    }

    onDocumentsChange();
  };

  const handleShare = (id: string, title: string) => {
    setSelectedDocument({ id, title });
    setShareModalOpen(true);
  };

  const handleCloseShareModal = () => {
    setShareModalOpen(false);
    setSelectedDocument(null);
  };

  const handleViewAnalytics = (id: string) => {
    router.push(`/dashboard/documents/${id}`);
  };

  if (documents.length === 0) {
    return (
      <div className="text-center py-12">
        <svg
          className="mx-auto h-12 w-12 text-gray-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
          />
        </svg>
        <h3 className="mt-2 text-sm font-medium text-gray-900">No documents</h3>
        <p className="mt-1 text-sm text-gray-500">
          Get started by uploading your first PDF document.
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {documents.map((document) => (
          <DocumentCard
            key={document.id}
            document={document}
            onDelete={handleDelete}
            onShare={handleShare}
            onViewAnalytics={handleViewAnalytics}
          />
        ))}
      </div>

      {/* Share Link Modal */}
      {selectedDocument && (
        <ShareLinkModal
          isOpen={shareModalOpen}
          onClose={handleCloseShareModal}
          documentId={selectedDocument.id}
          documentTitle={selectedDocument.title}
        />
      )}
    </>
  );
};
