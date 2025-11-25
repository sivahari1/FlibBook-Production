'use client';

import React, { useState, useRef, useCallback } from 'react';
import { ContentType } from '@/lib/types/content';
import {
  validateFile,
  formatBytes,
  getAllowedFileTypes,
  getAllowedExtensions,
  getMaxFileSize,
} from '@/lib/file-validation';

/**
 * File Uploader Component
 * Handles file uploads for PDF, Image, and Video content types
 * Implements drag-and-drop, file preview, and upload progress
 * Requirements: 9.2
 */

interface FileUploaderProps {
  contentType: ContentType;
  onFileSelect: (file: File) => void;
  maxSize?: number;
  acceptedFormats?: string[];
  disabled?: boolean;
  selectedFile?: File | null;
  onFileRemove?: () => void;
}

export const FileUploader: React.FC<FileUploaderProps> = ({
  contentType,
  onFileSelect,
  maxSize,
  acceptedFormats,
  disabled = false,
  selectedFile = null,
  onFileRemove,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string>('');
  const [previewUrl, setPreviewUrl] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Get validation parameters
  const maxFileSize = maxSize || getMaxFileSize(contentType);
  const allowedTypes = acceptedFormats || getAllowedFileTypes(contentType);
  const allowedExtensions = getAllowedExtensions(contentType);

  // Generate preview for image files
  const generatePreview = useCallback((file: File) => {
    if (contentType === ContentType.IMAGE) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    } else if (contentType === ContentType.VIDEO) {
      // For videos, create an object URL for preview
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
    }
  }, [contentType]);

  // Clean up preview URL
  const cleanupPreview = useCallback(() => {
    if (previewUrl && contentType === ContentType.VIDEO) {
      URL.revokeObjectURL(previewUrl);
    }
    setPreviewUrl('');
  }, [previewUrl, contentType]);

  // Handle file selection
  const handleFileSelect = useCallback((file: File) => {
    setError('');
    
    // Validate file
    const validation = validateFile(
      {
        name: file.name,
        type: file.type,
        size: file.size,
      },
      contentType
    );

    if (!validation.valid) {
      setError(validation.error || 'Invalid file');
      return;
    }

    // Generate preview
    generatePreview(file);
    
    // Notify parent
    onFileSelect(file);
  }, [contentType, onFileSelect, generatePreview]);

  // Handle file input change
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  // Handle drag events
  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!disabled) {
      setIsDragging(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (disabled) return;

    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  // Handle click to open file dialog
  const handleClick = () => {
    if (!disabled && fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  // Handle file removal
  const handleRemove = () => {
    cleanupPreview();
    setError('');
    if (onFileRemove) {
      onFileRemove();
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Get content type label
  const getContentTypeLabel = () => {
    switch (contentType) {
      case ContentType.PDF:
        return 'PDF';
      case ContentType.IMAGE:
        return 'Image';
      case ContentType.VIDEO:
        return 'Video';
      default:
        return 'File';
    }
  };

  // Get icon for content type
  const getContentTypeIcon = () => {
    switch (contentType) {
      case ContentType.PDF:
        return (
          <svg className="w-12 h-12" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z"
              clipRule="evenodd"
            />
          </svg>
        );
      case ContentType.IMAGE:
        return (
          <svg className="w-12 h-12" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z"
              clipRule="evenodd"
            />
          </svg>
        );
      case ContentType.VIDEO:
        return (
          <svg className="w-12 h-12" fill="currentColor" viewBox="0 0 20 20">
            <path d="M2 6a2 2 0 012-2h6a2 2 0 012 2v8a2 2 0 01-2 2H4a2 2 0 01-2-2V6zM14.553 7.106A1 1 0 0014 8v4a1 1 0 00.553.894l2 1A1 1 0 0018 13V7a1 1 0 00-1.447-.894l-2 1z" />
          </svg>
        );
      default:
        return null;
    }
  };

  return (
    <div className="space-y-3">
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
        {getContentTypeLabel()} File
      </label>

      {/* File Drop Zone */}
      {!selectedFile && (
        <div
          onClick={handleClick}
          onDragEnter={handleDragEnter}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`
            relative flex justify-center px-6 pt-5 pb-6 border-2 border-dashed rounded-lg
            transition-all cursor-pointer
            ${
              isDragging
                ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                : 'border-gray-300 dark:border-gray-600 hover:border-blue-400 dark:hover:border-blue-500'
            }
            ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
          `}
        >
          <div className="space-y-2 text-center">
            {/* Icon */}
            <div className="mx-auto text-gray-400 dark:text-gray-500">
              {getContentTypeIcon()}
            </div>

            {/* Upload Text */}
            <div className="flex text-sm text-gray-600 dark:text-gray-400">
              <span className="relative font-medium text-blue-600 dark:text-blue-400 hover:text-blue-500">
                Click to upload
              </span>
              <p className="pl-1">or drag and drop</p>
            </div>

            {/* File Info */}
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {allowedExtensions.join(', ').toUpperCase()} up to{' '}
              {formatBytes(maxFileSize)}
            </p>
          </div>

          {/* Hidden File Input */}
          <input
            ref={fileInputRef}
            type="file"
            className="sr-only"
            accept={allowedTypes}
            onChange={handleInputChange}
            disabled={disabled}
          />
        </div>
      )}

      {/* Selected File Preview */}
      {selectedFile && (
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              {/* Image Preview */}
              {contentType === ContentType.IMAGE && previewUrl && (
                <div className="mb-3">
                  <img
                    src={previewUrl}
                    alt="Preview"
                    className="max-h-48 rounded-lg object-contain"
                  />
                </div>
              )}

              {/* Video Preview */}
              {contentType === ContentType.VIDEO && previewUrl && (
                <div className="mb-3">
                  <video
                    src={previewUrl}
                    controls
                    className="max-h-48 rounded-lg"
                  />
                </div>
              )}

              {/* File Info */}
              <div className="flex items-center space-x-3">
                <div className="flex-shrink-0 text-gray-400 dark:text-gray-500">
                  {getContentTypeIcon()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                    {selectedFile.name}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {formatBytes(selectedFile.size)}
                  </p>
                </div>
              </div>
            </div>

            {/* Remove Button */}
            {!disabled && (
              <button
                type="button"
                onClick={handleRemove}
                className="ml-4 flex-shrink-0 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                aria-label="Remove file"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                    clipRule="evenodd"
                  />
                </svg>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
          <div className="flex items-start">
            <svg
              className="w-5 h-5 text-red-400 mt-0.5 mr-2 flex-shrink-0"
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
    </div>
  );
};
