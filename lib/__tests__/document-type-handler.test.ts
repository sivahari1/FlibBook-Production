/**
 * Document Type Handler Tests
 * 
 * Unit tests for document type specific handling functionality
 * 
 * Requirements: 3.1, 3.2, 3.3, 3.4, 3.5
 */

import { describe, it, expect, beforeEach, vi, type MockedFunction } from 'vitest';
import { 
  DocumentTypeHandler, 
  DocumentType, 
  type DocumentCharacteristics 
} from '../pdf-reliability/document-type-handler';
import { createReliabilityConfig } from '../pdf-reliability/config';
import { RenderingMethod } from '../pdf-reliability/types';
import type { ReliabilityConfig } from '../pdf-reliability/types';

// Mock fetch for testing
global.fetch = vi.fn() as MockedFunction<typeof fetch>;

describe('DocumentTypeHandler', () => {
  let handler: DocumentTypeHandler;
  let config: ReliabilityConfig;

  beforeEach(() => {
    config = createReliabilityConfig();
    handler = new DocumentTypeHandler(config);
    vi.clearAllMocks();
    // Reset fetch mock completely
    (fetch as MockedFunction<typeof fetch>).mockReset();
  });

  describe('analyzeDocument', () => {
    it('should detect small PDFs correctly', async () => {
      // Requirements: 3.1 - Small PDFs (< 1MB)
      const sampleData = new ArrayBuffer(1024);
      const view = new Uint8Array(sampleData);
      // Create valid PDF header
      const header = '%PDF-1.4';
      for (let i = 0; i < header.length; i++) {
        view[i] = header.charCodeAt(i);
      }

      // Mock HEAD request for size
      const mockHeadResponse = {
        ok: true,
        headers: new Map([['content-length', '512000']]) // 500KB
      };
      
      // Mock Range request for sample data
      const mockRangeResponse = {
        ok: true,
        headers: new Map([['content-range', 'bytes 0-8191/512000']]),
        arrayBuffer: () => Promise.resolve(sampleData)
      };

      (fetch as MockedFunction<typeof fetch>)
        .mockResolvedValueOnce(mockHeadResponse as any)
        .mockResolvedValueOnce(mockRangeResponse as any);

      const characteristics = await handler.analyzeDocument('http://example.com/small.pdf');

      expect(characteristics.type).toBe(DocumentType.SMALL_PDF);
      expect(characteristics.size).toBe(512000);
      expect(characteristics.isCorrupted).toBe(false);
    });

    it('should detect large PDFs correctly', async () => {
      // Requirements: 3.2 - Large PDFs (> 10MB)
      const sampleData = new ArrayBuffer(1024);
      const view = new Uint8Array(sampleData);
      // Create valid PDF header
      const header = '%PDF-1.4';
      for (let i = 0; i < header.length; i++) {
        view[i] = header.charCodeAt(i);
      }

      // Mock HEAD request for size
      const mockHeadResponse = {
        ok: true,
        headers: new Map([['content-length', '15728640']]) // 15MB
      };
      
      // Mock Range request for sample data
      const mockRangeResponse = {
        ok: true,
        headers: new Map([['content-range', 'bytes 0-8191/15728640']]),
        arrayBuffer: () => Promise.resolve(sampleData)
      };

      (fetch as MockedFunction<typeof fetch>)
        .mockResolvedValueOnce(mockHeadResponse as any)
        .mockResolvedValueOnce(mockRangeResponse as any);

      const characteristics = await handler.analyzeDocument('http://example.com/large.pdf');

      expect(characteristics.type).toBe(DocumentType.LARGE_PDF);
      expect(characteristics.size).toBe(15728640);
      expect(characteristics.isCorrupted).toBe(false);
    });

    it('should detect complex PDFs with images', async () => {
      // Requirements: 3.3 - Complex PDFs with images
      const sampleData = new ArrayBuffer(1024);
      const view = new Uint8Array(sampleData);
      // Create valid PDF header with image content
      const content = '%PDF-1.4\n/Image /DCTDecode';
      for (let i = 0; i < content.length; i++) {
        view[i] = content.charCodeAt(i);
      }

      // Mock HEAD request for size
      const mockHeadResponse = {
        ok: true,
        headers: new Map([['content-length', '5242880']]) // 5MB
      };
      
      // Mock Range request for sample data
      const mockRangeResponse = {
        ok: true,
        headers: new Map([['content-range', 'bytes 0-8191/5242880']]),
        arrayBuffer: () => Promise.resolve(sampleData)
      };

      (fetch as MockedFunction<typeof fetch>)
        .mockResolvedValueOnce(mockHeadResponse as any)
        .mockResolvedValueOnce(mockRangeResponse as any);

      const characteristics = await handler.analyzeDocument('http://example.com/complex.pdf');

      expect(characteristics.type).toBe(DocumentType.COMPLEX_PDF);
      expect(characteristics.hasImages).toBe(true);
      expect(characteristics.complexity).toBe('medium');
    });

    it('should detect password-protected PDFs', async () => {
      // Requirements: 3.4 - Password-protected PDFs
      const mockResponse = {
        ok: true,
        headers: new Map([['content-length', '2097152']]) // 2MB
      };
      (fetch as MockedFunction<typeof fetch>).mockResolvedValueOnce(mockResponse as any);

      const sampleData = new ArrayBuffer(1024);
      const view = new Uint8Array(sampleData);
      // Create valid PDF header with encryption
      const content = '%PDF-1.4\n/Encrypt /Filter/Standard';
      for (let i = 0; i < content.length; i++) {
        view[i] = content.charCodeAt(i);
      }

      const characteristics = await handler.analyzeDocument('http://example.com/encrypted.pdf', sampleData);

      expect(characteristics.type).toBe(DocumentType.PASSWORD_PROTECTED);
      expect(characteristics.isPasswordProtected).toBe(true);
    });

    it('should detect corrupted PDFs', async () => {
      // Requirements: 3.5 - Corrupted PDFs
      const mockResponse = {
        ok: true,
        headers: new Map([['content-length', '1048576']]) // 1MB
      };
      (fetch as MockedFunction<typeof fetch>).mockResolvedValueOnce(mockResponse as any);

      const sampleData = new ArrayBuffer(1024);
      const view = new Uint8Array(sampleData);
      // Create invalid PDF header
      const content = 'NOT A PDF FILE';
      for (let i = 0; i < content.length; i++) {
        view[i] = content.charCodeAt(i);
      }

      const characteristics = await handler.analyzeDocument('http://example.com/corrupted.pdf', sampleData);

      expect(characteristics.type).toBe(DocumentType.CORRUPTED_PDF);
      expect(characteristics.isCorrupted).toBe(true);
    });

    it('should handle network errors gracefully', async () => {
      // Test error handling when document analysis fails
      // Clear all previous mocks to ensure clean state
      vi.clearAllMocks();
      (fetch as MockedFunction<typeof fetch>).mockRejectedValueOnce(new Error('Network error'));

      const characteristics = await handler.analyzeDocument('http://example.com/unreachable.pdf');

      expect(characteristics.type).toBe(DocumentType.CORRUPTED_PDF);
      expect(characteristics.isCorrupted).toBe(true);
      expect(characteristics.size).toBe(0);
    });
  });

  describe('getOptimizedOptions', () => {
    it('should optimize for small PDFs', () => {
      // Requirements: 3.1 - Display within 5 seconds
      const characteristics: DocumentCharacteristics = {
        type: DocumentType.SMALL_PDF,
        size: 512000,
        hasImages: false,
        isPasswordProtected: false,
        isCorrupted: false,
        complexity: 'low'
      };

      const options = handler.getOptimizedOptions(characteristics);

      expect(options.timeout).toBe(5000); // 5 seconds for small PDFs
      expect(options.preferredMethod).toBe(RenderingMethod.PDFJS_CANVAS);
      expect(options.typeSpecific?.enableStreaming).toBe(false);
      expect(options.typeSpecific?.memoryManagement).toBe('conservative');
    });

    it('should optimize for large PDFs', () => {
      // Requirements: 3.2 - Complete within 60 seconds with progress
      const characteristics: DocumentCharacteristics = {
        type: DocumentType.LARGE_PDF,
        size: 15728640,
        hasImages: false,
        isPasswordProtected: false,
        isCorrupted: false,
        complexity: 'high'
      };

      const options = handler.getOptimizedOptions(characteristics);

      expect(options.timeout).toBe(60000); // 60 seconds for large PDFs
      expect(options.preferredMethod).toBe(RenderingMethod.PDFJS_CANVAS);
      expect(options.typeSpecific?.enableStreaming).toBe(true);
      expect(options.typeSpecific?.memoryManagement).toBe('aggressive');
      expect(options.typeSpecific?.maxConcurrentPages).toBe(2);
    });

    it('should optimize for complex PDFs', () => {
      // Requirements: 3.3 - Handle without memory errors
      const characteristics: DocumentCharacteristics = {
        type: DocumentType.COMPLEX_PDF,
        size: 5242880,
        hasImages: true,
        isPasswordProtected: false,
        isCorrupted: false,
        complexity: 'high'
      };

      const options = handler.getOptimizedOptions(characteristics);

      expect(options.timeout).toBe(45000); // 45 seconds for complex PDFs
      expect(options.typeSpecific?.enableStreaming).toBe(true);
      expect(options.typeSpecific?.memoryManagement).toBe('aggressive');
      expect(options.typeSpecific?.maxConcurrentPages).toBe(1); // Single page for memory efficiency
    });
  });

  describe('getStreamingConfig', () => {
    it('should enable streaming for large PDFs', () => {
      // Requirements: 3.2 - Large PDF handling with streaming
      const characteristics: DocumentCharacteristics = {
        type: DocumentType.LARGE_PDF,
        size: 15728640,
        hasImages: false,
        isPasswordProtected: false,
        isCorrupted: false,
        complexity: 'high'
      };

      const streamingConfig = handler.getStreamingConfig(characteristics);

      expect(streamingConfig.enableStreaming).toBe(true);
      expect(streamingConfig.chunkSize).toBe(1024 * 1024); // 1MB chunks
      expect(streamingConfig.maxBufferSize).toBe(10 * 1024 * 1024); // 10MB buffer
      expect(streamingConfig.progressiveRendering).toBe(true);
    });

    it('should disable streaming for small PDFs', () => {
      const characteristics: DocumentCharacteristics = {
        type: DocumentType.SMALL_PDF,
        size: 512000,
        hasImages: false,
        isPasswordProtected: false,
        isCorrupted: false,
        complexity: 'low'
      };

      const streamingConfig = handler.getStreamingConfig(characteristics);

      expect(streamingConfig.enableStreaming).toBe(false);
      expect(streamingConfig.progressiveRendering).toBe(false);
    });
  });

  describe('getMemoryManagementStrategy', () => {
    it('should use conservative strategy for small PDFs', () => {
      // Requirements: 3.1 - Small PDF optimization
      const characteristics: DocumentCharacteristics = {
        type: DocumentType.SMALL_PDF,
        size: 512000,
        hasImages: false,
        isPasswordProtected: false,
        isCorrupted: false,
        complexity: 'low'
      };

      const strategy = handler.getMemoryManagementStrategy(characteristics);

      expect(strategy.strategy).toBe('conservative');
      expect(strategy.maxCanvasSize).toBe(2048 * 2048);
      expect(strategy.enableCanvasPooling).toBe(false);
      expect(strategy.aggressiveCleanup).toBe(false);
    });

    it('should use aggressive strategy for large PDFs', () => {
      // Requirements: 3.2, 3.3 - Large/complex PDF memory management
      const characteristics: DocumentCharacteristics = {
        type: DocumentType.LARGE_PDF,
        size: 15728640,
        hasImages: true,
        isPasswordProtected: false,
        isCorrupted: false,
        complexity: 'high'
      };

      const strategy = handler.getMemoryManagementStrategy(characteristics);

      expect(strategy.strategy).toBe('aggressive');
      expect(strategy.maxCanvasSize).toBe(1024 * 1024);
      expect(strategy.enableCanvasPooling).toBe(true);
      expect(strategy.aggressiveCleanup).toBe(true);
      expect(strategy.maxConcurrentPages).toBe(2);
    });

    it('should use aggressive strategy for complex PDFs', () => {
      // Requirements: 3.3 - Complex PDF memory management
      const characteristics: DocumentCharacteristics = {
        type: DocumentType.COMPLEX_PDF,
        size: 5242880,
        hasImages: true,
        isPasswordProtected: false,
        isCorrupted: false,
        complexity: 'high'
      };

      const strategy = handler.getMemoryManagementStrategy(characteristics);

      expect(strategy.strategy).toBe('aggressive');
      expect(strategy.enableCanvasPooling).toBe(true);
      expect(strategy.aggressiveCleanup).toBe(true);
    });
  });

  describe('handlePasswordProtected', () => {
    it('should throw error when no password provided', async () => {
      // Requirements: 3.4 - Password-protected PDF detection
      const mockContext = {
        renderingId: 'test-id',
        url: 'http://example.com/encrypted.pdf',
        options: {},
        startTime: new Date(),
        currentMethod: RenderingMethod.PDFJS_CANVAS,
        attemptCount: 0,
        progressState: {
          percentage: 0,
          stage: 'initializing' as any,
          bytesLoaded: 0,
          totalBytes: 0,
          timeElapsed: 0,
          isStuck: false,
          lastUpdate: new Date(),
        },
        errorHistory: [],
      };

      await expect(handler.handlePasswordProtected(mockContext)).rejects.toThrow(
        'PDF is password-protected and requires a password to open'
      );
    });

    it('should store password in context when provided', async () => {
      // Requirements: 3.4 - Password handling
      const mockContext = {
        renderingId: 'test-id',
        url: 'http://example.com/encrypted.pdf',
        options: {},
        startTime: new Date(),
        currentMethod: RenderingMethod.PDFJS_CANVAS,
        attemptCount: 0,
        progressState: {
          percentage: 0,
          stage: 'initializing' as any,
          bytesLoaded: 0,
          totalBytes: 0,
          timeElapsed: 0,
          isStuck: false,
          lastUpdate: new Date(),
        },
        errorHistory: [],
      };

      await handler.handlePasswordProtected(mockContext, 'test-password');

      expect(mockContext.options.pdfPassword).toBe('test-password');
    });
  });

  describe('handleCorruptedPDF', () => {
    it('should throw corruption error', () => {
      // Requirements: 3.5 - Corrupted PDF detection and handling
      const mockContext = {
        renderingId: 'test-id',
        url: 'http://example.com/corrupted.pdf',
        options: {},
        startTime: new Date(),
        currentMethod: RenderingMethod.PDFJS_CANVAS,
        attemptCount: 0,
        progressState: {
          percentage: 0,
          stage: 'initializing' as any,
          bytesLoaded: 0,
          totalBytes: 0,
          timeElapsed: 0,
          isStuck: false,
          lastUpdate: new Date(),
        },
        errorHistory: [],
      };

      const corruptionDetails = { type: 'invalid-header', offset: 0 };

      expect(() => handler.handleCorruptedPDF(mockContext, corruptionDetails)).toThrow(
        'PDF file appears to be corrupted or invalid'
      );
    });
  });

  describe('edge cases', () => {
    it('should handle unknown document sizes gracefully', async () => {
      // Test when content-length header is missing
      const sampleData = new ArrayBuffer(1024);
      const view = new Uint8Array(sampleData);
      const header = '%PDF-1.4';
      for (let i = 0; i < header.length; i++) {
        view[i] = header.charCodeAt(i);
      }

      // Mock HEAD request with no content-length
      const mockHeadResponse = {
        ok: true,
        headers: new Map() // No content-length header
      };
      
      // Mock Range request for sample data
      const mockRangeResponse = {
        ok: true,
        headers: new Map([['content-range', 'bytes 0-8191/0']]),
        arrayBuffer: () => Promise.resolve(sampleData)
      };

      (fetch as MockedFunction<typeof fetch>)
        .mockResolvedValueOnce(mockHeadResponse as any)
        .mockResolvedValueOnce(mockRangeResponse as any);

      const characteristics = await handler.analyzeDocument('http://example.com/unknown-size.pdf');

      expect(characteristics.type).toBe(DocumentType.STANDARD_PDF);
      expect(characteristics.size).toBe(0);
    });

    it('should handle HEAD request failures with Range fallback', async () => {
      // Mock HEAD request failure, then successful Range request
      (fetch as MockedFunction<typeof fetch>)
        .mockRejectedValueOnce(new Error('HEAD not allowed'))
        .mockResolvedValueOnce({
          ok: true,
          headers: new Map([['content-range', 'bytes 0-1023/5242880']]),
          arrayBuffer: () => Promise.resolve(new ArrayBuffer(1024))
        } as any);

      const characteristics = await handler.analyzeDocument('http://example.com/no-head.pdf');

      expect(characteristics.size).toBe(5242880);
    });

    it('should assess complexity correctly', async () => {
      // Test complexity assessment with various factors
      const sampleData = new ArrayBuffer(1024);
      const view = new Uint8Array(sampleData);
      // Create PDF with images (high complexity)
      const content = '%PDF-1.4\n/Image /DCTDecode /FlateDecode';
      for (let i = 0; i < content.length; i++) {
        view[i] = content.charCodeAt(i);
      }

      // Mock HEAD request for large size
      const mockHeadResponse = {
        ok: true,
        headers: new Map([['content-length', '12582912']]) // 12MB
      };
      
      // Mock Range request for sample data
      const mockRangeResponse = {
        ok: true,
        headers: new Map([['content-range', 'bytes 0-8191/12582912']]),
        arrayBuffer: () => Promise.resolve(sampleData)
      };

      (fetch as MockedFunction<typeof fetch>)
        .mockResolvedValueOnce(mockHeadResponse as any)
        .mockResolvedValueOnce(mockRangeResponse as any);

      const characteristics = await handler.analyzeDocument('http://example.com/complex.pdf');

      expect(characteristics.complexity).toBe('high'); // Large size + images = high complexity
    });
  });
});