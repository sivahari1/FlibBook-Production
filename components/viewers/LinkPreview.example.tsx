/**
 * LinkPreview Component Examples
 * 
 * This file demonstrates various usage scenarios for the LinkPreview component.
 */

import LinkPreview from './LinkPreview';
import { LinkMetadata } from '@/lib/types/content';

// Example 1: Basic Link Preview with All Metadata
export function BasicLinkPreview() {
  const metadata: LinkMetadata = {
    url: 'https://example.com/article/how-to-learn-react',
    title: 'How to Learn React in 2024',
    description: 'A comprehensive guide to learning React, covering fundamentals, hooks, state management, and best practices for modern web development.',
    domain: 'example.com',
    previewImage: 'https://example.com/images/react-guide-preview.jpg',
    fetchedAt: new Date('2024-01-15')
  };

  return (
    <LinkPreview
      linkUrl={metadata.url}
      metadata={metadata}
      allowDirectAccess={true}
      title="Shared Article"
    />
  );
}

// Example 2: Link Preview Without Preview Image
export function LinkPreviewNoImage() {
  const metadata: LinkMetadata = {
    url: 'https://docs.example.com/api/reference',
    title: 'API Reference Documentation',
    description: 'Complete API reference for the Example platform, including endpoints, authentication, and usage examples.',
    domain: 'docs.example.com',
    fetchedAt: new Date()
  };

  return (
    <LinkPreview
      linkUrl={metadata.url}
      metadata={metadata}
      allowDirectAccess={true}
    />
  );
}

// Example 3: Link Preview Without Description
export function LinkPreviewNoDescription() {
  const metadata: LinkMetadata = {
    url: 'https://github.com/example/project',
    title: 'Example Project Repository',
    domain: 'github.com',
    previewImage: 'https://github.com/example/project/preview.png'
  };

  return (
    <LinkPreview
      linkUrl={metadata.url}
      metadata={metadata}
      allowDirectAccess={true}
      title="GitHub Repository"
    />
  );
}

// Example 4: Restricted Access Link
export function RestrictedLinkPreview() {
  const metadata: LinkMetadata = {
    url: 'https://premium.example.com/exclusive-content',
    title: 'Premium Exclusive Content',
    description: 'This content is available only to premium members. Upgrade your account to access exclusive articles, videos, and resources.',
    domain: 'premium.example.com',
    previewImage: 'https://premium.example.com/preview.jpg',
    fetchedAt: new Date()
  };

  return (
    <LinkPreview
      linkUrl={metadata.url}
      metadata={metadata}
      allowDirectAccess={false}
      title="Premium Content"
    />
  );
}

// Example 5: News Article Link
export function NewsArticleLinkPreview() {
  const metadata: LinkMetadata = {
    url: 'https://news.example.com/2024/01/breaking-news-story',
    title: 'Breaking: Major Technology Announcement',
    description: 'In a surprising turn of events, a major technology company has announced a groundbreaking new product that could revolutionize the industry.',
    domain: 'news.example.com',
    previewImage: 'https://news.example.com/images/breaking-news.jpg',
    fetchedAt: new Date()
  };

  return (
    <LinkPreview
      linkUrl={metadata.url}
      metadata={metadata}
      allowDirectAccess={true}
      title="Latest News"
    />
  );
}

// Example 6: Educational Resource Link
export function EducationalResourceLink() {
  const metadata: LinkMetadata = {
    url: 'https://learn.example.com/courses/web-development',
    title: 'Complete Web Development Course',
    description: 'Master web development from scratch with this comprehensive course covering HTML, CSS, JavaScript, React, Node.js, and deployment strategies.',
    domain: 'learn.example.com',
    previewImage: 'https://learn.example.com/course-preview.jpg',
    fetchedAt: new Date('2024-01-10')
  };

  return (
    <LinkPreview
      linkUrl={metadata.url}
      metadata={metadata}
      allowDirectAccess={true}
      title="Educational Resource"
    />
  );
}

// Example 7: Blog Post Link
export function BlogPostLink() {
  const metadata: LinkMetadata = {
    url: 'https://blog.example.com/posts/best-practices-2024',
    title: '10 Best Practices for Modern Web Development',
    description: 'Discover the top 10 best practices that every web developer should follow in 2024 to build fast, secure, and maintainable applications.',
    domain: 'blog.example.com',
    previewImage: 'https://blog.example.com/images/best-practices.jpg'
  };

  return (
    <LinkPreview
      linkUrl={metadata.url}
      metadata={metadata}
      allowDirectAccess={true}
    />
  );
}

// Example 8: Long URL Link
export function LongURLLink() {
  const metadata: LinkMetadata = {
    url: 'https://example.com/very/long/path/to/resource/with/many/segments/and/query/parameters?id=12345&category=technology&sort=date&filter=recent',
    title: 'Resource with Long URL',
    description: 'This demonstrates how the component handles very long URLs with multiple path segments and query parameters.',
    domain: 'example.com'
  };

  return (
    <LinkPreview
      linkUrl={metadata.url}
      metadata={metadata}
      allowDirectAccess={true}
      title="Long URL Example"
    />
  );
}

// Example 9: Minimal Metadata Link
export function MinimalMetadataLink() {
  const metadata: LinkMetadata = {
    url: 'https://simple.example.com',
    title: 'Simple Website',
    domain: 'simple.example.com'
  };

  return (
    <LinkPreview
      linkUrl={metadata.url}
      metadata={metadata}
      allowDirectAccess={true}
    />
  );
}

// Example 10: Video Platform Link
export function VideoPlatformLink() {
  const metadata: LinkMetadata = {
    url: 'https://videos.example.com/watch/tutorial-series',
    title: 'Complete Tutorial Series',
    description: 'Watch our complete tutorial series covering everything you need to know about modern web development, from basics to advanced topics.',
    domain: 'videos.example.com',
    previewImage: 'https://videos.example.com/thumbnails/tutorial-series.jpg',
    fetchedAt: new Date()
  };

  return (
    <LinkPreview
      linkUrl={metadata.url}
      metadata={metadata}
      allowDirectAccess={true}
      title="Video Tutorial"
    />
  );
}
