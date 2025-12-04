import { config } from 'dotenv';
import { resolve } from 'path';

// Load environment variables
config({ path: resolve(process.cwd(), '.env.local') });

async function diagnoseImageLoading() {
  console.log('🔍 Diagnosing Image Loading Issue\n');

  // Test the exact URLs from your browser console
  const testUrls = [
    'https://zuhrivibcgudgsejsljo.supabase.co/storage/v1/object/public/document-pages/cmi2xriym00009u9gegjddd8j/164fbf91-9471-4d88-96a0-2dfc6611a282/page-1.jpg',
    'https://zuhrivibcgudgsejsljo.supabase.co/storage/v1/object/public/document-pages/cmi2xriym00009u9gegjddd8j/164fbf91-9471-4d88-96a0-2dfc6611a282/page-2.jpg',
  ];

  console.log('📋 Testing URLs from Browser Console:\n');

  for (const url of testUrls) {
    console.log(`Testing: ${url.substring(0, 100)}...`);
    
    try {
      // Test with different headers to simulate browser behavior
      const tests = [
        { name: 'No Headers', headers: {} },
        { name: 'With User-Agent', headers: { 'User-Agent': 'Mozilla/5.0' } },
        { name: 'With Referer', headers: { 'Referer': 'http://localhost:3000/' } },
        { name: 'With Origin', headers: { 'Origin': 'http://localhost:3000' } },
      ];

      for (const test of tests) {
        const response = await fetch(url, {
          method: 'GET',
          headers: test.headers as any,
        });

        console.log(`  ${test.name}: ${response.status} ${response.statusText}`);
        
        if (response.status !== 200) {
          const text = await response.text();
          console.log(`    Error: ${text.substring(0, 100)}`);
        }
      }
      console.log();
    } catch (error) {
      console.error(`  ❌ Error:`, error);
    }
  }

  // Check if the path structure is correct
  console.log('\n📁 Analyzing URL Structure:');
  const sampleUrl = testUrls[0];
  const urlParts = sampleUrl.split('/');
  console.log('  Bucket:', urlParts[7]);
  console.log('  Document ID:', urlParts[8]);
  console.log('  Conversion ID:', urlParts[9]);
  console.log('  File:', urlParts[10]);

  // Test if we can list files in the bucket
  console.log('\n🗂️  Testing Supabase Storage Access:');
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (supabaseUrl && supabaseKey) {
    try {
      const listUrl = `${supabaseUrl}/storage/v1/object/list/document-pages`;
      const response = await fetch(listUrl, {
        headers: {
          'Authorization': `Bearer ${supabaseKey}`,
          'apikey': supabaseKey,
        },
      });

      if (response.ok) {
        const files = await response.json();
        console.log(`  ✅ Found ${files.length} items in bucket`);
        if (files.length > 0) {
          console.log(`  First few items:`, files.slice(0, 3).map((f: any) => f.name));
        }
      } else {
        console.log(`  ❌ Failed to list files: ${response.status}`);
      }
    } catch (error) {
      console.error(`  ❌ Error listing files:`, error);
    }
  }

  console.log('\n💡 Recommendations:');
  console.log('1. If all tests return 400, the files may not exist in storage');
  console.log('2. If some tests work, it\'s a CORS/referrer issue');
  console.log('3. Check if the document was properly converted');
  console.log('4. Verify the storage bucket path structure');
}

diagnoseImageLoading();
