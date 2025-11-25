/**
 * Example usage of ContentTypeSelector component
 * This file demonstrates how to use the ContentTypeSelector in different scenarios
 */

'use client';

import React, { useState } from 'react';
import { ContentTypeSelector } from './ContentTypeSelector';
import { ContentType } from '@/lib/types/content';
import { getAllowedContentTypes, UserRole } from '@/lib/rbac/admin-privileges';

/**
 * Example 1: Admin user with all content types available
 */
export function AdminContentTypeSelectorExample() {
  const [selectedType, setSelectedType] = useState<ContentType>(ContentType.PDF);
  const allowedTypes = getAllowedContentTypes('ADMIN' as UserRole);

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h2 className="text-2xl font-bold mb-4">Admin Upload - All Types Available</h2>
      <ContentTypeSelector
        selectedType={selectedType}
        onTypeChange={setSelectedType}
        allowedTypes={allowedTypes}
      />
      <div className="mt-4 p-4 bg-gray-100 dark:bg-gray-800 rounded">
        <p className="text-sm">
          Selected Type: <strong>{selectedType}</strong>
        </p>
        <p className="text-xs text-gray-600 dark:text-gray-400 mt-2">
          Available Types: {allowedTypes.join(', ')}
        </p>
      </div>
    </div>
  );
}

/**
 * Example 2: Platform user with limited content types (PDF only)
 */
export function PlatformUserContentTypeSelectorExample() {
  const [selectedType, setSelectedType] = useState<ContentType>(ContentType.PDF);
  const allowedTypes = getAllowedContentTypes('PLATFORM_USER' as UserRole);

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h2 className="text-2xl font-bold mb-4">Platform User Upload - PDF Only</h2>
      <ContentTypeSelector
        selectedType={selectedType}
        onTypeChange={setSelectedType}
        allowedTypes={allowedTypes}
      />
      <div className="mt-4 p-4 bg-gray-100 dark:bg-gray-800 rounded">
        <p className="text-sm">
          Selected Type: <strong>{selectedType}</strong>
        </p>
        <p className="text-xs text-gray-600 dark:text-gray-400 mt-2">
          Available Types: {allowedTypes.join(', ')}
        </p>
      </div>
    </div>
  );
}

/**
 * Example 3: Disabled state
 */
export function DisabledContentTypeSelectorExample() {
  const [selectedType, setSelectedType] = useState<ContentType>(ContentType.PDF);
  const allowedTypes = getAllowedContentTypes('ADMIN' as UserRole);

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h2 className="text-2xl font-bold mb-4">Disabled State</h2>
      <ContentTypeSelector
        selectedType={selectedType}
        onTypeChange={setSelectedType}
        allowedTypes={allowedTypes}
        disabled={true}
      />
      <div className="mt-4 p-4 bg-gray-100 dark:bg-gray-800 rounded">
        <p className="text-sm text-gray-500">
          Component is disabled - selections are not allowed
        </p>
      </div>
    </div>
  );
}

/**
 * Example 4: Member user with no upload permissions
 */
export function MemberContentTypeSelectorExample() {
  const [selectedType, setSelectedType] = useState<ContentType>(ContentType.PDF);
  const allowedTypes = getAllowedContentTypes('MEMBER' as UserRole);

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h2 className="text-2xl font-bold mb-4">Member User - No Upload Access</h2>
      <ContentTypeSelector
        selectedType={selectedType}
        onTypeChange={setSelectedType}
        allowedTypes={allowedTypes}
      />
      <div className="mt-4 p-4 bg-gray-100 dark:bg-gray-800 rounded">
        <p className="text-sm text-gray-500">
          Members cannot upload content
        </p>
      </div>
    </div>
  );
}

/**
 * Example 5: Integration with form
 */
export function ContentTypeSelectorFormExample() {
  const [selectedType, setSelectedType] = useState<ContentType>(ContentType.PDF);
  const [title, setTitle] = useState('');
  const allowedTypes = getAllowedContentTypes('ADMIN' as UserRole);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Form submitted:', { selectedType, title });
    alert(`Uploading ${selectedType}: ${title}`);
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h2 className="text-2xl font-bold mb-4">Form Integration Example</h2>
      <form onSubmit={handleSubmit} className="space-y-6">
        <ContentTypeSelector
          selectedType={selectedType}
          onTypeChange={setSelectedType}
          allowedTypes={allowedTypes}
        />

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Title
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-800"
            placeholder="Enter content title"
            required
          />
        </div>

        <button
          type="submit"
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:ring-2 focus:ring-blue-500"
        >
          Upload {selectedType}
        </button>
      </form>
    </div>
  );
}
