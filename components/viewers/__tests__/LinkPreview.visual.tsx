/**
 * Visual Test Page for LinkPreview Component
 * 
 * This file can be used to manually test the LinkPreview component
 * in different scenarios. Not meant for automated testing.
 */

import LinkPreview from '../LinkPreview';
import { LinkMetadata } from '@/lib/types/content';

function LinkPreviewVisualTest() {
  // Test Case 1: Full metadata with image
  const fullMetadata: LinkMetadata = {
    url: 'https://example.com/article',
    title: 'Complete Guide to Web Development',
    description: 'Learn everything about modern web development including React, TypeScript, and best practices.',
    domain: 'example.com',
    previewImage: 'https://via.placeholder.com/800x400/3b82f6/ffffff?text=Preview+Image',
    fetchedAt: new Date()
  };

  // Test Case 2: No preview image
  const noImageMetadata: LinkMetadata = {
    url: 'https://docs.example.com/api',
    title: 'API Documentation',
    description: 'Complete API reference and documentation.',
    domain: 'docs.example.com',
    fetchedAt: new Date()
  };

  // Test Case 3: Minimal metadata
  const minimalMetadata: LinkMetadata = {
    url: 'https://simple.example.com',
    title: 'Simple Link',
    domain: 'simple.example.com'
  };

  return (
    <div className="space-y-8 p-8 bg-gray-50 dark:bg-slate-900 min-h-screen">
      <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-8">
        LinkPreview Component Visual Tests
      </h1>

      {/* Test 1: Full Metadata with Access */}
      <section>
        <h2 className="text-xl font-semibold mb-4 text-gray-800 dark:text-gray-200">
          Test 1: Full Metadata with Access
        </h2>
        <LinkPreview
          linkUrl={fullMetadata.url}
          metadata={fullMetadata}
          allowDirectAccess={true}
          title="Shared Article"
        />
      </section>

      {/* Test 2: No Preview Image */}
      <section>
        <h2 className="text-xl font-semibold mb-4 text-gray-800 dark:text-gray-200">
          Test 2: No Preview Image
        </h2>
        <LinkPreview
          linkUrl={noImageMetadata.url}
          metadata={noImageMetadata}
          allowDirectAccess={true}
        />
      </section>

      {/* Test 3: Restricted Access */}
      <section>
        <h2 className="text-xl font-semibold mb-4 text-gray-800 dark:text-gray-200">
          Test 3: Restricted Access
        </h2>
        <LinkPreview
          linkUrl={fullMetadata.url}
          metadata={fullMetadata}
          allowDirectAccess={false}
          title="Premium Content"
        />
      </section>

      {/* Test 4: Minimal Metadata */}
      <section>
        <h2 className="text-xl font-semibold mb-4 text-gray-800 dark:text-gray-200">
          Test 4: Minimal Metadata
        </h2>
        <LinkPreview
          linkUrl={minimalMetadata.url}
          metadata={minimalMetadata}
          allowDirectAccess={true}
        />
      </section>
    </div>
  );
}

LinkPreviewVisualTest.displayName = 'LinkPreviewVisualTest';

export default LinkPreviewVisualTest;
