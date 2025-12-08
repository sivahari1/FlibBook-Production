import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

async function diagnoseActualError() {
  console.log('🔍 Diagnosing Actual Flipbook Error...\n');

  try {
    // Get a document with pages
    const { data: pages } = await supabase
      .from('document_pages')
      .select('documentId, pageNumber, pageUrl')
      .limit(1);

    if (!pages || pages.length === 0) {
      console.log('❌ No pages in database');
      return;
    }

    const testDocId = pages[0].documentId;
    const testPageUrl = pages[0].pageUrl;

    console.log(`Testing Document: ${testDocId}`);
    console.log(`Testing Page URL: ${testPageUrl}\n`);

    // 1. Check if the document_pages table has expiresAt column
    console.log('1️⃣ Checking table structure...');
    const { data: tableInfo, error: tableError } = await supabase
      .from('document_pages')
      .select('*')
      .limit(1);

    if (tableError) {
      console.error('❌ Table query error:', tableError);
      return;
    }

    if (tableInfo && tableInfo.length > 0) {
      console.log('✅ Table columns:', Object.keys(tableInfo[0]));
      console.log('Has expiresAt?', 'expiresAt' in tableInfo[0] ? 'YES' : 'NO ❌');
    }

    // 2. Try to query with expiresAt filter (like the API does)
    console.log('\n2️⃣ Testing query with expiresAt filter...');
    const { data: filteredPages, error: filterError } = await supabase
      .from('document_pages')
      .select('*')
      .eq('documentId', testDocId)
      .gt('expiresAt', new Date().toISOString())
      .order('pageNumber', { ascending: true });

    if (filterError) {
      console.error('❌ FOUND THE PROBLEM!');
      console.error('Error querying with expiresAt:', filterError);
      console.error('\nThe expiresAt column is missing from the document_pages table!');
    } else {
      console.log('✅ Query with expiresAt works');
      console.log(`Found ${filteredPages?.length || 0} pages`);
    }

    // 3. Try query WITHOUT expiresAt filter
    console.log('\n3️⃣ Testing query WITHOUT expiresAt filter...');
    const { data: allPages, error: allError } = await supabase
      .from('document_pages')
      .select('*')
      .eq('documentId', testDocId)
      .order('pageNumber', { ascending: true });

    if (allError) {
      console.error('❌ Error:', allError);
    } else {
      console.log('✅ Query without expiresAt works!');
      console.log(`Found ${allPages?.length || 0} pages`);
      if (allPages && allPages.length > 0) {
        console.log('\nSample page:', {
          pageNumber: allPages[0].pageNumber,
          hasUrl: !!allPages[0].pageUrl,
          urlPreview: allPages[0].pageUrl?.substring(0, 60) + '...',
        });
      }
    }

    // 4. Test actual page URL
    console.log('\n4️⃣ Testing page URL accessibility...');
    try {
      const response = await fetch(testPageUrl, { method: 'HEAD' });
      console.log(`✅ URL accessible: ${response.status} ${response.statusText}`);
    } catch (err) {
      console.error('❌ URL not accessible:', err);
    }

  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

diagnoseActualError();
