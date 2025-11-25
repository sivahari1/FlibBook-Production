/**
 * Tests for ContentProcessor class
 * Validates content processing for PDFs, images, and videos
 * Requirements: 3.3, 3.4, 4.3, 4.4
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ContentProcessor } from '../content-processor';
import { ContentType } from '../types/content';

// Mock the storage module
vi.mock('../storage', () => ({
  uploadFile: vi.fn().mockResolvedValue({ path: 'mock-path', error: undefined }),
  getBucketForContentType: vi.fn().mockReturnValue('documents')
}));

// Mock sharp
vi.mock('sharp', () => {
  const mockSharp = vi.fn((input?: any) => {
    // Support sharp({ create: ... }) syntax for placeholder generation
    if (input && input.create) {
      return {
        metadata: vi.fn().mockResolvedValue({}),
        resize: vi.fn().mockReturnThis(),
        jpeg: vi.fn().mockReturnThis(),
        toBuffer: vi.fn().mockResolvedValue(Buffer.from('placeholder'))
      };
    }
    // Default sharp behavior for image processing
    return {
      metadata: vi.fn().mockResolvedValue({
        width: 1920,
        height: 1080,
        format: 'jpeg'
      }),
      resize: vi.fn().mockReturnThis(),
      jpeg: vi.fn().mockReturnThis(),
      toBuffer: vi.fn().mockResolvedValue(Buffer.from('thumbnail'))
    };
  });
  return { default: mockSharp };
});

// Helper to create a mock File with arrayBuffer method
function createMockFile(content: string, filename: string, type: string): File {
  const buffer = Buffer.from(content);
  const file = new File([buffer], filename, { type });
  // Add arrayBuffer method for Node.js environment
  (file as any).arrayBuffer = async () => buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);
  return file;
}

describe('ContentProcessor', () => {
  let processor: ContentProcessor;

  beforeEach(() => {
    processor = new ContentProcessor();
    vi.clearAllMocks();
  });

  describe('processUpload', () => {
    it('should route to processPDF for PDF content type', async () => {
      // Requirements: 3.3
      const mockFile = createMockFile('test', 'test.pdf', 'application/pdf');
      const result = await processor.processUpload(mockFile, ContentType.PDF, 'user1');

      expect(result.metadata).toBeDefined();
      expect(result.metadata.mimeType).toBe('application/pdf');
    });

    it('should route to processImage for IMAGE content type', async () => {
      // Requirements: 3.3, 3.4
      const mockFile = createMockFile('test', 'test.jpg', 'image/jpeg');
      const result = await processor.processUpload(mockFile, ContentType.IMAGE, 'user1');

      expect(result.metadata).toBeDefined();
      expect(result.metadata.mimeType).toBe('image/jpeg');
      expect(result.metadata.width).toBe(1920);
      expect(result.metadata.height).toBe(1080);
    });

    it('should route to processVideo for VIDEO content type', async () => {
      // Requirements: 4.3, 4.4
      const mockFile = createMockFile('test', 'test.mp4', 'video/mp4');
      const result = await processor.processUpload(mockFile, ContentType.VIDEO, 'user1');

      expect(result.metadata).toBeDefined();
      expect(result.metadata.mimeType).toBe('video/mp4');
    });

    it('should throw error for unsupported content type', async () => {
      const mockFile = createMockFile('test', 'test.txt', 'text/plain');
      const result = await processor.processUpload(mockFile, 'UNSUPPORTED' as ContentType, 'user1');

      expect(result.error).toBeDefined();
      expect(result.error).toContain('Unsupported content type');
    });
  });

  describe('PDF Processing', () => {
    it('should process PDF and return metadata', async () => {
      // Requirements: 3.3
      const mockFile = createMockFile('test pdf content', 'document.pdf', 'application/pdf');
      const result = await processor.processUpload(mockFile, ContentType.PDF, 'user1');

      expect(result.fileUrl).toBeDefined();
      expect(result.metadata.fileSize).toBeGreaterThan(0);
      expect(result.metadata.mimeType).toBe('application/pdf');
    });

    it('should handle PDF processing errors gracefully', async () => {
      const { uploadFile } = await import('../storage');
      vi.mocked(uploadFile).mockResolvedValueOnce({ path: '', error: 'Upload failed' });

      const mockFile = createMockFile('test', 'test.pdf', 'application/pdf');
      const result = await processor.processUpload(mockFile, ContentType.PDF, 'user1');

      expect(result.error).toBe('Upload failed');
    });
  });

  describe('Image Processing', () => {
    it('should process image and generate thumbnail', async () => {
      // Requirements: 3.3, 3.4
      const mockFile = createMockFile('test image', 'photo.jpg', 'image/jpeg');
      const result = await processor.processUpload(mockFile, ContentType.IMAGE, 'user1');

      expect(result.fileUrl).toBeDefined();
      expect(result.thumbnailUrl).toBeDefined();
      expect(result.metadata.width).toBe(1920);
      expect(result.metadata.height).toBe(1080);
      expect(result.metadata.fileSize).toBeGreaterThan(0);
    });

    it('should extract image dimensions', async () => {
      // Requirements: 3.4
      const mockFile = createMockFile('test', 'image.png', 'image/png');
      const result = await processor.processUpload(mockFile, ContentType.IMAGE, 'user1');

      expect(result.metadata.width).toBeDefined();
      expect(result.metadata.height).toBeDefined();
    });

    it('should handle image processing errors', async () => {
      const sharp = (await import('sharp')).default;
      vi.mocked(sharp).mockImplementationOnce(() => {
        throw new Error('Invalid image');
      });

      const mockFile = createMockFile('invalid', 'bad.jpg', 'image/jpeg');
      const result = await processor.processUpload(mockFile, ContentType.IMAGE, 'user1');

      expect(result.error).toBeDefined();
    });
  });

  describe('Video Processing', () => {
    it('should process video and return metadata', async () => {
      // Requirements: 4.3, 4.4
      const mockFile = createMockFile('test video', 'video.mp4', 'video/mp4');
      const result = await processor.processUpload(mockFile, ContentType.VIDEO, 'user1');

      expect(result.fileUrl).toBeDefined();
      expect(result.metadata.fileSize).toBeGreaterThan(0);
      expect(result.metadata.mimeType).toBe('video/mp4');
      expect(result.metadata.duration).toBeDefined();
    });

    it('should handle video processing errors', async () => {
      const { uploadFile } = await import('../storage');
      vi.mocked(uploadFile).mockResolvedValueOnce({ path: '', error: 'Storage error' });

      const mockFile = createMockFile('test', 'video.mp4', 'video/mp4');
      const result = await processor.processUpload(mockFile, ContentType.VIDEO, 'user1');

      expect(result.error).toBe('Storage error');
    });
  });
});
