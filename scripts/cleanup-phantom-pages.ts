#!/usr/bin/env tsx

/**
 * Cleanup script to remove phantom pages
 * 
 * This script removes document_pages rows that don't have corresponding
 * images in Supabase storage, fixing the phantom pages issue.
 */

import { prisma } from '@/lib/db';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function cleanupPhantomPages() {
  console.log('🧹 Starting Phantom Pages Cleanup\n');

  try {
    // Get all documents with pages
    const documents = await prisma.document.findMany({
      where: {
        pages: {
          some: {}
        }
      },
      include: {
        pages: {
          orderBy: { pageNumber: 'asc' }
        }
      }
    });

    console.log(`📊 Found ${documents.length} documents with pages\n`);

    let totalPagesChecked = 0;
    let totalPhantomPages = 0;
    let documentsFixed = 0;

    for (const document of documents) {
      console.log(`📄 Checking: ${document.title} (${document.pages.length} pages)`);
      
      const phantomPageIds: string[] = [];
      const phantomPageNumbers: number[] = [];

      for (const page of document.pages) {
        totalPagesChecked++;
        
        if (!page.storagePath) {
          console.log(`   ❌ Page ${page.pageNumber}: No storage path`);
          phantomPageIds.push(page.id);
          phantomPageNumbers.push(page.pageNumber);
          continue;
        }

        try {
          // Check if file exists in Supabase storage
          const { data, error } = await supabase.storage
            .from('document-pages')
            .download(page.storagePath);

          if (error || !data) {
            console.log(`   ❌ Page ${page.pageNumber}: Missing in storage`);
            phantomPageIds.push(page.id);
            phantomPageNumbers.push(page.pageNumber);
          } else {
            console.log(`   ✅ Page ${page.pageNumber}: Valid`);
          }
        } catch (error) {
          console.log(`   ❌ Page ${page.pageNumber}: Storage error - ${error}`);
          phantomPageIds.push(page.id);
          phantomPageNumbers.push(page.pageNumber);
        }
      }

      // Remove phantom pages for this document
      if (phantomPageIds.length > 0) {
        console.log(`   🗑️  Removing ${phantomPageIds.length} phantom pages: ${phantomPageNumbers.join(', ')}`);
        
        const deleteResult = await prisma.documentPage.deleteMany({
          where: {
            id: {
              in: phantomPageIds
            }
          }
        });

        console.log(`   ✅ Deleted ${deleteResult.count} phantom pages`);
        totalPhantomPages += deleteResult.count;
        documentsFixed++;
      } else {
        console.log(`   ✅ No phantom pages found`);
      }

      console.log(''); // Empty line for readability
    }

    // Summary
    console.log('📋 CLEANUP SUMMARY:');
    console.log(`   Documents checked: ${documents.length}`);
    console.log(`   Total pages checked: ${totalPagesChecked}`);
    console.log(`   Documents fixed: ${documentsFixed}`);
    console.log(`   Phantom pages removed: ${totalPhantomPages}`);

    if (totalPhantomPages > 0) {
      console.log(`\n✅ Successfully cleaned up ${totalPhantomPages} phantom pages!`);
      console.log(`   The viewer should now work without 404/500 errors.`);
    } else {
      console.log(`\n✅ No phantom pages found - database is clean!`);
    }

  } catch (error) {
    console.error('❌ Cleanup failed:', error);
    process.exit(1);
  }
}

// Run cleanup
cleanupPhantomPages().catch(console.error);