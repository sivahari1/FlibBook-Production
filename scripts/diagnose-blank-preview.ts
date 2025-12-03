import { config } from 'dotenv';
config({ path: '.env.local' });

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function diagnoseBlankPreview() {
  console.log('🔍 Diagnosing Blank Preview Issue\n');
  
  // Get the document ID from the URL in the screenshot
  const documentId = '164fb9f1-9471-4d88-96a0-2d6c661a2829';
  
  console.log(`Checking document: ${documentId}\n`);
  
  // 1. Check if document exists
  console.log('1. Checking document...');
  const { data: document, error: docError } = await supabase
    .from('documents')
    .select('*')
    .eq('id', documentId)
    .single();
  
  if (docError) {
    console.error('❌ Document not found:', docError.message);
    return;
  }
  
  console.log('✅ Document found:', document.title);
  console.log('   Content Type:', document.contentType);
  console.log('   File URL:', document.fileUrl);
  
  // 2. Check document_pages table
  console.log('\n2. Checking document_pages...');
  const { data: pages, error: pagesError } = await supabase
    .from('document_pages')
    .select('*')
    .eq('documentId', documentId)
    .order('pageNumber');
  
  if (pagesError) {
    console.error('❌ Error fetching pages:', pagesError.message);
    return;
  }
  
  if (!pages || pages.length === 0) {
    console.error('❌ No pages found in document_pages table');
    console.log('\n🔧 SOLUTION: The document needs to be converted to pages.');
    console.log('   Run: npm run convert-document', documentId);
    return;
  }
  
  console.log(`✅ Found ${pages.length} pages`);
  
  // 3. Test page URL accessibility
  console.log('\n3. Testing page URL accessibility...');
  
  for (let i = 0; i < Math.min(3, pages.length); i++) {
    const page = pages[i];
    console.log(`\n   Page ${page.pageNumber}:`);
    console.log(`   URL: ${page.pageUrl}`);
    
    try {
      const response = await fetch(page.pageUrl, { method: 'HEAD' });
      console.log(`   HTTP Status: ${response.status}`);
      
      if (response.ok) {
        console.log(`   ✅ Page accessible`);
        console.log(`   Content-Type: ${response.headers.get('content-type')}`);
        console.log(`   Content-Length: ${response.headers.get('content-length')}`);
      } else {
        console.log(`   ❌ Page not accessible`);
        console.log(`   Status Text: ${response.statusText}`);
      }
    } catch (error: any) {
      console.log(`   ❌ Fetch error: ${error.message}`);
    }
  }
  
  // 4. Check API endpoint
  console.log('\n4. Testing API endpoint...');
  try {
    const apiUrl = `http://localhost:3000/api/documents/${documentId}/pages`;
    console.log(`   Testing: ${apiUrl}`);
    
    const response = await fetch(apiUrl);
    console.log(`   Status: ${response.status}`);
    
    if (response.ok) {
      const data = await response.json();
      console.log(`   ✅ API returns ${data.length || 0} pages`);
      
      if (data.length > 0) {
        console.log(`   First page URL: ${data[0].pageUrl}`);
      }
    } else {
      console.log(`   ❌ API error: ${response.statusText}`);
      const text = await response.text();
      console.log(`   Response: ${text}`);
    }
  } catch (error: any) {
    console.log(`   ❌ API request failed: ${error.message}`);
  }
  
  // 5. Check storage bucket
  console.log('\n5. Checking storage bucket...');
  const { data: buckets } = await supabase.storage.listBuckets();
  const pagesBucket = buckets?.find(b => b.name === 'document-pages');
  
  if (!pagesBucket) {
    console.error('❌ document-pages bucket not found');
    console.log('\n🔧 SOLUTION: Create the storage bucket');
    console.log('   Run: npm run create-storage-buckets');
  } else {
    console.log('✅ document-pages bucket exists');
    console.log(`   Public: ${pagesBucket.public}`);
  }
  
  console.log('\n' + '='.repeat(60));
  console.log('DIAGNOSIS COMPLETE');
  console.log('='.repeat(60));
}

diagnoseBlankPreview().catch(console.error);
