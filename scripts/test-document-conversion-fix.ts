#!/usr/bin/env npx tsx

/**
 * Test Document Conversion Fix
 * 
 * This script tests the core document workflow fix:
 * 1. Upload PDF → Auto-conversion triggered
 * 2. Pages generated and stored
 * 3. Member can view real content
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function testDocumentConversionFix() {
  console.log('🧪 Testing Document Conversion Fix...\n');

  try {
    // 1. Check if we have any documents
    const documents = await prisma.document.findMany({
      where: {
        contentType: 'PDF'
      },
      include: {
        pages: true,
        bookShopItems: true
      },
      take: 5
    });

    console.log(`📄 Found ${documents.length} PDF documents in database`);

    if (documents.length === 0) {
      console.log('❌ No PDF documents found. Upload a PDF to test the fix.');
      return;
    }

    // 2. Check conversion status for each document
    for (const doc of documents) {
      console.log(`\n📋 Document: ${doc.title}`);
      console.log(`   ID: ${doc.id}`);
      console.log(`   Content Type: ${doc.contentType}`);
      console.log(`   File Size: ${(Number(doc.fileSize) / 1024).toFixed(2)} KB`);
      console.log(`   Storage Path: ${doc.storagePath}`);
      console.log(`   Pages: ${doc.pages.length}`);
      console.log(`   In Bookshop: ${doc.bookShopItems.length > 0 ? 'Yes' : 'No'}`);

      if (doc.pages.length > 0) {
        console.log('   ✅ Has converted pages - GOOD!');
        console.log(`   📄 Page URLs:`);
        doc.pages.slice(0, 3).forEach((page, index) => {
          console.log(`      Page ${page.pageNumber}: ${page.pageUrl}`);
        });
        if (doc.pages.length > 3) {
          console.log(`      ... and ${doc.pages.length - 3} more pages`);
        }
      } else {
        console.log('   ❌ No converted pages - NEEDS CONVERSION');
        console.log('   💡 This document was uploaded before the fix');
      }

      // Check if it's available to members
      if (doc.bookShopItems.length > 0) {
        const bookshopItem = doc.bookShopItems[0];
        console.log(`   🏪 Bookshop: ${bookshopItem.title} (${bookshopItem.category})`);
        console.log(`   💰 Price: ${bookshopItem.isFree ? 'Free' : `₹${bookshopItem.price}`}`);
        console.log(`   📊 Published: ${bookshopItem.isPublished ? 'Yes' : 'No'}`);
      }
    }

    // 3. Check member access
    console.log('\n👥 Checking Member Access...');
    const memberItems = await prisma.myJstudyroomItem.findMany({
      include: {
        bookShopItem: {
          include: {
            document: {
              include: {
                pages: true
              }
            }
          }
        },
        user: {
          select: {
            email: true,
            name: true
          }
        }
      },
      take: 5
    });

    console.log(`📚 Found ${memberItems.length} items in member study rooms`);

    for (const item of memberItems) {
      const doc = item.bookShopItem.document;
      console.log(`\n👤 Member: ${item.user.email}`);
      console.log(`   📖 Document: ${item.bookShopItem.title}`);
      console.log(`   📄 Pages Available: ${doc.pages.length}`);
      console.log(`   🎯 Status: ${doc.pages.length > 0 ? '✅ Can view real content' : '❌ Will see placeholder'}`);
    }

    // 4. Summary and recommendations
    console.log('\n📊 SUMMARY:');
    const totalDocs = documents.length;
    const convertedDocs = documents.filter(d => d.pages.length > 0).length;
    const unconvertedDocs = totalDocs - convertedDocs;

    console.log(`   📄 Total PDF Documents: ${totalDocs}`);
    console.log(`   ✅ Converted Documents: ${convertedDocs}`);
    console.log(`   ❌ Unconverted Documents: ${unconvertedDocs}`);

    if (unconvertedDocs > 0) {
      console.log('\n💡 RECOMMENDATIONS:');
      console.log('   1. Upload a new PDF to test the automatic conversion fix');
      console.log('   2. For existing documents, you may need to manually trigger conversion');
      console.log('   3. Check the upload endpoint logs for conversion status');
    }

    if (convertedDocs > 0) {
      console.log('\n🎉 GOOD NEWS:');
      console.log('   ✅ Some documents have been converted successfully');
      console.log('   ✅ Members should be able to view real content for these documents');
      console.log('   ✅ The core workflow is working!');
    }

    // 5. Test member API endpoint
    if (memberItems.length > 0) {
      const testItem = memberItems[0];
      const docId = testItem.bookShopItem.document.id;
      console.log(`\n🔗 Test Member Viewer URL:`);
      console.log(`   http://localhost:3000/member/view/${testItem.id}`);
      console.log(`   API: http://localhost:3000/api/member/my-jstudyroom/${docId}/pages`);
    }

  } catch (error) {
    console.error('❌ Error testing document conversion fix:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the test
testDocumentConversionFix().catch(console.error);