/**
 * Tests for LinkProcessor class
 * Validates URL validation and metadata fetching
 * Requirements: 5.1, 5.3, 5.5
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { LinkProcessor } from '../link-processor';

// Mock the storage module
vi.mock('../storage', () => ({
  uploadFile: vi.fn().mockResolvedValue({ path: 'mock-preview-path', error: undefined })
}));

// Mock fetch
global.fetch = vi.fn();

describe('LinkProcessor', () => {
  let processor: LinkProcessor;

  beforeEach(() => {
    processor = new LinkProcessor();
    vi.clearAllMocks();
  });

  describe('isValidUrl', () => {
    it('should validate HTTP URLs', () => {
      // Requirements: 5.1, 5.5
      expect(processor.isValidUrl('http://example.com')).toBe(true);
    });

    it('should validate HTTPS URLs', () => {
      // Requirements: 5.1, 5.5
      expect(processor.isValidUrl('https://example.com')).toBe(true);
    });

    it('should reject non-HTTP/HTTPS protocols', () => {
      // Requirements: 5.5
      expect(processor.isValidUrl('ftp://example.com')).toBe(false);
      expect(processor.isValidUrl('file:///path/to/file')).toBe(false);
      expect(processor.isValidUrl('javascript:alert(1)')).toBe(false);
    });

    it('should reject invalid URL formats', () => {
      // Requirements: 5.1
      expect(processor.isValidUrl('not a url')).toBe(false);
      expect(processor.isValidUrl('')).toBe(false);
      expect(processor.isValidUrl('example.com')).toBe(false);
    });

    it('should handle URLs with paths and query parameters', () => {
      expect(processor.isValidUrl('https://example.com/path?query=value')).toBe(true);
      expect(processor.isValidUrl('http://example.com:8080/path#hash')).toBe(true);
    });
  });

  describe('processLink', () => {
    it('should process valid URL and return metadata', async () => {
      // Requirements: 5.1, 5.3
      const mockHtml = `
        <html>
          <head>
            <title>Example Page</title>
            <meta property="og:title" content="Example Title">
            <meta property="og:description" content="Example Description">
            <meta property="og:image" content="https://example.com/image.jpg">
          </head>
        </html>
      `;

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve(mockHtml)
      } as Response);

      const result = await processor.processLink('https://example.com');

      expect(result.domain).toBe('example.com');
      expect(result.title).toBe('Example Title');
      expect(result.description).toBe('Example Description');
      expect(result.fetchedAt).toBeInstanceOf(Date);
    });

    it('should reject invalid URLs', async () => {
      // Requirements: 5.1
      const result = await processor.processLink('not a url');

      expect(result.domain).toBe('unknown');
      expect(result.title).toBe('not a url');
    });

    it('should handle fetch errors gracefully', async () => {
      // Requirements: 5.3
      vi.mocked(fetch).mockRejectedValueOnce(new Error('Network error'));

      const result = await processor.processLink('https://example.com');

      expect(result.domain).toBe('example.com');
      expect(result.title).toBeDefined();
    });

    it('should handle HTTP errors', async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: false,
        status: 404
      } as Response);

      const result = await processor.processLink('https://example.com/notfound');

      expect(result.domain).toBe('example.com');
    });

    it('should extract domain from URL', async () => {
      // Requirements: 5.3
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve('<html><title>Test</title></html>')
      } as Response);

      const result = await processor.processLink('https://subdomain.example.com/path');

      expect(result.domain).toBe('subdomain.example.com');
    });
  });

  describe('Metadata Extraction', () => {
    it('should extract Open Graph title', async () => {
      // Requirements: 5.3
      const mockHtml = '<meta property="og:title" content="OG Title">';
      
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve(mockHtml)
      } as Response);

      const result = await processor.processLink('https://example.com');

      expect(result.title).toBe('OG Title');
    });

    it('should fall back to HTML title tag', async () => {
      // Requirements: 5.3
      const mockHtml = '<html><head><title>HTML Title</title></head></html>';
      
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve(mockHtml)
      } as Response);

      const result = await processor.processLink('https://example.com');

      expect(result.title).toBe('HTML Title');
    });

    it('should extract meta description', async () => {
      const mockHtml = '<meta name="description" content="Page description">';
      
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve(mockHtml)
      } as Response);

      const result = await processor.processLink('https://example.com');

      expect(result.description).toBe('Page description');
    });

    it('should extract Open Graph image', async () => {
      const mockHtml = '<meta property="og:image" content="https://example.com/image.jpg">';
      
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve(mockHtml)
      } as Response);

      const result = await processor.processLink('https://example.com');

      expect(result.previewImage).toBeDefined();
    });

    it('should decode HTML entities in extracted text', async () => {
      const mockHtml = '<meta property="og:title" content="Title &amp; Subtitle">';
      
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve(mockHtml)
      } as Response);

      const result = await processor.processLink('https://example.com');

      expect(result.title).toBe('Title & Subtitle');
    });

    it('should handle reversed meta tag attributes', async () => {
      const mockHtml = '<meta content="Reversed Title" property="og:title">';
      
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve(mockHtml)
      } as Response);

      const result = await processor.processLink('https://example.com');

      expect(result.title).toBe('Reversed Title');
    });
  });

  describe('Preview Image Storage', () => {
    it('should store preview image when userId is provided', async () => {
      // Requirements: 5.3
      const mockHtml = '<meta property="og:image" content="https://example.com/preview.jpg">';
      
      vi.mocked(fetch)
        .mockResolvedValueOnce({
          ok: true,
          text: () => Promise.resolve(mockHtml)
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          arrayBuffer: () => Promise.resolve(new ArrayBuffer(100))
        } as Response);

      const result = await processor.processLink('https://example.com', 'user1');

      expect(result.previewImage).toBeDefined();
    });

    it('should handle preview image fetch errors', async () => {
      const mockHtml = '<meta property="og:image" content="https://example.com/preview.jpg">';
      
      vi.mocked(fetch)
        .mockResolvedValueOnce({
          ok: true,
          text: () => Promise.resolve(mockHtml)
        } as Response)
        .mockResolvedValueOnce({
          ok: false,
          status: 404
        } as Response);

      const result = await processor.processLink('https://example.com', 'user1');

      // Should still have the URL even if storage fails
      expect(result.previewImage).toBeDefined();
    });

    it('should skip preview storage when no userId provided', async () => {
      const mockHtml = '<meta property="og:image" content="https://example.com/preview.jpg">';
      
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve(mockHtml)
      } as Response);

      const result = await processor.processLink('https://example.com');

      expect(result.previewImage).toBe('https://example.com/preview.jpg');
    });
  });

  describe('Edge Cases', () => {
    it('should handle timeout errors', async () => {
      vi.mocked(fetch).mockRejectedValueOnce(new Error('Timeout'));

      const result = await processor.processLink('https://slow-site.com');

      expect(result.domain).toBe('slow-site.com');
      expect(result.title).toBeDefined();
    });

    it('should handle malformed HTML', async () => {
      const mockHtml = '<html><head><title>Test</title><meta property="og:title" content="Unclosed';
      
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve(mockHtml)
      } as Response);

      const result = await processor.processLink('https://example.com');

      expect(result.domain).toBe('example.com');
    });

    it('should handle empty HTML', async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve('')
      } as Response);

      const result = await processor.processLink('https://example.com');

      expect(result.domain).toBe('example.com');
    });

    it('should handle URLs with special characters', async () => {
      const url = 'https://example.com/path?query=value&other=123#section';
      
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve('<title>Test</title>')
      } as Response);

      const result = await processor.processLink(url);

      expect(result.domain).toBe('example.com');
    });
  });
});
