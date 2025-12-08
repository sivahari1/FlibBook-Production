/**
 * Diagnostic script to check document conversion state
 * 
 * This script checks:
 * 1. Which documents exist in the database
 * 2. Which documents have cached pages
 * 3. Which documents have page images in Supabase storage
 */

import { prisma } from '../lib/db';
import { hasCachedPages, getCachedPageUrls } from '../lib/services/page-cache';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function diagnoseDocuments() {
  console.log('🔍 Diagnosing document conversion state...\n');

  try {
    // Get all PDF documents
    const documents = await prisma.document.findMany({
      where: {
        mimeType: 'application/pdf',
      },
      select: {
        id: true,
        filename: true,
        userId: true,
        storagePath: true,
        createdAt: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    console.log(`Found ${documents.length} PDF documents\n`);

    for (const doc of documents) {
      console.log(`📄 Document: ${doc.filename}`);
      console.log(`   ID: ${doc.id}`);
      console.log(`   Created: ${doc.createdAt.toISOString()}`);
      console.log(`   Storage Path: ${doc.storagePath}`);

      // Check if document file exists in storage
      const { data: fileData, error: fileError } = await supabase.storage
        .from('documents')
        .list(doc.storagePath.split('/').slice(0, -1).join('/'), {
          search: doc.storagePath.split('/').pop(),
        });

      if (fileError || !fileData || fileData.length === 0) {
        console.log(`   ❌ PDF file NOT found in storage`);
      } else {
        console.log(`   ✅ PDF file exists in storage`);
      }

      // Check if pages are cached
      const hasCached = await hasCachedPages(doc.id);
      console.log(`   Cache: ${hasCached ? '✅ Has cached pages' : '❌ No cached pages'}`);

      if (hasCached) {
        const pageUrls = await getCachedPageUrls(doc.id);
        console.log(`   Pages: ${pageUrls.length} pages cached`);

        // Check if first page image exists
        if (pageUrls.length > 0) {
          const firstPageUrl = pageUrls[0];
          // Extract storage path from URL
          const urlParts = firstPageUrl.split('/document-pages/');
          if (urlParts.length > 1) {
            const storagePath = urlParts[1].split('?')[0];
            const { data: pageData, error: pageError } = await supabase.storage
              .from('document-pages')
              .list(storagePath.split('/').slice(0, -1).join('/'), {
                search: storagePath.split('/').pop(),
              });

            if (pageError || !pageData || pageData.length === 0) {
              console.log(`   ❌ Page images NOT found in storage (need reconversion)`);
            } else {
              console.log(`   ✅ Page images exist in storage`);
            }
          }
        }
      } else {
        console.log(`   ⚠️  Document needs conversion`);
      }

      console.log('');
    }

    console.log('\n📊 Summary:');
    const needsConversion = [];
    const hasPages = [];

    for (const doc of documents) {
      const hasCached = await hasCachedPages(doc.id);
      if (hasCached) {
        hasPages.push(doc);
      } else {
        needsConversion.push(doc);
      }
    }

    console.log(`   ✅ ${hasPages.length} documents have pages`);
    console.log(`   ⚠️  ${needsConversion.length} documents need conversion`);

    if (needsConversion.length > 0) {
      console.log('\n💡 To convert documents, you can:');
      console.log('   1. View each document in the browser (triggers automatic conversion)');
      console.log('   2. Run: npm run tsx scripts/reconvert-blank-page-documents.ts');
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

diagnoseDocuments();
