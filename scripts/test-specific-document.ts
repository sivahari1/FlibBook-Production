import { config } from 'dotenv';
config({ path: '.env.local' });

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function testDocument() {
  // The correct document ID
  const documentId = '164fbf91-9471-4d88-96a0-2dfc6611a282';
  
  console.log('🔍 Testing document: ma10-rn01\n');
  console.log(`Document ID: ${documentId}\n`);
  
  // 1. Get pages
  console.log('1. Fetching pages from database...');
  const { data: pages, error } = await supabase
    .from('document_pages')
    .select('*')
    .eq('documentId', documentId)
    .order('pageNumber');
  
  if (error) {
    console.error('❌ Error:', error.message);
    return;
  }
  
  console.log(`✅ Found ${pages.length} pages\n`);
  
  // 2. Test each page URL
  console.log('2. Testing page URLs...\n');
  
  for (const page of pages) {
    console.log(`Page ${page.pageNumber}:`);
    console.log(`  URL: ${page.pageUrl}`);
    
    try {
      const response = await fetch(page.pageUrl, { method: 'HEAD' });
      
      if (response.ok) {
        console.log(`  ✅ Status: ${response.status}`);
        console.log(`  Content-Type: ${response.headers.get('content-type')}`);
        console.log(`  Size: ${response.headers.get('content-length')} bytes`);
      } else {
        console.log(`  ❌ Status: ${response.status} - ${response.statusText}`);
      }
    } catch (error: any) {
      console.log(`  ❌ Error: ${error.message}`);
    }
    console.log('');
  }
  
  // 3. Test API endpoint
  console.log('3. Testing API endpoint...\n');
  const apiUrl = `http://localhost:3000/api/documents/${documentId}/pages`;
  console.log(`URL: ${apiUrl}\n`);
  
  try {
    const response = await fetch(apiUrl);
    console.log(`Status: ${response.status}`);
    
    if (response.ok) {
      const data = await response.json();
      console.log(`✅ API returns ${data.length} pages`);
      
      if (data.length > 0) {
        console.log(`\nFirst page structure:`);
        console.log(JSON.stringify(data[0], null, 2));
      }
    } else {
      const text = await response.text();
      console.log(`❌ Error: ${text}`);
    }
  } catch (error: any) {
    console.log(`❌ Error: ${error.message}`);
  }
  
  console.log('\n' + '='.repeat(60));
  console.log(`✅ Test the preview at:`);
  console.log(`http://localhost:3000/dashboard/documents/${documentId}/view`);
  console.log('='.repeat(60));
}

testDocument().catch(console.error);
