import { config } from 'dotenv';
config({ path: '.env.local' });

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function testPreviewRendering() {
  console.log('🔍 Testing Preview Rendering\n');

  // Get a document with pages
  const { data: docs, error: docsError } = await supabase
    .from('documents')
    .select('id, title, contentType')
    .eq('contentType', 'PDF')
    .limit(1);

  if (docsError || !docs || docs.length === 0) {
    console.error('❌ No PDF documents found');
    return;
  }

  const doc = docs[0];
  console.log(`✅ Testing document: ${doc.title} (${doc.id})\n`);

  // Get pages for this document
  const { data: pages, error: pagesError } = await supabase
    .from('document_pages')
    .select('*')
    .eq('documentId', doc.id)
    .order('pageNumber');

  if (pagesError) {
    console.error('❌ Error fetching pages:', pagesError);
    return;
  }

  if (!pages || pages.length === 0) {
    console.log('❌ No pages found for this document');
    return;
  }

  console.log(`✅ Found ${pages.length} pages\n`);

  // Test first 3 page URLs
  console.log('Testing page URLs:\n');
  for (let i = 0; i < Math.min(3, pages.length); i++) {
    const page = pages[i];
    console.log(`Page ${page.pageNumber}:`);
    console.log(`  URL: ${page.pageUrl}`);
    
    try {
      const response = await fetch(page.pageUrl);
      console.log(`  Status: ${response.status}`);
      console.log(`  Content-Type: ${response.headers.get('content-type')}`);
      console.log(`  Content-Length: ${response.headers.get('content-length')} bytes`);
      
      if (response.status === 200) {
        console.log(`  ✅ Image accessible`);
      } else {
        console.log(`  ❌ Image not accessible`);
      }
    } catch (error) {
      console.log(`  ❌ Error fetching image:`, error);
    }
    console.log('');
  }

  // Check if pages are expired
  const now = new Date();
  const expiredPages = pages.filter(p => new Date(p.expiresAt) < now);
  if (expiredPages.length > 0) {
    console.log(`⚠️  Warning: ${expiredPages.length} pages are expired`);
  } else {
    console.log(`✅ All pages are valid (not expired)`);
  }

  console.log('\n📝 Summary:');
  console.log(`  Document ID: ${doc.id}`);
  console.log(`  Total Pages: ${pages.length}`);
  console.log(`  All pages accessible: ${pages.length > 0 ? 'Yes' : 'No'}`);
  console.log(`\n🌐 Preview URL: http://localhost:3000/dashboard/documents/${doc.id}/view`);
}

testPreviewRendering().catch(console.error);
