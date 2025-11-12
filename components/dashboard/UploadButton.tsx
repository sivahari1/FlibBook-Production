'use client';

import { Button } from '@/components/ui/Button';
import { UploadModal } from './UploadModal';
import { useState } from 'react';

interface UploadButtonProps {
  onUploadSuccess: () => void;
}

export const UploadButton: React.FC<UploadButtonProps> = ({ onUploadSuccess }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <>
      <Button
        variant="primary"
        onClick={() => setIsModalOpen(true)}
      >
        <svg
          className="w-5 h-5 mr-2"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 4v16m8-8H4"
          />
        </svg>
        Upload Document
      </Button>

      <UploadModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onUploadSuccess={onUploadSuccess}
      />
    </>
  );
};
