import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

async function testApiCallDirect() {
  console.log('🧪 Testing API Call Directly\n');
  
  try {
    // Get a document with pages
    const { data: pages } = await supabase
      .from('document_pages')
      .select('*')
      .limit(1);

    if (!pages || pages.length === 0) {
      console.log('❌ No pages found in database');
      return;
    }

    const documentId = pages[0].documentId;
    console.log('📄 Testing with document:', documentId);

    // Test database query directly
    console.log('\n🗄️ Testing database query directly...');
    const { data: dbPages, error: dbError } = await supabase
      .from('document_pages')
      .select('*')
      .eq('documentId', documentId)
      .order('pageNumber', { ascending: true });

    if (dbError) {
      console.log('❌ Database error:', dbError);
    } else {
      console.log('✅ Database query successful');
      console.log('   Pages found:', dbPages?.length);
      if (dbPages && dbPages.length > 0) {
        console.log('   Sample page URL:', dbPages[0].pageUrl);
        
        // Test if the URL is accessible
        console.log('\n🖼️ Testing first page URL accessibility...');
        try {
          const response = await fetch(dbPages[0].pageUrl, { method: 'HEAD' });
          console.log('   Status:', response.status, response.statusText);
          if (response.ok) {
            console.log('   ✅ Page URL is accessible');
          } else {
            console.log('   ❌ Page URL failed with status:', response.status);
          }
        } catch (fetchError) {
          console.log('   ❌ Failed to fetch page URL:', fetchError);
        }
      }
    }

    console.log('\n💡 Next Steps:');
    console.log('   1. Make sure dev server is running: npm run dev');
    console.log('   2. Check browser console for specific errors');
    console.log('   3. Verify the page URLs are accessible');
    
  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

testApiCallDirect();
