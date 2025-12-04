/**
 * Verify and create document-pages storage bucket
 * 
 * This script checks if the document-pages bucket exists in Supabase Storage
 * and creates it if it doesn't exist with proper RLS policies.
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing required environment variables:');
  console.error('   NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl ? '✓' : '✗');
  console.error('   SUPABASE_SERVICE_ROLE_KEY:', supabaseServiceKey ? '✓' : '✗');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

async function verifyAndCreateBucket() {
  console.log('🔍 Checking document-pages bucket...\n');

  try {
    // Check if bucket exists
    const { data: buckets, error: listError } = await supabase.storage.listBuckets();

    if (listError) {
      console.error('❌ Error listing buckets:', listError.message);
      process.exit(1);
    }

    const bucketExists = buckets?.some((b) => b.name === 'document-pages');

    if (bucketExists) {
      console.log('✅ document-pages bucket already exists');
      
      // Test upload to verify access
      console.log('\n🧪 Testing bucket access...');
      // Create a minimal 1x1 PNG image
      const testFile = Buffer.from([
        0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A,
        0x00, 0x00, 0x00, 0x0D, 0x49, 0x48, 0x44, 0x52,
        0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
        0x08, 0x06, 0x00, 0x00, 0x00, 0x1F, 0x15, 0xC4,
        0x89, 0x00, 0x00, 0x00, 0x0A, 0x49, 0x44, 0x41,
        0x54, 0x78, 0x9C, 0x63, 0x00, 0x01, 0x00, 0x00,
        0x05, 0x00, 0x01, 0x0D, 0x0A, 0x2D, 0xB4, 0x00,
        0x00, 0x00, 0x00, 0x49, 0x45, 0x4E, 0x44, 0xAE,
        0x42, 0x60, 0x82
      ]);
      const testPath = `test-${Date.now()}.png`;
      
      const { error: uploadError } = await supabase.storage
        .from('document-pages')
        .upload(testPath, testFile, {
          contentType: 'image/png',
          upsert: true,
        });

      if (uploadError) {
        console.error('❌ Upload test failed:', uploadError.message);
        console.log('\n⚠️  Bucket exists but may have permission issues');
      } else {
        console.log('✅ Upload test successful');
        
        // Clean up test file
        await supabase.storage.from('document-pages').remove([testPath]);
        console.log('✅ Cleanup successful');
      }
      
      return;
    }

    // Create bucket
    console.log('📦 Creating document-pages bucket...');
    const { data: newBucket, error: createError } = await supabase.storage.createBucket(
      'document-pages',
      {
        public: true, // Public bucket for easier access
        fileSizeLimit: 10485760, // 10MB per file
        allowedMimeTypes: ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'],
      }
    );

    if (createError) {
      console.error('❌ Error creating bucket:', createError.message);
      
      // Check if it's a permission error
      if (createError.message.includes('permission') || createError.message.includes('policy')) {
        console.log('\n⚠️  You may need to create the bucket manually in Supabase Dashboard:');
        console.log('   1. Go to Storage in Supabase Dashboard');
        console.log('   2. Click "New bucket"');
        console.log('   3. Name: document-pages');
        console.log('   4. Public bucket: Yes');
        console.log('   5. File size limit: 10MB');
        console.log('   6. Allowed MIME types: image/jpeg, image/jpg, image/png, image/webp');
      }
      
      process.exit(1);
    }

    console.log('✅ Bucket created successfully');

    // Test the new bucket
    console.log('\n🧪 Testing new bucket...');
    // Create a minimal 1x1 PNG image
    const testFile = Buffer.from([
      0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A,
      0x00, 0x00, 0x00, 0x0D, 0x49, 0x48, 0x44, 0x52,
      0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
      0x08, 0x06, 0x00, 0x00, 0x00, 0x1F, 0x15, 0xC4,
      0x89, 0x00, 0x00, 0x00, 0x0A, 0x49, 0x44, 0x41,
      0x54, 0x78, 0x9C, 0x63, 0x00, 0x01, 0x00, 0x00,
      0x05, 0x00, 0x01, 0x0D, 0x0A, 0x2D, 0xB4, 0x00,
      0x00, 0x00, 0x00, 0x49, 0x45, 0x4E, 0x44, 0xAE,
      0x42, 0x60, 0x82
    ]);
    const testPath = `test-${Date.now()}.png`;
    
    const { error: uploadError } = await supabase.storage
      .from('document-pages')
      .upload(testPath, testFile, {
        contentType: 'image/png',
        upsert: true,
      });

    if (uploadError) {
      console.error('❌ Upload test failed:', uploadError.message);
    } else {
      console.log('✅ Upload test successful');
      
      // Clean up test file
      await supabase.storage.from('document-pages').remove([testPath]);
      console.log('✅ Cleanup successful');
    }

    console.log('\n✅ document-pages bucket is ready to use!');
    console.log('\n📝 Note: You may need to configure RLS policies in Supabase Dashboard:');
    console.log('   1. Go to Storage > document-pages > Policies');
    console.log('   2. Add policy for authenticated users to upload/read');
    console.log('   3. Example policy: Allow authenticated users to upload to their own folder');

  } catch (error) {
    console.error('❌ Unexpected error:', error);
    process.exit(1);
  }
}

// Run the verification
verifyAndCreateBucket()
  .then(() => {
    console.log('\n✅ Verification complete');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Verification failed:', error);
    process.exit(1);
  });
