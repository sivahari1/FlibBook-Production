/**
 * Direct test of page URLs from the database
 * This bypasses Prisma connection issues and tests URLs directly
 */

import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';

// Load environment variables
config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

async function testPageUrls() {
  console.log('🔍 Testing Page URLs Directly\n');
  console.log('='.repeat(60));

  const supabase = createClient(supabaseUrl, supabaseKey);

  // Query DocumentPage table directly
  console.log('\n1️⃣ Querying DocumentPage table...');
  const { data: pages, error } = await supabase
    .from('DocumentPage')
    .select('*')
    .limit(5);

  if (error) {
    console.log('❌ Error querying DocumentPage:', error.message);
    return;
  }

  if (!pages || pages.length === 0) {
    console.log('⚠️  No pages found in database');
    console.log('   Run conversion script to generate pages');
    return;
  }

  console.log(`✅ Found ${pages.length} pages`);

  // Test each URL
  console.log('\n2️⃣ Testing Page URLs...');
  for (const page of pages) {
    console.log(`\n   Page ${page.pageNumber} (Doc: ${page.documentId.substring(0, 8)}...)`);
    console.log(`   URL: ${page.pageUrl.substring(0, 80)}...`);

    try {
      const response = await fetch(page.pageUrl, { method: 'HEAD' });
      console.log(`   Status: ${response.status} ${response.statusText}`);

      if (response.status === 200) {
        console.log('   ✅ URL is accessible');
        const contentType = response.headers.get('content-type');
        const contentLength = response.headers.get('content-length');
        console.log(`   Content-Type: ${contentType}`);
        console.log(`   Size: ${contentLength ? `${(parseInt(contentLength) / 1024).toFixed(2)} KB` : 'unknown'}`);
      } else if (response.status === 401) {
        console.log('   ❌ Authentication required');
        console.log('   → URLs may need to be signed');
      } else if (response.status === 403) {
        console.log('   ❌ Access forbidden');
        console.log('   → Check storage bucket permissions');
      } else if (response.status === 404) {
        console.log('   ❌ File not found');
        console.log('   → File may have been deleted from storage');
      }
    } catch (fetchError: any) {
      console.log(`   ❌ Fetch failed: ${fetchError.message}`);
    }
  }

  // Test generating a signed URL
  console.log('\n3️⃣ Testing Signed URL Generation...');
  if (pages.length > 0) {
    const firstPage = pages[0];
    const urlParts = firstPage.pageUrl.split('/');
    const storagePath = urlParts.slice(-2).join('/'); // Get last two parts (userId/documentId/filename)

    console.log(`   Storage path: ${storagePath}`);

    const { data: signedData, error: signedError } = await supabase.storage
      .from('document-pages')
      .createSignedUrl(storagePath, 3600);

    if (signedError) {
      console.log('   ❌ Failed to create signed URL:', signedError.message);
    } else {
      console.log('   ✅ Signed URL created');
      console.log(`   URL: ${signedData.signedUrl.substring(0, 80)}...`);

      // Test the signed URL
      try {
        const response = await fetch(signedData.signedUrl, { method: 'HEAD' });
        console.log(`   Signed URL Status: ${response.status} ${response.statusText}`);
      } catch (error) {
        console.log('   ❌ Failed to fetch signed URL');
      }
    }
  }

  // Check bucket configuration
  console.log('\n4️⃣ Checking Bucket Configuration...');
  const { data: bucket, error: bucketError } = await supabase.storage.getBucket('document-pages');

  if (bucketError) {
    console.log('   ❌ Failed to get bucket:', bucketError.message);
  } else {
    console.log('   ✅ Bucket configuration:');
    console.log(`      Public: ${bucket.public}`);
    console.log(`      File size limit: ${bucket.file_size_limit || 'unlimited'}`);
    console.log(`      Allowed MIME types: ${bucket.allowed_mime_types?.join(', ') || 'all'}`);
  }

  console.log('\n' + '='.repeat(60));
  console.log('📋 RECOMMENDATIONS');
  console.log('='.repeat(60));
  console.log('\nIf URLs return 401/403:');
  console.log('  1. Make bucket public in Supabase Dashboard');
  console.log('  2. Or use signed URLs in the API');
  console.log('\nIf URLs return 404:');
  console.log('  3. Re-run document conversion');
  console.log('  4. Check if files exist in storage bucket');
  console.log('\n✅ Test complete!\n');
}

testPageUrls().catch(console.error);
