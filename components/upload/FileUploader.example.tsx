/**
 * Example usage of FileUploader component
 * Demonstrates how to integrate the FileUploader in different scenarios
 */

'use client';

import React, { useState } from 'react';
import { FileUploader } from './FileUploader';
import { ContentType } from '@/lib/types/content';
import { Button } from '@/components/ui/Button';

/**
 * Example 1: Basic PDF Upload
 */
export function BasicPDFUploadExample() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const handleFileSelect = (file: File) => {
    console.log('File selected:', file.name);
    setSelectedFile(file);
  };

  const handleFileRemove = () => {
    console.log('File removed');
    setSelectedFile(null);
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    const formData = new FormData();
    formData.append('file', selectedFile);
    formData.append('contentType', ContentType.PDF);

    // Upload logic here
    console.log('Uploading file:', selectedFile.name);
  };

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Basic PDF Upload</h3>
      <FileUploader
        contentType={ContentType.PDF}
        onFileSelect={handleFileSelect}
        selectedFile={selectedFile}
        onFileRemove={handleFileRemove}
      />
      {selectedFile && (
        <Button onClick={handleUpload} variant="primary">
          Upload PDF
        </Button>
      )}
    </div>
  );
}

/**
 * Example 2: Image Upload with Preview
 */
export function ImageUploadExample() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const handleFileSelect = (file: File) => {
    console.log('Image selected:', file.name);
    setSelectedFile(file);
  };

  const handleFileRemove = () => {
    console.log('Image removed');
    setSelectedFile(null);
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('contentType', ContentType.IMAGE);

      // Upload logic here
      console.log('Uploading image:', selectedFile.name);
      
      // Simulate upload delay
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      alert('Image uploaded successfully!');
      setSelectedFile(null);
    } catch (error) {
      console.error('Upload failed:', error);
      alert('Upload failed. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Image Upload with Preview</h3>
      <FileUploader
        contentType={ContentType.IMAGE}
        onFileSelect={handleFileSelect}
        selectedFile={selectedFile}
        onFileRemove={handleFileRemove}
        disabled={isUploading}
      />
      {selectedFile && (
        <Button
          onClick={handleUpload}
          variant="primary"
          disabled={isUploading}
          isLoading={isUploading}
        >
          {isUploading ? 'Uploading...' : 'Upload Image'}
        </Button>
      )}
    </div>
  );
}

/**
 * Example 3: Video Upload with Custom Size Limit
 */
export function VideoUploadExample() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const customMaxSize = 100 * 1024 * 1024; // 100MB custom limit

  const handleFileSelect = (file: File) => {
    console.log('Video selected:', file.name);
    setSelectedFile(file);
  };

  const handleFileRemove = () => {
    console.log('Video removed');
    setSelectedFile(null);
  };

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Video Upload (Custom 100MB Limit)</h3>
      <FileUploader
        contentType={ContentType.VIDEO}
        onFileSelect={handleFileSelect}
        selectedFile={selectedFile}
        onFileRemove={handleFileRemove}
        maxSize={customMaxSize}
      />
      {selectedFile && (
        <div className="text-sm text-gray-600">
          Selected: {selectedFile.name} ({(selectedFile.size / (1024 * 1024)).toFixed(2)} MB)
        </div>
      )}
    </div>
  );
}

/**
 * Example 4: Multi-Content Type Upload Form
 */
export function MultiContentTypeExample() {
  const [contentType, setContentType] = useState<ContentType>(ContentType.PDF);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [title, setTitle] = useState('');

  const handleFileSelect = (file: File) => {
    setSelectedFile(file);
    // Auto-fill title from filename
    if (!title) {
      const filename = file.name.substring(0, file.name.lastIndexOf('.'));
      setTitle(filename);
    }
  };

  const handleFileRemove = () => {
    setSelectedFile(null);
  };

  const handleContentTypeChange = (newType: ContentType) => {
    setContentType(newType);
    setSelectedFile(null); // Clear file when changing type
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile || !title) return;

    console.log('Submitting:', {
      contentType,
      file: selectedFile.name,
      title,
    });

    // Upload logic here
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <h3 className="text-lg font-semibold">Multi-Content Type Upload</h3>

      {/* Content Type Selector */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Content Type
        </label>
        <div className="flex space-x-2">
          {[ContentType.PDF, ContentType.IMAGE, ContentType.VIDEO].map((type) => (
            <button
              key={type}
              type="button"
              onClick={() => handleContentTypeChange(type)}
              className={`px-4 py-2 rounded-lg border ${
                contentType === type
                  ? 'border-blue-500 bg-blue-50 text-blue-700'
                  : 'border-gray-300 bg-white text-gray-700 hover:border-gray-400'
              }`}
            >
              {type}
            </button>
          ))}
        </div>
      </div>

      {/* Title Input */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Title
        </label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          placeholder="Enter title"
          required
        />
      </div>

      {/* File Uploader */}
      <FileUploader
        contentType={contentType}
        onFileSelect={handleFileSelect}
        selectedFile={selectedFile}
        onFileRemove={handleFileRemove}
      />

      {/* Submit Button */}
      <Button
        type="submit"
        variant="primary"
        disabled={!selectedFile || !title}
      >
        Upload {contentType}
      </Button>
    </form>
  );
}

/**
 * Example 5: Disabled State
 */
export function DisabledUploadExample() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const isProcessing = true; // Simulating a processing state

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Disabled Upload (Processing)</h3>
      <FileUploader
        contentType={ContentType.PDF}
        onFileSelect={setSelectedFile}
        selectedFile={selectedFile}
        disabled={isProcessing}
      />
      <p className="text-sm text-gray-500">
        Upload is disabled while processing...
      </p>
    </div>
  );
}

/**
 * Example 6: With Custom Accepted Formats
 */
export function CustomFormatsExample() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  
  // Only allow PNG and JPG images
  const customFormats = ['image/png', 'image/jpeg'];

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Custom Formats (PNG & JPG Only)</h3>
      <FileUploader
        contentType={ContentType.IMAGE}
        onFileSelect={setSelectedFile}
        selectedFile={selectedFile}
        acceptedFormats={customFormats}
      />
    </div>
  );
}

/**
 * Complete Example Component
 */
export default function FileUploaderExamples() {
  return (
    <div className="max-w-4xl mx-auto p-8 space-y-12">
      <h1 className="text-3xl font-bold mb-8">FileUploader Component Examples</h1>
      
      <BasicPDFUploadExample />
      <hr className="my-8" />
      
      <ImageUploadExample />
      <hr className="my-8" />
      
      <VideoUploadExample />
      <hr className="my-8" />
      
      <MultiContentTypeExample />
      <hr className="my-8" />
      
      <DisabledUploadExample />
      <hr className="my-8" />
      
      <CustomFormatsExample />
    </div>
  );
}
