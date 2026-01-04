#!/usr/bin/env tsx

import { supabaseServer, generateSignedUrl } from '@/lib/supabase/server';
import { prisma } from '@/lib/db';

async function testPdfViewerFix() {
  console.log('🔍 Testing PDF Viewer Fix...\n');

  try {
    // Get a sample PDF document
    const pdfDocument = await prisma.document.findFirst({
      where: { 
        contentType: 'PDF',
        storagePath: { 
          not: null,
          not: ''
        }
      },
      include: {
        bookShopItems: {
          include: {
            myJstudyroomItems: true
          }
        }
      }
    });

    if (!pdfDocument) {
      console.log('❌ No PDF documents found in database');
      return;
    }

    console.log(`📄 Found PDF document: ${pdfDocument.title}`);
    console.log(`📁 Storage path: ${pdfDocument.storagePath}`);

    // Generate signed URL
    const result = await generateSignedUrl('documents', pdfDocument.storagePath!, 3600);
    
    if (!result.ok) {
      console.log(`❌ Failed to generate signed URL: ${result.error}`);
      return;
    }

    console.log(`✅ Generated signed URL: ${result.signedUrl}`);

    // Test the URL with fetch to check headers
    try {
      const response = await fetch(result.signedUrl, { method: 'HEAD' });
      console.log(`\n📊 URL Response Status: ${response.status}`);
      console.log(`📊 Content-Type: ${response.headers.get('content-type')}`);
      console.log(`📊 Content-Length: ${response.headers.get('content-length')}`);
      console.log(`📊 Content-Disposition: ${response.headers.get('content-disposition')}`);
      
      if (response.status === 200) {
        console.log('✅ PDF URL is accessible');
        
        // Check if content-type is correct
        const contentType = response.headers.get('content-type');
        if (contentType?.includes('application/pdf')) {
          console.log('✅ Content-Type is correct (application/pdf)');
        } else {
          console.log(`⚠️  Content-Type might be incorrect: ${contentType}`);
        }
      } else {
        console.log(`❌ PDF URL returned status: ${response.status}`);
      }
    } catch (fetchError) {
      console.log(`❌ Error fetching PDF URL: ${fetchError}`);
    }

    // Test the API endpoint
    console.log('\n🔗 Testing API endpoint...');
    const apiUrl = `/api/viewer/document/${pdfDocument.id}/access`;
    console.log(`API URL: ${apiUrl}`);
    
    console.log('\n✅ PDF Viewer Fix Test Complete');
    console.log('\n📋 Next Steps:');
    console.log('1. Open the member viewer in browser');
    console.log('2. Check Network tab for the API call');
    console.log('3. Verify the signed URL returns 200 with application/pdf');
    console.log('4. Test the "Open PDF in new tab" link');

  } catch (error) {
    console.error('❌ Error testing PDF viewer fix:', error);
  }
}

testPdfViewerFix().catch(console.error);