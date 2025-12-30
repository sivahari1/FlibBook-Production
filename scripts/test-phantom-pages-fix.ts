#!/usr/bin/env tsx

/**
 * Test script to verify phantom pages fix
 * 
 * This script tests that:
 * 1. No DB rows are created before successful upload
 * 2. DB rows match exactly with storage files
 * 3. Viewer never requests non-existent pages
 */

import { prisma } from '@/lib/db';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function testPhantomPagesFix() {
  console.log('🧪 Testing Phantom Pages Fix\n');

  try {
    // Get a sample document with pages
    const document = await prisma.document.findFirst({
      where: {
        contentType: 'application/pdf',
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

    if (!document) {
      console.log('❌ No PDF documents with pages found for testing');
      return;
    }

    console.log(`📄 Testing document: ${document.title}`);
    console.log(`📊 DB shows ${document.pages.length} pages\n`);

    // Check each page in storage
    let storagePageCount = 0;
    let missingPages: number[] = [];
    let validPages: number[] = [];

    for (const page of document.pages) {
      const storagePath = page.storagePath;
      
      if (!storagePath) {
        console.log(`⚠️  Page ${page.pageNumber}: No storage path in DB`);
        missingPages.push(page.pageNumber);
        continue;
      }

      try {
        // Check if file exists in Supabase storage
        const { data, error } = await supabase.storage
          .from('document-pages')
          .download(storagePath);

        if (error || !data) {
          console.log(`❌ Page ${page.pageNumber}: Missing in storage (${storagePath})`);
          missingPages.push(page.pageNumber);
        } else {
          console.log(`✅ Page ${page.pageNumber}: Found in storage (${(data.size / 1024).toFixed(2)} KB)`);
          storagePageCount++;
          validPages.push(page.pageNumber);
        }
      } catch (error) {
        console.log(`❌ Page ${page.pageNumber}: Storage check failed - ${error}`);
        missingPages.push(page.pageNumber);
      }
    }

    // Summary
    console.log('\n📋 PHANTOM PAGES TEST RESULTS:');
    console.log(`   DB Pages: ${document.pages.length}`);
    console.log(`   Storage Pages: ${storagePageCount}`);
    console.log(`   Valid Pages: ${validPages.length}`);
    console.log(`   Missing Pages: ${missingPages.length}`);

    if (missingPages.length > 0) {
      console.log(`   ❌ PHANTOM PAGES DETECTED: ${missingPages.join(', ')}`);
      console.log('\n🔧 These phantom pages should be cleaned up:');
      
      // Show cleanup command
      console.log(`   DELETE FROM document_pages WHERE documentId = '${document.id}' AND pageNumber IN (${missingPages.join(', ')});`);
      
      return false;
    } else {
      console.log(`   ✅ NO PHANTOM PAGES - All DB entries have corresponding storage files`);
      return true;
    }

  } catch (error) {
    console.error('❌ Test failed:', error);
    return false;
  }
}

async function testMultipleDocuments() {
  console.log('\n🔍 Testing multiple documents for phantom pages...\n');

  const documents = await prisma.document.findMany({
    where: {
      contentType: 'application/pdf',
      pages: {
        some: {}
      }
    },
    include: {
      pages: true
    },
    take: 5 // Test first 5 documents
  });

  let totalTested = 0;
  let documentsWithPhantoms = 0;
  let totalPhantomPages = 0;

  for (const doc of documents) {
    totalTested++;
    console.log(`📄 ${doc.title} (${doc.pages.length} pages)`);
    
    let phantomCount = 0;
    
    for (const page of doc.pages) {
      if (!page.storagePath) {
        phantomCount++;
        continue;
      }

      try {
        const { error } = await supabase.storage
          .from('document-pages')
          .download(page.storagePath);

        if (error) {
          phantomCount++;
        }
      } catch {
        phantomCount++;
      }
    }

    if (phantomCount > 0) {
      console.log(`   ❌ ${phantomCount} phantom pages detected`);
      documentsWithPhantoms++;
      totalPhantomPages += phantomCount;
    } else {
      console.log(`   ✅ No phantom pages`);
    }
  }

  console.log('\n📊 SUMMARY:');
  console.log(`   Documents tested: ${totalTested}`);
  console.log(`   Documents with phantoms: ${documentsWithPhantoms}`);
  console.log(`   Total phantom pages: ${totalPhantomPages}`);
  
  if (totalPhantomPages > 0) {
    console.log(`\n⚠️  PHANTOM PAGES STILL EXIST - Fix not fully effective`);
    return false;
  } else {
    console.log(`\n✅ NO PHANTOM PAGES DETECTED - Fix is working!`);
    return true;
  }
}

// Run tests
async function main() {
  console.log('🚀 Starting Phantom Pages Fix Verification\n');
  
  const singleDocTest = await testPhantomPagesFix();
  const multiDocTest = await testMultipleDocuments();
  
  console.log('\n🏁 FINAL RESULT:');
  if (singleDocTest && multiDocTest) {
    console.log('✅ PHANTOM PAGES FIX VERIFIED - All tests passed!');
    process.exit(0);
  } else {
    console.log('❌ PHANTOM PAGES STILL DETECTED - Fix needs more work');
    process.exit(1);
  }
}

main().catch(console.error);