'use client';

import { Button } from '@/components/ui/Button';
import { EnhancedUploadModal } from './EnhancedUploadModal';
import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { UploadData } from '@/lib/types/content';
import type { UserRole } from '@/lib/rbac/admin-privileges';

interface UploadButtonProps {
  onUploadSuccess: () => void;
}

export const UploadButton: React.FC<UploadButtonProps> = ({ onUploadSuccess }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { data: session } = useSession();

  // Get user role from session, default to PLATFORM_USER
  const userRole = (session?.user?.userRole as UserRole) || 'PLATFORM_USER';
  
  // Show BookShop option for admins
  const showBookShopOption = userRole === 'ADMIN';

  /**
   * Handle upload using the enhanced upload API
   * Maintains backward compatibility for PDF uploads
   * Requirements: 9.1, 9.2
   */
  const handleUpload = async (data: UploadData) => {
    try {
      // Prepare form data for upload API
      const formData = new FormData();
      formData.append('contentType', data.contentType);
      formData.append('title', data.title);
      
      if (data.description) {
        formData.append('description', data.description);
      }

      // Add file or link URL based on content type
      if (data.file) {
        formData.append('file', data.file);
      } else if (data.linkUrl) {
        formData.append('linkUrl', data.linkUrl);
      }

      // Add BookShop data if applicable
      if (data.uploadToBookShop && data.bookShopData) {
        formData.append('uploadToBookShop', 'true');
        formData.append('bookShopCategory', data.bookShopData.category);
        formData.append('bookShopPrice', data.bookShopData.price.toString());
        formData.append('bookShopIsFree', data.bookShopData.isFree.toString());
        formData.append('bookShopIsPublished', data.bookShopData.isPublished.toString());
      }

      // Use the enhanced upload API endpoint
      const response = await fetch('/api/documents/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to upload content');
      }

      const result = await response.json();

      // Notify parent component of successful upload
      onUploadSuccess();

      return result;
    } catch (error) {
      console.error('Upload error:', error);
      throw error;
    }
  };

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
        Upload Content
      </Button>

      <EnhancedUploadModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onUpload={handleUpload}
        userRole={userRole}
        showBookShopOption={showBookShopOption}
      />
    </>
  );
};
