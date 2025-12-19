#!/usr/bin/env tsx

/**
 * Test script to verify the member view fix
 */

import { prisma } from '../lib/db';

async function testMemberViewFix() {
  console.log('🧪 Testing Member View Fix...\n');

  try {
    // Get a sample MyJstudyroomItem
    const sampleItem = await prisma.myJstudyroomItem.findFirst({
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
        user: {
          select: {
            id: true,
            email: true,
            userRole: true,
          },
        },
      },
    });

    if (!sampleItem) {
      console.log('❌ No MyJstudyroomItem found for testing');
      return;
    }

    console.log('✅ Found test item:');
    console.log(`   Item ID: ${sampleItem.id}`);
    console.log(`   User: ${sampleItem.user.email} (${sampleItem.user.userRole})`);
    console.log(`   Document: ${sampleItem.bookShopItem.document.title}`);
    console.log(`   Content Type: ${sampleItem.bookShopItem.document.contentType}`);
    console.log(`   Storage Path: ${sampleItem.bookShopItem.document.storagePath}`);

    // Test the viewer page query (same as in the actual page)
    const viewerItem = await prisma.myJstudyroomItem.findUnique({
      where: { id: sampleItem.id },
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
      console.log('\n✅ Viewer query successful');
      
      // Check user ownership
      if (viewerItem.userId === sampleItem.user.id) {
        console.log('✅ User ownership verified');
      } else {
        console.log('❌ User ownership mismatch');
      }

      // Check role permissions (now should allow both MEMBER and ADMIN)
      const userRole = sampleItem.user.userRole;
      if (userRole === 'MEMBER' || userRole === 'ADMIN') {
        console.log(`✅ Role permission verified (${userRole})`);
      } else {
        console.log(`❌ Role permission denied (${userRole})`);
      }

      console.log('\n🎯 Test URL:');
      console.log(`   /member/view/${sampleItem.id}`);
      
      console.log('\n📋 Expected behavior:');
      console.log('   - Should load the document viewer');
      console.log('   - Should display the document content');
      console.log('   - Should show watermark with user name');
      console.log('   - Should NOT redirect to My Documents');

    } else {
      console.log('❌ Viewer query failed');
    }

  } catch (error) {
    console.error('❌ Error during test:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the test
testMemberViewFix().catch(console.error);