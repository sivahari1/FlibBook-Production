async function testImageAccess() {
  const testUrl = 'https://zuhrivibcgudgsejsljo.supabase.co/storage/v1/object/public/document-pages/cmi2xriym00009u9gegjddd8j/915f8e20-4826-4cb7-9744-611cc7316c6e/page-1.jpg';

  console.log('🔍 Testing Image URL Access\n');
  console.log(`Testing URL: ${testUrl}\n`);

  try {
    const response = await fetch(testUrl);
    console.log(`Status: ${response.status} ${response.statusText}`);
    console.log(`Content-Type: ${response.headers.get('content-type')}`);
    console.log(`Content-Length: ${response.headers.get('content-length')}`);
    
    if (response.ok) {
      console.log('\n✅ Image is accessible!');
    } else {
      console.log('\n❌ Image is NOT accessible');
      const text = await response.text();
      console.log('Response body:', text.substring(0, 500));
    }
  } catch (error) {
    console.error('❌ Error fetching image:', error);
  }
}

testImageAccess();
