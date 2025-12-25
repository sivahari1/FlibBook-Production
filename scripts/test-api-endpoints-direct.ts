#!/usr/bin/env tsx

/**
 * Test the new viewer API endpoints directly
 */

async function testAPIEndpoints() {
  console.log('🔍 Testing viewer API endpoints...\n');

  const baseUrl = 'http://localhost:3000';
  
  // Test document ID from our previous test
  const documentId = '10f49dd4-a7f1-4900-9c06-05fe8d8bcf5c';
  const itemId = 'cmj8srmtw00039uawrqpq2ijd';

  try {
    console.log('📋 Testing pages list endpoint...');
    
    // Test with document ID
    console.log(`🔗 GET ${baseUrl}/api/viewer/${documentId}/pages`);
    const pagesResponse = await fetch(`${baseUrl}/api/viewer/${documentId}/pages`);
    console.log(`Status: ${pagesResponse.status}`);
    
    if (pagesResponse.ok) {
      const pagesData = await pagesResponse.json();
      console.log('✅ Pages list response:', JSON.stringify(pagesData, null, 2));
      
      if (pagesData.success && pagesData.pages.length > 0) {
        const firstPage = pagesData.pages[0].pageNumber;
        
        console.log('\n🖼️ Testing page image endpoint...');
        console.log(`🔗 GET ${baseUrl}/api/viewer/${documentId}/pages/${firstPage}`);
        
        const imageResponse = await fetch(`${baseUrl}/api/viewer/${documentId}/pages/${firstPage}`);
        console.log(`Status: ${imageResponse.status}`);
        console.log(`Content-Type: ${imageResponse.headers.get('content-type')}`);
        
        if (imageResponse.ok) {
          console.log('✅ Image endpoint working!');
        } else {
          const errorText = await imageResponse.text();
          console.log('❌ Image endpoint error:', errorText);
        }
      }
    } else {
      const errorText = await pagesResponse.text();
      console.log('❌ Pages list error:', errorText);
    }

    // Test with MyJstudyroom item ID
    console.log(`\n🎒 Testing with MyJstudyroom item ID...`);
    console.log(`🔗 GET ${baseUrl}/api/viewer/${itemId}/pages`);
    
    const itemPagesResponse = await fetch(`${baseUrl}/api/viewer/${itemId}/pages`);
    console.log(`Status: ${itemPagesResponse.status}`);
    
    if (itemPagesResponse.ok) {
      const itemPagesData = await itemPagesResponse.json();
      console.log('✅ Item pages response:', JSON.stringify(itemPagesData, null, 2));
    } else {
      const errorText = await itemPagesResponse.text();
      console.log('❌ Item pages error:', errorText);
    }

  } catch (error) {
    console.error('❌ Error testing API endpoints:', error);
    console.log('\n💡 Make sure the dev server is running: npm run dev');
  }
}

testAPIEndpoints();