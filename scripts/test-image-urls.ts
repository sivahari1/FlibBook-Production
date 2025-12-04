import { config } from 'dotenv';
import { resolve } from 'path';

// Load environment variables
config({ path: resolve(process.cwd(), '.env.local') });

async function testImageUrls() {
  console.log('🔍 Testing Image URLs from Browser Console\n');

  // These are the URLs from your screenshot that are failing with 400
  const failingUrls = [
    'https://zuhrivibcgudgsejsljo.supabase.co/storage/v1/object/public/document-pages/cmi2xriym00009u9gegjddd8j/164fbf91-9471-4d88-96a0-2dfc6611a282/page-1.jpg',
    'https://zuhrivibcgudgsejsljo.supabase.co/storage/v1/object/public/document-pages/cmi2xriym00009u9gegjddd8j/164fbf91-9471-4d88-96a0-2dfc6611a282/page-2.jpg',
  ];

  for (const url of failingUrls) {
    console.log(`\nTesting: ${url}`);
    
    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        },
      });

      console.log(`  Status: ${response.status} ${response.statusText}`);
      console.log(`  Content-Type: ${response.headers.get('content-type')}`);
      console.log(`  Content-Length: ${response.headers.get('content-length')}`);
      console.log(`  Cache-Control: ${response.headers.get('cache-control')}`);
      
      if (response.status === 200) {
        console.log('  ✅ Image loads successfully from Node.js');
      } else {
        console.log('  ❌ Image failed to load');
        const text = await response.text();
        console.log(`  Response: ${text.substring(0, 200)}`);
      }
    } catch (error) {
      console.error(`  ❌ Error:`, error);
    }
  }

  console.log('\n📋 Analysis:');
  console.log('If images load from Node.js but fail in browser:');
  console.log('  - Check browser console for CORS errors');
  console.log('  - Verify browser cache is cleared');
  console.log('  - Check if browser extensions are blocking requests');
  console.log('\nIf images fail from both:');
  console.log('  - Verify Supabase storage bucket is public');
  console.log('  - Check if files actually exist in storage');
  console.log('  - Verify URL format is correct');
}

testImageUrls();
