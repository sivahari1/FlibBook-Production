/**
 * Tests for content type definitions
 * Validates that all interfaces and enums are properly defined
 */

import { describe, it, expect } from 'vitest';
import {
  ContentType,
  ContentMetadata,
  EnhancedDocument,
  BookShopItemData,
  EnhancedBookShopItem,
  UploadData,
  ImageMetadata,
  VideoMetadata,
  LinkMetadata,
  ContentFilter,
  ContentStats,
  BookShopFilter,
  ProcessingResult,
  UploadResponse,
  WatermarkConfig,
  ViewerAnalyticsEvent
} from '../content';

describe('Content Type Definitions', () => {
  describe('ContentType Enum', () => {
    it('should define all required content types', () => {
      // Requirements: 3.1, 4.1, 5.1, 11.3
      expect(ContentType.PDF).toBe('PDF');
      expect(ContentType.IMAGE).toBe('IMAGE');
      expect(ContentType.VIDEO).toBe('VIDEO');
      expect(ContentType.LINK).toBe('LINK');
    });

    it('should have exactly 4 content types', () => {
      const types = Object.values(ContentType);
      expect(types).toHaveLength(4);
    });
  });

  describe('ContentMetadata Interface', () => {
    it('should accept common metadata fields', () => {
      const metadata: ContentMetadata = {
        fileSize: 1024,
        mimeType: 'application/pdf'
      };
      
      expect(metadata.fileSize).toBe(1024);
      expect(metadata.mimeType).toBe('application/pdf');
    });

    it('should accept image-specific metadata', () => {
      // Requirements: 3.1, 3.4
      const metadata: ContentMetadata = {
        width: 1920,
        height: 1080,
        fileSize: 2048,
        mimeType: 'image/jpeg'
      };
      
      expect(metadata.width).toBe(1920);
      expect(metadata.height).toBe(1080);
    });

    it('should accept video-specific metadata', () => {
      // Requirements: 4.1, 4.4
      const metadata: ContentMetadata = {
        duration: 120,
        width: 1920,
        height: 1080,
        bitrate: 5000,
        codec: 'h264',
        fileSize: 10485760,
        mimeType: 'video/mp4'
      };
      
      expect(metadata.duration).toBe(120);
      expect(metadata.codec).toBe('h264');
    });

    it('should accept link-specific metadata', () => {
      // Requirements: 5.1, 5.3
      const metadata: ContentMetadata = {
        domain: 'example.com',
        title: 'Example Page',
        description: 'An example page',
        previewImage: 'https://example.com/preview.jpg',
        fetchedAt: new Date()
      };
      
      expect(metadata.domain).toBe('example.com');
      expect(metadata.title).toBe('Example Page');
    });
  });

  describe('EnhancedDocument Interface', () => {
    it('should create a valid PDF document', () => {
      const doc: EnhancedDocument = {
        id: 'doc1',
        title: 'Test PDF',
        filename: 'test.pdf',
        contentType: ContentType.PDF,
        fileUrl: 'https://storage.example.com/test.pdf',
        metadata: { fileSize: 1024, mimeType: 'application/pdf' },
        userId: 'user1',
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      expect(doc.contentType).toBe(ContentType.PDF);
      expect(doc.title).toBe('Test PDF');
    });

    it('should create a valid image document', () => {
      const doc: EnhancedDocument = {
        id: 'doc2',
        title: 'Test Image',
        filename: 'test.jpg',
        contentType: ContentType.IMAGE,
        fileUrl: 'https://storage.example.com/test.jpg',
        thumbnailUrl: 'https://storage.example.com/thumb.jpg',
        metadata: { width: 1920, height: 1080, fileSize: 2048, mimeType: 'image/jpeg' },
        userId: 'user1',
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      expect(doc.contentType).toBe(ContentType.IMAGE);
      expect(doc.thumbnailUrl).toBeDefined();
    });

    it('should create a valid video document', () => {
      const doc: EnhancedDocument = {
        id: 'doc3',
        title: 'Test Video',
        filename: 'test.mp4',
        contentType: ContentType.VIDEO,
        fileUrl: 'https://storage.example.com/test.mp4',
        thumbnailUrl: 'https://storage.example.com/thumb.jpg',
        metadata: { duration: 120, width: 1920, height: 1080, fileSize: 10485760, mimeType: 'video/mp4' },
        userId: 'user1',
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      expect(doc.contentType).toBe(ContentType.VIDEO);
      expect(doc.metadata.duration).toBe(120);
    });

    it('should create a valid link document', () => {
      const doc: EnhancedDocument = {
        id: 'doc4',
        title: 'Test Link',
        contentType: ContentType.LINK,
        linkUrl: 'https://example.com',
        metadata: { domain: 'example.com', title: 'Example', description: 'Test link' },
        userId: 'user1',
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      expect(doc.contentType).toBe(ContentType.LINK);
      expect(doc.linkUrl).toBe('https://example.com');
    });
  });

  describe('BookShopItemData Interface', () => {
    it('should create valid BookShop item data', () => {
      // Requirements: 11.3, 11.4, 11.5
      const itemData: BookShopItemData = {
        title: 'Test Item',
        description: 'A test item',
        contentType: ContentType.PDF,
        category: 'Education',
        price: 100,
        isFree: false,
        isPublished: true
      };
      
      expect(itemData.contentType).toBe(ContentType.PDF);
      expect(itemData.isFree).toBe(false);
      expect(itemData.isPublished).toBe(true);
    });

    it('should support free items', () => {
      const itemData: BookShopItemData = {
        title: 'Free Item',
        contentType: ContentType.IMAGE,
        category: 'Free Resources',
        price: 0,
        isFree: true,
        isPublished: true
      };
      
      expect(itemData.isFree).toBe(true);
      expect(itemData.price).toBe(0);
    });

    it('should support draft items', () => {
      const itemData: BookShopItemData = {
        title: 'Draft Item',
        contentType: ContentType.VIDEO,
        category: 'Videos',
        price: 200,
        isFree: false,
        isPublished: false
      };
      
      expect(itemData.isPublished).toBe(false);
    });
  });

  describe('EnhancedBookShopItem Interface', () => {
    it('should create a valid BookShop item', () => {
      const item: EnhancedBookShopItem = {
        id: 'item1',
        documentId: 'doc1',
        title: 'Test Item',
        description: 'A test item',
        contentType: ContentType.PDF,
        category: 'Education',
        fileUrl: 'https://storage.example.com/test.pdf',
        metadata: { fileSize: 1024, mimeType: 'application/pdf' },
        isFree: false,
        price: 100,
        isPublished: true,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      expect(item.contentType).toBe(ContentType.PDF);
      expect(item.price).toBe(100);
    });
  });

  describe('UploadData Interface', () => {
    it('should create valid upload data for file upload', () => {
      const uploadData: UploadData = {
        contentType: ContentType.IMAGE,
        title: 'Test Upload',
        description: 'A test upload'
      };
      
      expect(uploadData.contentType).toBe(ContentType.IMAGE);
      expect(uploadData.title).toBe('Test Upload');
    });

    it('should create valid upload data for link', () => {
      const uploadData: UploadData = {
        contentType: ContentType.LINK,
        linkUrl: 'https://example.com',
        title: 'Example Link'
      };
      
      expect(uploadData.contentType).toBe(ContentType.LINK);
      expect(uploadData.linkUrl).toBe('https://example.com');
    });

    it('should support BookShop upload', () => {
      const uploadData: UploadData = {
        contentType: ContentType.PDF,
        title: 'BookShop Item',
        uploadToBookShop: true,
        bookShopData: {
          title: 'BookShop Item',
          contentType: ContentType.PDF,
          category: 'Education',
          price: 100,
          isFree: false,
          isPublished: true
        }
      };
      
      expect(uploadData.uploadToBookShop).toBe(true);
      expect(uploadData.bookShopData).toBeDefined();
    });
  });

  describe('Specialized Metadata Interfaces', () => {
    it('should create valid ImageMetadata', () => {
      const metadata: ImageMetadata = {
        width: 1920,
        height: 1080,
        fileSize: 2048,
        mimeType: 'image/jpeg'
      };
      
      expect(metadata.width).toBe(1920);
      expect(metadata.height).toBe(1080);
    });

    it('should create valid VideoMetadata', () => {
      const metadata: VideoMetadata = {
        duration: 120,
        width: 1920,
        height: 1080,
        fileSize: 10485760,
        mimeType: 'video/mp4',
        bitrate: 5000,
        codec: 'h264'
      };
      
      expect(metadata.duration).toBe(120);
      expect(metadata.codec).toBe('h264');
    });

    it('should create valid LinkMetadata', () => {
      const metadata: LinkMetadata = {
        url: 'https://example.com',
        title: 'Example',
        description: 'An example page',
        domain: 'example.com',
        previewImage: 'https://example.com/preview.jpg',
        fetchedAt: new Date()
      };
      
      expect(metadata.url).toBe('https://example.com');
      expect(metadata.domain).toBe('example.com');
    });
  });

  describe('Filter and Stats Interfaces', () => {
    it('should create valid ContentFilter', () => {
      const filter: ContentFilter = {
        contentType: ContentType.PDF,
        searchQuery: 'test',
        dateRange: {
          start: new Date('2024-01-01'),
          end: new Date('2024-12-31')
        }
      };
      
      expect(filter.contentType).toBe(ContentType.PDF);
      expect(filter.searchQuery).toBe('test');
    });

    it('should create valid ContentStats', () => {
      const stats: ContentStats = {
        totalItems: 100,
        byType: {
          [ContentType.PDF]: 50,
          [ContentType.IMAGE]: 30,
          [ContentType.VIDEO]: 15,
          [ContentType.LINK]: 5
        },
        storageUsed: 1073741824,
        sharesCreated: 25,
        quotaRemaining: 'unlimited'
      };
      
      expect(stats.totalItems).toBe(100);
      expect(stats.quotaRemaining).toBe('unlimited');
    });

    it('should create valid BookShopFilter', () => {
      const filter: BookShopFilter = {
        contentType: ContentType.VIDEO,
        category: 'Education',
        priceRange: [0, 500],
        searchQuery: 'tutorial'
      };
      
      expect(filter.contentType).toBe(ContentType.VIDEO);
      expect(filter.priceRange).toEqual([0, 500]);
    });
  });

  describe('Processing and Response Interfaces', () => {
    it('should create valid ProcessingResult', () => {
      const result: ProcessingResult = {
        fileUrl: 'https://storage.example.com/test.pdf',
        thumbnailUrl: 'https://storage.example.com/thumb.jpg',
        metadata: { fileSize: 1024, mimeType: 'application/pdf' }
      };
      
      expect(result.fileUrl).toBeDefined();
      expect(result.thumbnailUrl).toBeDefined();
    });

    it('should create valid UploadResponse', () => {
      const response: UploadResponse = {
        success: true,
        document: {
          id: 'doc1',
          title: 'Test',
          contentType: ContentType.PDF,
          metadata: {},
          userId: 'user1',
          createdAt: new Date(),
          updatedAt: new Date()
        },
        quotaRemaining: 'unlimited'
      };
      
      expect(response.success).toBe(true);
      expect(response.quotaRemaining).toBe('unlimited');
    });
  });

  describe('Watermark and Analytics Interfaces', () => {
    it('should create valid WatermarkConfig', () => {
      const config: WatermarkConfig = {
        text: 'CONFIDENTIAL',
        opacity: 0.3,
        position: 'center',
        fontSize: 48,
        color: '#000000'
      };
      
      expect(config.text).toBe('CONFIDENTIAL');
      expect(config.position).toBe('center');
    });

    it('should create valid ViewerAnalyticsEvent', () => {
      const event: ViewerAnalyticsEvent = {
        documentId: 'doc1',
        contentType: ContentType.VIDEO,
        action: 'play',
        timestamp: new Date(),
        metadata: { duration: 120 }
      };
      
      expect(event.action).toBe('play');
      expect(event.contentType).toBe(ContentType.VIDEO);
    });
  });
});
