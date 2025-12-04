import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { resolve } from 'path';

// Load environment variables
config({ path: resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function fixPreviewRendering() {
  console.log('🔧 Fixing Preview Rendering Issues\n');

  try {
    // 1. Check if document-pages bucket exists
    console.log('1. Checking document-pages bucket...');
    const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets();
    
    if (bucketsError) {
      console.error('❌ Error listing buckets:', bucketsError);
      return;
    }

    const pagesBucket = buckets?.find(b => b.name === 'document-pages');
    
    if (!pagesBucket) {
      console.log('❌ document-pages bucket not found. Creating it...');
      
      const { data: newBucket, error: createError } = await supabase.storage.createBucket('document-pages', {
        public: true,
        fileSizeLimit: 52428800, // 50MB
        allowedMimeTypes: ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'],
      });

      if (createError) {
        console.error('❌ Error creating bucket:', createError);
        return;
      }
      
      console.log('✅ Created document-pages bucket');
    } else {
      console.log('✅ document-pages bucket exists');
    }

    // 2. Update bucket to be public
    console.log('\n2. Ensuring bucket is public...');
    const { data: updateData, error: updateError } = await supabase.storage.updateBucket('document-pages', {
      public: true,
      fileSizeLimit: 52428800,
      allowedMimeTypes: ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'],
    });

    if (updateError) {
      console.error('⚠️  Warning updating bucket:', updateError.message);
    } else {
      console.log('✅ Bucket is public');
    }

    // 3. Test a specific document's pages
    console.log('\n3. Testing document pages...');
    const testDocId = '164fbf91-9471-4d88-96a0-2dfc6611a282';
    
    const { data: files, error: listError } = await supabase.storage
      .from('document-pages')
      .list(`cmi2xriym00009u9gegjddd8j/${testDocId}`);

    if (listError) {
      console.error('❌ Error listing files:', listError);
    } else {
      console.log(`✅ Found ${files?.length || 0} page files`);
      
      if (files && files.length > 0) {
        // Test first page URL
        const firstFile = files[0];
        const { data: urlData } = supabase.storage
          .from('document-pages')
          .getPublicUrl(`cmi2xriym00009u9gegjddd8j/${testDocId}/${firstFile.name}`);

        console.log(`\n📸 Testing first page URL:`);
        console.log(urlData.publicUrl);

        // Test if URL is accessible
        try {
          const response = await fetch(urlData.publicUrl);
          console.log(`   Status: ${response.status} ${response.statusText}`);
          console.log(`   Content-Type: ${response.headers.get('content-type')}`);
          
          if (response.status === 200) {
            console.log('   ✅ Image is accessible');
          } else {
            console.log('   ❌ Image is not accessible');
          }
        } catch (fetchError) {
          console.error('   ❌ Error fetching image:', fetchError);
        }
      }
    }

    // 4. Check CORS settings
    console.log('\n4. CORS Configuration:');
    console.log('   ⚠️  CORS must be configured in Supabase Dashboard');
    console.log('   Go to: Storage > Settings > CORS');
    console.log('   Add allowed origin: http://localhost:3000');
    console.log('   Allowed methods: GET, HEAD');

    console.log('\n✅ Diagnostic complete!');
    console.log('\n📋 Next Steps:');
    console.log('1. Verify CORS settings in Supabase Dashboard');
    console.log('2. Clear browser cache and hard refresh (Ctrl+Shift+R)');
    console.log('3. Check browser console for any remaining errors');

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

fixPreviewRendering();
