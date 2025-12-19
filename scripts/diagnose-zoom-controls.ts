#!/usr/bin/env tsx

/**
 * Diagnostic script to help debug zoom controls and document display issues
 */

console.log('=== PDF Viewer Zoom Controls Diagnostic ===\n');

// Check if we're in a browser environment
if (typeof window !== 'undefined') {
  console.log('✓ Running in browser environment');
  
  // Check PDF.js availability
  if ((window as any).pdfjsLib) {
    console.log('✓ PDF.js library is available');
    console.log('  Version:', (window as any).pdfjsLib.version);
    console.log('  Worker source:', (window as any).pdfjsLib.GlobalWorkerOptions?.workerSrc);
  } else {
    console.log('✗ PDF.js library is NOT available');
  }
  
  // Check for PDF viewer elements
  const pdfViewer = document.querySelector('[data-testid="simple-document-viewer"]');
  if (pdfViewer) {
    console.log('✓ PDF viewer container found');
    
    const canvas = document.querySelector('[data-testid="pdfjs-canvas"]');
    if (canvas) {
      console.log('✓ PDF canvas found');
      console.log('  Canvas size:', (canvas as HTMLCanvasElement).width, 'x', (canvas as HTMLCanvasElement).height);
      console.log('  Canvas style:', (canvas as HTMLElement).style.cssText);
    } else {
      console.log('✗ PDF canvas NOT found');
    }
    
    const toolbar = document.querySelector('[data-testid="viewer-toolbar"]');
    if (toolbar) {
      console.log('✓ Viewer toolbar found');
      
      const zoomIn = document.querySelector('[data-testid="zoom-in-button"]');
      const zoomOut = document.querySelector('[data-testid="zoom-out-button"]');
      const zoomLevel = document.querySelector('[data-testid="zoom-level"]');
      
      console.log('  Zoom in button:', zoomIn ? '✓' : '✗');
      console.log('  Zoom out button:', zoomOut ? '✓' : '✗');
      console.log('  Zoom level display:', zoomLevel ? '✓' : '✗');
      
      if (zoomLevel) {
        console.log('  Current zoom level:', zoomLevel.textContent);
      }
    } else {
      console.log('✗ Viewer toolbar NOT found');
    }
  } else {
    console.log('✗ PDF viewer container NOT found');
  }
  
  // Check memory usage
  if ((window as any).performance?.memory) {
    const memory = (window as any).performance.memory;
    const usedMB = (memory.usedJSHeapSize / (1024 * 1024)).toFixed(2);
    const totalMB = (memory.totalJSHeapSize / (1024 * 1024)).toFixed(2);
    const limitMB = (memory.jsHeapSizeLimit / (1024 * 1024)).toFixed(2);
    console.log('📊 Memory usage:', usedMB, 'MB used,', totalMB, 'MB total,', limitMB, 'MB limit');
  }
  
  // Check for console errors
  const originalError = console.error;
  let errorCount = 0;
  console.error = (...args) => {
    errorCount++;
    originalError.apply(console, args);
  };
  
  setTimeout(() => {
    console.log('🐛 Console errors in last 5 seconds:', errorCount);
  }, 5000);
  
} else {
  console.log('✗ Not running in browser environment');
}

// Test zoom functionality if available
if (typeof window !== 'undefined') {
  // Add a global function to test zoom
  (window as any).testZoom = (level: number) => {
    console.log('🔍 Testing zoom level:', level);
    
    const zoomInBtn = document.querySelector('[data-testid="zoom-in-button"]') as HTMLButtonElement;
    const zoomOutBtn = document.querySelector('[data-testid="zoom-out-button"]') as HTMLButtonElement;
    
    if (level > 1.0 && zoomInBtn) {
      console.log('  Clicking zoom in button...');
      zoomInBtn.click();
    } else if (level < 1.0 && zoomOutBtn) {
      console.log('  Clicking zoom out button...');
      zoomOutBtn.click();
    }
    
    setTimeout(() => {
      const zoomDisplay = document.querySelector('[data-testid="zoom-level"]');
      if (zoomDisplay) {
        console.log('  New zoom level:', zoomDisplay.textContent);
      }
      
      const canvas = document.querySelector('[data-testid="pdfjs-canvas"]') as HTMLCanvasElement;
      if (canvas) {
        console.log('  Canvas size after zoom:', canvas.width, 'x', canvas.height);
      }
    }, 1000);
  };
  
  console.log('\n💡 To test zoom functionality, run: testZoom(1.5) or testZoom(0.75) in the browser console');
}

export {};