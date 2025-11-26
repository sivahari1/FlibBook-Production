/**
 * Link Processing Pipeline
 * Handles URL validation and metadata fetching from Open Graph tags
 * Requirements: 5.1, 5.3, 5.5
 */

import { uploadFile } from './storage';
import { ContentMetadata } from './types/content';

/**
 * LinkProcessor class for handling link content type
 * Validates URLs and fetches metadata from Open Graph tags
 */
export class LinkProcessor {
  /**
   * Process a link URL with metadata fetching
   * Requirements: 5.1, 5.3, 5.5
   */
  async processLink(url: string, userId?: string): Promise<ContentMetadata> {
    try {
      // Validate URL format
      if (!this.isValidUrl(url)) {
        throw new Error('Invalid URL format');
      }

      // Extract domain
      const domain = this.extractDomain(url);

      // Fetch Open Graph metadata
      const metadata = await this.fetchMetadata(url);

      // Store preview image if available
      let previewImagePath: string | undefined;
      if (metadata.previewImage && userId) {
        previewImagePath = await this.storePreviewImage(
          metadata.previewImage,
          userId
        );
      }

      return {
        domain,
        title: metadata.title || domain,
        description: metadata.description,
        previewImage: previewImagePath || metadata.previewImage,
        fetchedAt: new Date()
      };
    } catch (error) {
      console.error('Link processing error:', error);
      // Return minimal metadata on error
      return {
        domain: this.extractDomain(url),
        title: url,
        fetchedAt: new Date()
      };
    }
  }

  /**
   * Validate URL format (HTTP/HTTPS only)
   * Requirements: 5.1, 5.5
   */
  isValidUrl(urlString: string): boolean {
    try {
      const url = new URL(urlString);
      // Only allow HTTP and HTTPS protocols
      return url.protocol === 'http:' || url.protocol === 'https:';
    } catch {
      return false;
    }
  }

  /**
   * Extract domain from URL
   * Requirements: 5.3
   */
  private extractDomain(urlString: string): string {
    try {
      const url = new URL(urlString);
      return url.hostname;
    } catch {
      return 'unknown';
    }
  }

  /**
   * Fetch Open Graph metadata from URL
   * Requirements: 5.3
   */
  private async fetchMetadata(url: string): Promise<{
    title?: string;
    description?: string;
    previewImage?: string;
  }> {
    try {
      // Fetch the page HTML with proper headers to avoid 403 errors
      const response = await fetch(url, {
        headers: {
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5',
          'Accept-Encoding': 'gzip, deflate, br',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache',
        },
        // Set timeout to avoid hanging
        signal: AbortSignal.timeout(15000) // Increased to 15 seconds
      });

      if (!response.ok) {
        // For 403/401 errors, return basic metadata instead of failing
        if (response.status === 403 || response.status === 401) {
          console.warn(`Access denied for URL ${url}, returning basic metadata`);
          return {
            title: this.extractDomain(url),
            description: `Link to ${this.extractDomain(url)}`
          };
        }
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const html = await response.text();

      // Extract Open Graph tags
      const metadata = {
        title: this.extractMetaTag(html, 'og:title') || this.extractTitle(html),
        description: this.extractMetaTag(html, 'og:description') || 
                    this.extractMetaTag(html, 'description'),
        previewImage: this.extractMetaTag(html, 'og:image')
      };

      return metadata;
    } catch (error) {
      console.error('Metadata fetch error:', error);
      return {};
    }
  }

  /**
   * Extract Open Graph meta tag content from HTML
   */
  private extractMetaTag(html: string, property: string): string | undefined {
    // Try Open Graph format: <meta property="og:title" content="...">
    const ogRegex = new RegExp(
      `<meta[^>]*property=["']${property}["'][^>]*content=["']([^"']*)["']`,
      'i'
    );
    let match = html.match(ogRegex);
    if (match && match[1]) {
      return this.decodeHtmlEntities(match[1]);
    }

    // Try standard meta format: <meta name="description" content="...">
    const metaRegex = new RegExp(
      `<meta[^>]*name=["']${property}["'][^>]*content=["']([^"']*)["']`,
      'i'
    );
    match = html.match(metaRegex);
    if (match && match[1]) {
      return this.decodeHtmlEntities(match[1]);
    }

    // Try reversed attribute order
    const reversedOgRegex = new RegExp(
      `<meta[^>]*content=["']([^"']*)["'][^>]*property=["']${property}["']`,
      'i'
    );
    match = html.match(reversedOgRegex);
    if (match && match[1]) {
      return this.decodeHtmlEntities(match[1]);
    }

    return undefined;
  }

  /**
   * Extract title from HTML <title> tag as fallback
   */
  private extractTitle(html: string): string | undefined {
    const titleRegex = /<title[^>]*>([^<]*)<\/title>/i;
    const match = html.match(titleRegex);
    if (match && match[1]) {
      return this.decodeHtmlEntities(match[1].trim());
    }
    return undefined;
  }

  /**
   * Decode HTML entities in extracted text
   */
  private decodeHtmlEntities(text: string): string {
    const entities: Record<string, string> = {
      '&amp;': '&',
      '&lt;': '<',
      '&gt;': '>',
      '&quot;': '"',
      '&#39;': "'",
      '&apos;': "'"
    };

    return text.replace(/&[^;]+;/g, (entity) => entities[entity] || entity);
  }

  /**
   * Store preview image from URL to storage
   * Requirements: 5.3
   */
  private async storePreviewImage(
    imageUrl: string,
    userId: string
  ): Promise<string | undefined> {
    try {
      // Validate image URL
      if (!this.isValidUrl(imageUrl)) {
        return undefined;
      }

      // Fetch the image
      const response = await fetch(imageUrl, {
        signal: AbortSignal.timeout(10000)
      });

      if (!response.ok) {
        return undefined;
      }

      // Get image buffer
      const arrayBuffer = await response.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      // Generate storage path
      const imageId = this.generateId();
      const storagePath = `link-previews/${userId}/${imageId}.jpg`;

      // Upload to storage
      const uploadResult = await uploadFile(buffer, storagePath, 'image/jpeg');

      if (uploadResult.error) {
        console.error('Preview image upload error:', uploadResult.error);
        return undefined;
      }

      return storagePath;
    } catch (error) {
      console.error('Preview image storage error:', error);
      return undefined;
    }
  }

  /**
   * Generate a unique ID for preview images
   */
  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  }
}
