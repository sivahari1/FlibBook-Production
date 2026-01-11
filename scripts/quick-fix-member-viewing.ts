#!/usr/bin/env tsx

/**
 * Quick fix for member document viewing issues
 * Run with: npx tsx scripts/quick-fix-member-viewing.ts
 */

import { prisma } from '@/lib/db';

async function quickFixMemberViewing() {
  console.log('🔧 Quick Fix for Member Document Viewing');
  console.log('======================================\n');

  try {
    // Step 1: Check if we can access documents with new fields
    console.log('1. Testing document access...');
    
    let documentsAccessible = false;
    try {
      const testDoc = await prisma.document.findFirst({
        select: {
          id: true,
          title: true,
          conversionStatus: true, // This will fail if field doesn't exist
        }
      });
      documentsAccessible = true;
      console.log('✅ New schema fields are available');
    } catch (error) {
      console.log('❌ New schema fields not available - migration needed');
      console.log('   Please run: npx prisma migrate dev --name add_conversion_tracking');
      return;
    }

    // Step 2: Check for documents without conversion status
    console.log('\n2. Checking documents without conversion status...');
    
    const documentsNeedingUpdate = await prisma.document.findMany({
      where: {
        OR: [
          { conversionStatus: null },
          { conversionStatus: undefined }
        ]
      },
      select: {
        id: true,
        title: true,
        contentType: true,
      }
    });

    if (documentsNeedingUpdate.length > 0) {
      console.log(`   Found ${documentsNeedingUpdate.length} documents needing status update`);
      
      // Update documents to have PENDING status
      const updateResult = await prisma.document.updateMany({
        where: {
          OR: [
            { conversionStatus: null },
            { conversionStatus: undefined }
          ]
        },
        data: {
          conversionStatus: 'PENDING'
        }
      });
      
      console.log(`✅ Updated ${updateResult.count} documents to PENDING status`);
    } else {
      console.log('✅ All documents have conversion status');
    }

    // Step 3: Check DocumentPage table for missing storagePath
    console.log('\n3. Checking document pages...');
    
    const pagesWithNullPath = await prisma.documentPage.findMany({
      where: {
        storagePath: null
      },
      select: {
        id: true,
        documentId: true,
        pageNumber: true,
        pageUrl: true,
      },
      take: 5
    });

    if (pagesWithNullPath.length > 0) {
      console.log(`   Found ${pagesWithNullPath.length} pages with null storagePath`);
      
      // Try to fix storage paths from pageUrl
      for (const page of pagesWithNullPath) {
        if (page.pageUrl) {
          // Extract storage path from public URL
          const match = page.pageUrl.match(/\/storage\/v1\/object\/public\/document-pages\/(.+)$/);
          if (match?.[1]) {
            await prisma.documentPage.update({
              where: { id: page.id },
              data: { storagePath: match[1] }
            });
            console.log(`   ✅ Fixed storage path for page ${page.pageNumber} of document ${page.documentId}`);
          }
        }
      }
    } else {
      console.log('✅ All pages have storage paths');
    }

    // Step 4: Test a sample document resolution
    console.log('\n4. Testing document ID resolution...');
    
    const sampleMyJstudyroomItem = await prisma.myJstudyroomItem.findFirst({
      include: {
        bookShopItem: {
          select: {
            documentId: true,
            title: true,
          }
        }
      }
    });

    if (sampleMyJstudyroomItem) {
      console.log(`   Sample MyJstudyroom item: ${sampleMyJstudyroomItem.id}`);
      console.log(`   Resolves to document: ${sampleMyJstudyroomItem.bookShopItem.documentId}`);
      console.log(`   Document title: ${sampleMyJstudyroomItem.bookShopItem.title}`);
      
      // Test the resolver
      const { resolveDocumentId } = await import('@/lib/server/resolveDocumentId');
      try {
        const resolution = await resolveDocumentId(sampleMyJstudyroomItem.id);
        console.log(`✅ Resolver works: ${sampleMyJstudyroomItem.id} → ${resolution.documentId} (${resolution.source})`);
      } catch (error) {
        console.log(`❌ Resolver error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    } else {
      console.log('⚠️  No MyJstudyroom items found for testing');
    }

    console.log('\n🎉 Quick fix completed!');
    console.log('\n📋 If you still see errors:');
    console.log('1. Refresh the browser page');
    console.log('2. Check browser console for specific API errors');
    console.log('3. Ensure user has documents in their study room');
    console.log('4. Try accessing a document directly by its document ID');

  } catch (error) {
    console.error('❌ Quick fix failed:', error);
    
    if (error instanceof Error) {
      if (error.message.includes('Unknown arg')) {
        console.log('\n🔧 SOLUTION: Run Prisma migration first:');
        console.log('   npx prisma migrate dev --name add_conversion_tracking');
      }
    }
  }
}

async function main() {
  try {
    await quickFixMemberViewing();
  } catch (error) {
    console.error('❌ Script failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  main();
}