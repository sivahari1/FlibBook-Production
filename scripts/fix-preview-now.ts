import { createClient } from '@supabase/supabase-js';

async function fixPreviewNow() {
  console.log('🔧 QUICK PREVIEW FIX\n');
  
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!supabaseUrl || !supabaseKey) {
    console.log('❌ Missing Supabase credentials');
    return;
  }
  
  const supabase = createClient(supabaseUrl, supabaseKey);
  
  // 1. Check if we can connect to Supabase storage
  console.log('1️⃣ Testing Supabase Storage Connection...');
  try {
    const { data: buckets, error } = await supabase.storage.listBuckets();
    
    if (error) {
      console.log(`❌ Storage error: ${error.message}\n`);
      console.log('SOLUTION: Check your Supabase project status at https://supabase.com/dashboard');
      return;
    }
    
    console.log(`✅ Connected! Found ${buckets?.length || 0} buckets\n`);
    
    // 2. Check document-pages bucket
    console.log('2️⃣ Checking document-pages bucket...');
    const hasDocPages = buckets?.some(b => b.name === 'document-pages');
    
    if (!hasDocPages) {
      console.log('❌ document-pages bucket missing');
      console.log('\nSOLUTION: Create the bucket:');
      console.log('1. Go to https://supabase.com/dashboard/project/zuhrivibcgudgsejsljo/storage/buckets');
      console.log('2. Click "New bucket"');
      console.log('3. Name: document-pages');
      console.log('4. Make it PUBLIC');
      console.log('5. Click "Create bucket"\n');
      return;
    }
    
    console.log('✅ document-pages bucket exists\n');
    
    // 3. Check if bucket is public
    const bucket = buckets?.find(b => b.name === 'document-pages');
    if (!bucket?.public) {
      console.log('⚠️  document-pages bucket is PRIVATE');
      console.log('\nSOLUTION: Make it public:');
      console.log('1. Go to https://supabase.com/dashboard/project/zuhrivibcgudgsejsljo/storage/buckets');
      console.log('2. Click on document-pages');
      console.log('3. Click "Edit bucket"');
      console.log('4. Check "Public bucket"');
      console.log('5. Click "Save"\n');
    } else {
      console.log('✅ Bucket is public\n');
    }
    
    // 4. Check for files
    console.log('3️⃣ Checking for converted pages...');
    const { data: files, error: listError } = await supabase.storage
      .from('document-pages')
      .list('', { limit: 10 });
    
    if (listError) {
      console.log(`❌ Error listing files: ${listError.message}\n`);
      return;
    }
    
    if (!files || files.length === 0) {
      console.log('❌ No page images found');
      console.log('\nSOLUTION: Convert your PDFs:');
      console.log('Run: npx tsx scripts/convert-documents-simple.ts\n');
      return;
    }
    
    console.log(`✅ Found ${files.length} page images\n`);
    
    // 5. Test accessing a file
    console.log('4️⃣ Testing file access...');
    const testFile = files[0];
    const { data: urlData } = supabase.storage
      .from('document-pages')
      .getPublicUrl(testFile.name);
    
    console.log(`Test URL: ${urlData.publicUrl}`);
    
    try {
      const response = await fetch(urlData.publicUrl, { method: 'HEAD' });
      console.log(`✅ File accessible (HTTP ${response.status})\n`);
    } catch (error: any) {
      console.log(`❌ Cannot access file: ${error.message}\n`);
      console.log('SOLUTION: Check CORS settings in Supabase Storage');
    }
    
    // 6. Final recommendations
    console.log('═══════════════════════════════════════');
    console.log('📋 NEXT STEPS:');
    console.log('═══════════════════════════════════════\n');
    
    console.log('If preview still not working:');
    console.log('');
    console.log('1. HARD REFRESH your browser:');
    console.log('   - Windows/Linux: Ctrl + Shift + R');
    console.log('   - Mac: Cmd + Shift + R');
    console.log('');
    console.log('2. Clear browser cache:');
    console.log('   - Open DevTools (F12)');
    console.log('   - Right-click refresh button');
    console.log('   - Select "Empty Cache and Hard Reload"');
    console.log('');
    console.log('3. Check browser console for errors:');
    console.log('   - Press F12');
    console.log('   - Go to Console tab');
    console.log('   - Look for red errors');
    console.log('');
    console.log('4. Restart your dev server:');
    console.log('   - Stop: Ctrl + C');
    console.log('   - Start: npm run dev');
    console.log('');
    
  } catch (error: any) {
    console.log(`❌ Unexpected error: ${error.message}\n`);
    console.log('SOLUTION: Check your internet connection and Supabase project status');
  }
}

fixPreviewNow().catch(console.error);
