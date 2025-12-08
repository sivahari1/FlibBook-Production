/**
 * PDF.js Configuration Tests
 * 
 * Tests for PDF.js configuration module
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  initializePDFJS,
  getPDFJS,
  getPDFJSConfig,
  isPDFJSAvailable,
  PDFJSVerbosity,
  type PDFJSConfig,
} from '../pdfjs-config';

describe('PDF.js Configuration', () => {
  describe('initializePDFJS', () => {
    it('should initialize PDF.js with default configuration', () => {
      initializePDFJS();
      
      const pdfjsLib = getPDFJS();
      expect(pdfjsLib).toBeDefined();
      expect(pdfjsLib.GlobalWorkerOptions.workerSrc).toBeDefined();
      expect(pdfjsLib.GlobalWorkerOptions.workerSrc).toContain('pdf.worker');
    });

    it('should accept custom configuration', () => {
      const customConfig: Partial<PDFJSConfig> = {
        workerSrc: 'https://custom-cdn.com/pdf.worker.js',
      };
      
      initializePDFJS(customConfig);
      
      const pdfjsLib = getPDFJS();
      expect(pdfjsLib.GlobalWorkerOptions.workerSrc).toBe(customConfig.workerSrc);
    });
  });

  describe('getPDFJS', () => {
    it('should return PDF.js library instance', () => {
      const pdfjsLib = getPDFJS();
      
      expect(pdfjsLib).toBeDefined();
      expect(typeof pdfjsLib.getDocument).toBe('function');
      expect(pdfjsLib.version).toBeDefined();
    });
  });

  describe('getPDFJSConfig', () => {
    it('should return current configuration', () => {
      const config = getPDFJSConfig();
      
      expect(config).toBeDefined();
      expect(config.workerSrc).toBeDefined();
      expect(config.cMapUrl).toBeDefined();
      expect(config.standardFontDataUrl).toBeDefined();
      expect(typeof config.cMapPacked).toBe('boolean');
      expect(typeof config.disableWorker).toBe('boolean');
      expect(typeof config.verbosity).toBe('number');
    });

    it('should have valid CDN URLs', () => {
      const config = getPDFJSConfig();
      
      expect(config.workerSrc).toMatch(/^https:\/\//);
      expect(config.cMapUrl).toMatch(/^https:\/\//);
      expect(config.standardFontDataUrl).toMatch(/^https:\/\//);
    });

    it('should use correct PDF.js version', () => {
      const config = getPDFJSConfig();
      
      // Should use version 4.10.38 as specified in package.json
      expect(config.workerSrc).toContain('4.10.38');
      expect(config.cMapUrl).toContain('4.10.38');
      expect(config.standardFontDataUrl).toContain('4.10.38');
    });
  });

  describe('isPDFJSAvailable', () => {
    it('should return true when PDF.js is available', () => {
      expect(isPDFJSAvailable()).toBe(true);
    });

    it('should detect getDocument function', () => {
      const pdfjsLib = getPDFJS();
      expect(typeof pdfjsLib.getDocument).toBe('function');
    });
  });

  describe('PDFJSVerbosity', () => {
    it('should have correct verbosity levels', () => {
      expect(PDFJSVerbosity.ERRORS).toBe(0);
      expect(PDFJSVerbosity.WARNINGS).toBe(1);
      expect(PDFJSVerbosity.INFOS).toBe(5);
    });
  });

  describe('Configuration defaults', () => {
    it('should disable worker in config when specified', () => {
      const config = getPDFJSConfig();
      expect(typeof config.disableWorker).toBe('boolean');
    });

    it('should use packed CMaps by default', () => {
      const config = getPDFJSConfig();
      expect(config.cMapPacked).toBe(true);
    });

    it('should set appropriate verbosity for environment', () => {
      const config = getPDFJSConfig();
      
      if (process.env.NODE_ENV === 'production') {
        expect(config.verbosity).toBe(PDFJSVerbosity.ERRORS);
      } else {
        expect(config.verbosity).toBe(PDFJSVerbosity.WARNINGS);
      }
    });
  });

  describe('Worker configuration', () => {
    it('should configure worker source globally', () => {
      initializePDFJS();
      
      const pdfjsLib = getPDFJS();
      expect(pdfjsLib.GlobalWorkerOptions.workerSrc).toBeDefined();
      expect(pdfjsLib.GlobalWorkerOptions.workerSrc.length).toBeGreaterThan(0);
    });

    it('should use CDN for worker to avoid bundling issues', () => {
      const config = getPDFJSConfig();
      expect(config.workerSrc).toContain('cdnjs.cloudflare.com');
    });
  });
});
