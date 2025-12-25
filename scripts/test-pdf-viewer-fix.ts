#!/usr/bin/env tsx

/**
 * Test PDF Viewer Fix
 * 
 * This script tests the PDF viewer with a real document to see if the fix works.
 */

async function testPDFViewerFix() {
  const documentId = '27b35557-868f-4faa-b66d-4a28d65e6ab7'; // TPIPR document with 5 pages
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  
  console.log('🧪 Testing PDF Viewer Fix');
  console.log('==========================');
  console.log(`Document ID: ${documentId}`);
  console.log(`Base URL: ${baseUrl}`);
  console.log('');
  
  try {
    // Test the member view page directly
    console.log('1. Testing member view page...');
    const memberViewUrl = `${baseUrl}/member/view/${documentId}`;
    console.log(`   URL: ${memberViewUrl}`);
    
    const pageResponse = await fetch(memberViewUrl);
    console.log(`   Status: ${pageResponse.status}`);
    
    if (pageResponse.ok) {
      console.log('   ✅ Member view page loads successfully');
      
      // Check if the page contains the expected viewer components
      const pageContent = await pageResponse.text();
      
      if (pageContent.includes('MyJstudyroomViewerClient')) {
        console.log('   ✅ MyJstudyroomViewerClient found in page');
      } else {
        console.log('   ⚠️ MyJstudyroomViewerClient not found in page');
      }
      
      if (pageContent.includes('SimpleDocumentViewer')) {
        console.log('   ⚠️ SimpleDocumentViewer found in page (may cause auth issues)');
      } else {
        console.log('   ✅ SimpleDocumentViewer not found in page');
      }
      
    } else {
      console.log(`   ❌ Member view page failed: ${pageResponse.status}`);
      const errorText = await pageResponse.text();
      console.log(`   Error: ${errorText.substring(0, 200)}...`);
    }
    
    console.log('');
    console.log('2. Testing API endpoints with authentication...');
    
    // Note: These tests won't work from a script because we don't have session cookies
    // But we can test the structure
    
    console.log('   Testing pages API structure...');
    const pagesResponse = await fetch(`${baseUrl}/api/viewer/documents/${documentId}/pages`);
    console.log(`   Status: ${pagesResponse.status}`);
    
    if (pagesResponse.status === 401) {
      console.log('   ✅ API correctly requires authentication');
    } else if (pagesResponse.ok) {
      console.log('   ⚠️ API allows unauthenticated access');
    } else {
      console.log(`   ❌ API returned unexpected status: ${pagesResponse.status}`);
    }
    
    console.log('');
    console.log('🎯 RECOMMENDATIONS');
    console.log('==================');
    console.log('1. Open the browser to: ' + memberViewUrl);
    console.log('2. Make sure you are logged in as a user who has access to this document');
    console.log('3. Check the browser console for any remaining errors');
    console.log('4. The PDF should now load properly with authentication');
    
  } catch (error) {
    console.error('❌ Error during test:', error);
  }
}

// Run the test
testPDFViewerFix().catch(console.error);