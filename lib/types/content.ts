/**
 * TypeScript types for multi-content type support
 * Supports PDF, Image, Video, and Link content types
 */

/**
 * Content types supported by the platform
 * Requirements: 3.1, 4.1, 5.1, 11.3
 */
export enum ContentType {
  PDF = 'PDF',
  IMAGE = 'IMAGE',
  VIDEO = 'VIDEO',
  LINK = 'LINK'
}

/**
 * Metadata structure for different content types
 * Contains type-specific fields for images, videos, and links
 * Requirements: 3.1, 4.1, 5.1
 */
export interface ContentMetadata {
  // Common metadata
  fileSize?: number;
  mimeType?: string;
  
  // Image-specific metadata (Requirements: 3.1, 3.4)
  width?: number;
  height?: number;
  
  // Video-specific metadata (Requirements: 4.1, 4.4)
  duration?: number;
  bitrate?: number;
  codec?: string;
  
  // Link-specific metadata (Requirements: 5.1, 5.3)
  domain?: string;
  title?: string;
  description?: string;
  previewImage?: string;
  fetchedAt?: Date;
  
  // Index signature for compatibility with DocumentMetadata
  [key: string]: unknown;
}

/**
 * Enhanced document interface with multi-content type support
 * Extends the base Document model with content type fields
 * Requirements: 3.1, 4.1, 5.1
 */
export interface EnhancedDocument {
  id: string;
  title: string;
  filename?: string;
  contentType: ContentType;
  fileUrl?: string;
  linkUrl?: string;
  thumbnailUrl?: string;
  metadata: ContentMetadata;
  userId: string;
  fileSize?: bigint;
  storagePath?: string;
  mimeType?: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * BookShop item data for creation/update
 * Requirements: 11.3, 11.4, 11.5
 */
export interface BookShopItemData {
  title: string;
  description?: string;
  contentType: ContentType;
  category: string;
  price: number;
  isFree: boolean;
  isPublished: boolean;
  file?: File;
  linkUrl?: string;
  previewImage?: File;
  metadata?: ContentMetadata;
}

/**
 * Enhanced BookShop item interface
 * Requirements: 11.3
 */
export interface EnhancedBookShopItem {
  id: string;
  documentId: string;
  title: string;
  description?: string;
  contentType: ContentType;
  category: string;
  fileUrl?: string;
  linkUrl?: string;
  thumbnailUrl?: string;
  previewUrl?: string;
  metadata: ContentMetadata;
  isFree: boolean;
  price?: number;
  isPublished: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Upload data interface for multi-content type uploads
 * Requirements: 9.1, 9.2, 11.1
 */
export interface UploadData {
  contentType: ContentType;
  file?: File;
  linkUrl?: string;
  title: string;
  description?: string;
  uploadToBookShop?: boolean;
  bookShopData?: BookShopItemData;
}

/**
 * Image-specific metadata
 * Requirements: 3.1, 3.4, 6.3
 */
export interface ImageMetadata {
  width: number;
  height: number;
  fileSize: number;
  mimeType: string;
}

/**
 * Video-specific metadata
 * Requirements: 4.1, 4.4, 7.5
 */
export interface VideoMetadata {
  duration: number;
  width: number;
  height: number;
  fileSize: number;
  mimeType: string;
  bitrate?: number;
  codec?: string;
}

/**
 * Link-specific metadata
 * Requirements: 5.1, 5.3, 8.1, 8.2, 8.3, 8.4
 */
export interface LinkMetadata {
  url: string;
  title: string;
  description?: string;
  previewImage?: string;
  domain: string;
  fetchedAt?: Date;
}

/**
 * Content filter for dashboard and search
 * Requirements: 10.4, 10.5
 */
export interface ContentFilter {
  contentType?: ContentType;
  dateRange?: {
    start: Date;
    end: Date;
  };
  searchQuery?: string;
}

/**
 * Content statistics for dashboard
 * Requirements: 1.2, 10.1
 */
export interface ContentStats {
  totalItems: number;
  byType: Record<ContentType, number>;
  storageUsed: number;
  sharesCreated: number;
  quotaRemaining: number | 'unlimited';
}

/**
 * BookShop filter for catalog display
 * Requirements: 13.1, 13.2
 */
export interface BookShopFilter {
  contentType?: ContentType;
  category?: string;
  priceRange?: [number, number];
  searchQuery?: string;
}

/**
 * Processing result from content processor
 * Requirements: 3.3, 4.3, 5.2
 */
export interface ProcessingResult {
  fileUrl?: string;
  thumbnailUrl?: string;
  metadata: ContentMetadata;
  error?: string;
}

/**
 * Upload response interface
 * Requirements: 9.5
 */
export interface UploadResponse {
  success: boolean;
  document?: EnhancedDocument;
  bookShopItem?: EnhancedBookShopItem;
  error?: string;
  warning?: string;
  quotaRemaining?: number | 'unlimited';
  message?: string;
}

/**
 * Watermark configuration
 * Requirements: 6.4, 7.6, 14.5
 */
export interface WatermarkConfig {
  text: string;
  opacity?: number;
  position?: 'center' | 'top-right' | 'bottom-right' | 'bottom-left' | 'top-left';
  fontSize?: number;
  color?: string;
}

/**
 * Viewer analytics event
 * Requirements: 14.1
 */
export interface ViewerAnalyticsEvent {
  documentId: string;
  contentType: ContentType;
  action: 'view' | 'download' | 'zoom' | 'play' | 'pause' | 'fullscreen';
  timestamp: Date;
  metadata?: Record<string, any>;
}
