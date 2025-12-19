#!/usr/bin/env tsx

/**
 * Test the member pages API endpoint directly
 */

import { prisma } from '../lib/db';

async function testMemberPagesAPIDirect() {
  try {
    console.log('🔍 Testing member pages API directly...');

    // Find a user with documents in their jstudyroom
    const myJstudyroomItem = await prisma.myJstudyroomItem.findFirst({
      include: {
        user: true,
        bookShopItem: {
          include: {
            document: {
              include: {
                pages: true
              }
            }
          }
        }
      }
    });

    if (!myJstudyroomItem) {
      console.log('❌ No MyJstudyroom items found');
      return;
    }

    console.log(`👤 User: ${myJstudyroomItem.user.email}`);
    console.log(`📚 BookShop Item: ${myJstudyroomItem.bookShopItem.title}`);
    console.log(`📄 Document ID: ${myJstudyroomItem.bookShopItem.documentId}`);
    console.log(`📑 Pages: ${myJstudyroomItem.bookShopItem.document?.pages?.length || 0}`);

    // Check if document has pages
    if (myJstudyroomItem.bookShopItem.document?.pages?.length === 0) {
      console.log('⚠️ Document has no pages - this might be the issue!');
      
      // Check if document needs conversion
      const document = myJstudyroomItem.bookShopItem.document;
      console.log(`📋 Document details:`);
      console.log(`   - Title: ${document?.title}`);
      console.log(`   - Content Type: ${document?.contentType}`);
      console.log(`   - Storage Path: ${document?.storagePath}`);
      console.log(`   - Created: ${document?.createdAt}`);
      
      console.log('\n💡 This document may need to be converted to generate pages.');
      console.log('🔧 Try running the document conversion process.');
    } else {
      console.log('✅ Document has pages, API should work');
      
      // Show first few pages
      const pages = myJstudyroomItem.bookShopItem.document?.pages?.slice(0, 3);
      pages?.forEach((page, index) => {
        console.log(`   Page ${index + 1}: ${page.pageUrl}`);
      });
    }

    console.log(`\n🌐 Test URL: /api/member/my-jstudyroom/${myJstudyroomItem.bookShopItem.documentId}/pages`);

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testMemberPagesAPIDirect();