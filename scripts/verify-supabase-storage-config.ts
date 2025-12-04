import { config } from 'dotenv';
import { resolve } from 'path';

// Load environment variables
config({ path: resolve(process.cwd(), '.env.local') });

async function verifyStorageConfig() {
  console.log('🔍 Verifying Supabase Storage Configuration\n');

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Missing Supabase credentials');
    console.error('   NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl ? '✓' : '✗');
    console.error('   SUPABASE_SERVICE_ROLE_KEY:', supabaseKey ? '✓' : '✗');
    return;
  }

  console.log('✅ Supabase credentials found\n');

  // Check bucket configuration
  try {
    const response = await fetch(`${supabaseUrl}/storage/v1/bucket/document-pages`, {
      headers: {
        'Authorization': `Bearer ${supabaseKey}`,
        'apikey': supabaseKey,
      },
    });

    if (response.ok) {
      const bucket = await response.json();
      console.log('📦 Bucket Configuration:');
      console.log('   Name:', bucket.name);
      console.log('   Public:', bucket.public ? '✅ Yes' : '❌ No');
      console.log('   File Size Limit:', bucket.file_size_limit || 'No limit');
      console.log('   Allowed MIME Types:', bucket.allowed_mime_types || 'All types');
      console.log();

      if (!bucket.public) {
        console.log('⚠️  WARNING: Bucket is not public!');
        console.log('   This will cause 400 errors when loading images in the browser.');
        console.log('   Run this SQL to fix:');
        console.log('   UPDATE storage.buckets SET public = true WHERE name = \'document-pages\';');
        console.log();
      }
    } else {
      console.error('❌ Failed to fetch bucket configuration');
      console.error('   Status:', response.status, response.statusText);
      const error = await response.text();
      console.error('   Error:', error);
    }
  } catch (error) {
    console.error('❌ Error checking bucket:', error);
  }

  // Test a sample image URL
  console.log('\n🖼️  Testing Sample Image URL:');
  const testUrl = `${supabaseUrl}/storage/v1/object/public/document-pages/test.jpg`;
  console.log('   URL:', testUrl);
  
  try {
    const response = await fetch(testUrl, {
      method: 'HEAD',
    });
    console.log('   Status:', response.status, response.statusText);
    console.log('   CORS Headers:');
    console.log('     Access-Control-Allow-Origin:', response.headers.get('access-control-allow-origin') || 'Not set');
    console.log('     Access-Control-Allow-Methods:', response.headers.get('access-control-allow-methods') || 'Not set');
  } catch (error) {
    console.error('   Error:', error);
  }

  console.log('\n📋 Recommendations:');
  console.log('1. Ensure bucket is public');
  console.log('2. Verify CORS is configured properly');
  console.log('3. Remove referrerPolicy="no-referrer" from image tags');
  console.log('4. Use crossOrigin="anonymous" for CORS support');
}

verifyStorageConfig();
