import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

async function testPagesAPI() {
  console.log('🧪 Testing Pages API Endpoint...\n');

  try {
    // Get a document with pages
    const { data: pages } = await supabase
      .from('document_pages')
      .select('documentId')
      .limit(1);

    if (!pages || pages.length === 0) {
      console.log('❌ No pages found in database');
      return;
    }

    const testDocId = pages[0].documentId;
    console.log(`Testing with document ID: ${testDocId}\n`);

    // Simulate the API call that the frontend makes
    const { data: docPages, error } = await supabase
      .from('document_pages')
      .select('*')
      .eq('documentId', testDocId)
      .order('pageNumber', { ascending: true });

    if (error) {
      console.error('❌ Error fetching pages:', error);
      return;
    }

    console.log(`✅ Successfully fetched ${docPages.length} pages\n`);

    console.log('📄 Page Details:');
    console.log('---------------');
    docPages.forEach((page: any, index: number) => {
      console.log(`\nPage ${index + 1}:`);
      console.log(`  - Page Number: ${page.pageNumber}`);
      console.log(`  - Has URL: ${page.pageUrl ? 'Yes' : 'No'}`);
      console.log(`  - URL Preview: ${page.pageUrl?.substring(0, 60)}...`);
    });

    // Test if URLs are accessible
    console.log('\n\n🌐 Testing URL Accessibility...');
    console.log('------------------------------');
    
    for (let i = 0; i < Math.min(3, docPages.length); i++) {
      const page = docPages[i];
      if (page.pageUrl) {
        try {
          const response = await fetch(page.pageUrl, { method: 'HEAD' });
          const status = response.ok ? '✅' : '❌';
          console.log(`${status} Page ${page.pageNumber}: ${response.status} ${response.statusText}`);
        } catch (err) {
          console.log(`❌ Page ${page.pageNumber}: Failed to fetch`);
        }
      }
    }

    console.log('\n\n✅ API Test Complete!');
    console.log('\n📋 Summary:');
    console.log(`  - Total pages: ${docPages.length}`);
    console.log(`  - All pages have URLs: ${docPages.every((p: any) => p.pageUrl) ? 'Yes' : 'No'}`);
    console.log(`  - Pages are ordered: ${docPages.every((p: any, i: number) => p.pageNumber === i + 1) ? 'Yes' : 'No'}`);

  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

testPagesAPI();
