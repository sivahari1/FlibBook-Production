/**
 * Media Upload Modal Component
 * Handles audio/video file uploads and external URL input for annotations
 * Requirements: 9.1, 9.2, 9.3, 9.4
 */
'use client';

import React, { useState, useRef } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import type { MediaType } from '@/lib/types/annotations';

interface MediaUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  mediaType: MediaType;
  onUploadComplete: (mediaUrl: string, isExternal: boolean) => void;
  selectedText: string;
}

type UploadTab = 'file' | 'url';

const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB

const ACCEPTED_TYPES = {
  AUDIO: {
    mimeTypes: ['audio/mpeg', 'audio/wav', 'audio/mp3', 'audio/x-wav'],
    extensions: ['.mp3', '.wav'],
    label: 'MP3, WAV'
  },
  VIDEO: {
    mimeTypes: ['video/mp4', 'video/webm'],
    extensions: ['.mp4', '.webm'],
    label: 'MP4, WEBM'
  }
};

export function MediaUploadModal({
  isOpen,
  onClose,
  mediaType,
  onUploadComplete,
  selectedText
}: MediaUploadModalProps) {
  const [activeTab, setActiveTab] = useState<UploadTab>('file');
  const [file, setFile] = useState<File | null>(null);
  const [externalUrl, setExternalUrl] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const acceptedConfig = ACCEPTED_TYPES[mediaType];

  // File validation
  const validateFile = (file: File): string | null => {
    // Check file size
    if (file.size > MAX_FILE_SIZE) {
      return `File size must be less than ${MAX_FILE_SIZE / (1024 * 1024)}MB`;
    }

    // Check file type
    const isValidType = acceptedConfig.mimeTypes.some(type => 
      file.type === type || file.type.startsWith(type.split('/')[0] + '/')
    );
    
    const hasValidExtension = acceptedConfig.extensions.some(ext =>
      file.name.toLowerCase().endsWith(ext)
    );

    if (!isValidType && !hasValidExtension) {
      return `Please select a valid ${acceptedConfig.label} file`;
    }

    return null;
  };

  // URL validation
  const validateUrl = (url: string): string | null => {
    if (!url.trim()) {
      return 'Please enter a URL';
    }

    try {
      new URL(url);
    } catch {
      return 'Please enter a valid URL';
    }

    // Check for supported platforms
    const supportedPatterns = [
      /youtube\.com\/watch/i,
      /youtu\.be\//i,
      /vimeo\.com\//i,
      /soundcloud\.com\//i,
      /spotify\.com\//i,
      /\.(mp3|wav|mp4|webm)$/i
    ];

    const isSupported = supportedPatterns.some(pattern => pattern.test(url));
    if (!isSupported) {
      return 'URL must be from YouTube, Vimeo, SoundCloud, Spotify, or a direct media link';
    }

    return null;
  };

  // Handle file selection
  const handleFileSelect = (selectedFile: File) => {
    const validationError = validateFile(selectedFile);
    if (validationError) {
      setError(validationError);
      setFile(null);
      return;
    }

    setFile(selectedFile);
    setError(null);
  };

  // Handle file input change
  const handleFileInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (selectedFile) {
      handleFileSelect(selectedFile);
    }
  };

  // Handle drag and drop
  const handleDragOver = (event: React.DragEvent) => {
    event.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (event: React.DragEvent) => {
    event.preventDefault();
    setIsDragging(false);

    const droppedFile = event.dataTransfer.files[0];
    if (droppedFile) {
      handleFileSelect(droppedFile);
    }
  };

  // Handle file upload
  const handleFileUpload = async () => {
    if (!file) return;

    setIsUploading(true);
    setUploadProgress(0);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('mediaType', mediaType);

      // Simulate progress (in real implementation, use XMLHttpRequest for progress tracking)
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => Math.min(prev + 10, 90));
      }, 200);

      const response = await fetch('/api/media/upload', {
        method: 'POST',
        body: formData,
      });

      clearInterval(progressInterval);
      setUploadProgress(100);

      if (!response.ok) {
        const errorData = await response.json();
        const errorMessage = errorData.error || 'Upload failed';
        
        // Provide more specific error messages based on status code
        if (response.status === 413) {
          throw new Error('File is too large. Maximum size is 100MB.');
        } else if (response.status === 415) {
          throw new Error('File type not supported. Please use MP3, WAV, MP4, or WEBM.');
        } else if (response.status === 403) {
          throw new Error('You don\'t have permission to upload media files.');
        } else if (response.status === 507) {
          throw new Error('Storage quota exceeded. Please delete some files or upgrade your plan.');
        }
        
        throw new Error(errorMessage);
      }

      const { mediaUrl } = await response.json();
      onUploadComplete(mediaUrl, false);
      handleClose();
    } catch (error) {
      console.error('Upload error:', error);
      const errorMessage = error instanceof Error 
        ? error.message 
        : 'Upload failed. Please try again.';
      setError(errorMessage);
      setUploadProgress(0);
    } finally {
      setIsUploading(false);
    }
  };

  // Handle external URL submission
  const handleUrlSubmit = () => {
    const validationError = validateUrl(externalUrl);
    if (validationError) {
      setError(validationError);
      return;
    }

    onUploadComplete(externalUrl, true);
    handleClose();
  };

  // Handle close
  const handleClose = () => {
    if (!isUploading) {
      setFile(null);
      setExternalUrl('');
      setError(null);
      setUploadProgress(0);
      setActiveTab('file');
      onClose();
    }
  };

  // Format file size
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <Modal 
      isOpen={isOpen} 
      onClose={handleClose} 
      title={`Add ${mediaType === 'AUDIO' ? 'Audio' : 'Video'} Annotation`}
    >
      <div className="space-y-4">
        {/* Selected Text Preview */}
        <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-lg border border-gray-200 dark:border-gray-700">
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Selected text:</p>
          <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
            &quot;{selectedText.length > 100 ? selectedText.substring(0, 100) + '...' : selectedText}&quot;
          </p>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-gray-200 dark:border-gray-700">
          <button
            className={`px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === 'file'
                ? 'border-b-2 border-blue-500 text-blue-600 dark:text-blue-400'
                : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
            }`}
            onClick={() => setActiveTab('file')}
            disabled={isUploading}
          >
            📁 Upload File
          </button>
          <button
            className={`px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === 'url'
                ? 'border-b-2 border-blue-500 text-blue-600 dark:text-blue-400'
                : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
            }`}
            onClick={() => setActiveTab('url')}
            disabled={isUploading}
          >
            🔗 External URL
          </button>
        </div>

        {/* File Upload Tab */}
        {activeTab === 'file' && (
          <div className="space-y-4">
            <div
              className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-all ${
                isDragging
                  ? 'border-blue-400 bg-blue-50 dark:bg-blue-900/20'
                  : file
                  ? 'border-green-300 bg-green-50 dark:bg-green-900/20'
                  : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500'
              }`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => !isUploading && fileInputRef.current?.click()}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept={acceptedConfig.extensions.join(',')}
                onChange={handleFileInputChange}
                className="hidden"
                disabled={isUploading}
              />

              {file ? (
                <div className="space-y-2">
                  <div className="text-4xl">
                    {mediaType === 'AUDIO' ? '🎵' : '🎬'}
                  </div>
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                    {file.name}
                  </p>
                  <p className="text-xs text-gray-500">
                    {formatFileSize(file.size)}
                  </p>
                  {!isUploading && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setFile(null);
                      }}
                      className="text-xs text-red-600 hover:text-red-700 dark:text-red-400"
                    >
                      Remove
                    </button>
                  )}
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="text-4xl text-gray-400">
                    {mediaType === 'AUDIO' ? '🎵' : '🎬'}
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Drag & drop or click to select
                  </p>
                  <p className="text-xs text-gray-500">
                    {acceptedConfig.label} • Max {MAX_FILE_SIZE / (1024 * 1024)}MB
                  </p>
                </div>
              )}
            </div>

            {/* Upload Progress */}
            {isUploading && (
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-400">Uploading...</span>
                  <span className="text-gray-600 dark:text-gray-400">{uploadProgress}%</span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
              </div>
            )}
          </div>
        )}

        {/* External URL Tab */}
        {activeTab === 'url' && (
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Media URL
              </label>
              <Input
                type="url"
                placeholder="https://youtube.com/watch?v=... or https://example.com/audio.mp3"
                value={externalUrl}
                onChange={(e) => {
                  setExternalUrl(e.target.value);
                  setError(null);
                }}
                disabled={isUploading}
                className="w-full"
              />
            </div>

            {/* Supported Platforms */}
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
              <p className="text-sm font-medium text-blue-900 dark:text-blue-100 mb-2">
                Supported Platforms:
              </p>
              <div className="grid grid-cols-2 gap-2 text-xs text-blue-700 dark:text-blue-300">
                <div>• YouTube</div>
                <div>• Vimeo</div>
                <div>• SoundCloud</div>
                <div>• Spotify</div>
                <div>• Direct MP3/WAV</div>
                <div>• Direct MP4/WEBM</div>
              </div>
            </div>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
          <Button
            variant="secondary"
            onClick={handleClose}
            disabled={isUploading}
          >
            Cancel
          </Button>
          <Button
            onClick={activeTab === 'file' ? handleFileUpload : handleUrlSubmit}
            disabled={
              isUploading || 
              (activeTab === 'file' && !file) || 
              (activeTab === 'url' && !externalUrl.trim())
            }
            className="min-w-[120px]"
          >
            {isUploading ? 'Uploading...' : activeTab === 'file' ? 'Upload' : 'Add Link'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
