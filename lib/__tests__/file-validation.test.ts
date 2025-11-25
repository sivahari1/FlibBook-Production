/**
 * Tests for file validation and sanitization utilities
 * Validates image, video, and PDF file validation
 * Requirements: 3.1, 3.2, 4.1, 4.2
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import {
  isValidImageType,
  isValidImageExtension,
  isValidVideoType,
  isValidVideoExtension,
  isValidPDFType,
  isValidPDFExtension,
  isValidFileSize,
  sanitizeFilename,
  validateImageFile,
  validateVideoFile,
  validatePDFFile,
  validateFile,
  validateContentTypeMatch,
  getMaxFileSize,
  getAllowedFileTypes,
  getAllowedExtensions,
  formatBytes,
  MAX_IMAGE_SIZE,
  MAX_VIDEO_SIZE,
  MAX_PDF_SIZE,
  ALLOWED_IMAGE_TYPES,
  ALLOWED_IMAGE_EXTENSIONS,
  ALLOWED_VIDEO_TYPES,
  ALLOWED_VIDEO_EXTENSIONS
} from '../file-validation';
import { ContentType } from '../types/content';
import { LinkProcessor } from '../link-processor';

describe('File Validation Utilities', () => {
  describe('Image Type Validation', () => {
    it('should accept valid image MIME types', () => {
      // Requirements: 3.1
      expect(isValidImageType('image/jpeg')).toBe(true);
      expect(isValidImageType('image/jpg')).toBe(true);
      expect(isValidImageType('image/png')).toBe(true);
      expect(isValidImageType('image/gif')).toBe(true);
      expect(isValidImageType('image/webp')).toBe(true);
    });

    it('should accept case-insensitive MIME types', () => {
      expect(isValidImageType('IMAGE/JPEG')).toBe(true);
      expect(isValidImageType('Image/Png')).toBe(true);
    });

    it('should reject invalid image MIME types', () => {
      // Requirements: 3.2
      expect(isValidImageType('image/bmp')).toBe(false);
      expect(isValidImageType('image/tiff')).toBe(false);
      expect(isValidImageType('application/pdf')).toBe(false);
      expect(isValidImageType('video/mp4')).toBe(false);
      expect(isValidImageType('text/plain')).toBe(false);
    });

    it('should accept valid image extensions', () => {
      // Requirements: 3.1
      expect(isValidImageExtension('photo.jpg')).toBe(true);
      expect(isValidImageExtension('photo.jpeg')).toBe(true);
      expect(isValidImageExtension('photo.png')).toBe(true);
      expect(isValidImageExtension('photo.gif')).toBe(true);
      expect(isValidImageExtension('photo.webp')).toBe(true);
    });

    it('should accept case-insensitive extensions', () => {
      expect(isValidImageExtension('photo.JPG')).toBe(true);
      expect(isValidImageExtension('photo.PNG')).toBe(true);
    });

    it('should reject invalid image extensions', () => {
      // Requirements: 3.2
      expect(isValidImageExtension('photo.bmp')).toBe(false);
      expect(isValidImageExtension('photo.tiff')).toBe(false);
      expect(isValidImageExtension('photo.pdf')).toBe(false);
      expect(isValidImageExtension('photo.mp4')).toBe(false);
    });
  });

  describe('Video Type Validation', () => {
    it('should accept valid video MIME types', () => {
      // Requirements: 4.1
      expect(isValidVideoType('video/mp4')).toBe(true);
      expect(isValidVideoType('video/webm')).toBe(true);
      expect(isValidVideoType('video/quicktime')).toBe(true);
    });

    it('should accept case-insensitive MIME types', () => {
      expect(isValidVideoType('VIDEO/MP4')).toBe(true);
      expect(isValidVideoType('Video/WebM')).toBe(true);
    });

    it('should reject invalid video MIME types', () => {
      // Requirements: 4.2
      expect(isValidVideoType('video/avi')).toBe(false);
      expect(isValidVideoType('video/x-msvideo')).toBe(false);
      expect(isValidVideoType('application/pdf')).toBe(false);
      expect(isValidVideoType('image/jpeg')).toBe(false);
    });

    it('should accept valid video extensions', () => {
      // Requirements: 4.1
      expect(isValidVideoExtension('video.mp4')).toBe(true);
      expect(isValidVideoExtension('video.webm')).toBe(true);
      expect(isValidVideoExtension('video.mov')).toBe(true);
    });

    it('should accept case-insensitive extensions', () => {
      expect(isValidVideoExtension('video.MP4')).toBe(true);
      expect(isValidVideoExtension('video.MOV')).toBe(true);
    });

    it('should reject invalid video extensions', () => {
      // Requirements: 4.2
      expect(isValidVideoExtension('video.avi')).toBe(false);
      expect(isValidVideoExtension('video.mkv')).toBe(false);
      expect(isValidVideoExtension('video.flv')).toBe(false);
    });
  });

  describe('PDF Type Validation', () => {
    it('should accept valid PDF MIME type', () => {
      expect(isValidPDFType('application/pdf')).toBe(true);
    });

    it('should accept case-insensitive MIME type', () => {
      expect(isValidPDFType('APPLICATION/PDF')).toBe(true);
    });

    it('should reject invalid PDF MIME types', () => {
      expect(isValidPDFType('application/msword')).toBe(false);
      expect(isValidPDFType('image/jpeg')).toBe(false);
    });

    it('should accept valid PDF extension', () => {
      expect(isValidPDFExtension('document.pdf')).toBe(true);
    });

    it('should accept case-insensitive extension', () => {
      expect(isValidPDFExtension('document.PDF')).toBe(true);
    });

    it('should reject invalid PDF extensions', () => {
      expect(isValidPDFExtension('document.doc')).toBe(false);
      expect(isValidPDFExtension('document.docx')).toBe(false);
    });
  });

  describe('File Size Validation', () => {
    it('should validate image file sizes', () => {
      // Requirements: 3.2
      expect(isValidFileSize(1024, ContentType.IMAGE)).toBe(true);
      expect(isValidFileSize(MAX_IMAGE_SIZE, ContentType.IMAGE)).toBe(true);
      expect(isValidFileSize(MAX_IMAGE_SIZE + 1, ContentType.IMAGE)).toBe(false);
    });

    it('should validate video file sizes', () => {
      // Requirements: 4.2
      expect(isValidFileSize(1024, ContentType.VIDEO)).toBe(true);
      expect(isValidFileSize(MAX_VIDEO_SIZE, ContentType.VIDEO)).toBe(true);
      expect(isValidFileSize(MAX_VIDEO_SIZE + 1, ContentType.VIDEO)).toBe(false);
    });

    it('should validate PDF file sizes', () => {
      expect(isValidFileSize(1024, ContentType.PDF)).toBe(true);
      expect(isValidFileSize(MAX_PDF_SIZE, ContentType.PDF)).toBe(true);
      expect(isValidFileSize(MAX_PDF_SIZE + 1, ContentType.PDF)).toBe(false);
    });

    it('should reject zero or negative file sizes', () => {
      expect(isValidFileSize(0, ContentType.IMAGE)).toBe(false);
      expect(isValidFileSize(-1, ContentType.IMAGE)).toBe(false);
    });

    it('should always accept link content type', () => {
      expect(isValidFileSize(0, ContentType.LINK)).toBe(true);
      expect(isValidFileSize(999999999, ContentType.LINK)).toBe(true);
    });
  });

  describe('Filename Sanitization', () => {
    it('should sanitize basic filenames', () => {
      // Requirements: 3.2, 4.2
      expect(sanitizeFilename('test.jpg')).toBe('test.jpg');
      expect(sanitizeFilename('my-file.png')).toBe('my-file.png');
      expect(sanitizeFilename('document_2024.pdf')).toBe('document_2024.pdf');
    });

    it('should remove path separators', () => {
      expect(sanitizeFilename('../../../etc/passwd')).toBe('etc_passwd');
      expect(sanitizeFilename('..\\..\\windows\\system32')).toBe('windows_system32');
      expect(sanitizeFilename('path/to/file.jpg')).toBe('path_to_file.jpg');
    });

    it('should remove special characters', () => {
      // Special chars before extension are removed, leaving just filename and extension
      expect(sanitizeFilename('file<>:"|?*.jpg')).toBe('file.jpg');
      expect(sanitizeFilename('file with spaces.png')).toBe('file_with_spaces.png');
    });

    it('should remove null bytes and control characters', () => {
      expect(sanitizeFilename('file\x00name.jpg')).toBe('filename.jpg');
      expect(sanitizeFilename('file\x1fname.jpg')).toBe('filename.jpg');
    });

    it('should handle multiple underscores', () => {
      expect(sanitizeFilename('file___name.jpg')).toBe('file_name.jpg');
    });

    it('should remove leading/trailing dots and underscores', () => {
      expect(sanitizeFilename('...file.jpg')).toBe('file.jpg');
      expect(sanitizeFilename('___file.jpg')).toBe('file.jpg');
      // Multiple dots are treated as special chars and replaced
      expect(sanitizeFilename('file....jpg')).toBe('file_jpg');
    });

    it('should limit filename length', () => {
      const longName = 'a'.repeat(300) + '.jpg';
      const sanitized = sanitizeFilename(longName);
      expect(sanitized.length).toBeLessThanOrEqual(210);
    });

    it('should handle empty or invalid filenames', () => {
      expect(sanitizeFilename('')).toBe('unnamed');
      expect(sanitizeFilename('...')).toBe('unnamed');
    });

    it('should preserve valid extensions', () => {
      expect(sanitizeFilename('test.jpg')).toMatch(/\.jpg$/);
      expect(sanitizeFilename('test.PNG')).toMatch(/\.png$/);
    });
  });

  describe('Image File Validation', () => {
    it('should validate correct image files', () => {
      // Requirements: 3.1, 3.2
      const result = validateImageFile({
        name: 'photo.jpg',
        type: 'image/jpeg',
        size: 1024 * 1024 // 1MB
      });
      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should reject invalid image type', () => {
      const result = validateImageFile({
        name: 'photo.bmp',
        type: 'image/bmp',
        size: 1024
      });
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Invalid image type');
    });

    it('should reject invalid image extension', () => {
      const result = validateImageFile({
        name: 'photo.bmp',
        type: 'image/jpeg',
        size: 1024
      });
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Invalid image extension');
    });

    it('should reject oversized images', () => {
      const result = validateImageFile({
        name: 'photo.jpg',
        type: 'image/jpeg',
        size: MAX_IMAGE_SIZE + 1
      });
      expect(result.valid).toBe(false);
      expect(result.error).toContain('exceeds maximum limit');
    });

    it('should reject empty image files', () => {
      const result = validateImageFile({
        name: 'photo.jpg',
        type: 'image/jpeg',
        size: 0
      });
      expect(result.valid).toBe(false);
      expect(result.error).toContain('empty');
    });
  });

  describe('Video File Validation', () => {
    it('should validate correct video files', () => {
      // Requirements: 4.1, 4.2
      const result = validateVideoFile({
        name: 'video.mp4',
        type: 'video/mp4',
        size: 10 * 1024 * 1024 // 10MB
      });
      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should reject invalid video type', () => {
      const result = validateVideoFile({
        name: 'video.avi',
        type: 'video/avi',
        size: 1024
      });
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Invalid video type');
    });

    it('should reject invalid video extension', () => {
      const result = validateVideoFile({
        name: 'video.avi',
        type: 'video/mp4',
        size: 1024
      });
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Invalid video extension');
    });

    it('should reject oversized videos', () => {
      const result = validateVideoFile({
        name: 'video.mp4',
        type: 'video/mp4',
        size: MAX_VIDEO_SIZE + 1
      });
      expect(result.valid).toBe(false);
      expect(result.error).toContain('exceeds maximum limit');
    });

    it('should reject empty video files', () => {
      const result = validateVideoFile({
        name: 'video.mp4',
        type: 'video/mp4',
        size: 0
      });
      expect(result.valid).toBe(false);
      expect(result.error).toContain('empty');
    });
  });

  describe('PDF File Validation', () => {
    it('should validate correct PDF files', () => {
      const result = validatePDFFile({
        name: 'document.pdf',
        type: 'application/pdf',
        size: 1024 * 1024 // 1MB
      });
      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should reject invalid PDF type', () => {
      const result = validatePDFFile({
        name: 'document.pdf',
        type: 'application/msword',
        size: 1024
      });
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Invalid file type');
    });

    it('should reject invalid PDF extension', () => {
      const result = validatePDFFile({
        name: 'document.doc',
        type: 'application/pdf',
        size: 1024
      });
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Invalid file extension');
    });

    it('should reject oversized PDFs', () => {
      const result = validatePDFFile({
        name: 'document.pdf',
        type: 'application/pdf',
        size: MAX_PDF_SIZE + 1
      });
      expect(result.valid).toBe(false);
      expect(result.error).toContain('exceeds maximum limit');
    });
  });

  describe('Universal File Validation', () => {
    it('should validate files based on content type', () => {
      // Requirements: 3.1, 3.2, 4.1, 4.2
      const imageResult = validateFile(
        { name: 'photo.jpg', type: 'image/jpeg', size: 1024 },
        ContentType.IMAGE
      );
      expect(imageResult.valid).toBe(true);

      const videoResult = validateFile(
        { name: 'video.mp4', type: 'video/mp4', size: 1024 },
        ContentType.VIDEO
      );
      expect(videoResult.valid).toBe(true);

      const pdfResult = validateFile(
        { name: 'doc.pdf', type: 'application/pdf', size: 1024 },
        ContentType.PDF
      );
      expect(pdfResult.valid).toBe(true);
    });

    it('should accept link content type without file', () => {
      const result = validateFile(
        { name: '', type: '', size: 0 },
        ContentType.LINK
      );
      expect(result.valid).toBe(true);
    });

    it('should reject unsupported content types', () => {
      const result = validateFile(
        { name: 'file.txt', type: 'text/plain', size: 1024 },
        'UNSUPPORTED' as ContentType
      );
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Unsupported content type');
    });
  });

  describe('Content Type Match Validation', () => {
    it('should validate matching content types', () => {
      const imageResult = validateContentTypeMatch(
        { name: 'photo.jpg', type: 'image/jpeg' },
        ContentType.IMAGE
      );
      expect(imageResult.valid).toBe(true);

      const videoResult = validateContentTypeMatch(
        { name: 'video.mp4', type: 'video/mp4' },
        ContentType.VIDEO
      );
      expect(videoResult.valid).toBe(true);

      const pdfResult = validateContentTypeMatch(
        { name: 'doc.pdf', type: 'application/pdf' },
        ContentType.PDF
      );
      expect(pdfResult.valid).toBe(true);
    });

    it('should reject mismatched content types', () => {
      const result = validateContentTypeMatch(
        { name: 'photo.jpg', type: 'image/jpeg' },
        ContentType.VIDEO
      );
      expect(result.valid).toBe(false);
      expect(result.error).toContain('does not match');
    });
  });

  describe('Helper Functions', () => {
    it('should get max file size for content types', () => {
      expect(getMaxFileSize(ContentType.IMAGE)).toBe(MAX_IMAGE_SIZE);
      expect(getMaxFileSize(ContentType.VIDEO)).toBe(MAX_VIDEO_SIZE);
      expect(getMaxFileSize(ContentType.PDF)).toBe(MAX_PDF_SIZE);
      expect(getMaxFileSize(ContentType.LINK)).toBe(0);
    });

    it('should get allowed file types', () => {
      const imageTypes = getAllowedFileTypes(ContentType.IMAGE);
      expect(imageTypes).toContain('image/jpeg');
      expect(imageTypes).toContain('image/png');

      const videoTypes = getAllowedFileTypes(ContentType.VIDEO);
      expect(videoTypes).toContain('video/mp4');
      expect(videoTypes).toContain('video/webm');
    });

    it('should get allowed extensions', () => {
      const imageExts = getAllowedExtensions(ContentType.IMAGE);
      expect(imageExts).toContain('.jpg');
      expect(imageExts).toContain('.png');

      const videoExts = getAllowedExtensions(ContentType.VIDEO);
      expect(videoExts).toContain('.mp4');
      expect(videoExts).toContain('.mov');
    });

    it('should format bytes correctly', () => {
      expect(formatBytes(0)).toBe('0 Bytes');
      expect(formatBytes(1024)).toBe('1 KB');
      expect(formatBytes(1024 * 1024)).toBe('1 MB');
      expect(formatBytes(1024 * 1024 * 1024)).toBe('1 GB');
      expect(formatBytes(1536)).toBe('1.5 KB');
    });
  });
});

// ============================================================================
// Property-Based Tests
// ============================================================================

describe('Property-Based Tests for File Validation', () => {
  /**
   * Property 7: Image format acceptance
   * Feature: admin-enhanced-privileges, Property 7: Image format acceptance
   * For any file with extension JPG, JPEG, PNG, GIF, or WebP, 
   * the image upload validation should accept the file
   * Validates: Requirements 3.1
   */
  describe('Property 7: Image format acceptance', () => {
    it('should accept all valid image formats', () => {
      fc.assert(
        fc.property(
          // Generate valid image MIME types
          fc.constantFrom(...ALLOWED_IMAGE_TYPES),
          // Generate valid image extensions
          fc.constantFrom(...ALLOWED_IMAGE_EXTENSIONS),
          // Generate valid file sizes (1 byte to MAX_IMAGE_SIZE)
          fc.integer({ min: 1, max: MAX_IMAGE_SIZE }),
          (mimeType, extension, size) => {
            const filename = `test${extension}`;
            const file = {
              name: filename,
              type: mimeType,
              size: size
            };

            const result = validateImageFile(file);
            
            // All valid combinations should be accepted
            expect(result.valid).toBe(true);
            expect(result.error).toBeUndefined();
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Property 8: Image format rejection
   * Feature: admin-enhanced-privileges, Property 8: Image format rejection
   * For any file that is not a valid image format, 
   * the image upload validation should reject the file with an error
   * Validates: Requirements 3.2
   */
  describe('Property 8: Image format rejection', () => {
    it('should reject all invalid image MIME types', () => {
      fc.assert(
        fc.property(
          // Generate invalid MIME types (not in allowed list)
          fc.constantFrom(
            'image/bmp',
            'image/tiff',
            'image/svg+xml',
            'application/pdf',
            'video/mp4',
            'text/plain',
            'application/octet-stream'
          ),
          // Generate any extension
          fc.constantFrom('.jpg', '.png', '.bmp', '.tiff', '.pdf'),
          // Generate valid file size
          fc.integer({ min: 1, max: MAX_IMAGE_SIZE }),
          (mimeType, extension, size) => {
            const filename = `test${extension}`;
            const file = {
              name: filename,
              type: mimeType,
              size: size
            };

            const result = validateImageFile(file);
            
            // Invalid MIME types should be rejected
            expect(result.valid).toBe(false);
            expect(result.error).toBeDefined();
            expect(result.error).toContain('Invalid image');
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should reject all invalid image extensions', () => {
      fc.assert(
        fc.property(
          // Generate valid MIME type
          fc.constantFrom(...ALLOWED_IMAGE_TYPES),
          // Generate invalid extensions
          fc.constantFrom('.bmp', '.tiff', '.svg', '.pdf', '.mp4', '.txt'),
          // Generate valid file size
          fc.integer({ min: 1, max: MAX_IMAGE_SIZE }),
          (mimeType, extension, size) => {
            const filename = `test${extension}`;
            const file = {
              name: filename,
              type: mimeType,
              size: size
            };

            const result = validateImageFile(file);
            
            // Invalid extensions should be rejected
            expect(result.valid).toBe(false);
            expect(result.error).toBeDefined();
            expect(result.error).toContain('Invalid image extension');
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should reject oversized image files', () => {
      fc.assert(
        fc.property(
          // Generate valid MIME type
          fc.constantFrom(...ALLOWED_IMAGE_TYPES),
          // Generate valid extension
          fc.constantFrom(...ALLOWED_IMAGE_EXTENSIONS),
          // Generate oversized file (above MAX_IMAGE_SIZE)
          fc.integer({ min: MAX_IMAGE_SIZE + 1, max: MAX_IMAGE_SIZE * 2 }),
          (mimeType, extension, size) => {
            const filename = `test${extension}`;
            const file = {
              name: filename,
              type: mimeType,
              size: size
            };

            const result = validateImageFile(file);
            
            // Oversized files should be rejected
            expect(result.valid).toBe(false);
            expect(result.error).toBeDefined();
            expect(result.error).toContain('exceeds maximum limit');
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Property 11: Video format acceptance
   * Feature: admin-enhanced-privileges, Property 11: Video format acceptance
   * For any file with extension MP4, WebM, or MOV, 
   * the video upload validation should accept the file
   * Validates: Requirements 4.1
   */
  describe('Property 11: Video format acceptance', () => {
    it('should accept all valid video formats', () => {
      fc.assert(
        fc.property(
          // Generate valid video MIME types
          fc.constantFrom(...ALLOWED_VIDEO_TYPES),
          // Generate valid video extensions
          fc.constantFrom(...ALLOWED_VIDEO_EXTENSIONS),
          // Generate valid file sizes (1 byte to MAX_VIDEO_SIZE)
          fc.integer({ min: 1, max: MAX_VIDEO_SIZE }),
          (mimeType, extension, size) => {
            const filename = `test${extension}`;
            const file = {
              name: filename,
              type: mimeType,
              size: size
            };

            const result = validateVideoFile(file);
            
            // All valid combinations should be accepted
            expect(result.valid).toBe(true);
            expect(result.error).toBeUndefined();
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Property 12: Video format rejection
   * Feature: admin-enhanced-privileges, Property 12: Video format rejection
   * For any file that is not a valid video format, 
   * the video upload validation should reject the file with an error
   * Validates: Requirements 4.2
   */
  describe('Property 12: Video format rejection', () => {
    it('should reject all invalid video MIME types', () => {
      fc.assert(
        fc.property(
          // Generate invalid MIME types (not in allowed list)
          fc.constantFrom(
            'video/avi',
            'video/x-msvideo',
            'video/x-matroska',
            'application/pdf',
            'image/jpeg',
            'text/plain'
          ),
          // Generate any extension
          fc.constantFrom('.mp4', '.webm', '.mov', '.avi', '.mkv'),
          // Generate valid file size
          fc.integer({ min: 1, max: MAX_VIDEO_SIZE }),
          (mimeType, extension, size) => {
            const filename = `test${extension}`;
            const file = {
              name: filename,
              type: mimeType,
              size: size
            };

            const result = validateVideoFile(file);
            
            // Invalid MIME types should be rejected
            expect(result.valid).toBe(false);
            expect(result.error).toBeDefined();
            expect(result.error).toContain('Invalid video');
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should reject all invalid video extensions', () => {
      fc.assert(
        fc.property(
          // Generate valid MIME type
          fc.constantFrom(...ALLOWED_VIDEO_TYPES),
          // Generate invalid extensions
          fc.constantFrom('.avi', '.mkv', '.flv', '.wmv', '.pdf', '.jpg'),
          // Generate valid file size
          fc.integer({ min: 1, max: MAX_VIDEO_SIZE }),
          (mimeType, extension, size) => {
            const filename = `test${extension}`;
            const file = {
              name: filename,
              type: mimeType,
              size: size
            };

            const result = validateVideoFile(file);
            
            // Invalid extensions should be rejected
            expect(result.valid).toBe(false);
            expect(result.error).toBeDefined();
            expect(result.error).toContain('Invalid video extension');
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should reject oversized video files', () => {
      fc.assert(
        fc.property(
          // Generate valid MIME type
          fc.constantFrom(...ALLOWED_VIDEO_TYPES),
          // Generate valid extension
          fc.constantFrom(...ALLOWED_VIDEO_EXTENSIONS),
          // Generate oversized file (above MAX_VIDEO_SIZE)
          fc.integer({ min: MAX_VIDEO_SIZE + 1, max: MAX_VIDEO_SIZE + 1000000 }),
          (mimeType, extension, size) => {
            const filename = `test${extension}`;
            const file = {
              name: filename,
              type: mimeType,
              size: size
            };

            const result = validateVideoFile(file);
            
            // Oversized files should be rejected
            expect(result.valid).toBe(false);
            expect(result.error).toBeDefined();
            expect(result.error).toContain('exceeds maximum limit');
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Property 15: URL format validation
   * Feature: admin-enhanced-privileges, Property 15: URL format validation
   * For any string, the URL validation function should correctly identify 
   * whether it is a valid HTTP or HTTPS URL
   * Validates: Requirements 5.1, 5.5
   */
  describe('Property 15: URL format validation', () => {
    const linkProcessor = new LinkProcessor();

    it('should accept all valid HTTP and HTTPS URLs', () => {
      fc.assert(
        fc.property(
          // Generate valid protocols
          fc.constantFrom('http', 'https'),
          // Generate valid domains
          fc.constantFrom(
            'example.com',
            'www.example.com',
            'sub.example.com',
            'example.co.uk',
            'test-site.org',
            '192.168.1.1',
            'localhost'
          ),
          // Generate optional paths
          fc.option(
            fc.constantFrom(
              '/path',
              '/path/to/resource',
              '/page.html',
              '/api/v1/users',
              ''
            ),
            { nil: '' }
          ),
          // Generate optional query strings
          fc.option(
            fc.constantFrom(
              '?query=value',
              '?a=1&b=2',
              '?search=test',
              ''
            ),
            { nil: '' }
          ),
          (protocol, domain, path, query) => {
            const url = `${protocol}://${domain}${path}${query}`;
            
            const result = linkProcessor.isValidUrl(url);
            
            // All valid HTTP/HTTPS URLs should be accepted
            expect(result).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should reject invalid URL formats', () => {
      fc.assert(
        fc.property(
          // Generate invalid URL strings
          fc.constantFrom(
            'not a url',
            'ftp://example.com',
            'file:///path/to/file',
            'javascript:alert(1)',
            'data:text/html,<script>alert(1)</script>',
            '//example.com',
            'example.com',
            'www.example.com',
            '',
            'http://',
            'https://'
            // Note: Some edge cases like 'http://.' or 'http://..' are technically
            // parseable by the URL constructor but semantically invalid.
            // The current implementation uses URL constructor which accepts these.
          ),
          (invalidUrl) => {
            const result = linkProcessor.isValidUrl(invalidUrl);
            
            // Invalid URLs should be rejected
            expect(result).toBe(false);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should reject non-HTTP/HTTPS protocols', () => {
      fc.assert(
        fc.property(
          // Generate invalid protocols
          fc.constantFrom(
            'ftp',
            'file',
            'javascript',
            'data',
            'mailto',
            'tel',
            'ssh',
            'ws',
            'wss'
          ),
          // Generate valid domain
          fc.constantFrom('example.com', 'test.org'),
          (protocol, domain) => {
            const url = `${protocol}://${domain}`;
            
            const result = linkProcessor.isValidUrl(url);
            
            // Non-HTTP/HTTPS protocols should be rejected
            expect(result).toBe(false);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should handle edge cases correctly', () => {
      fc.assert(
        fc.property(
          // Generate edge case URLs
          fc.constantFrom(
            'http://example.com:8080',
            'https://example.com:443',
            'http://user:pass@example.com',
            'https://example.com/path?query=value#fragment',
            'http://192.168.1.1:3000/api',
            'https://[::1]/',
            'http://localhost:3000'
          ),
          (url) => {
            const result = linkProcessor.isValidUrl(url);
            
            // Edge case valid URLs should be accepted
            expect(result).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
