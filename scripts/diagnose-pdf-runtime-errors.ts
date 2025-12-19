#!/usr/bin/env tsx

/**
 * Diagnose PDF Runtime Errors
 * 
 * This script identifies the actual runtime issues preventing PDF preview/view
 */

import { readFile } from 'fs/promises';
import { join } from 'path';

async function diagnosePDFRuntimeErrors() {
  console.log('🔍 DIAGNOSING PDF RUNTIME ERRORS');
  console.log('=====================================\n');

  // Check if ReliablePDFRenderer is properly implemented
  try {
    const reliableRendererPath = join(process.cwd(), 'lib/pdf-reliability/reliable-pdf-renderer.ts');
    const reliableRendererContent = await readFile(reliableRendererPath, 'utf-8');
    
    console.log('📋 CHECKING RELIABLE PDF RENDERER IMPLEMENTATION:');
    
    // Check for key methods
    const hasRenderPDF = reliableRendererContent.includes('renderPDF');
    const hasOnProgressUpdate = reliableRendererContent.includes('onProgressUpdate');
    const hasCancelRendering = reliableRendererContent.includes('cancelRendering');
    const hasForceRetry = reliableRendererContent.includes('forceRetry');
    
    console.log(`  ✅ renderPDF method: ${hasRenderPDF ? 'FOUND' : '❌ MISSING'}`);
    console.log(`  ✅ onProgressUpdate method: ${hasOnProgressUpdate ? 'FOUND' : '❌ MISSING'}`);
    console.log(`  ✅ cancelRendering method: ${hasCancelRendering ? 'FOUND' : '❌ MISSING'}`);
    console.log(`  ✅ forceRetry method: ${hasForceRetry ? 'FOUND' : '❌ MISSING'}`);
    
    if (!hasRenderPDF) {
      console.log('  🚨 CRITICAL: renderPDF method is missing - this is why PDF rendering fails!');
    }
    
  } catch (error) {
    console.log('  ❌ ReliablePDFRenderer file not found or not readable');
    console.log('  🚨 CRITICAL: This is why PDF rendering fails!');
  }

  console.log('\n📋 CHECKING RENDERING METHOD CHAIN:');
  
  try {
    const chainPath = join(process.cwd(), 'lib/pdf-reliability/rendering-method-chain.ts');
    const chainContent = await readFile(chainPath, 'utf-8');
    
    const hasExecuteMethod = chainContent.includes('executeMethod');
    const hasGetNextMethod = chainContent.includes('getNextMethod');
    const hasRecordSuccess = chainContent.includes('recordSuccess');
    
    console.log(`  ✅ executeMethod: ${hasExecuteMethod ? 'FOUND' : '❌ MISSING'}`);
    console.log(`  ✅ getNextMethod: ${hasGetNextMethod ? 'FOUND' : '❌ MISSING'}`);
    console.log(`  ✅ recordSuccess: ${hasRecordSuccess ? 'FOUND' : '❌ MISSING'}`);
    
    if (!hasExecuteMethod) {
      console.log('  🚨 CRITICAL: executeMethod is missing - rendering chain cannot work!');
    }
    
  } catch (error) {
    console.log('  ❌ RenderingMethodChain file not found');
    console.log('  🚨 CRITICAL: This is why fallback methods don\'t work!');
  }

  console.log('\n📋 CHECKING PDF.JS INTEGRATION:');
  
  try {
    const pdfjsPath = join(process.cwd(), 'lib/pdfjs-integration.ts');
    const pdfjsContent = await readFile(pdfjsPath, 'utf-8');
    
    const hasLoadPDFDocument = pdfjsContent.includes('export.*loadPDFDocument');
    const hasRenderPageToCanvas = pdfjsContent.includes('export.*renderPageToCanvas');
    
    console.log(`  ✅ loadPDFDocument export: ${hasLoadPDFDocument ? 'FOUND' : '❌ MISSING'}`);
    console.log(`  ✅ renderPageToCanvas export: ${hasRenderPageToCanvas ? 'FOUND' : '❌ MISSING'}`);
    
  } catch (error) {
    console.log('  ❌ PDF.js integration file issues');
  }

  console.log('\n📋 CHECKING PDF VIEWER COMPONENT:');
  
  try {
    const viewerPath = join(process.cwd(), 'components/viewers/PDFViewerWithPDFJS.tsx');
    const viewerContent = await readFile(viewerPath, 'utf-8');
    
    // Check for the specific error patterns from console
    const hasReliableRendererRef = viewerContent.includes('reliableRendererRef');
    const hasRenderPDFCall = viewerContent.includes('renderPDF(');
    const hasLegacyFallback = viewerContent.includes('loadDocumentLegacy');
    
    console.log(`  ✅ reliableRendererRef: ${hasReliableRendererRef ? 'FOUND' : '❌ MISSING'}`);
    console.log(`  ✅ renderPDF call: ${hasRenderPDFCall ? 'FOUND' : '❌ MISSING'}`);
    console.log(`  ✅ legacy fallback: ${hasLegacyFallback ? 'FOUND' : '❌ MISSING'}`);
    
    // Check for the specific error from console
    if (viewerContent.includes('Rendering method chain not yet implemented')) {
      console.log('  🚨 FOUND: "Rendering method chain not yet implemented" error in code');
    }
    
  } catch (error) {
    console.log('  ❌ PDF Viewer component issues');
  }

  console.log('\n🎯 ROOT CAUSE ANALYSIS:');
  console.log('Based on the console errors, the main issues are:');
  console.log('1. ReliablePDFRenderer.renderPDF() method is not properly implemented');
  console.log('2. RenderingMethodChain is throwing "not yet implemented" errors');
  console.log('3. The reliability system is failing back to legacy loading');
  console.log('4. Even legacy loading has issues with PDF.js integration');
  
  console.log('\n💡 IMMEDIATE FIX NEEDED:');
  console.log('1. Implement the missing renderPDF method in ReliablePDFRenderer');
  console.log('2. Implement the missing methods in RenderingMethodChain');
  console.log('3. Fix the PDF.js integration for legacy fallback');
  console.log('4. Test with a simple PDF.js implementation first');
  
  console.log('\n🚀 QUICK SOLUTION:');
  console.log('Since the reliability system is complex and not fully implemented,');
  console.log('we should create a SIMPLE, WORKING PDF viewer first, then enhance it.');
}

// Run the diagnosis
diagnosePDFRuntimeErrors().catch(console.error);