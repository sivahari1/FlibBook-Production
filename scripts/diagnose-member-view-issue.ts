#!/usr/bin/env tsx

/**
 * Diagnostic script to investigate the member view issue
 * where clicking "View" redirects to My Documents instead of displaying the document
 */

import { prisma } from '../lib/db';

async function diagnoseMemberViewIssue() {
  console.log('🔍 Diagnosing Member View Issue...\n');

  try {
    // 1. Check if there are any MyJstudyroomItems
    console.log('1. Checking MyJstudyroomItem records...');
    const myJstudyroomItems = await prisma.myJstudyroomItem.findMany({
      include: {
        bookShopItem: {
          include: {
            document: {
              select: {
                id: true,
                title: true,
                contentType: true,
                storagePath: true,
                linkUrl: true,
              },
            },
          },
        },
        user: {
          select: {
            id: true,
            email: true,
            userRole: true,
          },
        },
      },
      take: 5,
    });

    console.log(`Found ${myJstudyroomItems.length} MyJstudyroomItem records`);
    
    if (myJstudyroomItems.length > 0) {
      console.log('\nSample MyJstudyroomItem:');
      const sample = myJstudyroomItems[0];
      console.log({
        id: sample.id,
        userId: sample.userId,
        userEmail: sample.user.email,
        userRole: sample.user.userRole,
        bookShopItemId: sample.bookShopItemId,
        bookShopTitle: sample.bookShopItem.title,
        documentId: sample.bookShopItem.document.id,
        documentTitle: sample.bookShopItem.document.title,
        contentType: sample.bookShopItem.document.contentType,
        storagePath: sample.bookShopItem.document.storagePath,
        linkUrl: sample.bookShopItem.document.linkUrl,
        isFree: sample.isFree,
        addedAt: sample.addedAt,
      });

      // 2. Test the specific query used in the viewer page
      console.log('\n2. Testing viewer page query...');
      const testItemId = sample.id;
      console.log(`Testing with itemId: ${testItemId}`);

      const viewerItem = await prisma.myJstudyroomItem.findUnique({
        where: { id: testItemId },
        include: {
          bookShopItem: {
            include: {
              document: {
                select: {
                  id: true,
                  title: true,
                  filename: true,
                  contentType: true,
                  storagePath: true,
                  linkUrl: true,
                  thumbnailUrl: true,
                  metadata: true,
                  fileSize: true,
                  mimeType: true,
                  createdAt: true,
                  updatedAt: true,
                  userId: true,
                },
              },
            },
          },
        },
      });

      if (viewerItem) {
        console.log('✅ Viewer query successful');
        console.log('Document details:');
        console.log({
          itemId: viewerItem.id,
          documentId: viewerItem.bookShopItem.document.id,
          title: viewerItem.bookShopItem.document.title,
          contentType: viewerItem.bookShopItem.document.contentType,
          storagePath: viewerItem.bookShopItem.document.storagePath,
          linkUrl: viewerItem.bookShopItem.document.linkUrl,
          metadata: viewerItem.bookShopItem.document.metadata,
        });
      } else {
        console.log('❌ Viewer query failed - item not found');
      }

      // 3. Check for any data inconsistencies
      console.log('\n3. Checking for data inconsistencies...');
      
      // Check if all bookShopItems have valid documents
      const itemsWithoutDocuments = await prisma.myJstudyroomItem.findMany({
        where: {
          bookShopItem: {
            document: null,
          },
        },
        include: {
          bookShopItem: true,
        },
      });

      if (itemsWithoutDocuments.length > 0) {
        console.log(`⚠️  Found ${itemsWithoutDocuments.length} items without documents`);
        itemsWithoutDocuments.forEach(item => {
          console.log(`- Item ${item.id} -> BookShop ${item.bookShopItemId}`);
        });
      } else {
        console.log('✅ All items have valid documents');
      }

      // 4. Check user permissions
      console.log('\n4. Checking user permissions...');
      const sampleUserId = sample.userId;
      const userItems = await prisma.myJstudyroomItem.findMany({
        where: { userId: sampleUserId },
        select: { id: true, userId: true },
      });

      console.log(`User ${sampleUserId} has ${userItems.length} items`);
      console.log('Item IDs:', userItems.map(item => item.id));

    } else {
      console.log('❌ No MyJstudyroomItem records found');
      
      // Check if there are any BookShopItems
      const bookShopItems = await prisma.bookShopItem.findMany({
        take: 5,
        include: {
          document: {
            select: {
              id: true,
              title: true,
              contentType: true,
            },
          },
        },
      });
      
      console.log(`Found ${bookShopItems.length} BookShopItem records`);
      if (bookShopItems.length > 0) {
        console.log('Sample BookShopItem:');
        console.log({
          id: bookShopItems[0].id,
          title: bookShopItems[0].title,
          documentId: bookShopItems[0].document?.id,
          documentTitle: bookShopItems[0].document?.title,
        });
      }
    }

    // 5. Check for any recent errors in the logs
    console.log('\n5. Summary and Recommendations...');
    
    if (myJstudyroomItems.length === 0) {
      console.log('🔧 ISSUE: No documents in My jstudyroom');
      console.log('   - Users need to add documents from the Book Shop first');
      console.log('   - Check if the Book Shop has published items');
    } else {
      console.log('🔧 POTENTIAL ISSUES TO CHECK:');
      console.log('   1. Session/authentication issues');
      console.log('   2. User role verification (should be MEMBER)');
      console.log('   3. Item ownership verification');
      console.log('   4. Document file accessibility');
      console.log('   5. Browser console errors during navigation');
    }

  } catch (error) {
    console.error('❌ Error during diagnosis:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the diagnosis
diagnoseMemberViewIssue().catch(console.error);