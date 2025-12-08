import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing environment variables:');
  console.error('NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl ? 'Set' : 'Missing');
  console.error('SUPABASE_SERVICE_ROLE_KEY:', supabaseKey ? 'Set' : 'Missing');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function verifyDocumentPagesData() {
  console.log('🔍 Verifying DocumentPage Table Data...\n');

  try {
    // 1. Check if table exists and get row count
    const { data: pages, error: pagesError, count } = await supabase
      .from('document_pages')
      .select('*', { count: 'exact' });

    if (pagesError) {
      console.error('❌ Error querying document_pages table:', pagesError);
      return;
    }

    console.log(`✅ DocumentPage table exists with ${count} rows\n`);

    if (!pages || pages.length === 0) {
      console.log('⚠️  No pages found in the table');
      return;
    }

    // 2. Display sample data
    console.log('📄 Sample Page Data:');
    console.log('-------------------');
    pages.slice(0, 3).forEach((page: any) => {
      console.log(`\nDocument ID: ${page.documentId}`);
      console.log(`Page Number: ${page.pageNumber}`);
      console.log(`Page URL: ${page.pageUrl?.substring(0, 80)}...`);
      console.log(`Created: ${page.createdAt}`);
    });

    // 3. Group by document
    const docGroups = pages.reduce((acc: any, page: any) => {
      if (!acc[page.documentId]) {
        acc[page.documentId] = [];
      }
      acc[page.documentId].push(page);
      return acc;
    }, {});

    console.log('\n\n📊 Pages by Document:');
    console.log('--------------------');
    Object.entries(docGroups).forEach(([docId, docPages]: [string, any]) => {
      console.log(`Document ${docId}: ${docPages.length} pages`);
    });

    // 4. Check for documents table
    const { data: documents, error: docsError } = await supabase
      .from('documents')
      .select('id, title, contentType')
      .in('id', Object.keys(docGroups));

    if (docsError) {
      console.error('\n❌ Error querying documents:', docsError);
    } else {
      console.log('\n\n📚 Documents with Pages:');
      console.log('----------------------');
      documents?.forEach((doc: any) => {
        const pageCount = docGroups[doc.id]?.length || 0;
        console.log(`${doc.title} (${doc.contentType}): ${pageCount} pages`);
      });
    }

    // 5. Test URL accessibility (first page only)
    if (pages.length > 0 && pages[0].pageUrl) {
      console.log('\n\n🌐 Testing Page URL Accessibility...');
      console.log('-----------------------------------');
      const testUrl = pages[0].pageUrl;
      console.log(`Testing URL: ${testUrl.substring(0, 80)}...`);
      
      try {
        const response = await fetch(testUrl, { method: 'HEAD' });
        if (response.ok) {
          console.log('✅ URL is accessible');
          console.log(`Status: ${response.status}`);
          console.log(`Content-Type: ${response.headers.get('content-type')}`);
        } else {
          console.log(`⚠️  URL returned status: ${response.status}`);
        }
      } catch (fetchError) {
        console.log('❌ Error accessing URL:', fetchError);
      }
    }

    // 6. Check for missing page URLs
    const missingUrls = pages.filter((p: any) => !p.pageUrl);
    if (missingUrls.length > 0) {
      console.log(`\n\n⚠️  Warning: ${missingUrls.length} pages have missing URLs`);
    }

    console.log('\n\n✅ Verification Complete!');

  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

verifyDocumentPagesData();
