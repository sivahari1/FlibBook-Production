/**
 * Example usage of EnhancedUploadModal component
 * 
 * This file demonstrates how to integrate the EnhancedUploadModal
 * into your application with proper upload handling.
 */

'use client';

import React, { useState } from 'react';
import { EnhancedUploadModal } from './EnhancedUploadModal';
import { UploadData } from '@/lib/types/content';
import type { UserRole } from '@/lib/rbac/admin-privileges';

export function EnhancedUploadModalExample() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // Example: Get user role from session
  const userRole: UserRole = 'ADMIN'; // or 'PLATFORM_USER', 'MEMBER'

  /**
   * Handle upload submission
   * This function should send the upload data to your API endpoint
   */
  const handleUpload = async (data: UploadData) => {
    console.log('Upload data:', data);

    // Prepare FormData for API request
    const formData = new FormData();
    formData.append('contentType', data.contentType);
    formData.append('title', data.title);
    
    if (data.description) {
      formData.append('description', data.description);
    }

    // Add file or link URL
    if (data.file) {
      formData.append('file', data.file);
    } else if (data.linkUrl) {
      formData.append('linkUrl', data.linkUrl);
    }

    // Add BookShop data if applicable
    if (data.uploadToBookShop && data.bookShopData) {
      formData.append('uploadToBookShop', 'true');
      formData.append('bookShopData', JSON.stringify(data.bookShopData));
    }

    // Send to upload API
    const response = await fetch('/api/documents/upload', {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Upload failed');
    }

    const result = await response.json();
    console.log('Upload successful:', result);

    // Refresh your document list or perform other actions
    // refreshDocuments();
  };

  return (
    <div>
      {/* Trigger Button */}
      <button
        onClick={() => setIsModalOpen(true)}
        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
      >
        Upload Content
      </button>

      {/* Enhanced Upload Modal */}
      <EnhancedUploadModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onUpload={handleUpload}
        userRole={userRole}
        showBookShopOption={true} // Set to true for admins
      />
    </div>
  );
}

/**
 * Example with session integration
 */
export function EnhancedUploadModalWithSession() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // Example: Get user from session (using next-auth)
  // const { data: session } = useSession();
  // const userRole = session?.user?.userRole as UserRole || 'PLATFORM_USER';
  const userRole: UserRole = 'ADMIN';

  const handleUpload = async (data: UploadData) => {
    try {
      const formData = new FormData();
      formData.append('contentType', data.contentType);
      formData.append('title', data.title);
      
      if (data.description) {
        formData.append('description', data.description);
      }

      if (data.file) {
        formData.append('file', data.file);
      } else if (data.linkUrl) {
        formData.append('linkUrl', data.linkUrl);
      }

      if (data.uploadToBookShop && data.bookShopData) {
        formData.append('uploadToBookShop', 'true');
        formData.append('bookShopData', JSON.stringify(data.bookShopData));
      }

      const response = await fetch('/api/documents/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Upload failed');
      }

      const result = await response.json();
      
      // Show success notification
      console.log('Upload successful:', result);
      
      // Close modal
      setIsModalOpen(false);
      
      // Refresh data
      // await refreshDocuments();
    } catch (error) {
      console.error('Upload error:', error);
      throw error; // Re-throw to let modal handle the error display
    }
  };

  return (
    <div>
      <button
        onClick={() => setIsModalOpen(true)}
        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
      >
        Upload Content
      </button>

      <EnhancedUploadModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onUpload={handleUpload}
        userRole={userRole}
        showBookShopOption={userRole === 'ADMIN'}
      />
    </div>
  );
}

/**
 * Example integration in Dashboard
 */
export function DashboardWithEnhancedUpload() {
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [documents, setDocuments] = useState([]);
  
  // Get user role from session
  const userRole: UserRole = 'ADMIN';

  const handleUpload = async (data: UploadData) => {
    const formData = new FormData();
    formData.append('contentType', data.contentType);
    formData.append('title', data.title);
    
    if (data.description) {
      formData.append('description', data.description);
    }

    if (data.file) {
      formData.append('file', data.file);
    } else if (data.linkUrl) {
      formData.append('linkUrl', data.linkUrl);
    }

    if (data.uploadToBookShop && data.bookShopData) {
      formData.append('uploadToBookShop', 'true');
      formData.append('bookShopData', JSON.stringify(data.bookShopData));
    }

    const response = await fetch('/api/documents/upload', {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Upload failed');
    }

    const result = await response.json();
    
    // Refresh documents list
    await fetchDocuments();
    
    return result;
  };

  const fetchDocuments = async () => {
    const response = await fetch('/api/documents');
    const data = await response.json();
    setDocuments(data.documents || []);
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">My Documents</h1>
        <button
          onClick={() => setIsUploadModalOpen(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          Upload Content
        </button>
      </div>

      {/* Document List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {documents.map((doc: any) => (
          <div key={doc.id} className="border rounded-lg p-4">
            <h3 className="font-medium">{doc.title}</h3>
            <p className="text-sm text-gray-500">{doc.contentType}</p>
          </div>
        ))}
      </div>

      {/* Enhanced Upload Modal */}
      <EnhancedUploadModal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        onUpload={handleUpload}
        userRole={userRole}
        showBookShopOption={userRole === 'ADMIN'}
      />
    </div>
  );
}
