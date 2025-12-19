#!/usr/bin/env tsx

/**
 * PDF Viewer Diagnostic Script
 * 
 * Tests the PDF.js integration to ensure it's working properly
 */

import { initializePDFJS, isPDFJSAvailable } from '../lib/pdfjs-config';
import { loadPDFDocument, type LoadPDFDocumentOptions } from '../lib/pdfjs-integration';

async function testPDFViewer() {
  console.log('🔍 Testing PDF Viewer Integration...\n');

  // Test 1: Check if PDF.js is available
  console.log('1. Checking PDF.js availability...');
  try {
    initializePDFJS();
    const isAvailable = isPDFJSAvailable();
    console.log(`   ✅ PDF.js available: ${isAvailable}`);
  } catch (error) {
    console.log(`   ❌ PDF.js initialization failed:`, error);
    return;
  }

  // Test 2: Test PDF loading (using a simple test PDF URL)
  console.log('\n2. Testing PDF document loading...');
  try {
    // You can replace this with a real PDF URL from your system
    const testPdfUrl = 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf';
    
    console.log(`   Loading PDF from: ${testPdfUrl}`);
    const result = await loadPDFDocument({
      source: testPdfUrl,
      timeout: 10000
    });
    
    console.log(`   ✅ PDF loaded successfully`);
    console.log(`   📄 Number of pages: ${result.numPages}`);
    
    // Test getting a page
    const page = await result.document.getPage(1);
    console.log(`   📏 Page 1 dimensions: ${page.getViewport({ scale: 1.0 }).width} x ${page.getViewport({ scale: 1.0 }).height}`);
    
    // Cleanup
    result.document.destroy();
    console.log(`   🧹 PDF document cleaned up`);
    
  } catch (error) {
    console.log(`   ❌ PDF loading failed:`, error);
  }

  console.log('\n✨ PDF Viewer diagnostic complete!');
}

// Run the test
testPDFViewer().catch(console.error);