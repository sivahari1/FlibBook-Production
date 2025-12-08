/**
 * PDF.js TypeScript Type Definitions
 * 
 * These types provide type safety for PDF.js operations
 * Re-export actual PDF.js types for consistency
 * 
 * Requirements: 2.1 - Set up TypeScript types for PDF.js
 */

import type { 
  PDFDocumentProxy,
  PDFPageProxy,
  PageViewport,
  RenderTask,
  PDFDocumentLoadingTask,
} from 'pdfjs-dist';

/**
 * PDF Document Interface
 * 
 * Represents a loaded PDF document
 * Re-export of PDFDocumentProxy from pdfjs-dist
 */
export type PDFDocument = PDFDocumentProxy;

/**
 * PDF Page Interface
 * 
 * Represents a single page in a PDF document
 * Re-export of PDFPageProxy from pdfjs-dist
 */
export type PDFPage = PDFPageProxy;

/**
 * PDF Viewport Interface
 * 
 * Defines the dimensions and transformation for rendering
 * Re-export of PageViewport from pdfjs-dist
 */
export type PDFViewport = PageViewport;

/**
 * PDF Viewport Parameters
 */
export interface PDFViewportParams {
  /** Scale factor for rendering */
  scale: number;
  
  /** Rotation angle in degrees (0, 90, 180, 270) */
  rotation?: number;
  
  /** Offset X */
  offsetX?: number;
  
  /** Offset Y */
  offsetY?: number;
  
  /** Don't flip Y axis */
  dontFlip?: boolean;
}

/**
 * PDF Render Parameters
 * Simplified interface for common rendering use cases
 */
export interface PDFRenderParams {
  /** Canvas 2D rendering context */
  canvasContext: CanvasRenderingContext2D;
  
  /** Viewport for rendering */
  viewport: PageViewport;
  
  /** Intent: 'display' or 'print' */
  intent?: 'display' | 'print';
  
  /** Transform matrix */
  transform?: number[];
  
  /** Background color */
  background?: string;
}

/**
 * PDF Render Task Interface
 * 
 * Represents an ongoing render operation
 * Re-export of RenderTask from pdfjs-dist
 */
export type PDFRenderTask = RenderTask;

/**
 * PDF Loading Task Interface
 * Re-export of PDFDocumentLoadingTask from pdfjs-dist
 */
export type PDFLoadingTask = PDFDocumentLoadingTask;

/**
 * PDF Loading Progress
 */
export interface PDFLoadingProgress {
  /** Bytes loaded */
  loaded: number;
  
  /** Total bytes (if known) */
  total?: number;
}

/**
 * PDF Document Source
 */
export interface PDFDocumentSource {
  /** URL to PDF file */
  url?: string;
  
  /** Binary data */
  data?: Uint8Array | ArrayBuffer;
  
  /** HTTP headers */
  httpHeaders?: Record<string, string>;
  
  /** Enable range requests */
  rangeChunkSize?: number;
  
  /** Disable auto-fetch */
  disableAutoFetch?: boolean;
  
  /** Disable streaming */
  disableStream?: boolean;
  
  /** Password for encrypted PDFs */
  password?: string;
}

/**
 * PDF Metadata
 */
export interface PDFMetadata {
  info: PDFInfo;
  metadata: any;
  contentDispositionFilename?: string;
}

/**
 * PDF Info
 */
export interface PDFInfo {
  Title?: string;
  Author?: string;
  Subject?: string;
  Keywords?: string;
  Creator?: string;
  Producer?: string;
  CreationDate?: string;
  ModDate?: string;
  PDFFormatVersion?: string;
}

/**
 * PDF Outline Item
 */
export interface PDFOutline {
  title: string;
  bold?: boolean;
  italic?: boolean;
  color?: number[];
  dest?: any;
  url?: string;
  items?: PDFOutline[];
}

/**
 * PDF Text Content
 */
export interface PDFTextContent {
  items: PDFTextItem[];
  styles: Record<string, PDFTextStyle>;
}

/**
 * PDF Text Item
 */
export interface PDFTextItem {
  str: string;
  dir: string;
  transform: number[];
  width: number;
  height: number;
  fontName: string;
}

/**
 * PDF Text Style
 */
export interface PDFTextStyle {
  fontFamily: string;
  ascent: number;
  descent: number;
  vertical: boolean;
}

/**
 * PDF Text Content Parameters
 */
export interface PDFTextContentParams {
  normalizeWhitespace?: boolean;
  disableCombineTextItems?: boolean;
}

/**
 * PDF Annotation
 */
export interface PDFAnnotation {
  subtype: string;
  rect: number[];
  contents?: string;
  url?: string;
  dest?: any;
}

/**
 * PDF Annotation Parameters
 */
export interface PDFAnnotationParams {
  intent?: string;
}

/**
 * PDF.js Error Types
 */
export enum PDFJSErrorType {
  UNKNOWN = 'UnknownError',
  INVALID_PDF = 'InvalidPDFException',
  MISSING_PDF = 'MissingPDFException',
  UNEXPECTED_RESPONSE = 'UnexpectedResponseException',
  PASSWORD_REQUIRED = 'PasswordException',
  ABORT = 'AbortException',
}

/**
 * PDF.js Error
 */
export interface PDFJSError extends Error {
  name: PDFJSErrorType;
  message: string;
}
