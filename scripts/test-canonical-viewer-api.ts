#!/usr/bin/env tsx

/**
 * Test script for the canonical viewer API
 * 
 * This script tests the new viewer API endpoints to ensure they work correctly
 * with proper authorization, error handling, and binary streaming.
 */

import { prisma } from '../lib/db';

async function testCanonicalViewerAPI() {
  console.log('🧪 Testing Canonical Viewer API');
  console.log('================================');

  try {
    // 1. Find a test document
    console.log('\n1. Finding test document...');
    
    const testDocument = await prisma.document.findFirst({
      where: {
        mimeType: 'application/pdf'
      },
      include: {
        pages: {
          take: 1,
          orderBy: { pageNumber: 'asc' }
        }
      }
    });

    if (!testDocument) {
      console.log('❌ No PDF documents found in database');
      return;
    }

    console.log(`✅ Found test document: ${testDocument.title} (${testDocument.id})`);
    console.log(`   - Owner: ${testDocument.userId}`);
    console.log(`   - Pages in DB: ${testDocument.pages.length}`);

    // 2. Test pages API endpoint
    console.log('\n2. Testing pages API endpoint...');
    
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const pagesUrl = `${baseUrl}/api/viewer/documents/${testDocument.id}/pages`;
    
    console.log(`   Calling: ${pagesUrl}`);
    
    try {
      const pagesResponse = await fetch(pagesUrl);
      console.log(`   Status: ${pagesResponse.status} ${pagesResponse.statusText}`);
      
      if (pagesResponse.ok) {
        const pagesData = await pagesResponse.json();
        console.log(`   ✅ Pages API successful`);
        console.log(`   - Success: ${pagesData.success}`);
        console.log(`   - Total pages: ${pagesData.totalPages}`);
        console.log(`   - Pages count: ${pagesData.pages?.length || 0}`);
        
        // 3. Test individual page endpoint
        if (pagesData.pages && pagesData.pages.length > 0) {
          console.log('\n3. Testing individual page endpoint...');
          
          const pageUrl = `${baseUrl}/api/viewer/documents/${testDocument.id}/pages/1`;
          console.log(`   Calling: ${pageUrl}`);
          
          const pageResponse = await fetch(pageUrl, { method: 'HEAD' }); // Use HEAD to avoid downloading
          console.log(`   Status: ${pageResponse.status} ${pageResponse.statusText}`);
          console.log(`   Content-Type: ${pageResponse.headers.get('content-type')}`);
          console.log(`   Content-Length: ${pageResponse.headers.get('content-length')}`);
          
          if (pageResponse.ok) {
            console.log(`   ✅ Page API successful`);
          } else {
            console.log(`   ❌ Page API failed`);
          }
        }
        
      } else {
        const errorData = await pagesResponse.json().catch(() => ({ error: 'Unknown error' }));
        console.log(`   ❌ Pages API failed: ${errorData.error || errorData.message}`);
      }
      
    } catch (fetchError) {
      console.log(`   ❌ Network error: ${fetchError}`);
    }

    // 4. Test diagnostics endpoint
    console.log('\n4. Testing diagnostics endpoint...');
    
    const diagnosticsUrl = `${baseUrl}/api/viewer/diagnose/${testDocument.id}`;
    console.log(`   Calling: ${diagnosticsUrl}`);
    
    try {
      const diagnosticsResponse = await fetch(diagnosticsUrl);
      console.log(`   Status: ${diagnosticsResponse.status} ${diagnosticsResponse.statusText}`);
      
      if (diagnosticsResponse.ok) {
        const diagnosticsData = await diagnosticsResponse.json();
        console.log(`   ✅ Diagnostics API successful`);
        console.log(`   - Can view: ${diagnosticsData.summary?.canView}`);
        console.log(`   - Has pages: ${diagnosticsData.summary?.hasPages}`);
        console.log(`   - Storage accessible: ${diagnosticsData.summary?.storageAccessible}`);
        console.log(`   - Healthy: ${diagnosticsData.summary?.healthy}`);
        console.log(`   - Issues: ${diagnosticsData.summary?.issues?.length || 0}`);
        
        if (diagnosticsData.summary?.issues?.length > 0) {
          console.log(`   - Issue details: ${diagnosticsData.summary.issues.join(', ')}`);
        }
        
        if (diagnosticsData.recommendations?.length > 0) {
          console.log(`   - Recommendations: ${diagnosticsData.recommendations.join(', ')}`);
        }
        
      } else {
        const errorData = await diagnosticsResponse.json().catch(() => ({ error: 'Unknown error' }));
        console.log(`   ❌ Diagnostics API failed: ${errorData.error || errorData.message}`);
      }
      
    } catch (fetchError) {
      console.log(`   ❌ Network error: ${fetchError}`);
    }

    // 5. Database integrity check
    console.log('\n5. Database integrity check...');
    
    const documentPagesCount = await prisma.documentPage.count({
      where: { documentId: testDocument.id }
    });
    
    console.log(`   - Document pages in DB: ${documentPagesCount}`);
    
    if (documentPagesCount > 0) {
      const samplePage = await prisma.documentPage.findFirst({
        where: { documentId: testDocument.id },
        orderBy: { pageNumber: 'asc' }
      });
      
      console.log(`   - Sample page URL: ${samplePage?.pageUrl ? '***' : 'null'}`);
      console.log(`   - Sample page format: ${samplePage?.format || 'unknown'}`);
      console.log(`   - Sample page size: ${samplePage?.fileSize || 0} bytes`);
    }

    console.log('\n✅ Canonical Viewer API test completed');
    
  } catch (error) {
    console.error('\n❌ Test failed with error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the test
if (require.main === module) {
  testCanonicalViewerAPI().catch(console.error);
}

export { testCanonicalViewerAPI };