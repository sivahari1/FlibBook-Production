#!/usr/bin/env tsx

/**
 * Diagnose PDF 404 Issue
 * 
 * This script checks why the PDF viewer is getting 404 errors
 * for the document pages API endpoints.
 */

import { prisma } from '@/lib/db';

async function diagnosePDF404Issue() {
  const documentId = '27b35557-868f-4faa-b66d-4a28d65e6ab7'; // TPIPR document with 5 pages
  
  console.log('🔍 Diagnosing PDF 404 Issue');
  console.log('================================');
  console.log(`Document ID: ${documentId}`);
  console.log('');
  
  try {
    // 1. Check if document exists
    console.log('1. Checking if document exists...');
    const document = await prisma.document.findUnique({
      where: { id: documentId },
      select: {
        id: true,
        title: true,
        mimeType: true,
        contentType: true,
        createdAt: true,
        userId: true
      }
    });
    
    if (!document) {
      console.log('❌ Document not found in database');
      return;
    }
    
    console.log('✅ Document found:');
    console.log(`   Title: ${document.title}`);
    console.log(`   MIME Type: ${document.mimeType}`);
    console.log(`   Content Type: ${document.contentType}`);
    console.log(`   User ID: ${document.userId}`);
    console.log('');
    
    // 2. Check document pages
    console.log('2. Checking document pages...');
    const pages = await prisma.documentPage.findMany({
      where: { documentId },
      select: {
        pageNumber: true,
        pageUrl: true,
        fileSize: true,
        format: true
      },
      orderBy: { pageNumber: 'asc' }
    });
    
    if (pages.length === 0) {
      console.log('❌ No pages found for this document');
      console.log('   This explains the 404 errors - pages need to be generated');
      console.log('');
      
      // Check if there's a conversion job
      console.log('3. Checking conversion status...');
      const conversionJob = await prisma.conversionJob.findFirst({
        where: { documentId },
        select: {
          id: true,
          status: true,
          progress: true,
          error: true,
          createdAt: true,
          updatedAt: true
        },
        orderBy: { createdAt: 'desc' }
      });
      
      if (conversionJob) {
        console.log('📋 Conversion job found:');
        console.log(`   Status: ${conversionJob.status}`);
        console.log(`   Progress: ${conversionJob.progress}%`);
        if (conversionJob.error) {
          console.log(`   Error: ${conversionJob.error}`);
        }
        console.log(`   Created: ${conversionJob.createdAt}`);
        console.log(`   Updated: ${conversionJob.updatedAt}`);
      } else {
        console.log('❌ No conversion job found');
        console.log('   Document may need to be converted to generate pages');
      }
      
      return;
    }
    
    console.log(`✅ Found ${pages.length} pages:`);
    pages.slice(0, 5).forEach(page => {
      console.log(`   Page ${page.pageNumber}: ${page.pageUrl} (${page.fileSize} bytes, ${page.format})`);
    });
    if (pages.length > 5) {
      console.log(`   ... and ${pages.length - 5} more pages`);
    }
    console.log('');
    
    // 3. Test API endpoints
    console.log('3. Testing API endpoints...');
    
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    
    // Test pages list API
    console.log('   Testing pages list API...');
    try {
      const pagesResponse = await fetch(`${baseUrl}/api/viewer/documents/${documentId}/pages`);
      console.log(`   Status: ${pagesResponse.status}`);
      
      if (pagesResponse.ok) {
        const pagesData = await pagesResponse.json();
        console.log(`   ✅ Pages API working: ${pagesData.totalPages} pages`);
      } else {
        const errorData = await pagesResponse.text();
        console.log(`   ❌ Pages API failed: ${errorData}`);
      }
    } catch (error) {
      console.log(`   ❌ Pages API error: ${error}`);
    }
    
    // Test individual page API
    console.log('   Testing individual page API...');
    try {
      const pageResponse = await fetch(`${baseUrl}/api/viewer/documents/${documentId}/pages/1`);
      console.log(`   Status: ${pageResponse.status}`);
      
      if (pageResponse.ok) {
        const contentType = pageResponse.headers.get('content-type');
        const contentLength = pageResponse.headers.get('content-length');
        console.log(`   ✅ Page API working: ${contentType}, ${contentLength} bytes`);
      } else {
        const errorData = await pageResponse.text();
        console.log(`   ❌ Page API failed: ${errorData}`);
      }
    } catch (error) {
      console.log(`   ❌ Page API error: ${error}`);
    }
    
    console.log('');
    console.log('🎯 DIAGNOSIS COMPLETE');
    console.log('====================');
    
    if (pages.length === 0) {
      console.log('❌ ROOT CAUSE: Document has no pages generated');
      console.log('');
      console.log('💡 SOLUTION: Convert the document to generate page images');
      console.log('   Run: npm run convert-document ' + documentId);
    } else {
      console.log('✅ Document has pages - API issue may be elsewhere');
      console.log('   Check authentication, authorization, or storage access');
    }
    
  } catch (error) {
    console.error('❌ Error during diagnosis:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the diagnosis
diagnosePDF404Issue().catch(console.error);