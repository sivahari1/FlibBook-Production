/**
 * Content Processing Pipeline
 * Handles processing of different content types (PDF, Image, Video)
 * Requirements: 3.3, 3.4, 4.3, 4.4
 */

import sharp from 'sharp';
import { uploadFile, getBucketForContentType } from './storage';
import { ContentType, ContentMetadata, ProcessingResult } from './types/content';

/**
 * ContentProcessor class for handling multi-content type uploads
 * Processes PDFs, images, and videos with thumbnail generation
 */
export class ContentProcessor {
  /**
   * Main entry point for processing uploads
   * Routes to appropriate processor based on content type
   * Requirements: 3.3, 4.3
   */
  async processUpload(
    file: File,
    contentType: ContentType,
    userId: string
  ): Promise<ProcessingResult> {
    try {
      switch (contentType) {
        case ContentType.PDF:
          return await this.processPDF(file, userId);
        case ContentType.IMAGE:
          return await this.processImage(file, userId);
        case ContentType.VIDEO:
          return await this.processVideo(file, userId);
        default:
          throw new Error(`Unsupported content type: ${contentType}`);
      }
    } catch (error) {
      console.error('Content processing error:', error);
      return {
        metadata: {},
        error: error instanceof Error ? error.message : 'Processing failed'
      };
    }
  }

  /**
   * Process PDF files with thumbnail generation
   * Requirements: 3.3, 3.4
   */
  private async processPDF(file: File, userId: string): Promise<ProcessingResult> {
    try {
      const buffer = Buffer.from(await file.arrayBuffer());
      const fileSize = buffer.length;
      const documentId = this.generateId();
      const storagePath = `pdfs/${userId}/${documentId}.pdf`;
      const bucket = getBucketForContentType(ContentType.PDF);

      // Upload PDF to storage
      const uploadResult = await uploadFile(buffer, storagePath, file.type, bucket);
      
      if (uploadResult.error) {
        return {
          metadata: {},
          error: uploadResult.error
        };
      }

      // Generate thumbnail from first page
      // Note: PDF thumbnail generation requires additional libraries (pdf-lib, canvas)
      // or client-side processing. For serverless environments, consider:
      // 1. Client-side thumbnail generation before upload
      // 2. AWS Lambda with pdf-lib layer
      // 3. Dedicated media processing service
      // For now, we'll create a placeholder approach
      let thumbnailUrl: string | undefined;
      try {
        const thumbnailBuffer = await this.generatePDFPlaceholderThumbnail();
        if (thumbnailBuffer) {
          const thumbnailPath = `pdfs/${userId}/thumbnails/${documentId}.jpg`;
          const thumbnailUpload = await uploadFile(thumbnailBuffer, thumbnailPath, 'image/jpeg', bucket);
          if (!thumbnailUpload.error) {
            thumbnailUrl = thumbnailPath;
          }
        }
      } catch (thumbError) {
        console.error('PDF thumbnail generation failed:', thumbError);
        // Continue without thumbnail - not a critical error
      }

      const metadata: ContentMetadata = {
        fileSize,
        mimeType: file.type
      };

      return {
        fileUrl: uploadResult.path,
        thumbnailUrl,
        metadata
      };
    } catch (error) {
      console.error('PDF processing error:', error);
      return {
        metadata: {},
        error: error instanceof Error ? error.message : 'PDF processing failed'
      };
    }
  }

  /**
   * Generate a placeholder thumbnail for PDFs
   * Requirements: 3.4
   * 
   * Creates a simple PDF icon thumbnail using sharp
   * In production, you would extract the actual first page using:
   * - pdf-lib + canvas for server-side rendering
   * - Client-side rendering before upload
   * - Dedicated media processing service
   */
  private async generatePDFPlaceholderThumbnail(): Promise<Buffer> {
    // Create a simple 300x300 placeholder with PDF icon
    // Using sharp to create a solid color background
    const thumbnail = await sharp({
      create: {
        width: 300,
        height: 300,
        channels: 4,
        background: { r: 239, g: 68, b: 68, alpha: 1 } // Red background
      }
    })
      .jpeg({ quality: 80 })
      .toBuffer();
    
    return thumbnail;
  }

  /**
   * Process image files with thumbnail generation
   * Requirements: 3.3, 3.4
   */
  private async processImage(file: File, userId: string): Promise<ProcessingResult> {
    try {
      const buffer = Buffer.from(await file.arrayBuffer());
      const documentId = this.generateId();
      const bucket = getBucketForContentType(ContentType.IMAGE);
      
      // Get image metadata using sharp
      const image = sharp(buffer);
      const imageMetadata = await image.metadata();
      
      const width = imageMetadata.width || 0;
      const height = imageMetadata.height || 0;
      const fileSize = buffer.length;

      // Upload original image
      const storagePath = `images/${userId}/${documentId}.${this.getExtension(file.name)}`;
      const uploadResult = await uploadFile(buffer, storagePath, file.type, bucket);
      
      if (uploadResult.error) {
        return {
          metadata: {},
          error: uploadResult.error
        };
      }

      // Generate thumbnail (max 300x300, maintain aspect ratio)
      const thumbnailBuffer = await image
        .resize(300, 300, {
          fit: 'inside',
          withoutEnlargement: true
        })
        .jpeg({ quality: 80 })
        .toBuffer();

      // Upload thumbnail
      const thumbnailPath = `images/${userId}/thumbnails/${documentId}.jpg`;
      const thumbnailUpload = await uploadFile(thumbnailBuffer, thumbnailPath, 'image/jpeg', bucket);

      const metadata: ContentMetadata = {
        width,
        height,
        fileSize,
        mimeType: file.type
      };

      return {
        fileUrl: uploadResult.path,
        thumbnailUrl: thumbnailUpload.error ? undefined : thumbnailPath,
        metadata
      };
    } catch (error) {
      console.error('Image processing error:', error);
      return {
        metadata: {},
        error: error instanceof Error ? error.message : 'Image processing failed'
      };
    }
  }

  /**
   * Process video files with thumbnail and metadata extraction
   * Requirements: 4.3, 4.4
   */
  private async processVideo(file: File, userId: string): Promise<ProcessingResult> {
    try {
      const buffer = Buffer.from(await file.arrayBuffer());
      const fileSize = buffer.length;
      const documentId = this.generateId();
      const storagePath = `videos/${userId}/${documentId}.${this.getExtension(file.name)}`;
      const bucket = getBucketForContentType(ContentType.VIDEO);

      // Upload video to storage
      const uploadResult = await uploadFile(buffer, storagePath, file.type, bucket);
      
      if (uploadResult.error) {
        return {
          metadata: {},
          error: uploadResult.error
        };
      }

      // Generate thumbnail from video first frame
      let thumbnailUrl: string | undefined;
      let duration = 0;
      let width = 0;
      let height = 0;

      try {
        const videoMetadata = await this.generateVideoThumbnail(buffer, userId, documentId, bucket);
        if (videoMetadata) {
          thumbnailUrl = videoMetadata.thumbnailUrl;
          duration = videoMetadata.duration || 0;
          width = videoMetadata.width || 0;
          height = videoMetadata.height || 0;
        }
      } catch (thumbError) {
        console.error('Video thumbnail generation failed:', thumbError);
        // Continue without thumbnail - not a critical error
      }

      const metadata: ContentMetadata = {
        fileSize,
        mimeType: file.type,
        duration,
        width,
        height
      };

      return {
        fileUrl: uploadResult.path,
        thumbnailUrl,
        metadata
      };
    } catch (error) {
      console.error('Video processing error:', error);
      return {
        metadata: {},
        error: error instanceof Error ? error.message : 'Video processing failed'
      };
    }
  }

  /**
   * Generate thumbnail from video first frame
   * Requirements: 4.4
   * 
   * Note: In a serverless environment without ffmpeg, we use a placeholder approach.
   * For server-side processing with actual frame extraction, you would use ffmpeg:
   * ffmpeg -i video.mp4 -ss 00:00:01 -vframes 1 -vf scale=300:-1 thumbnail.jpg
   * 
   * Production alternatives:
   * 1. AWS Lambda with ffmpeg layer
   * 2. Dedicated media processing service (e.g., AWS MediaConvert, Cloudinary)
   * 3. Client-side thumbnail generation before upload
   */
  private async generateVideoThumbnail(
    _videoBuffer: Buffer,
    userId: string,
    documentId: string,
    bucket: string
  ): Promise<{ thumbnailUrl?: string; duration?: number; width?: number; height?: number } | null> {
    try {
      // Generate a placeholder thumbnail for videos
      const thumbnailBuffer = await this.generateVideoPlaceholderThumbnail();
      
      // Upload thumbnail
      const thumbnailPath = `videos/${userId}/thumbnails/${documentId}.jpg`;
      const thumbnailUpload = await uploadFile(thumbnailBuffer, thumbnailPath, 'image/jpeg', bucket);
      
      if (thumbnailUpload.error) {
        return null;
      }
      
      return {
        thumbnailUrl: thumbnailPath,
        // Metadata would be extracted using ffprobe in production
        duration: undefined,
        width: undefined,
        height: undefined
      };
    } catch (error) {
      console.error('Video thumbnail generation error:', error);
      return null;
    }
  }

  /**
   * Generate a placeholder thumbnail for videos
   * Requirements: 4.4
   * 
   * Creates a simple video icon thumbnail using sharp
   * In production, you would extract the actual first frame using ffmpeg
   */
  private async generateVideoPlaceholderThumbnail(): Promise<Buffer> {
    // Create a simple 300x300 placeholder with video icon (blue background)
    const thumbnail = await sharp({
      create: {
        width: 300,
        height: 300,
        channels: 4,
        background: { r: 59, g: 130, b: 246, alpha: 1 } // Blue background
      }
    })
      .jpeg({ quality: 80 })
      .toBuffer();
    
    return thumbnail;
  }

  /**
   * Generate a unique ID for files
   */
  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  }

  /**
   * Extract file extension from filename
   */
  private getExtension(filename: string): string {
    const parts = filename.split('.');
    return parts.length > 1 ? parts[parts.length - 1] : 'bin';
  }
}
