import { config } from 'dotenv';
config({ path: '.env.local' });

async function testCanonicalAPI() {
  console.log('🔍 Testing Canonical Viewer API\n');
  
  // Use an existing document ID from the database
  const documentId = '27b35557-868f-4faa-b66d-4a28d65e6ab7'; // TPIPR document
  const baseUrl = 'http://localhost:3000';
  
  console.log(`Testing document: ${documentId}\n`);
  
  // Test 1: Pages API
  console.log('1. Testing pages API...');
  try {
    const response = await fetch(`${baseUrl}/api/viewer/documents/${documentId}/pages`);
    console.log(`   Status: ${response.status}`);
    
    if (response.ok) {
      const data = await response.json();
      console.log(`   ✅ Success: ${data.totalPages} pages found`);
      console.log(`   Pages:`, data.pages.slice(0, 3).map((p: any) => `Page ${p.pageNumber}`));
      
      // Test 2: Individual page API
      if (data.pages.length > 0) {
        console.log('\n2. Testing individual page API...');
        const firstPage = data.pages[0];
        const pageResponse = await fetch(`${baseUrl}/api/viewer/documents/${documentId}/pages/${firstPage.pageNumber}`);
        console.log(`   Page ${firstPage.pageNumber} status: ${pageResponse.status}`);
        
        if (pageResponse.ok) {
          const contentType = pageResponse.headers.get('content-type');
          const contentLength = pageResponse.headers.get('content-length');
          console.log(`   ✅ Success: ${contentType}, ${contentLength} bytes`);
        } else {
          const errorText = await pageResponse.text();
          console.log(`   ❌ Error: ${errorText}`);
        }
      }
    } else {
      const errorData = await response.json();
      console.log(`   ❌ Error: ${errorData.message || errorData.error}`);
      
      if (response.status === 409) {
        console.log('   💡 This means pages need to be generated');
      }
    }
  } catch (error) {
    console.error('   ❌ Request failed:', error);
  }
  
  // Test 3: Compare with member API
  console.log('\n3. Testing member API for comparison...');
  try {
    const memberResponse = await fetch(`${baseUrl}/api/member/my-jstudyroom/${documentId}/pages`);
    console.log(`   Member API status: ${memberResponse.status}`);
    
    if (memberResponse.ok) {
      const memberData = await memberResponse.json();
      console.log(`   Member API: ${memberData.totalPages || 0} pages`);
    } else {
      console.log(`   Member API failed: ${memberResponse.status}`);
    }
  } catch (error) {
    console.error('   Member API error:', error);
  }
  
  console.log('\n' + '='.repeat(60));
  console.log('TEST COMPLETE');
  console.log('='.repeat(60));
}

testCanonicalAPI().catch(console.error);