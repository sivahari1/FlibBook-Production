/**
 * PDF.js Configuration Usage Examples
 * 
 * This file demonstrates how to use the PDF.js configuration module
 */

import { getPDFJS, initializePDFJS, isPDFJSAvailable } from './pdfjs-config';
import type { 
  PDFDocument, 
  PDFPage, 
  PDFViewport,
  PDFRenderParams,
  PDFLoadingProgress,
} from './types/pdfjs';

/**
 * Example 1: Basic PDF Loading
 */
export async function loadPDFExample(pdfUrl: string): Promise<PDFDocument> {
  // Check if PDF.js is available
  if (!isPDFJSAvailable()) {
    throw new Error('PDF.js is not available');
  }

  // Get PDF.js library
  const pdfjsLib = getPDFJS();

  // Load PDF document
  const loadingTask = pdfjsLib.getDocument(pdfUrl);
  
  // Track loading progress
  loadingTask.onProgress = (progress: PDFLoadingProgress) => {
    const percent = progress.total 
      ? Math.round((progress.loaded / progress.total) * 100)
      : 0;
    console.log(`Loading: ${percent}%`);
  };

  // Wait for document to load
  const pdf = await loadingTask.promise;
  
  console.log(`PDF loaded: ${pdf.numPages} pages`);
  
  return pdf;
}

/**
 * Example 2: Render PDF Page to Canvas
 */
export async function renderPageExample(
  pdf: PDFDocument,
  pageNumber: number,
  scale: number = 1.5
): Promise<HTMLCanvasElement> {
  // Get the page
  const page: PDFPage = await pdf.getPage(pageNumber);
  
  // Get viewport at desired scale
  const viewport: PDFViewport = page.getViewport({ scale });
  
  // Create canvas
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');
  
  if (!context) {
    throw new Error('Failed to get canvas context');
  }
  
  // Set canvas dimensions
  canvas.width = viewport.width;
  canvas.height = viewport.height;
  
  // Render page
  const renderParams: PDFRenderParams = {
    canvasContext: context,
    viewport: viewport,
  };
  
  const renderTask = page.render(renderParams);
  await renderTask.promise;
  
  console.log(`Page ${pageNumber} rendered`);
  
  return canvas;
}

/**
 * Example 3: Custom Configuration
 */
export function customConfigExample(): void {
  // Initialize with custom configuration
  initializePDFJS({
    workerSrc: 'https://custom-cdn.com/pdf.worker.js',
    disableWorker: false,
    cMapPacked: true,
  });
  
  console.log('PDF.js initialized with custom config');
}

/**
 * Example 4: Load PDF with Authentication
 */
export async function loadAuthenticatedPDFExample(
  pdfUrl: string,
  authToken: string
): Promise<PDFDocument> {
  const pdfjsLib = getPDFJS();
  
  // Load with custom headers
  const loadingTask = pdfjsLib.getDocument({
    url: pdfUrl,
    httpHeaders: {
      'Authorization': `Bearer ${authToken}`,
    },
  });
  
  const pdf = await loadingTask.promise;
  return pdf;
}

/**
 * Example 5: Render Multiple Pages
 */
export async function renderMultiplePagesExample(
  pdf: PDFDocument,
  startPage: number,
  endPage: number,
  scale: number = 1.0
): Promise<HTMLCanvasElement[]> {
  const canvases: HTMLCanvasElement[] = [];
  
  for (let pageNum = startPage; pageNum <= endPage; pageNum++) {
    const canvas = await renderPageExample(pdf, pageNum, scale);
    canvases.push(canvas);
  }
  
  return canvases;
}

/**
 * Example 6: Get PDF Metadata
 */
export async function getPDFMetadataExample(pdf: PDFDocument): Promise<void> {
  if (pdf.getMetadata) {
    const metadata = await pdf.getMetadata();
    
    console.log('PDF Info:', {
      title: (metadata.info as any).Title,
      author: (metadata.info as any).Author,
      subject: (metadata.info as any).Subject,
      creator: (metadata.info as any).Creator,
      producer: (metadata.info as any).Producer,
      creationDate: (metadata.info as any).CreationDate,
    });
  }
}

/**
 * Example 7: Cleanup Resources
 */
export function cleanupPDFExample(pdf: PDFDocument): void {
  // Destroy PDF document to free memory
  pdf.destroy();
  console.log('PDF resources cleaned up');
}

/**
 * Example 8: Error Handling
 */
export async function loadPDFWithErrorHandlingExample(
  pdfUrl: string
): Promise<PDFDocument | null> {
  try {
    const pdfjsLib = getPDFJS();
    const loadingTask = pdfjsLib.getDocument(pdfUrl);
    const pdf = await loadingTask.promise;
    return pdf;
  } catch (error: any) {
    console.error('Failed to load PDF:', error);
    
    if (error.name === 'InvalidPDFException') {
      console.error('Invalid PDF file');
    } else if (error.name === 'MissingPDFException') {
      console.error('PDF file not found');
    } else if (error.name === 'UnexpectedResponseException') {
      console.error('Network error loading PDF');
    } else if (error.name === 'PasswordException') {
      console.error('PDF is password protected');
    }
    
    return null;
  }
}

/**
 * Example 9: Render with Progress Callback
 */
export async function renderWithProgressExample(
  pdf: PDFDocument,
  pageNumber: number,
  onProgress: (percent: number) => void
): Promise<HTMLCanvasElement> {
  const page = await pdf.getPage(pageNumber);
  const viewport = page.getViewport({ scale: 1.5 });
  
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d')!;
  
  canvas.width = viewport.width;
  canvas.height = viewport.height;
  
  const renderTask = page.render({
    canvasContext: context,
    viewport: viewport,
  });
  
  // Simulate progress (PDF.js doesn't provide render progress)
  onProgress(0);
  await renderTask.promise;
  onProgress(100);
  
  return canvas;
}

/**
 * Example 10: Complete Workflow
 */
export async function completeWorkflowExample(pdfUrl: string): Promise<void> {
  try {
    // 1. Check availability
    if (!isPDFJSAvailable()) {
      throw new Error('PDF.js not available');
    }
    
    // 2. Load PDF
    console.log('Loading PDF...');
    const pdf = await loadPDFExample(pdfUrl);
    
    // 3. Get metadata
    await getPDFMetadataExample(pdf);
    
    // 4. Render first page
    console.log('Rendering first page...');
    const canvas = await renderPageExample(pdf, 1, 1.5);
    
    // 5. Append to document
    document.body.appendChild(canvas);
    
    // 6. Cleanup when done
    // pdf.destroy(); // Uncomment when actually done
    
    console.log('Workflow complete!');
  } catch (error) {
    console.error('Workflow failed:', error);
  }
}
