/**
 * Test PDF Conversion with Sample PDF
 * 
 * This script helps test the PDF conversion fixes by:
 * 1. Listing available PDF documents
 * 2. Triggering conversion for a specific document
 * 3. Monitoring the conversion process
 * 4. Verifying the converted images
 * 5. Providing instructions for manual testing
 * 
 * Usage:
 *   npx tsx scripts/test-pdf-conversion-with-sample.ts [documentId]
 */

import { PrismaClient } from '@prisma/client';
import { createClient } from '@supabase/supabase-js';

const prisma = new PrismaClient();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials');
  console.error('Please set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function listPDFDocuments() {
  console.log('\n📄 Listing PDF Documents...\n');
  
  const documents = await prisma.document.findMany({
    where: {
      contentType: 'PDF'
    },
    select: {
      id: true,
      title: true,
      storagePath: true,
      createdAt: true,
      user: {
        select: {
          email: true
        }
      }
    },
    orderBy: {
      createdAt: 'desc'
    },
    take: 10
  });

  if (documents.length === 0) {
    console.log('No PDF documents found in database.');
    console.log('\n💡 To test:');
    console.log('1. Upload a PDF through the application');
    console.log('2. Run this script again with the document ID');
    return null;
  }

  console.log(`Found ${documents.length} PDF document(s):\n`);
  
  documents.forEach((doc, index) => {
    console.log(`${index + 1}. ${doc.title}`);
    console.log(`   ID: ${doc.id}`);
    console.log(`   Owner: ${doc.user.email}`);
    console.log(`   Storage: ${doc.storagePath}`);
    console.log(`   Created: ${doc.createdAt.toISOString()}`);
    console.log('');
  });

  return documents;
}

async function checkDocumentPages(documentId: string) {
  console.log(`\n🔍 Checking existing pages for document ${documentId}...\n`);
  
  const pages = await prisma.documentPage.findMany({
    where: {
      documentId
    },
    orderBy: {
      pageNumber: 'asc'
    }
  });

  if (pages.length === 0) {
    console.log('✅ No existing pages found - ready for fresh conversion');
    return { hasPages: false, pages: [] };
  }

  console.log(`Found ${pages.length} existing page(s):`);
  
  for (const page of pages) {
    // Check file size in storage
    const { data, error } = await supabase.storage
      .from('document-pages')
      .list(documentId, {
        search: `page-${page.pageNumber}.`
      });

    if (data && data.length > 0) {
      const fileSize = data[0].metadata?.size || 0;
      const fileSizeKB = (fileSize / 1024).toFixed(2);
      const status = fileSize < 10240 ? '❌ BLANK' : '✅ OK';
      
      console.log(`   Page ${page.pageNumber}: ${fileSizeKB} KB ${status}`);
    } else {
      console.log(`   Page ${page.pageNumber}: ⚠️  File not found in storage`);
    }
  }

  return { hasPages: true, pages };
}

async function triggerConversion(documentId: string) {
  console.log(`\n🔄 Triggering conversion for document ${documentId}...\n`);
  
  // Get document details
  const document = await prisma.document.findUnique({
    where: { id: documentId },
    include: {
      user: {
        select: {
          email: true
        }
      }
    }
  });

  if (!document) {
    console.error(`❌ Document ${documentId} not found`);
    return false;
  }

  console.log(`Document: ${document.title}`);
  console.log(`Owner: ${document.user.email}`);
  console.log(`Storage Path: ${document.storagePath}`);
  console.log('');

  // Import the conversion service
  try {
    const { convertPdfToPages } = await import('../lib/services/pdf-converter');
    
    console.log('Starting conversion...');
    console.log('Monitor the console for detailed logs:\n');
    console.log('  - Viewport dimensions');
    console.log('  - Render complete messages');
    console.log('  - Buffer sizes (PNG and JPEG)');
    console.log('  - Compression ratios\n');

    const startTime = Date.now();
    
    const result = await convertPdfToPages({
      id: document.id,
      storagePath: document.storagePath,
      title: document.title
    });

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);

    console.log('\n' + '='.repeat(60));
    console.log('CONVERSION RESULT');
    console.log('='.repeat(60));
    console.log(`Success: ${result.success ? '✅ YES' : '❌ NO'}`);
    console.log(`Pages: ${result.pages}`);
    console.log(`Duration: ${duration}s`);
    console.log(`Avg per page: ${(parseFloat(duration) / result.pages).toFixed(2)}s`);
    
    if (result.error) {
      console.log(`Error: ${result.error}`);
    }
    
    console.log('='.repeat(60) + '\n');

    return result.success;
  } catch (error) {
    console.error('❌ Conversion failed:', error);
    return false;
  }
}

async function verifyConvertedImages(documentId: string) {
  console.log(`\n✅ Verifying converted images for document ${documentId}...\n`);
  
  const pages = await prisma.documentPage.findMany({
    where: {
      documentId
    },
    orderBy: {
      pageNumber: 'asc'
    }
  });

  if (pages.length === 0) {
    console.log('❌ No pages found in database');
    return false;
  }

  console.log(`Checking ${pages.length} page(s):\n`);

  let allPagesOk = true;
  let totalSize = 0;
  const pageSizes: number[] = [];

  for (const page of pages) {
    const { data, error } = await supabase.storage
      .from('document-pages')
      .list(documentId, {
        search: `page-${page.pageNumber}.`
      });

    if (error || !data || data.length === 0) {
      console.log(`❌ Page ${page.pageNumber}: File not found in storage`);
      allPagesOk = false;
      continue;
    }

    const fileSize = data[0].metadata?.size || 0;
    const fileSizeKB = (fileSize / 1024).toFixed(2);
    totalSize += fileSize;
    pageSizes.push(fileSize);

    if (fileSize < 10240) {
      console.log(`❌ Page ${page.pageNumber}: ${fileSizeKB} KB - LIKELY BLANK (< 10 KB)`);
      allPagesOk = false;
    } else if (fileSize < 51200) {
      console.log(`⚠️  Page ${page.pageNumber}: ${fileSizeKB} KB - Small but might be OK`);
    } else {
      console.log(`✅ Page ${page.pageNumber}: ${fileSizeKB} KB - Good size`);
    }
  }

  console.log('\n' + '-'.repeat(60));
  console.log(`Total size: ${(totalSize / 1024 / 1024).toFixed(2)} MB`);
  console.log(`Average page size: ${(totalSize / pages.length / 1024).toFixed(2)} KB`);
  console.log(`Min page size: ${(Math.min(...pageSizes) / 1024).toFixed(2)} KB`);
  console.log(`Max page size: ${(Math.max(...pageSizes) / 1024).toFixed(2)} KB`);
  console.log('-'.repeat(60) + '\n');

  return allPagesOk;
}

async function provideTestingInstructions(documentId: string) {
  console.log('\n📋 MANUAL TESTING INSTRUCTIONS\n');
  console.log('='.repeat(60));
  
  console.log('\n1. Visual Inspection:');
  console.log(`   - Open: http://localhost:3000/dashboard/documents/${documentId}/view`);
  console.log('   - Verify pages display actual content (not blank)');
  console.log('   - Check that text and images are visible');
  console.log('   - Test navigation between pages');
  
  console.log('\n2. Check Browser Console:');
  console.log('   - Open browser DevTools (F12)');
  console.log('   - Look for any errors or warnings');
  console.log('   - Verify images load successfully');
  
  console.log('\n3. Download and Inspect:');
  console.log('   - Right-click on a page image');
  console.log('   - Select "Open image in new tab"');
  console.log('   - Verify the image shows actual content');
  
  console.log('\n4. Run Diagnostic Script:');
  console.log(`   npx tsx scripts/verify-pdf-conversion.ts ${documentId}`);
  
  console.log('\n' + '='.repeat(60) + '\n');
}

async function main() {
  const documentId = process.argv[2];

  console.log('='.repeat(60));
  console.log('PDF CONVERSION TEST SCRIPT');
  console.log('='.repeat(60));

  try {
    if (!documentId) {
      // List available documents
      const documents = await listPDFDocuments();
      
      if (documents && documents.length > 0) {
        console.log('\n💡 To test conversion, run:');
        console.log(`   npx tsx scripts/test-pdf-conversion-with-sample.ts <document-id>`);
        console.log('\nExample:');
        console.log(`   npx tsx scripts/test-pdf-conversion-with-sample.ts ${documents[0].id}`);
      }
      
      return;
    }

    // Check existing pages
    const { hasPages } = await checkDocumentPages(documentId);

    if (hasPages) {
      console.log('\n⚠️  Document already has converted pages.');
      console.log('Options:');
      console.log('1. Delete existing pages and reconvert');
      console.log('2. Just verify existing pages');
      console.log('3. Choose a different document\n');
      
      // For now, we'll verify existing pages
      console.log('Verifying existing pages...');
      await verifyConvertedImages(documentId);
    } else {
      // Trigger conversion
      const success = await triggerConversion(documentId);
      
      if (success) {
        // Verify converted images
        await verifyConvertedImages(documentId);
      }
    }

    // Provide testing instructions
    await provideTestingInstructions(documentId);

  } catch (error) {
    console.error('\n❌ Error:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
