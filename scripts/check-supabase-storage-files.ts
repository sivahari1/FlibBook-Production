import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkStorageFiles() {
  try {
    console.log('🔍 Checking Supabase storage buckets...');
    
    // List all buckets
    const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets();
    
    if (bucketsError) {
      console.error('Error listing buckets:', bucketsError);
      return;
    }
    
    console.log('📦 Available buckets:', buckets.map(b => b.name));
    
    // Check document-pages bucket specifically
    const { data: files, error: filesError } = await supabase.storage
      .from('document-pages')
      .list('', { limit: 10 });
    
    if (filesError) {
      console.error('Error listing files in document-pages bucket:', filesError);
      return;
    }
    
    console.log(`📄 Files in document-pages bucket: ${files.length}`);
    
    if (files.length > 0) {
      console.log('Sample files:');
      files.slice(0, 5).forEach(file => {
        console.log(`  - ${file.name} (${file.metadata?.size || 'unknown size'})`);
      });
    } else {
      console.log('❌ No files found in document-pages bucket');
    }
    
    // Check if we can list files in user folders
    console.log('\n🔍 Checking user folders...');
    const userId = 'cmi2xriym00009u9gegjddd8j'; // From the URLs we saw earlier
    
    const { data: userFiles, error: userFilesError } = await supabase.storage
      .from('document-pages')
      .list(userId, { limit: 10 });
    
    if (userFilesError) {
      console.error('Error listing user files:', userFilesError);
    } else {
      console.log(`📁 Files in user folder ${userId}: ${userFiles.length}`);
      if (userFiles.length > 0) {
        userFiles.slice(0, 5).forEach(file => {
          console.log(`  - ${file.name}`);
        });
      }
    }
    
  } catch (error) {
    console.error('❌ Error checking storage:', error);
  }
}

checkStorageFiles();