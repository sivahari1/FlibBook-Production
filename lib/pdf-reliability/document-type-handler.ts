/**
 * Document Type Specific Handler
 * 
 * Handles different PDF document types with optimized strategies based on
 * size, complexity, and special characteristics.
 * 
 * Requirements: 3.1, 3.2, 3.3, 3.4, 3.5
 */

import type {
  RenderOptions,
  RenderContext,
  RenderingMethod,
  ReliabilityConfig,
} from './types';
import { RenderingMethod as Method } from './types';
import { ErrorFactory } from './errors';

/**
 * Document Type Enumeration
 */
export enum DocumentType {
  SMALL_PDF = 'small-pdf',           // < 1MB
  LARGE_PDF = 'large-pdf',           // > 10MB
  COMPLEX_PDF = 'complex-pdf',       // Contains images/complex content
  PASSWORD_PROTECTED = 'password-protected',
  CORRUPTED_PDF = 'corrupted-pdf',
  STANDARD_PDF = 'standard-pdf'      // 1-10MB, standard content
}

/**
 * Document Characteristics Interface
 */
export interface DocumentCharacteristics {
  type: DocumentType;
  size: number;
  hasImages: boolean;
  isPasswordProtected: boolean;
  isCorrupted: boolean;
  pageCount?: number;
  complexity: 'low' | 'medium' | 'high';
}

/**
 * Type-specific Optimization Settings
 */
export interface TypeOptimizations {
  timeout: number;
  preferredMethod: RenderingMethod;
  enableStreaming: boolean;
  memoryManagement: 'aggressive' | 'standard' | 'conservative';
  progressUpdateInterval: number;
  maxConcurrentPages: number;
}

/**
 * Document Type Handler Class
 */
export class DocumentTypeHandler {
  private config: ReliabilityConfig;

  constructor(config: ReliabilityConfig) {
    this.config = config;
  }

  /**
   * Analyze document to determine type and characteristics
   * 
   * Requirements: 3.1, 3.2, 3.3, 3.4, 3.5
   */
  async analyzeDocument(url: string, initialData?: ArrayBuffer): Promise<DocumentCharacteristics> {
    try {
      // Get document size from headers or initial data
      const size = await this.getDocumentSize(url, initialData);
      
      // Perform initial PDF analysis
      const analysis = await this.performInitialAnalysis(url, initialData);
      
      // Determine document type based on characteristics
      const type = this.determineDocumentType(size, analysis);
      
      return {
        type,
        size,
        hasImages: analysis.hasImages,
        isPasswordProtected: analysis.isPasswordProtected,
        isCorrupted: analysis.isCorrupted,
        pageCount: analysis.pageCount,
        complexity: this.assessComplexity(size, analysis),
      };
    } catch (error) {
      // If analysis fails, assume corrupted or inaccessible
      return {
        type: DocumentType.CORRUPTED_PDF,
        size: 0,
        hasImages: false,
        isPasswordProtected: false,
        isCorrupted: true,
        complexity: 'low',
      };
    }
  }

  /**
   * Get optimized render options for document type
   * 
   * Requirements: 3.1, 3.2, 3.3
   */
  getOptimizedOptions(
    characteristics: DocumentCharacteristics,
    baseOptions: RenderOptions = {}
  ): RenderOptions {
    const optimizations = this.getTypeOptimizations(characteristics);
    
    return {
      ...baseOptions,
      timeout: optimizations.timeout,
      preferredMethod: optimizations.preferredMethod,
      // Add type-specific options
      typeSpecific: {
        documentType: characteristics.type,
        enableStreaming: optimizations.enableStreaming,
        memoryManagement: optimizations.memoryManagement,
        maxConcurrentPages: optimizations.maxConcurrentPages,
      },
    };
  }

  /**
   * Handle password-protected PDFs
   * 
   * Requirements: 3.4
   */
  async handlePasswordProtected(
    context: RenderContext,
    password?: string
  ): Promise<void> {
    if (!password) {
      throw ErrorFactory.createPasswordRequiredError(
        context.progressState.stage,
        context.currentMethod,
        { url: context.url }
      );
    }

    // Store password in context for PDF.js
    context.options.pdfPassword = password;
  }

  /**
   * Handle corrupted PDFs
   * 
   * Requirements: 3.5
   */
  handleCorruptedPDF(context: RenderContext, corruptionDetails: any): never {
    throw ErrorFactory.createCorruptionError(
      context.progressState.stage,
      context.currentMethod,
      {
        url: context.url,
        corruptionType: corruptionDetails.type || 'unknown',
        details: corruptionDetails,
      }
    );
  }

  /**
   * Get streaming configuration for large PDFs
   * 
   * Requirements: 3.2
   */
  getStreamingConfig(characteristics: DocumentCharacteristics) {
    if (characteristics.type === DocumentType.LARGE_PDF) {
      return {
        enableStreaming: true,
        chunkSize: 1024 * 1024, // 1MB chunks
        maxBufferSize: 10 * 1024 * 1024, // 10MB buffer
        progressiveRendering: true,
      };
    }
    
    return {
      enableStreaming: false,
      progressiveRendering: false,
    };
  }

  /**
   * Get memory management strategy
   * 
   * Requirements: 3.3
   */
  getMemoryManagementStrategy(characteristics: DocumentCharacteristics) {
    switch (characteristics.type) {
      case DocumentType.SMALL_PDF:
        return {
          strategy: 'conservative' as const,
          maxCanvasSize: 2048 * 2048,
          enableCanvasPooling: false,
          aggressiveCleanup: false,
        };
        
      case DocumentType.LARGE_PDF:
      case DocumentType.COMPLEX_PDF:
        return {
          strategy: 'aggressive' as const,
          maxCanvasSize: 1024 * 1024,
          enableCanvasPooling: true,
          aggressiveCleanup: true,
          maxConcurrentPages: 2,
        };
        
      default:
        return {
          strategy: 'standard' as const,
          maxCanvasSize: 1536 * 1536,
          enableCanvasPooling: true,
          aggressiveCleanup: false,
        };
    }
  }

  /**
   * Private: Get document size from URL or data
   */
  private async getDocumentSize(url: string, initialData?: ArrayBuffer): Promise<number> {
    if (initialData) {
      return initialData.byteLength;
    }

    try {
      const response = await fetch(url, { method: 'HEAD' });
      const contentLength = response.headers.get('content-length');
      return contentLength ? parseInt(contentLength, 10) : 0;
    } catch (error) {
      // If HEAD request fails, try to get partial content
      try {
        const response = await fetch(url, {
          headers: { Range: 'bytes=0-1023' } // First 1KB
        });
        const contentRange = response.headers.get('content-range');
        if (contentRange) {
          const match = contentRange.match(/\/(\d+)$/);
          return match ? parseInt(match[1], 10) : 0;
        }
      } catch (rangeError) {
        // If both fail, return 0 (unknown size)
        return 0;
      }
    }
    
    return 0;
  }

  /**
   * Private: Perform initial PDF analysis
   */
  private async performInitialAnalysis(
    url: string,
    initialData?: ArrayBuffer
  ): Promise<{
    hasImages: boolean;
    isPasswordProtected: boolean;
    isCorrupted: boolean;
    pageCount?: number;
  }> {
    try {
      // Get first few KB of the PDF for analysis
      const sampleData = initialData || await this.getSampleData(url);
      
      // Basic PDF header validation
      const isValidPDF = this.validatePDFHeader(sampleData);
      if (!isValidPDF) {
        return {
          hasImages: false,
          isPasswordProtected: false,
          isCorrupted: true,
        };
      }

      // Check for password protection
      const isPasswordProtected = this.detectPasswordProtection(sampleData);
      
      // Check for image content (basic heuristic)
      const hasImages = this.detectImageContent(sampleData);
      
      return {
        hasImages,
        isPasswordProtected,
        isCorrupted: false,
      };
    } catch (error) {
      return {
        hasImages: false,
        isPasswordProtected: false,
        isCorrupted: true,
      };
    }
  }

  /**
   * Private: Get sample data from URL
   */
  private async getSampleData(url: string, sampleSize: number = 8192): Promise<ArrayBuffer> {
    const response = await fetch(url, {
      headers: { Range: `bytes=0-${sampleSize - 1}` }
    });
    
    if (!response.ok) {
      throw new Error(`Failed to fetch sample data: ${response.status}`);
    }
    
    return response.arrayBuffer();
  }

  /**
   * Private: Validate PDF header
   */
  private validatePDFHeader(data: ArrayBuffer): boolean {
    const view = new Uint8Array(data);
    const header = new TextDecoder().decode(view.slice(0, 8));
    return header.startsWith('%PDF-');
  }

  /**
   * Private: Detect password protection
   */
  private detectPasswordProtection(data: ArrayBuffer): boolean {
    const view = new Uint8Array(data);
    const content = new TextDecoder().decode(view);
    
    // Look for encryption-related keywords in PDF structure
    return content.includes('/Encrypt') || 
           content.includes('/Filter/Standard') ||
           content.includes('/V ') || // Version in encryption dict
           content.includes('/R '); // Revision in encryption dict
  }

  /**
   * Private: Detect image content
   */
  private detectImageContent(data: ArrayBuffer): boolean {
    const view = new Uint8Array(data);
    const content = new TextDecoder().decode(view);
    
    // Look for image-related keywords
    return content.includes('/Image') ||
           content.includes('/DCTDecode') || // JPEG
           content.includes('/FlateDecode') || // PNG-like
           content.includes('/CCITTFaxDecode') || // TIFF
           content.includes('/JBIG2Decode'); // JBIG2
  }

  /**
   * Private: Determine document type based on characteristics
   */
  private determineDocumentType(size: number, analysis: any): DocumentType {
    if (analysis.isCorrupted) {
      return DocumentType.CORRUPTED_PDF;
    }
    
    if (analysis.isPasswordProtected) {
      return DocumentType.PASSWORD_PROTECTED;
    }
    
    // Size-based classification
    if (size > 0) {
      if (size < 1024 * 1024) { // < 1MB
        return DocumentType.SMALL_PDF;
      } else if (size > 10 * 1024 * 1024) { // > 10MB
        return DocumentType.LARGE_PDF;
      }
    }
    
    // Content-based classification
    if (analysis.hasImages) {
      return DocumentType.COMPLEX_PDF;
    }
    
    return DocumentType.STANDARD_PDF;
  }

  /**
   * Private: Assess document complexity
   */
  private assessComplexity(
    size: number,
    analysis: any
  ): 'low' | 'medium' | 'high' {
    let complexityScore = 0;
    
    // Size factor
    if (size > 10 * 1024 * 1024) complexityScore += 2; // > 10MB
    else if (size > 5 * 1024 * 1024) complexityScore += 1; // > 5MB
    
    // Content factors
    if (analysis.hasImages) complexityScore += 2;
    if (analysis.pageCount && analysis.pageCount > 50) complexityScore += 1;
    
    if (complexityScore >= 4) return 'high';
    if (complexityScore >= 2) return 'medium';
    return 'low';
  }

  /**
   * Private: Get type-specific optimizations
   */
  private getTypeOptimizations(characteristics: DocumentCharacteristics): TypeOptimizations {
    switch (characteristics.type) {
      case DocumentType.SMALL_PDF:
        // Requirements: 3.1 - display within 5 seconds
        return {
          timeout: 5000,
          preferredMethod: Method.PDFJS_CANVAS,
          enableStreaming: false,
          memoryManagement: 'conservative',
          progressUpdateInterval: 100,
          maxConcurrentPages: 5,
        };
        
      case DocumentType.LARGE_PDF:
        // Requirements: 3.2 - complete within 60 seconds with progress
        return {
          timeout: 60000,
          preferredMethod: Method.PDFJS_CANVAS,
          enableStreaming: true,
          memoryManagement: 'aggressive',
          progressUpdateInterval: 250,
          maxConcurrentPages: 2,
        };
        
      case DocumentType.COMPLEX_PDF:
        // Requirements: 3.3 - handle without memory errors
        return {
          timeout: 45000,
          preferredMethod: Method.PDFJS_CANVAS,
          enableStreaming: true,
          memoryManagement: 'aggressive',
          progressUpdateInterval: 500,
          maxConcurrentPages: 1,
        };
        
      case DocumentType.PASSWORD_PROTECTED:
        // Requirements: 3.4 - detect and prompt for password
        return {
          timeout: this.config.defaultTimeout,
          preferredMethod: Method.PDFJS_CANVAS,
          enableStreaming: false,
          memoryManagement: 'standard',
          progressUpdateInterval: this.config.progressUpdateInterval,
          maxConcurrentPages: 3,
        };
        
      default:
        return {
          timeout: this.config.defaultTimeout,
          preferredMethod: Method.PDFJS_CANVAS,
          enableStreaming: false,
          memoryManagement: 'standard',
          progressUpdateInterval: this.config.progressUpdateInterval,
          maxConcurrentPages: 3,
        };
    }
  }
}

/**
 * Utility function to create document type handler
 */
export function createDocumentTypeHandler(config: ReliabilityConfig): DocumentTypeHandler {
  return new DocumentTypeHandler(config);
}