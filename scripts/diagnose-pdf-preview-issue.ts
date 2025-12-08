import { prisma } from '@/lib/db';
import { getSignedUrl } from '@/lib/storage';

/**
 * Diagnostic script to check PDF preview issue
 * 
 * This script will:
 * 1. Check if documents exist in the database
 * 2. Verify storage paths
 * 3. Test signed URL generation
 * 4. Check PDF.js configuration
 */

async function diagnosePDFPreviewIssue() {
  console.log('=== PDF Preview Diagnostic ===\n');

  try {
    // 1. Check for PDF documents
    console.log('1. Checking for PDF documents in database...');
    const pdfDocuments = await prisma.document.findMany({
      where: {
        mimeType: 'application/pdf',
      },
      select: {
        id: true,
        title: true,
        filename: true,
        storagePath: true,
        contentType: true,
        userId: true,
        createdAt: true,
      },
      take: 5,
      orderBy: {
        createdAt: 'desc',
      },
    });

    if (pdfDocuments.length === 0) {
      console.log('❌ No PDF documents found in database');
      return;
    }

    console.log(`✅ Found ${pdfDocuments.length} PDF documents\n`);

    // 2. Check each document
    for (const doc of pdfDocuments) {
      console.log(`\n--- Document: ${doc.title} ---`);
      console.log(`ID: ${doc.id}`);
      console.log(`Filename: ${doc.filename}`);
      console.log(`Storage Path: ${doc.storagePath}`);
      console.log(`Content Type: ${doc.contentType}`);
      console.log(`User ID: ${doc.userId}`);

      // 3. Test signed URL generation
      if (doc.storagePath) {
        console.log('\nTesting signed URL generation...');
        const { url, error } = await getSignedUrl(doc.storagePath, 3600, 'documents');
        
        if (error) {
          console.log(`❌ Failed to generate signed URL: ${error}`);
        } else if (url) {
          console.log(`✅ Signed URL generated successfully`);
          console.log(`URL length: ${url.length} characters`);
          console.log(`URL starts with: ${url.substring(0, 50)}...`);
          
          // Test if URL is accessible
          try {
            const response = await fetch(url, { method: 'HEAD' });
            console.log(`URL accessibility: ${response.ok ? '✅ Accessible' : '❌ Not accessible'}`);
            console.log(`Status: ${response.status} ${response.statusText}`);
            console.log(`Content-Type: ${response.headers.get('content-type')}`);
            console.log(`Content-Length: ${response.headers.get('content-length')}`);
          } catch (fetchError) {
            console.log(`❌ Failed to fetch URL: ${fetchError instanceof Error ? fetchError.message : String(fetchError)}`);
          }
        } else {
          console.log('❌ No URL or error returned');
        }
      } else {
        console.log('❌ No storage path found for document');
      }
    }

    // 4. Check environment variables
    console.log('\n\n=== Environment Configuration ===');
    console.log(`NEXT_PUBLIC_SUPABASE_URL: ${process.env.NEXT_PUBLIC_SUPABASE_URL ? '✅ Set' : '❌ Not set'}`);
    console.log(`NEXT_PUBLIC_SUPABASE_ANON_KEY: ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? '✅ Set' : '❌ Not set'}`);
    console.log(`SUPABASE_SERVICE_ROLE_KEY: ${process.env.SUPABASE_SERVICE_ROLE_KEY ? '✅ Set' : '❌ Not set'}`);

    // 5. Check PDF.js worker
    console.log('\n\n=== PDF.js Configuration ===');
    const workerPath = 'public/pdf.worker.min.js';
    const fs = require('fs');
    const path = require('path');
    const workerExists = fs.existsSync(path.join(process.cwd(), workerPath));
    console.log(`PDF.js worker file: ${workerExists ? '✅ Exists' : '❌ Missing'}`);

    console.log('\n\n=== Diagnostic Complete ===');
    console.log('\nNext steps:');
    console.log('1. If signed URLs are not generating, check Supabase configuration');
    console.log('2. If URLs are not accessible, check storage bucket permissions');
    console.log('3. If PDF.js worker is missing, run: npm run build');
    console.log('4. Check browser console for PDF.js errors');
    console.log('5. Verify the document ID in the URL matches a document in the database');

  } catch (error) {
    console.error('❌ Diagnostic failed:', error);
    if (error instanceof Error) {
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
    }
  } finally {
    await prisma.$disconnect();
  }
}

// Run diagnostic
diagnosePDFPreviewIssue()
  .then(() => {
    console.log('\nDiagnostic completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\nDiagnostic failed with error:', error);
    process.exit(1);
  });
