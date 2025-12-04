import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

async function diagnoseCORS() {
  console.log('🔍 Diagnosing CORS and Storage Configuration\n');

  const supabase = createClient(supabaseUrl, supabaseKey);

  // Check bucket configuration
  const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets();

  if (bucketsError) {
    console.error('❌ Error listing buckets:', bucketsError);
    return;
  }

  const documentPagesBucket = buckets?.find(b => b.name === 'document-pages');

  if (!documentPagesBucket) {
    console.error('❌ document-pages bucket not found!');
    return;
  }

  console.log('✅ document-pages bucket found');
  console.log('   Public:', documentPagesBucket.public);
  console.log('   ID:', documentPagesBucket.id);
  console.log('   Created:', documentPagesBucket.created_at);
  console.log();

  // List files in the bucket
  const { data: files, error: filesError } = await supabase.storage
    .from('document-pages')
    .list('', {
      limit: 10,
      offset: 0,
    });

  if (filesError) {
    console.error('❌ Error listing files:', filesError);
    return;
  }

  console.log(`📁 Found ${files?.length || 0} items in bucket\n`);

  // Test accessing a specific file
  const testPath = 'cmi2xriym00009u9gegjddd8j/915f8e20-4826-4cb7-9744-611cc7316c6e/page-1.jpg';
  
  const { data: publicUrl } = supabase.storage
    .from('document-pages')
    .getPublicUrl(testPath);

  console.log('🔗 Testing public URL:');
  console.log('   ', publicUrl.publicUrl);
  console.log();

  // Try to fetch the URL
  try {
    const response = await fetch(publicUrl.publicUrl);
    console.log('📥 Fetch result:');
    console.log('   Status:', response.status, response.statusText);
    console.log('   Content-Type:', response.headers.get('content-type'));
    console.log('   Access-Control-Allow-Origin:', response.headers.get('access-control-allow-origin'));
    console.log('   Content-Length:', response.headers.get('content-length'));
    
    if (response.ok) {
      console.log('\n✅ Image is accessible with proper CORS headers!');
    } else {
      console.log('\n❌ Image returned error status');
    }
  } catch (error) {
    console.error('\n❌ Error fetching image:', error);
  }
}

diagnoseCORS();
