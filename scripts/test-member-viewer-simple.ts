#!/usr/bin/env tsx

/**
 * Simple test for member viewer
 */

import { prisma } from '../lib/db';

async function testMemberViewer() {
  console.log('🧪 Testing member viewer access...\n');

  try {
    // Find a member item
    const memberItem = await prisma.myJstudyroomItem.findFirst({
      include: {
        user: true,
        bookShopItem: {
          include: {
            document: true
          }
        }
      }
    });

    if (!memberItem) {
      console.log('❌ No member items found');
      return;
    }

    console.log('📄 Found member item:');
    console.log(`   - Item ID: ${memberItem.id}`);
    console.log(`   - User: ${memberItem.user.email}`);
    console.log(`   - Document: ${memberItem.bookShopItem.document.title}`);
    console.log(`   - Document ID: ${memberItem.bookShopItem.document.id}`);

    // Test the viewer URL
    const viewerUrl = `http://localhost:3000/member/view/${memberItem.id}`;
    console.log(`\n🔗 Viewer URL: ${viewerUrl}`);

    // Check if document has proper data
    const doc = memberItem.bookShopItem.document;
    console.log('\n📋 Document details:');
    console.log(`   - Content Type: ${doc.contentType}`);
    console.log(`   - MIME Type: ${doc.mimeType}`);
    console.log(`   - Storage Path: ${doc.storagePath}`);
    console.log(`   - File Size: ${doc.fileSize}`);
    console.log(`   - Has Metadata: ${doc.metadata ? 'Yes' : 'No'}`);

    console.log('\n✅ Test complete. Try accessing the viewer URL above.');

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Run test
testMemberViewer()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Test failed:', error);
    process.exit(1);
  });