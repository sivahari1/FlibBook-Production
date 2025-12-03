import { config } from 'dotenv';
config({ path: '.env.local' });

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function listDocuments() {
  console.log('📄 Listing all documents\n');
  
  const { data: documents, error } = await supabase
    .from('documents')
    .select('id, title, contentType, createdAt')
    .order('createdAt', { ascending: false })
    .limit(10);
  
  if (error) {
    console.error('❌ Error:', error.message);
    return;
  }
  
  if (!documents || documents.length === 0) {
    console.log('❌ No documents found in database');
    console.log('\n🔧 SOLUTION: Upload a document first');
    return;
  }
  
  console.log(`Found ${documents.length} documents:\n`);
  
  for (const doc of documents) {
    console.log(`📄 ${doc.title}`);
    console.log(`   ID: ${doc.id}`);
    console.log(`   Type: ${doc.contentType}`);
    console.log(`   Created: ${new Date(doc.createdAt).toLocaleString()}`);
    
    // Check if it has pages
    const { data: pages } = await supabase
      .from('document_pages')
      .select('pageNumber')
      .eq('documentId', doc.id);
    
    if (pages && pages.length > 0) {
      console.log(`   ✅ ${pages.length} pages converted`);
    } else {
      console.log(`   ⚠️  No pages (needs conversion)`);
    }
    console.log('');
  }
}

listDocuments().catch(console.error);
