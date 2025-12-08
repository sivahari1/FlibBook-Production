import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

async function testActualAPICall() {
  console.log('🧪 Testing Actual API Call (as browser would)...\n');

  // Get a document ID from the database first
  const { createClient } = await import('@supabase/supabase-js');
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data: docs } = await supabase
    .from('documents')
    .select('id, title, userId')
    .limit(1);

  if (!docs || docs.length === 0) {
    console.log('❌ No documents found');
    return;
  }

  const testDoc = docs[0];
  console.log(`Testing with document: ${testDoc.title}`);
  console.log(`Document ID: ${testDoc.id}`);
  console.log(`User ID: ${testDoc.userId}\n`);

  // Now test the API endpoint
  const apiUrl = `http://localhost:3000/api/documents/${testDoc.id}/pages`;
  console.log(`Calling API: ${apiUrl}\n`);

  try {
    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    console.log(`Status: ${response.status} ${response.statusText}`);
    
    const data = await response.json();
    console.log('\nResponse:');
    console.log(JSON.stringify(data, null, 2));

    if (data.success && data.pages) {
      console.log(`\n✅ API returned ${data.pages.length} pages`);
      if (data.pages.length > 0) {
        console.log('\nFirst page URL:');
        console.log(data.pages[0].pageUrl);
      }
    } else {
      console.log('\n❌ API call failed or returned no pages');
    }

  } catch (error) {
    console.error('❌ API call error:', error);
    console.log('\n⚠️  Is the dev server running? Start it with: npm run dev');
  }
}

testActualAPICall();
