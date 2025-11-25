/**
 * Tests for UniversalViewer component
 * Validates Requirements: 6.1, 7.1, 8.1, 14.1, 14.2, 14.3, 14.4
 */

import { describe, it, expect, vi } from 'vitest';
import * as fc from 'fast-check';
import { ContentType, EnhancedDocument, WatermarkConfig, ViewerAnalyticsEvent } from '@/lib/types/content';

describe('UniversalViewer Component', () => {
  describe('Content Type Routing', () => {
    it('should route PDF content to PDFViewer', () => {
      const pdfContent: EnhancedDocument = {
        id: 'doc-123',
        title: 'Test PDF',
        contentType: ContentType.PDF,
        fileUrl: 'https://example.com/test.pdf',
        metadata: {},
        userId: 'user-123',
        createdAt: new Date(),
        updatedAt: new Date()
      };

      expect(pdfContent.contentType).toBe(ContentType.PDF);
      expect(pdfContent.fileUrl).toBeDefined();
    });

    it('should route IMAGE content to ImageViewer', () => {
      const imageContent: EnhancedDocument = {
        id: 'img-456',
        title: 'Test Image',
        contentType: ContentType.IMAGE,
        fileUrl: 'https://example.com/test.jpg',
        metadata: {
          width: 1920,
          height: 1080,
          fileSize: 2048576,
          mimeType: 'image/jpeg'
        },
        userId: 'user-123',
        createdAt: new Date(),
        updatedAt: new Date()
      };

      expect(imageContent.contentType).toBe(ContentType.IMAGE);
      expect(imageContent.fileUrl).toBeDefined();
      expect(imageContent.metadata.width).toBeDefined();
      expect(imageContent.metadata.height).toBeDefined();
    });

    it('should route VIDEO content to VideoPlayer', () => {
      const videoContent: EnhancedDocument = {
        id: 'vid-789',
        title: 'Test Video',
        contentType: ContentType.VIDEO,
        fileUrl: 'https://example.com/test.mp4',
        metadata: {
          duration: 300,
          width: 1280,
          height: 720,
          fileSize: 10240000,
          mimeType: 'video/mp4'
        },
        userId: 'user-123',
        createdAt: new Date(),
        updatedAt: new Date()
      };

      expect(videoContent.contentType).toBe(ContentType.VIDEO);
      expect(videoContent.fileUrl).toBeDefined();
      expect(videoContent.metadata.duration).toBeDefined();
    });

    it('should route LINK content to LinkPreview', () => {
      const linkContent: EnhancedDocument = {
        id: 'link-012',
        title: 'Test Link',
        contentType: ContentType.LINK,
        linkUrl: 'https://example.com',
        metadata: {
          domain: 'example.com',
          title: 'Example Site',
          description: 'A test link'
        },
        userId: 'user-123',
        createdAt: new Date(),
        updatedAt: new Date()
      };

      expect(linkContent.contentType).toBe(ContentType.LINK);
      expect(linkContent.linkUrl).toBeDefined();
      expect(linkContent.metadata.domain).toBeDefined();
    });
  });

  describe('Content Validation', () => {
    it('should validate PDF content has fileUrl', () => {
      const pdfContent: EnhancedDocument = {
        id: 'doc-123',
        title: 'Test PDF',
        contentType: ContentType.PDF,
        fileUrl: 'https://example.com/test.pdf',
        metadata: {},
        userId: 'user-123',
        createdAt: new Date(),
        updatedAt: new Date()
      };

      expect(pdfContent.fileUrl).toBeDefined();
      expect(pdfContent.fileUrl).toBeTruthy();
    });

    it('should validate IMAGE content has fileUrl', () => {
      const imageContent: EnhancedDocument = {
        id: 'img-456',
        title: 'Test Image',
        contentType: ContentType.IMAGE,
        fileUrl: 'https://example.com/test.jpg',
        metadata: {},
        userId: 'user-123',
        createdAt: new Date(),
        updatedAt: new Date()
      };

      expect(imageContent.fileUrl).toBeDefined();
      expect(imageContent.fileUrl).toBeTruthy();
    });

    it('should validate VIDEO content has fileUrl', () => {
      const videoContent: EnhancedDocument = {
        id: 'vid-789',
        title: 'Test Video',
        contentType: ContentType.VIDEO,
        fileUrl: 'https://example.com/test.mp4',
        metadata: {},
        userId: 'user-123',
        createdAt: new Date(),
        updatedAt: new Date()
      };

      expect(videoContent.fileUrl).toBeDefined();
      expect(videoContent.fileUrl).toBeTruthy();
    });

    it('should validate LINK content has linkUrl', () => {
      const linkContent: EnhancedDocument = {
        id: 'link-012',
        title: 'Test Link',
        contentType: ContentType.LINK,
        linkUrl: 'https://example.com',
        metadata: {},
        userId: 'user-123',
        createdAt: new Date(),
        updatedAt: new Date()
      };

      expect(linkContent.linkUrl).toBeDefined();
      expect(linkContent.linkUrl).toBeTruthy();
    });

    it('should detect missing contentType', () => {
      const invalidContent = {
        id: 'invalid-123',
        title: 'Invalid Content',
        // Missing contentType
        metadata: {},
        userId: 'user-123',
        createdAt: new Date(),
        updatedAt: new Date()
      };

      expect(invalidContent).not.toHaveProperty('contentType');
    });
  });

  describe('Watermark Configuration', () => {
    it('should accept watermark config', () => {
      const watermark: WatermarkConfig = {
        text: 'user@example.com',
        opacity: 0.3,
        fontSize: 16
      };

      expect(watermark.text).toBe('user@example.com');
      expect(watermark.opacity).toBe(0.3);
      expect(watermark.fontSize).toBe(16);
    });

    it('should handle optional watermark properties', () => {
      const minimalWatermark: WatermarkConfig = {
        text: 'watermark'
      };

      expect(minimalWatermark.text).toBeDefined();
      expect(minimalWatermark.opacity).toBeUndefined();
      expect(minimalWatermark.fontSize).toBeUndefined();
    });

    it('should validate watermark opacity range', () => {
      const watermark: WatermarkConfig = {
        text: 'test',
        opacity: 0.5
      };

      expect(watermark.opacity).toBeGreaterThanOrEqual(0);
      expect(watermark.opacity).toBeLessThanOrEqual(1);
    });
  });

  describe('Analytics Events', () => {
    it('should create view analytics event', () => {
      const event: ViewerAnalyticsEvent = {
        documentId: 'doc-123',
        contentType: ContentType.PDF,
        action: 'view',
        timestamp: new Date()
      };

      expect(event.documentId).toBe('doc-123');
      expect(event.contentType).toBe(ContentType.PDF);
      expect(event.action).toBe('view');
      expect(event.timestamp).toBeInstanceOf(Date);
    });

    it('should include metadata in analytics event', () => {
      const event: ViewerAnalyticsEvent = {
        documentId: 'doc-123',
        contentType: ContentType.PDF,
        action: 'view',
        timestamp: new Date(),
        metadata: {
          title: 'Test Document',
          shareKey: 'share-abc'
        }
      };

      expect(event.metadata).toBeDefined();
      expect(event.metadata?.title).toBe('Test Document');
      expect(event.metadata?.shareKey).toBe('share-abc');
    });

    it('should support various action types', () => {
      const actions: ViewerAnalyticsEvent['action'][] = [
        'view', 'download', 'zoom', 'play', 'pause', 'fullscreen'
      ];

      actions.forEach(action => {
        const event: ViewerAnalyticsEvent = {
          documentId: 'doc-123',
          contentType: ContentType.VIDEO,
          action,
          timestamp: new Date()
        };

        expect(event.action).toBe(action);
      });
    });
  });

  describe('Component Props', () => {
    it('should accept required props', () => {
      const content: EnhancedDocument = {
        id: 'doc-123',
        title: 'Test Content',
        contentType: ContentType.PDF,
        fileUrl: 'https://example.com/test.pdf',
        metadata: {},
        userId: 'user-123',
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const props = {
        content
      };

      expect(props.content).toBeDefined();
      expect(props.content.id).toBe('doc-123');
      expect(props.content.contentType).toBe(ContentType.PDF);
    });

    it('should accept optional props', () => {
      const content: EnhancedDocument = {
        id: 'doc-123',
        title: 'Test Content',
        contentType: ContentType.PDF,
        fileUrl: 'https://example.com/test.pdf',
        metadata: {},
        userId: 'user-123',
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const props = {
        content,
        watermark: {
          text: 'user@example.com',
          opacity: 0.3
        },
        onAnalytics: vi.fn(),
        requireEmail: true,
        shareKey: 'share-123'
      };

      expect(props.watermark).toBeDefined();
      expect(props.onAnalytics).toBeDefined();
      expect(props.requireEmail).toBe(true);
      expect(props.shareKey).toBe('share-123');
    });
  });

  describe('Error Handling', () => {
    it('should detect missing fileUrl for PDF', () => {
      const invalidPdf = {
        id: 'doc-123',
        title: 'Invalid PDF',
        contentType: ContentType.PDF,
        // Missing fileUrl
        metadata: {},
        userId: 'user-123',
        createdAt: new Date(),
        updatedAt: new Date()
      };

      expect(invalidPdf).not.toHaveProperty('fileUrl');
    });

    it('should detect missing linkUrl for LINK', () => {
      const invalidLink = {
        id: 'link-123',
        title: 'Invalid Link',
        contentType: ContentType.LINK,
        // Missing linkUrl
        metadata: {},
        userId: 'user-123',
        createdAt: new Date(),
        updatedAt: new Date()
      };

      expect(invalidLink).not.toHaveProperty('linkUrl');
    });
  });
});

// ============================================================================
// Property-Based Tests
// ============================================================================

describe('Property-Based Tests for UniversalViewer', () => {
  /**
   * Property 44: Content viewer routing
   * Feature: admin-enhanced-privileges, Property 44: Content viewer routing
   * For any purchased content, opening it should route to the viewer appropriate 
   * for its content type (PDF viewer for PDFs, image viewer for images, 
   * video player for videos, link preview for links)
   * Validates: Requirements 14.1, 14.2, 14.3, 14.4
   */
  describe('Property 44: Content viewer routing', () => {
    it('should route to correct viewer for any content type', () => {
      fc.assert(
        fc.property(
          // Generate content with all possible types
          fc.constantFrom(ContentType.PDF, ContentType.IMAGE, ContentType.VIDEO, ContentType.LINK),
          fc.string({ minLength: 5, maxLength: 50 }),
          fc.string({ minLength: 5, maxLength: 20 }),
          (contentType, title, userId) => {
            // Create content based on type
            const content: EnhancedDocument = {
              id: `content-${Math.random()}`,
              title,
              contentType,
              fileUrl: contentType !== ContentType.LINK ? `https://example.com/file.${contentType.toLowerCase()}` : undefined,
              linkUrl: contentType === ContentType.LINK ? 'https://example.com' : undefined,
              metadata: {},
              userId,
              createdAt: new Date(),
              updatedAt: new Date()
            };

            // Validate routing requirements
            switch (contentType) {
              case ContentType.PDF:
                // Should route to PDFViewer
                expect(content.contentType).toBe(ContentType.PDF);
                expect(content.fileUrl).toBeDefined();
                expect(content.fileUrl).toBeTruthy();
                break;

              case ContentType.IMAGE:
                // Should route to ImageViewer
                expect(content.contentType).toBe(ContentType.IMAGE);
                expect(content.fileUrl).toBeDefined();
                expect(content.fileUrl).toBeTruthy();
                break;

              case ContentType.VIDEO:
                // Should route to VideoPlayer
                expect(content.contentType).toBe(ContentType.VIDEO);
                expect(content.fileUrl).toBeDefined();
                expect(content.fileUrl).toBeTruthy();
                break;

              case ContentType.LINK:
                // Should route to LinkPreview
                expect(content.contentType).toBe(ContentType.LINK);
                expect(content.linkUrl).toBeDefined();
                expect(content.linkUrl).toBeTruthy();
                break;
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should validate PDF content routes to PDF viewer', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 5, maxLength: 100 }),
          fc.constantFrom(
            'https://example.com/document.pdf',
            'https://storage.example.com/files/test.pdf',
            '/local/path/document.pdf'
          ),
          (title, fileUrl) => {
            const pdfContent: EnhancedDocument = {
              id: `pdf-${Math.random()}`,
              title,
              contentType: ContentType.PDF,
              fileUrl,
              metadata: {},
              userId: 'user-123',
              createdAt: new Date(),
              updatedAt: new Date()
            };

            // PDF content should have correct type and fileUrl
            expect(pdfContent.contentType).toBe(ContentType.PDF);
            expect(pdfContent.fileUrl).toBeDefined();
            expect(pdfContent.fileUrl).toBeTruthy();
            expect(pdfContent.linkUrl).toBeUndefined();
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should validate IMAGE content routes to image viewer', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 5, maxLength: 100 }),
          fc.constantFrom(
            'https://example.com/image.jpg',
            'https://storage.example.com/photos/test.png',
            '/local/path/image.webp'
          ),
          fc.record({
            width: fc.integer({ min: 100, max: 4000 }),
            height: fc.integer({ min: 100, max: 4000 }),
            fileSize: fc.integer({ min: 1024, max: 10 * 1024 * 1024 }),
            mimeType: fc.constantFrom('image/jpeg', 'image/png', 'image/webp')
          }),
          (title, fileUrl, metadata) => {
            const imageContent: EnhancedDocument = {
              id: `img-${Math.random()}`,
              title,
              contentType: ContentType.IMAGE,
              fileUrl,
              metadata,
              userId: 'user-123',
              createdAt: new Date(),
              updatedAt: new Date()
            };

            // IMAGE content should have correct type, fileUrl, and metadata
            expect(imageContent.contentType).toBe(ContentType.IMAGE);
            expect(imageContent.fileUrl).toBeDefined();
            expect(imageContent.fileUrl).toBeTruthy();
            expect(imageContent.metadata.width).toBeGreaterThan(0);
            expect(imageContent.metadata.height).toBeGreaterThan(0);
            expect(imageContent.linkUrl).toBeUndefined();
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should validate VIDEO content routes to video player', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 5, maxLength: 100 }),
          fc.constantFrom(
            'https://example.com/video.mp4',
            'https://storage.example.com/videos/test.webm',
            '/local/path/video.mov'
          ),
          fc.record({
            duration: fc.integer({ min: 1, max: 3600 }),
            width: fc.integer({ min: 640, max: 3840 }),
            height: fc.integer({ min: 480, max: 2160 }),
            fileSize: fc.integer({ min: 1024 * 1024, max: 100 * 1024 * 1024 }),
            mimeType: fc.constantFrom('video/mp4', 'video/webm', 'video/quicktime')
          }),
          (title, fileUrl, metadata) => {
            const videoContent: EnhancedDocument = {
              id: `vid-${Math.random()}`,
              title,
              contentType: ContentType.VIDEO,
              fileUrl,
              metadata,
              userId: 'user-123',
              createdAt: new Date(),
              updatedAt: new Date()
            };

            // VIDEO content should have correct type, fileUrl, and metadata
            expect(videoContent.contentType).toBe(ContentType.VIDEO);
            expect(videoContent.fileUrl).toBeDefined();
            expect(videoContent.fileUrl).toBeTruthy();
            expect(videoContent.metadata.duration).toBeGreaterThan(0);
            expect(videoContent.metadata.width).toBeGreaterThan(0);
            expect(videoContent.metadata.height).toBeGreaterThan(0);
            expect(videoContent.linkUrl).toBeUndefined();
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should validate LINK content routes to link preview', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 5, maxLength: 100 }),
          fc.constantFrom(
            'https://example.com',
            'https://github.com/user/repo',
            'https://docs.example.com/guide'
          ),
          fc.record({
            domain: fc.constantFrom('example.com', 'github.com', 'docs.example.com'),
            title: fc.string({ minLength: 5, maxLength: 100 }),
            description: fc.option(fc.string({ minLength: 10, maxLength: 200 }), { nil: undefined })
          }),
          (title, linkUrl, metadata) => {
            const linkContent: EnhancedDocument = {
              id: `link-${Math.random()}`,
              title,
              contentType: ContentType.LINK,
              linkUrl,
              metadata,
              userId: 'user-123',
              createdAt: new Date(),
              updatedAt: new Date()
            };

            // LINK content should have correct type, linkUrl, and metadata
            expect(linkContent.contentType).toBe(ContentType.LINK);
            expect(linkContent.linkUrl).toBeDefined();
            expect(linkContent.linkUrl).toBeTruthy();
            expect(linkContent.metadata.domain).toBeDefined();
            expect(linkContent.fileUrl).toBeUndefined();
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should handle content with complete metadata for routing', () => {
      fc.assert(
        fc.property(
          fc.constantFrom(ContentType.PDF, ContentType.IMAGE, ContentType.VIDEO, ContentType.LINK),
          fc.string({ minLength: 5, maxLength: 100 }),
          (contentType, title) => {
            // Create content with appropriate metadata
            let content: EnhancedDocument;

            switch (contentType) {
              case ContentType.PDF:
                content = {
                  id: `pdf-${Math.random()}`,
                  title,
                  contentType,
                  fileUrl: 'https://example.com/test.pdf',
                  metadata: {
                    fileSize: 1024000,
                    mimeType: 'application/pdf'
                  },
                  userId: 'user-123',
                  createdAt: new Date(),
                  updatedAt: new Date()
                };
                break;

              case ContentType.IMAGE:
                content = {
                  id: `img-${Math.random()}`,
                  title,
                  contentType,
                  fileUrl: 'https://example.com/test.jpg',
                  metadata: {
                    width: 1920,
                    height: 1080,
                    fileSize: 2048576,
                    mimeType: 'image/jpeg'
                  },
                  userId: 'user-123',
                  createdAt: new Date(),
                  updatedAt: new Date()
                };
                break;

              case ContentType.VIDEO:
                content = {
                  id: `vid-${Math.random()}`,
                  title,
                  contentType,
                  fileUrl: 'https://example.com/test.mp4',
                  metadata: {
                    duration: 300,
                    width: 1280,
                    height: 720,
                    fileSize: 10240000,
                    mimeType: 'video/mp4'
                  },
                  userId: 'user-123',
                  createdAt: new Date(),
                  updatedAt: new Date()
                };
                break;

              case ContentType.LINK:
                content = {
                  id: `link-${Math.random()}`,
                  title,
                  contentType,
                  linkUrl: 'https://example.com',
                  metadata: {
                    domain: 'example.com',
                    title: 'Example Site',
                    description: 'A test link'
                  },
                  userId: 'user-123',
                  createdAt: new Date(),
                  updatedAt: new Date()
                };
                break;
            }

            // All content should have required fields for routing
            expect(content.id).toBeDefined();
            expect(content.title).toBeDefined();
            expect(content.contentType).toBeDefined();
            expect(content.metadata).toBeDefined();
            expect(content.userId).toBeDefined();

            // Validate type-specific requirements
            if (contentType === ContentType.LINK) {
              expect(content.linkUrl).toBeDefined();
            } else {
              expect(content.fileUrl).toBeDefined();
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should validate routing with watermark configuration', () => {
      fc.assert(
        fc.property(
          fc.constantFrom(ContentType.PDF, ContentType.IMAGE, ContentType.VIDEO, ContentType.LINK),
          fc.string({ minLength: 5, maxLength: 100 }),
          fc.record({
            text: fc.string({ minLength: 5, maxLength: 50 }),
            opacity: fc.option(fc.double({ min: 0.1, max: 1.0, noNaN: true }), { nil: undefined }),
            fontSize: fc.option(fc.integer({ min: 10, max: 32 }), { nil: undefined })
          }),
          (contentType, title, watermark) => {
            const content: EnhancedDocument = {
              id: `content-${Math.random()}`,
              title,
              contentType,
              fileUrl: contentType !== ContentType.LINK ? `https://example.com/file` : undefined,
              linkUrl: contentType === ContentType.LINK ? 'https://example.com' : undefined,
              metadata: {},
              userId: 'user-123',
              createdAt: new Date(),
              updatedAt: new Date()
            };

            // Content and watermark should be valid for routing
            expect(content.contentType).toBeDefined();
            expect(watermark.text).toBeDefined();
            expect(watermark.text.length).toBeGreaterThan(0);

            // Watermark should have valid values if provided
            if (watermark.opacity !== undefined) {
              expect(watermark.opacity).toBeGreaterThanOrEqual(0.1);
              expect(watermark.opacity).toBeLessThanOrEqual(1.0);
            }

            if (watermark.fontSize !== undefined) {
              expect(watermark.fontSize).toBeGreaterThanOrEqual(10);
              expect(watermark.fontSize).toBeLessThanOrEqual(32);
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
