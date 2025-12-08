/**
 * Simple script to trigger PDF conversion for documents
 * 
 * This script helps convert documents that were uploaded but never converted
 * Run this AFTER starting your development server with: npm run dev
 */

const DOCUMENTS_TO_CONVERT = [
  {
    id: '164fbf91-9471-4d88-96a0-2dfc6611a282',
    name: 'ma10-rn01'
  },
  {
    id: '915f8e20-4826-4cb7-9744-611cc7316c6e',
    name: 'CVIP-schema'
  },
  {
    id: 'test-pbt-doc-free-1764665675746-3-i1u3q',
    name: 'Test Document 3'
  },
  {
    id: 'test-pbt-doc-free-1764665675746-2-i1u3q',
    name: 'Test Document 2'
  },
  {
    id: 'test-pbt-doc-free-1764665675746-1-i1u3q',
    name: 'Test Document 1'
  }
];

async function convertDocument(documentId: string, documentName: string) {
  console.log(`\n📝 Converting: ${documentName}`);
  console.log(`   Document ID: ${documentId}`);

  try {
    const response = await fetch('http://localhost:3000/api/documents/convert', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ documentId })
    });

    if (response.ok) {
      const result = await response.json();
      console.log(`   ✅ Success!`);
      console.log(`   📊 Pages: ${result.pageCount || 'Unknown'}`);
      console.log(`   ⏱️  Time: ${result.processingTime || 0}ms`);
      console.log(`   💾 Cached: ${result.cached ? 'Yes' : 'No'}`);
      return { success: true, result };
    } else {
      const errorText = await response.text();
      console.log(`   ❌ Failed: ${response.status} ${response.statusText}`);
      console.log(`   Error: ${errorText}`);
      return { success: false, error: errorText };
    }
  } catch (error: any) {
    console.log(`   ❌ Network error: ${error.message}`);
    return { success: false, error: error.message };
  }
}

async function main() {
  console.log('🔄 PDF Conversion Tool\n');
  console.log('⚠️  IMPORTANT: Make sure your development server is running!');
  console.log('   Run: npm run dev');
  console.log('   Then run this script in a separate terminal.\n');
  console.log('=' .repeat(60));

  // Wait a moment for user to read
  await new Promise(resolve => setTimeout(resolve, 2000));

  let successCount = 0;
  let failureCount = 0;

  for (let i = 0; i < DOCUMENTS_TO_CONVERT.length; i++) {
    const doc = DOCUMENTS_TO_CONVERT[i];
    console.log(`\n[${i + 1}/${DOCUMENTS_TO_CONVERT.length}]`);
    
    const result = await convertDocument(doc.id, doc.name);
    
    if (result.success) {
      successCount++;
    } else {
      failureCount++;
    }

    // Add delay between conversions
    if (i < DOCUMENTS_TO_CONVERT.length - 1) {
      console.log('   ⏳ Waiting 2 seconds...');
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('✅ Conversion Complete!\n');
  console.log('📊 Results:');
  console.log(`   - Successful: ${successCount}`);
  console.log(`   - Failed: ${failureCount}`);
  console.log(`   - Total: ${DOCUMENTS_TO_CONVERT.length}`);

  if (successCount > 0) {
    console.log('\n💡 Next Steps:');
    console.log('   1. Open your browser');
    console.log('   2. Go to: http://localhost:3000/dashboard');
    console.log('   3. Click on a document to preview');
    console.log('   4. The preview should now work!\n');
    
    console.log('🔗 Direct Preview URLs:');
    DOCUMENTS_TO_CONVERT.forEach((doc, index) => {
      console.log(`   ${index + 1}. http://localhost:3000/dashboard/documents/${doc.id}/preview`);
    });
    console.log('');
  }

  if (failureCount > 0) {
    console.log('\n⚠️  Some conversions failed. Common issues:');
    console.log('   - Development server not running (run: npm run dev)');
    console.log('   - PDF files missing from Supabase storage');
    console.log('   - Database connection issues');
    console.log('   - Supabase credentials incorrect\n');
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('\n❌ Fatal error:', error);
    process.exit(1);
  });
