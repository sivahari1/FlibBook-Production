/**
 * LinkUploader Component Usage Examples
 * 
 * This file demonstrates how to use the LinkUploader component
 * in different scenarios.
 */

import React, { useState } from 'react';
import { LinkUploader } from './LinkUploader';
import { LinkMetadata } from '@/lib/types/content';

/**
 * Example 1: Basic Usage
 * Simple link uploader with submit handler
 */
export function BasicLinkUploaderExample() {
  const [submittedLink, setSubmittedLink] = useState<{
    url: string;
    title: string;
    description?: string;
  } | null>(null);

  const handleLinkSubmit = (url: string, title: string, description?: string) => {
    console.log('Link submitted:', { url, title, description });
    setSubmittedLink({ url, title, description });
  };

  return (
    <div className="max-w-2xl mx-auto p-6">
      <h2 className="text-2xl font-bold mb-4">Basic Link Uploader</h2>
      
      <LinkUploader onLinkSubmit={handleLinkSubmit} />

      {submittedLink && (
        <div className="mt-6 p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
          <h3 className="font-semibold text-green-800 dark:text-green-200 mb-2">
            Link Submitted Successfully!
          </h3>
          <dl className="space-y-1 text-sm">
            <div>
              <dt className="font-medium text-gray-700 dark:text-gray-300">URL:</dt>
              <dd className="text-gray-600 dark:text-gray-400">{submittedLink.url}</dd>
            </div>
            <div>
              <dt className="font-medium text-gray-700 dark:text-gray-300">Title:</dt>
              <dd className="text-gray-600 dark:text-gray-400">{submittedLink.title}</dd>
            </div>
            {submittedLink.description && (
              <div>
                <dt className="font-medium text-gray-700 dark:text-gray-300">Description:</dt>
                <dd className="text-gray-600 dark:text-gray-400">{submittedLink.description}</dd>
              </div>
            )}
          </dl>
        </div>
      )}
    </div>
  );
}

/**
 * Example 2: With Metadata Callback
 * Demonstrates handling metadata fetch events
 */
export function LinkUploaderWithMetadataExample() {
  const [metadata, setMetadata] = useState<LinkMetadata | null>(null);

  const handleLinkSubmit = (url: string, title: string, description?: string) => {
    console.log('Link submitted:', { url, title, description });
  };

  const handleMetadataFetch = (fetchedMetadata: LinkMetadata) => {
    console.log('Metadata fetched:', fetchedMetadata);
    setMetadata(fetchedMetadata);
  };

  return (
    <div className="max-w-2xl mx-auto p-6">
      <h2 className="text-2xl font-bold mb-4">Link Uploader with Metadata</h2>
      
      <LinkUploader
        onLinkSubmit={handleLinkSubmit}
        onMetadataFetch={handleMetadataFetch}
      />

      {metadata && (
        <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
          <h3 className="font-semibold text-blue-800 dark:text-blue-200 mb-2">
            Fetched Metadata
          </h3>
          <dl className="space-y-1 text-sm">
            <div>
              <dt className="font-medium text-gray-700 dark:text-gray-300">Domain:</dt>
              <dd className="text-gray-600 dark:text-gray-400">{metadata.domain}</dd>
            </div>
            <div>
              <dt className="font-medium text-gray-700 dark:text-gray-300">Title:</dt>
              <dd className="text-gray-600 dark:text-gray-400">{metadata.title}</dd>
            </div>
            {metadata.description && (
              <div>
                <dt className="font-medium text-gray-700 dark:text-gray-300">Description:</dt>
                <dd className="text-gray-600 dark:text-gray-400">{metadata.description}</dd>
              </div>
            )}
            {metadata.previewImage && (
              <div>
                <dt className="font-medium text-gray-700 dark:text-gray-300">Preview Image:</dt>
                <dd className="text-gray-600 dark:text-gray-400">{metadata.previewImage}</dd>
              </div>
            )}
          </dl>
        </div>
      )}
    </div>
  );
}

/**
 * Example 3: With Initial Values
 * Pre-populate the form with existing link data
 */
export function LinkUploaderWithInitialValuesExample() {
  const handleLinkSubmit = (url: string, title: string, description?: string) => {
    console.log('Link updated:', { url, title, description });
  };

  return (
    <div className="max-w-2xl mx-auto p-6">
      <h2 className="text-2xl font-bold mb-4">Edit Existing Link</h2>
      
      <LinkUploader
        onLinkSubmit={handleLinkSubmit}
        initialUrl="https://example.com/article"
        initialTitle="Example Article"
        initialDescription="This is an example article about something interesting."
      />
    </div>
  );
}

/**
 * Example 4: Disabled State
 * Show the component in a disabled state
 */
export function DisabledLinkUploaderExample() {
  const handleLinkSubmit = (url: string, title: string, description?: string) => {
    console.log('This should not be called');
  };

  return (
    <div className="max-w-2xl mx-auto p-6">
      <h2 className="text-2xl font-bold mb-4">Disabled Link Uploader</h2>
      
      <LinkUploader
        onLinkSubmit={handleLinkSubmit}
        disabled={true}
        initialUrl="https://example.com"
        initialTitle="Disabled Example"
      />
      
      <p className="mt-4 text-sm text-gray-600 dark:text-gray-400">
        The form is disabled and cannot be edited.
      </p>
    </div>
  );
}

/**
 * Example 5: In a Form Context
 * Integrate with a larger form
 */
export function LinkUploaderInFormExample() {
  const [formData, setFormData] = useState({
    url: '',
    title: '',
    description: '',
    category: '',
    tags: '',
  });

  const handleLinkSubmit = (url: string, title: string, description?: string) => {
    setFormData((prev) => ({
      ...prev,
      url,
      title,
      description: description || '',
    }));
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Complete form submitted:', formData);
    alert('Form submitted! Check console for data.');
  };

  return (
    <div className="max-w-2xl mx-auto p-6">
      <h2 className="text-2xl font-bold mb-4">Link Uploader in Form</h2>
      
      <form onSubmit={handleFormSubmit} className="space-y-6">
        <LinkUploader onLinkSubmit={handleLinkSubmit} />

        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Category
          </label>
          <select
            value={formData.category}
            onChange={(e) => setFormData({ ...formData, category: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
          >
            <option value="">Select a category</option>
            <option value="article">Article</option>
            <option value="video">Video</option>
            <option value="tutorial">Tutorial</option>
            <option value="documentation">Documentation</option>
          </select>
        </div>

        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Tags (comma-separated)
          </label>
          <input
            type="text"
            value={formData.tags}
            onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
            placeholder="react, typescript, tutorial"
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
          />
        </div>

        <button
          type="submit"
          className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          Submit Complete Form
        </button>
      </form>
    </div>
  );
}

/**
 * Example 6: All Examples Combined
 * Showcase all examples in tabs
 */
export function AllLinkUploaderExamples() {
  const [activeTab, setActiveTab] = useState<string>('basic');

  const examples = [
    { id: 'basic', label: 'Basic', component: <BasicLinkUploaderExample /> },
    { id: 'metadata', label: 'With Metadata', component: <LinkUploaderWithMetadataExample /> },
    { id: 'initial', label: 'Initial Values', component: <LinkUploaderWithInitialValuesExample /> },
    { id: 'disabled', label: 'Disabled', component: <DisabledLinkUploaderExample /> },
    { id: 'form', label: 'In Form', component: <LinkUploaderInFormExample /> },
  ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-center mb-8 text-gray-900 dark:text-gray-100">
          LinkUploader Component Examples
        </h1>

        {/* Tabs */}
        <div className="flex gap-2 mb-6 overflow-x-auto">
          {examples.map((example) => (
            <button
              key={example.id}
              onClick={() => setActiveTab(example.id)}
              className={`
                px-4 py-2 rounded-lg font-medium transition-colors whitespace-nowrap
                ${
                  activeTab === example.id
                    ? 'bg-blue-600 text-white'
                    : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                }
              `}
            >
              {example.label}
            </button>
          ))}
        </div>

        {/* Active Example */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg">
          {examples.find((ex) => ex.id === activeTab)?.component}
        </div>
      </div>
    </div>
  );
}
