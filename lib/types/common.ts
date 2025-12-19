/**
 * Common type definitions used across library files
 * Replaces 'any' types with proper TypeScript types
 */

import { Session } from 'next-auth';

/**
 * Database error with Prisma-specific properties
 */
export interface DatabaseError extends Error {
  code?: string;
  meta?: Record<string, unknown>;
}

/**
 * Session with user properties
 * Extends NextAuth Session with our custom user fields
 */
export interface SessionWithUser extends Session {
  user: {
    id: string;
    email: string;
    name: string | null;
    subscription?: string;
    role?: string;
    userRole: string;
    additionalRoles?: string[];
    emailVerified: boolean;
    isActive: boolean;
  };
}

/**
 * User object returned from authentication
 */
export interface AuthUser {
  id: string;
  email: string;
  name: string | null;
  subscription?: string;
  role?: string;
  userRole: string;
  additionalRoles?: string[];
  emailVerified: boolean;
  isActive: boolean;
}

/**
 * Generic record type for unknown objects
 */
export type UnknownRecord = Record<string, unknown>;

/**
 * Sanitizable data type - can be primitive, object, or array
 */
export type SanitizableData = 
  | string 
  | number 
  | boolean 
  | null 
  | undefined 
  | UnknownRecord 
  | SanitizableData[];

/**
 * Performance entry with processing time
 */
export interface PerformanceEntry {
  processingStart: number;
  startTime: number;
}

/**
 * Canvas and context object for PDF rendering
 */
export interface CanvasAndContext {
  canvas: HTMLCanvasElement;
  context: CanvasRenderingContext2D;
}

/**
 * Annotation data structure
 */
export interface AnnotationData {
  id: string;
  documentId: string;
  pageNumber: number;
  userId: string;
  visibility: 'private' | 'shared' | 'public';
  x: number;
  y: number;
  mediaType: string;
  mediaUrl: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Debounced function type
 */
export type DebouncedFunction<T extends (...args: unknown[]) => unknown> = {
  (...args: Parameters<T>): void;
  cancel: () => void;
};

/**
 * Throttled function type
 */
export type ThrottledFunction<T extends (...args: unknown[]) => unknown> = {
  (...args: Parameters<T>): void;
  cancel: () => void;
};

/**
 * Storage file metadata
 */
export interface StorageFileMetadata {
  name: string;
  id: string;
  updated_at: string;
  created_at: string;
  last_accessed_at: string;
  metadata: Record<string, unknown>;
}

/**
 * PDF document proxy from PDF.js
 */
export interface PDFDocumentProxy {
  numPages: number;
  getPage(pageNumber: number): Promise<PDFPageProxy>;
  destroy(): Promise<void>;
}

/**
 * PDF page proxy from PDF.js
 */
export interface PDFPageProxy {
  pageNumber: number;
  getViewport(params: { scale: number }): PDFPageViewport;
  render(params: PDFRenderParams): PDFRenderTask;
  cleanup(): void;
}

/**
 * PDF page viewport
 */
export interface PDFPageViewport {
  width: number;
  height: number;
  scale: number;
}

/**
 * PDF render parameters
 */
export interface PDFRenderParams {
  canvasContext: CanvasRenderingContext2D;
  viewport: PDFPageViewport;
}

/**
 * PDF render task
 */
export interface PDFRenderTask {
  promise: Promise<void>;
  cancel(): void;
}

/**
 * Annotation statistics by type
 */
export interface AnnotationStatsByType {
  mediaType: string;
  _count: {
    mediaType: number;
  };
}

/**
 * Annotation statistics by page
 */
export interface AnnotationStatsByPage {
  pageNumber: number;
  _count: {
    pageNumber: number;
  };
}

/**
 * Fallback data for error recovery
 */
export interface FallbackData {
  canRetry: boolean;
  retryDelay?: number;
  fallbackContent?: unknown;
}

/**
 * Range validation parameters
 */
export interface RangeParams {
  min: number | string;
  max: number | string;
}

/**
 * Error with additional context
 */
export interface ErrorWithContext extends Error {
  code?: string;
  statusCode?: number;
  context?: UnknownRecord;
}

/**
 * Layout shift entry from Performance API
 */
export interface LayoutShift extends PerformanceEntry {
  value: number;
  hadRecentInput: boolean;
}

/**
 * Performance event timing from Performance API
 */
export interface PerformanceEventTiming extends PerformanceEntry {
  processingStart: number;
}
