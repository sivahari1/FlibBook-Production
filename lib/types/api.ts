/**
 * API response type definitions
 * Used for consistent API response structures across all endpoints
 */

/**
 * Generic API response wrapper
 * @template T - The type of data being returned
 */
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

/**
 * API error response
 */
export interface ApiErrorResponse {
  success: false;
  error: string;
  message?: string;
  statusCode?: number;
  details?: Record<string, unknown>;
}

/**
 * API success response
 * @template T - The type of data being returned
 */
export interface ApiSuccessResponse<T = unknown> {
  success: true;
  data: T;
  message?: string;
}

/**
 * Paginated API response
 * @template T - The type of items in the array
 */
export interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
  error?: string;
  message?: string;
}

/**
 * Pagination parameters
 */
export interface PaginationParams {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

/**
 * Document API response
 */
export interface DocumentResponse {
  id: string;
  title: string;
  filename: string;
  fileSize: number;
  contentType: string;
  fileUrl: string;
  thumbnailUrl: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Document list API response
 */
export interface DocumentListResponse {
  documents: DocumentResponse[];
  total: number;
  storageUsed: number;
  storageLimit: number;
}

/**
 * Share link API response
 */
export interface ShareLinkResponse {
  id: string;
  shareKey: string;
  shareUrl: string;
  documentId: string;
  expiresAt: Date | null;
  maxViews: number | null;
  viewCount: number;
  hasPassword: boolean;
  allowDownload: boolean;
  watermarkText: string | null;
  isActive: boolean;
  createdAt: Date;
}

/**
 * Email share API response
 */
export interface EmailShareApiResponse {
  id: string;
  shareKey: string;
  documentId: string;
  recipientEmail: string;
  expiresAt: Date | null;
  viewCount: number;
  allowDownload: boolean;
  watermarkText: string | null;
  isActive: boolean;
  sentAt: Date;
  createdAt: Date;
}

/**
 * Upload API response
 */
export interface UploadApiResponse {
  documentId: string;
  title: string;
  filename: string;
  fileSize: number;
  contentType: string;
  fileUrl: string;
  thumbnailUrl: string | null;
  bookshopItem?: {
    id: string;
    category: string;
    price: number;
  };
  message?: string;
  warning?: string;
}

/**
 * Authentication API response
 */
export interface AuthResponse {
  user: {
    id: string;
    email: string;
    name: string | null;
    userRole: string;
    emailVerified: boolean;
  };
  token?: string;
  message?: string;
}

/**
 * Email verification API response
 */
export interface EmailVerificationResponse {
  verified: boolean;
  email: string;
  message: string;
}

/**
 * Password reset API response
 */
export interface PasswordResetResponse {
  success: boolean;
  message: string;
}

/**
 * User creation API response
 */
export interface UserCreationResponse {
  user: {
    id: string;
    email: string;
    name: string | null;
    userRole: string;
  };
  temporaryPassword?: string;
  message: string;
}

/**
 * Bookshop item API response
 */
export interface BookshopItemResponse {
  id: string;
  title: string;
  description: string;
  category: string;
  price: number;
  contentType: string;
  thumbnailUrl: string | null;
  isActive: boolean;
  isPurchased?: boolean;
  createdAt: Date;
}

/**
 * Payment order API response
 */
export interface PaymentOrderResponse {
  orderId: string;
  amount: number;
  currency: string;
  razorpayOrderId: string;
  razorpayKeyId: string;
}

/**
 * Payment verification API response
 */
export interface PaymentVerificationResponse {
  verified: boolean;
  transactionId: string;
  bookshopItemId: string;
  message: string;
}

/**
 * Analytics API response
 */
export interface AnalyticsResponse {
  documentId: string;
  views: {
    total: number;
    unique: number;
    byDate: Array<{
      date: string;
      count: number;
    }>;
  };
  shares: {
    total: number;
    active: number;
    byType: {
      link: number;
      email: number;
    };
  };
  lastViewedAt: Date | null;
}

/**
 * Storage info API response
 */
export interface StorageInfoResponse {
  used: number;
  limit: number;
  percentage: number;
  remaining: number;
  documents: {
    total: number;
    byType: Record<string, number>;
  };
}

/**
 * Health check API response
 */
export interface HealthCheckResponse {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: Date;
  services: {
    database: 'up' | 'down';
    storage: 'up' | 'down';
    email: 'up' | 'down';
  };
  version: string;
}

/**
 * Batch operation API response
 */
export interface BatchOperationResponse {
  success: boolean;
  processed: number;
  succeeded: number;
  failed: number;
  errors: Array<{
    id: string;
    error: string;
  }>;
}

/**
 * File validation API response
 */
export interface FileValidationResponse {
  valid: boolean;
  errors?: string[];
  warnings?: string[];
  fileInfo?: {
    name: string;
    size: number;
    type: string;
  };
}

/**
 * Link metadata API response
 */
export interface LinkMetadataResponse {
  url: string;
  title: string;
  description?: string;
  thumbnailUrl?: string;
  contentType: string;
  isAccessible: boolean;
}

/**
 * Bookshop integration request data
 */
export interface BookshopIntegrationRequest {
  addToBookshop: boolean;
  bookshopCategory?: string;
  bookshopPrice?: number;
  bookshopDescription?: string;
}

/**
 * Search API response
 */
export interface SearchResponse<T> {
  results: T[];
  total: number;
  query: string;
  filters?: Record<string, unknown>;
  took: number;
}

/**
 * Webhook event payload
 */
export interface WebhookPayload {
  event: string;
  timestamp: Date;
  data: Record<string, unknown>;
  signature?: string;
}

/**
 * Validation error detail
 */
export interface ValidationErrorDetail {
  code: string;
  field: string;
  message: string;
}

/**
 * Prisma where clause for documents
 */
export interface DocumentWhereClause {
  userId: string;
  contentType?: string;
  title?: {
    contains: string;
    mode: 'insensitive';
  };
}

/**
 * Prisma where clause for bookshop items
 */
export interface BookshopWhereClause {
  isPublished?: boolean;
  category?: string;
  contentType?: string;
  title?: {
    contains: string;
    mode: 'insensitive';
  };
}

/**
 * Prisma where clause for users
 */
export interface UserWhereClause {
  userRole?: string;
  isActive?: boolean;
  email?: {
    contains: string;
    mode: 'insensitive';
  };
}

/**
 * Prisma where clause for access requests
 */
export interface AccessRequestWhereClause {
  status?: string;
}

/**
 * Prisma where clause for annotations
 */
export interface AnnotationWhereClause {
  documentId: string;
  pageNumber?: number;
  userId?: string;
}

/**
 * Prisma where clause for error reports
 */
export interface ErrorReportWhereClause {
  timestamp: {
    gte: Date;
    lte: Date;
  };
  severity?: string;
  userId?: string;
}

/**
 * User update data
 */
export interface UserUpdateData {
  name?: string;
  email?: string;
  userRole?: string;
  pricePlan?: string;
  notes?: string;
  isActive?: boolean;
}

/**
 * Bookshop item update data
 */
export interface BookshopItemUpdateData {
  documentId?: string;
  linkUrl?: string;
  title?: string;
  description?: string;
  category?: string;
  price?: number;
  contentType?: string;
  thumbnailUrl?: string;
  isActive?: boolean;
  isPublished?: boolean;
}

/**
 * Document metadata
 */
export interface DocumentMetadata {
  originalName?: string;
  mimeType?: string;
  pageCount?: number;
  dimensions?: {
    width: number;
    height: number;
  };
  duration?: number;
  [key: string]: unknown;
}

/**
 * Bookshop item with purchase status
 */
export interface BookshopItemWithStatus {
  id: string;
  title: string;
  description: string;
  category: string;
  price: number;
  contentType: string;
  thumbnailUrl: string | null;
  isActive: boolean;
  inMyJstudyroom: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Email share with document details
 */
export interface EmailShareWithDocument {
  id: string;
  shareKey: string;
  documentId: string;
  recipientEmail: string;
  expiresAt: Date | null;
  viewCount: number;
  allowDownload: boolean;
  watermarkText: string | null;
  isActive: boolean;
  sentAt: Date;
  createdAt: Date;
  document: {
    id: string;
    title: string;
    filename: string;
    contentType: string;
    thumbnailUrl: string | null;
  };
  sender: {
    name: string | null;
    email: string;
  };
}
