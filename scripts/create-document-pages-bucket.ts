/**
 * Create document-pages bucket for PDF page storage
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables from .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase environment variables');
  console.error('NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl ? '✓' : '✗');
  console.error('SUPABASE_SERVICE_ROLE_KEY:', supabaseServiceKey ? '✓' : '✗');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function createDocumentPagesBucket() {
  console.log('🚀 Creating document-pages bucket...\n');

  // Check if bucket exists
  const { data: buckets, error: listError } = await supabase.storage.listBuckets();
  
  if (listError) {
    console.error('❌ Error listing buckets:', listError);
    return;
  }

  console.log('📦 Existing buckets:', buckets?.map(b => b.name).join(', '));

  const bucketExists = buckets?.some(b => b.name === 'document-pages');
  
  if (bucketExists) {
    console.log('\n✅ Bucket "document-pages" already exists!');
    return;
  }

  // Create bucket
  console.log('\n📦 Creating "document-pages" bucket...');
  const { data, error } = await supabase.storage.createBucket('document-pages', {
    public: true, // Make it public so we can access the images
    fileSizeLimit: 10 * 1024 * 1024, // 10MB per page
    allowedMimeTypes: ['image/jpeg', 'image/jpg', 'image/png']
  });

  if (error) {
    console.error('❌ Error creating bucket:', error);
    return;
  }

  console.log('✅ Successfully created "document-pages" bucket!');
  console.log('\n📋 Next: The bucket is now ready for PDF page storage');
}

createDocumentPagesBucket().catch(error => {
  console.error('❌ Failed:', error);
  process.exit(1);
});
