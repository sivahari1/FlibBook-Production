'use client';

import React, { useState, useCallback } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { ContentTypeSelector } from '@/components/upload/ContentTypeSelector';
import { FileUploader } from '@/components/upload/FileUploader';
import { LinkUploader } from '@/components/upload/LinkUploader';
import { ContentType, UploadData, BookShopItemData, LinkMetadata } from '@/lib/types/content';
import { getAllowedContentTypes, canUploadToBookShop } from '@/lib/rbac/admin-privileges';
import type { UserRole } from '@/lib/rbac/admin-privileges';

/**
 * Enhanced Upload Modal Component
 * Supports multi-content type uploads (PDF, Image, Video, Link)
 * Integrates ContentTypeSelector, FileUploader, and LinkUploader
 * Provides BookShop upload option for admins
 * Requirements: 9.1, 9.2, 9.4, 9.5, 11.1
 */

interface EnhancedUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpload: (data: UploadData) => Promise<void>;
  userRole: UserRole;
  showBookShopOption?: boolean;
}

export const EnhancedUploadModal: React.FC<EnhancedUploadModalProps> = ({
  isOpen,
  onClose,
  onUpload,
  userRole,
  showBookShopOption = false,
}) => {
  // Content type selection
  const [selectedType, setSelectedType] = useState<ContentType>(ContentType.PDF);
  const allowedTypes = getAllowedContentTypes(userRole);

  // Common fields
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');

  // File upload state
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  // Link upload state
  const [linkUrl, setLinkUrl] = useState('');
  const [linkMetadata, setLinkMetadata] = useState<LinkMetadata | null>(null);

  // BookShop options
  const [uploadToBookShop, setUploadToBookShop] = useState(false);
  const [bookShopCategory, setBookShopCategory] = useState('');
  const [bookShopPrice, setBookShopPrice] = useState('0');
  const [bookShopIsFree, setBookShopIsFree] = useState(true);
  const [bookShopIsPublished, setBookShopIsPublished] = useState(true);

  // UI state
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Check if user can upload to BookShop
  const canUploadBookShop = canUploadToBookShop(userRole);

  // Reset form
  const resetForm = useCallback(() => {
    setSelectedType(ContentType.PDF);
    setTitle('');
    setDescription('');
    setSelectedFile(null);
    setLinkUrl('');
    setLinkMetadata(null);
    setUploadToBookShop(false);
    setBookShopCategory('');
    setBookShopPrice('0');
    setBookShopIsFree(true);
    setBookShopIsPublished(true);
    setError('');
    setSuccessMessage('');
    setUploadProgress(0);
  }, []);

  // Handle content type change
  const handleTypeChange = useCallback((type: ContentType) => {
    setSelectedType(type);
    setSelectedFile(null);
    setLinkUrl('');
    setLinkMetadata(null);
    setError('');
  }, []);

  // Handle file selection
  const handleFileSelect = useCallback((file: File) => {
    setSelectedFile(file);
    setError('');
    
    // Auto-fill title from filename if not set
    if (!title && file.name) {
      const filename = file.name.replace(/\.[^/.]+$/, ''); // Remove extension
      setTitle(filename);
    }
  }, [title]);

  // Handle file removal
  const handleFileRemove = useCallback(() => {
    setSelectedFile(null);
  }, []);

  // Handle link submission from LinkUploader
  const handleLinkSubmit = useCallback((url: string, linkTitle: string, linkDescription?: string) => {
    setLinkUrl(url);
    setTitle(linkTitle);
    if (linkDescription) {
      setDescription(linkDescription);
    }
    setError('');
  }, []);

  // Handle link metadata fetch
  const handleMetadataFetch = useCallback((metadata: LinkMetadata) => {
    setLinkMetadata(metadata);
  }, []);

  // Validate form
  const validateForm = (): boolean => {
    if (!title.trim()) {
      setError('Please enter a title');
      return false;
    }

    if (selectedType === ContentType.LINK) {
      if (!linkUrl.trim()) {
        setError('Please enter a URL');
        return false;
      }
    } else {
      if (!selectedFile) {
        setError('Please select a file');
        return false;
      }
    }

    if (uploadToBookShop) {
      if (!bookShopCategory.trim()) {
        setError('Please enter a category for BookShop');
        return false;
      }
      if (!bookShopIsFree) {
        const price = parseFloat(bookShopPrice);
        if (isNaN(price) || price < 0) {
          setError('Please enter a valid price');
          return false;
        }
      }
    }

    return true;
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsUploading(true);
    setError('');
    setSuccessMessage('');
    setUploadProgress(0);

    try {
      // Prepare upload data
      const uploadData: UploadData = {
        contentType: selectedType,
        title: title.trim(),
        description: description.trim() || undefined,
      };

      // Add file or link URL
      if (selectedType === ContentType.LINK) {
        uploadData.linkUrl = linkUrl;
      } else {
        uploadData.file = selectedFile!;
      }

      // Add BookShop data if applicable
      if (uploadToBookShop && canUploadBookShop) {
        const bookShopData: BookShopItemData = {
          title: title.trim(),
          description: description.trim() || undefined,
          contentType: selectedType,
          category: bookShopCategory.trim(),
          price: bookShopIsFree ? 0 : parseFloat(bookShopPrice),
          isFree: bookShopIsFree,
          isPublished: bookShopIsPublished,
        };

        if (selectedType === ContentType.LINK) {
          bookShopData.linkUrl = linkUrl;
        } else {
          bookShopData.file = selectedFile!;
        }

        uploadData.uploadToBookShop = true;
        uploadData.bookShopData = bookShopData;
      }

      // Simulate progress (actual progress would come from upload API)
      setUploadProgress(30);

      // Call upload handler
      await onUpload(uploadData);

      setUploadProgress(100);
      
      // Show success message with content details
      // Requirement 9.5: Display success confirmation with content details
      setSuccessMessage(
        `Successfully uploaded ${selectedType.toLowerCase()}: "${title}"`
      );

      // Reset form after short delay
      setTimeout(() => {
        resetForm();
        onClose();
      }, 1500);
    } catch (err) {
      console.error('Upload error:', err);
      setError(
        err instanceof Error ? err.message : 'Failed to upload content. Please try again.'
      );
      setUploadProgress(0);
    } finally {
      setIsUploading(false);
    }
  };

  // Handle modal close
  const handleClose = () => {
    if (!isUploading) {
      resetForm();
      onClose();
    }
  };

  // Handle price type change
  const handlePriceTypeChange = (isFree: boolean) => {
    setBookShopIsFree(isFree);
    if (isFree) {
      setBookShopPrice('0');
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Upload Content"
      size="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Content Type Selector */}
        {/* Requirement 9.1: Display options for PDF, Image, Video, and Link */}
        <ContentTypeSelector
          selectedType={selectedType}
          onTypeChange={handleTypeChange}
          allowedTypes={allowedTypes}
          disabled={isUploading}
        />

        {/* File Uploader for PDF, Image, Video */}
        {/* Requirement 9.2: Show appropriate input fields based on content type */}
        {selectedType !== ContentType.LINK && (
          <FileUploader
            contentType={selectedType}
            onFileSelect={handleFileSelect}
            selectedFile={selectedFile}
            onFileRemove={handleFileRemove}
            disabled={isUploading}
          />
        )}

        {/* Link Uploader for URLs */}
        {/* Requirement 9.2: Show appropriate input fields for links */}
        {selectedType === ContentType.LINK && (
          <LinkUploader
            onLinkSubmit={handleLinkSubmit}
            onMetadataFetch={handleMetadataFetch}
            disabled={isUploading}
          />
        )}

        {/* Title Input (for non-link types or if link hasn't auto-filled) */}
        {selectedType !== ContentType.LINK && (
          <Input
            label="Title"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Enter a title"
            disabled={isUploading}
            required
          />
        )}

        {/* Description Input */}
        <div className="space-y-2">
          <label
            htmlFor="description"
            className="block text-sm font-medium text-gray-700 dark:text-gray-300"
          >
            Description <span className="text-gray-400">(Optional)</span>
          </label>
          <textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Enter a description"
            disabled={isUploading}
            rows={3}
            className="
              w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg
              bg-white dark:bg-gray-800
              text-gray-900 dark:text-gray-100
              placeholder-gray-400 dark:placeholder-gray-500
              focus:outline-none focus:ring-2 focus:ring-blue-500
              disabled:opacity-50 disabled:cursor-not-allowed
              resize-none
            "
          />
        </div>

        {/* BookShop Upload Option */}
        {/* Requirement 11.1: Provide option to upload to BookShop for admins */}
        {canUploadBookShop && showBookShopOption && (
          <div className="border-t border-gray-200 dark:border-gray-700 pt-6 space-y-4">
            <div className="flex items-center">
              <input
                id="upload-to-bookshop"
                type="checkbox"
                checked={uploadToBookShop}
                onChange={(e) => setUploadToBookShop(e.target.checked)}
                disabled={isUploading}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label
                htmlFor="upload-to-bookshop"
                className="ml-2 block text-sm font-medium text-gray-700 dark:text-gray-300"
              >
                Upload to BookShop
              </label>
            </div>

            {uploadToBookShop && (
              <div className="ml-6 space-y-4 bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
                {/* Category */}
                <Input
                  label="Category"
                  type="text"
                  value={bookShopCategory}
                  onChange={(e) => setBookShopCategory(e.target.value)}
                  placeholder="e.g., Mathematics, Science, Literature"
                  disabled={isUploading}
                  required={uploadToBookShop}
                />

                {/* Pricing */}
                <div className="space-y-3">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Pricing
                  </label>
                  <div className="flex items-center space-x-4">
                    <label className="flex items-center">
                      <input
                        type="radio"
                        checked={bookShopIsFree}
                        onChange={() => handlePriceTypeChange(true)}
                        disabled={isUploading}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                      />
                      <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                        Free
                      </span>
                    </label>
                    <label className="flex items-center">
                      <input
                        type="radio"
                        checked={!bookShopIsFree}
                        onChange={() => handlePriceTypeChange(false)}
                        disabled={isUploading}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                      />
                      <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                        Paid
                      </span>
                    </label>
                  </div>

                  {!bookShopIsFree && (
                    <Input
                      label="Price (₹)"
                      type="number"
                      value={bookShopPrice}
                      onChange={(e) => setBookShopPrice(e.target.value)}
                      placeholder="0.00"
                      min="0"
                      step="0.01"
                      disabled={isUploading}
                      required={!bookShopIsFree}
                    />
                  )}
                </div>

                {/* Visibility */}
                <div className="space-y-3">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Visibility
                  </label>
                  <div className="flex items-center space-x-4">
                    <label className="flex items-center">
                      <input
                        type="radio"
                        checked={bookShopIsPublished}
                        onChange={() => setBookShopIsPublished(true)}
                        disabled={isUploading}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                      />
                      <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                        Published
                      </span>
                    </label>
                    <label className="flex items-center">
                      <input
                        type="radio"
                        checked={!bookShopIsPublished}
                        onChange={() => setBookShopIsPublished(false)}
                        disabled={isUploading}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                      />
                      <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                        Draft
                      </span>
                    </label>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Upload Progress */}
        {/* Requirement 9.4: Show upload progress */}
        {isUploading && uploadProgress > 0 && (
          <div className="space-y-2">
            <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400">
              <span>Uploading...</span>
              <span>{uploadProgress}%</span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
          </div>
        )}

        {/* Success Message */}
        {/* Requirement 9.5: Display success confirmation with content details */}
        {successMessage && (
          <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
            <div className="flex items-start">
              <svg
                className="w-5 h-5 text-green-400 mt-0.5 mr-3 flex-shrink-0"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                  clipRule="evenodd"
                />
              </svg>
              <p className="text-sm text-green-600 dark:text-green-400">
                {successMessage}
              </p>
            </div>
          </div>
        )}

        {/* Error Message */}
        {/* Requirement 9.4: Show error messages */}
        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
            <div className="flex items-start">
              <svg
                className="w-5 h-5 text-red-400 mt-0.5 mr-3 flex-shrink-0"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                  clipRule="evenodd"
                />
              </svg>
              <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200 dark:border-gray-700">
          <Button
            type="button"
            variant="secondary"
            onClick={handleClose}
            disabled={isUploading}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            disabled={isUploading || !title.trim() || (selectedType !== ContentType.LINK && !selectedFile) || (selectedType === ContentType.LINK && !linkUrl)}
            isLoading={isUploading}
          >
            {isUploading ? 'Uploading...' : 'Upload'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
