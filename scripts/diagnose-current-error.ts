import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

async function diagnoseCurrentError() {
  console.log('🔍 Diagnosing Current Preview Error\n');

  try {
    // Get a document with pages
    const { data: pages } = await supabase
      .from('document_pages')
      .select('*')
      .limit(1);

    if (!pages || pages.length === 0) {
      console.log('❌ No pages found');
      return;
    }

    const page = pages[0];
    console.log('📄 Sample Page Data:');
    console.log('   Document ID:', page.documentId);
    console.log('   Page Number:', page.pageNumber);
    console.log('   Page URL:', page.pageUrl);
    console.log('   Created:', page.createdAt);

    // Test the URL
    console.log('\n🌐 Testing Page URL...');
    try {
      const response = await fetch(page.pageUrl, { method: 'HEAD' });
      console.log('   Status:', response.status);
      console.log('   Content-Type:', response.headers.get('content-type'));
      
      if (response.ok) {
        console.log('   ✅ URL is accessible');
      } else {
        console.log('   ❌ URL returned error');
      }
    } catch (error) {
      console.log('   ❌ Failed to fetch URL:', error);
    }

    // Check the error from browser console
    console.log('\n🐛 Browser Console Error Analysis:');
    console.log('   Error: "link_preload" not supported within few seconds');
    console.log('   This means: The page URLs are being preloaded incorrectly');
    console.log('   Solution: Remove or fix the preload link headers');

    console.log('\n🔧 Recommended Fix:');
    console.log('   1. Check the API response headers');
    console.log('   2. Remove Link preconnect headers that cause issues');
    console.log('   3. Ensure page URLs are loaded normally, not preloaded');

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

diagnoseCurrentError();
