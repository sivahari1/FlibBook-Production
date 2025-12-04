#!/usr/bin/env tsx

/**
 * Diagnostic script to test preview rendering issues
 * Tests the complete flow from document to preview
 */

import { prisma } from '../lib/db';
import { getCachedPageUrls, hasCachedPages } from '../lib/services/page-cache';

async function diagnosePreviewRendering() {
  console.log('🔍 Diagnosing Preview Rendering Issues\n');
  console.log('=' .repeat(60));

  try {
    // 1. Check if documents exist
    console.log('\n📄 Checking documents...');
    const documents = await prisma.document.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        title: true,
        contentType: true,
        storagePath: true,
        createdAt: true,
      },
    });

    if (documents.length === 0) {
      console.log('❌ No documents found in database');
      return;
    }

    console.log(`✅ Found ${documents.length} documents`);
    documents.forEach((doc, i) => {
      console.log(`  ${i + 1}. ${doc.title} (${doc.contentType}) - ${doc.id}`);
    });

    // 2. Check for PDF documents
    const pdfDocs = documents.filter(d => d.contentType === 'PDF');
    if (pdfDocs.length === 0) {
      console.log('\n⚠️  No PDF documents found');
      return;
    }

    console.log(`\n📑 Found ${pdfDocs.length} PDF documents`);

    // 3. Check for converted pages
    console.log('\n🔄 Checking for converted pages...');
    for (const doc of pdfDocs) {
      const hasPages = await hasCachedPages(doc.id);
      console.log(`  ${doc.title}:`);
      console.log(`    Has cached pages: ${hasPages ? '✅ YES' : '❌ NO'}`);

      if (hasPages) {
        try {
          const pageUrls = await getCachedPageUrls(doc.id);
          console.log(`    Page count: ${pageUrls.length}`);
          console.log(`    First page URL: ${pageUrls[0]?.substring(0, 80)}...`);
        } catch (error) {
          console.log(`    ❌ Error getting page URLs: ${error}`);
        }
      }
    }

    // 4. Check DocumentPage table exists
    console.log('\n🗄️  Checking DocumentPage table...');
    try {
      const pageCount = await prisma.documentPage.count();
      console.log(`  ✅ DocumentPage table exists with ${pageCount} records`);

      if (pageCount > 0) {
        const samplePages = await prisma.documentPage.findMany({
          take: 3,
          select: {
            documentId: true,
            pageNumber: true,
            storagePath: true,
          },
        });
        console.log('  Sample pages:');
        samplePages.forEach(page => {
          console.log(`    Doc: ${page.documentId}, Page: ${page.pageNumber}, Path: ${page.storagePath}`);
        });
      }
    } catch (error: any) {
      if (error.code === 'P2021') {
        console.log('  ❌ DocumentPage table does NOT exist');
        console.log('  💡 Need to run: npx prisma migrate dev');
      } else {
        console.log(`  ❌ Error checking DocumentPage table: ${error.message}`);
      }
    }

    // 5. Check Supabase Storage bucket
    console.log('\n🪣 Checking Supabase Storage...');
    console.log('  Note: Cannot check storage from this script');
    console.log('  Please verify "document-pages" bucket exists in Supabase dashboard');

    // 6. Summary and recommendations
    console.log('\n' + '='.repeat(60));
    console.log('📋 SUMMARY & RECOMMENDATIONS\n');

    const hasDocumentPageTable = await prisma.documentPage.count().then(() => true).catch(() => false);
    const hasPagesInDb = hasDocumentPageTable && await prisma.documentPage.count() > 0;

    if (!hasDocumentPageTable) {
      console.log('❌ CRITICAL: DocumentPage table missing');
      console.log('   Action: Run `npx prisma migrate dev` to create the table\n');
    }

    if (!hasPagesInDb) {
      console.log('⚠️  WARNING: No pages in database');
      console.log('   Action: PDFs need to be converted to pages');
      console.log('   This should happen automatically when preview is opened\n');
    }

    const pdfWithoutPages = pdfDocs.filter(async doc => !(await hasCachedPages(doc.id)));
    if (pdfWithoutPages.length > 0) {
      console.log(`⚠️  ${pdfWithoutPages.length} PDF(s) without converted pages`);
      console.log('   These will be converted automatically on first preview\n');
    }

    console.log('✅ Next steps:');
    console.log('   1. Ensure DocumentPage table exists (run migration if needed)');
    console.log('   2. Ensure "document-pages" bucket exists in Supabase');
    console.log('   3. Open a PDF preview - conversion should trigger automatically');
    console.log('   4. Check browser console for any errors');

  } catch (error) {
    console.error('\n❌ Error during diagnosis:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the diagnostic
diagnosePreviewRendering().catch(console.error);
