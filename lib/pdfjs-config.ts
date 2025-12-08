/**
 * PDF.js Configuration Module
 * 
 * This module configures PDF.js library for rendering PDF documents
 * in the browser without iframe blocking issues.
 * 
 * Requirements: 2.1 - Use PDF.js library for rendering
 */

import * as pdfjsLib from 'pdfjs-dist';

/**
 * PDF.js Configuration Interface
 */
export interface PDFJSConfig {
  workerSrc: string;
  cMapUrl: string;
  cMapPacked: boolean;
  standardFontDataUrl: string;
  disableWorker: boolean;
  verbosity: number;
}

/**
 * PDF.js Verbosity Levels
 */
export enum PDFJSVerbosity {
  ERRORS = 0,
  WARNINGS = 1,
  INFOS = 5,
}

/**
 * Default PDF.js Configuration
 * 
 * Uses local worker from node_modules to avoid CDN issues
 */
const DEFAULT_CONFIG: PDFJSConfig = {
  // Use local PDF.js worker from node_modules
  workerSrc: `/pdf.worker.min.js`,
  
  // Character maps for non-Latin text
  cMapUrl: `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.10.38/cmaps/`,
  cMapPacked: true,
  
  // Standard fonts
  standardFontDataUrl: `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.10.38/standard_fonts/`,
  
  // Enable web worker for better performance
  disableWorker: false,
  
  // Only show errors in production
  verbosity: process.env.NODE_ENV === 'production' 
    ? PDFJSVerbosity.ERRORS 
    : PDFJSVerbosity.WARNINGS,
};

/**
 * Initialize PDF.js with configuration
 * 
 * This function must be called before using PDF.js
 */
export function initializePDFJS(config: Partial<PDFJSConfig> = {}): void {
  const finalConfig = { ...DEFAULT_CONFIG, ...config };
  
  // Set worker source
  pdfjsLib.GlobalWorkerOptions.workerSrc = finalConfig.workerSrc;
  
  // Note: Verbosity is set via environment and cannot be changed at runtime
  // in the current version of PDF.js
}

/**
 * Get PDF.js library instance
 * 
 * Returns the configured PDF.js library
 */
export function getPDFJS() {
  return pdfjsLib;
}

/**
 * Get current PDF.js configuration
 */
export function getPDFJSConfig(): PDFJSConfig {
  return DEFAULT_CONFIG;
}

/**
 * Check if PDF.js is available
 */
export function isPDFJSAvailable(): boolean {
  try {
    return typeof pdfjsLib !== 'undefined' && 
           typeof pdfjsLib.getDocument === 'function';
  } catch {
    return false;
  }
}

// Auto-initialize PDF.js when module is imported
if (typeof window !== 'undefined') {
  initializePDFJS();
}

export default pdfjsLib;
