import { config } from 'dotenv';
config({ path: '.env.local' });

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function checkDocument() {
  console.log('🔍 Checking Document Existence\n');
  
  const documentId = '27b35557-868f-4faa-b66d-4a28d65e6ab7'; // TPIPR document
  
  // Check if document exists
  console.log('1. Checking document...');
  const { data: document, error: docError } = await supabase
    .from('documents')
    .select('*')
    .eq('id', documentId)
    .single();
  
  if (docError) {
    console.error('❌ Document not found:', docError.message);
    
    // List some documents to see what's available
    console.log('\n2. Listing available documents...');
    const { data: docs } = await supabase
      .from('documents')
      .select('id, title, mimeType')
      .limit(5);
    
    if (docs && docs.length > 0) {
      console.log('Available documents:');
      docs.forEach(doc => {
        console.log(`   ${doc.id} - ${doc.title} (${doc.mimeType})`);
      });
    } else {
      console.log('No documents found in database');
    }
    return;
  }
  
  console.log('✅ Document found:', document.title);
  console.log('   Content Type:', document.mimeType);
  console.log('   Owner ID:', document.userId);
  
  // Check document_pages table
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
    return;
  }
  
  console.log(`✅ Found ${pages.length} pages`);
  
  // Check first page URL
  const firstPage = pages[0];
  console.log(`\n3. First page details:`);
  console.log(`   Page Number: ${firstPage.pageNumber}`);
  console.log(`   Page URL: ${firstPage.pageUrl}`);
  
  // Test page URL accessibility
  if (firstPage.pageUrl) {
    try {
      const response = await fetch(firstPage.pageUrl, { method: 'HEAD' });
      console.log(`   HTTP Status: ${response.status}`);
      
      if (response.ok) {
        console.log(`   ✅ Page accessible`);
        console.log(`   Content-Type: ${response.headers.get('content-type')}`);
      } else {
        console.log(`   ❌ Page not accessible`);
      }
    } catch (error: any) {
      console.log(`   ❌ Fetch error: ${error.message}`);
    }
  }
}

checkDocument().catch(console.error);