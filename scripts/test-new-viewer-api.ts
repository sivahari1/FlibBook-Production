#!/usr/bin/env tsx

/**
 * Test the new viewer API endpoints
 */

import { prisma } from '../lib/db';

async function testViewerAPI() {
  console.log('🔍 Testing new viewer API endpoints...\n');

  try {
    // Find a document with pages
    const document = await prisma.document.findFirst({
      where: {
        pages: {
          some: {}
        }
      },
      include: {
        pages: {
          take: 1,
          orderBy: { pageNumber: 'asc' }
        }
      }
    });

    if (!document) {
      console.log('❌ No documents with pages found');
      return;
    }

    console.log(`📄 Found document: ${document.id}`);
    console.log(`📊 Page count: ${document.pages.length}`);
    console.log(`🖼️ First page: ${document.pages[0]?.pageNumber || 'None'}`);

    // Test pages list endpoint
    console.log('\n🔗 Testing pages list endpoint:');
    console.log(`GET /api/viewer/${document.id}/pages`);

    // Test page image endpoint
    if (document.pages[0]) {
      console.log('\n🖼️ Testing page image endpoint:');
      console.log(`GET /api/viewer/${document.id}/pages/${document.pages[0].pageNumber}`);
    }

    // Check if document has MyJstudyroomItem (through BookShopItem)
    const item = await prisma.myJstudyroomItem.findFirst({
      where: { 
        bookShopItem: {
          documentId: document.id
        }
      },
      include: {
        bookShopItem: true
      }
    });

    if (item) {
      console.log(`\n🎒 Found MyJstudyroom item: ${item.id}`);
      console.log('🔗 Testing with item ID:');
      console.log(`GET /api/viewer/${item.id}/pages`);
      if (document.pages[0]) {
        console.log(`GET /api/viewer/${item.id}/pages/${document.pages[0].pageNumber}`);
      }
    }

    console.log('\n✅ API endpoints are ready for testing');
    console.log('\n📝 Next steps:');
    console.log('1. Start the dev server: npm run dev');
    console.log('2. Test the endpoints in browser or with curl');
    console.log('3. Check that images load properly in the viewer');

  } catch (error) {
    console.error('❌ Error testing viewer API:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testViewerAPI();