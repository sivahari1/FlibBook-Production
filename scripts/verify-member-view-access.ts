#!/usr/bin/env tsx

/**
 * Verify that the member view access is working correctly
 */

import { prisma } from '../lib/db';

async function verifyMemberViewAccess() {
  console.log('🔍 Verifying Member View Access...\n');

  try {
    // Get the first MyJstudyroomItem
    const item = await prisma.myJstudyroomItem.findFirst({
      include: {
        user: {
          select: {
            id: true,
            email: true,
            userRole: true,
          },
        },
        bookShopItem: {
          include: {
            document: {
              select: {
                id: true,
                title: true,
                contentType: true,
              },
            },
          },
        },
      },
    });

    if (!item) {
      console.log('❌ No MyJstudyroomItem found');
      console.log('💡 Add a document to My jstudyroom first from the Book Shop');
      return;
    }

    console.log('📄 Found document in My jstudyroom:');
    console.log(`   Item ID: ${item.id}`);
    console.log(`   User: ${item.user.email} (${item.user.userRole})`);
    console.log(`   Title: ${item.bookShopItem.title}`);
    console.log(`   Document: ${item.bookShopItem.document.title}`);
    console.log(`   Content Type: ${item.bookShopItem.document.contentType}`);

    console.log('\n🎯 Test this URL in your browser:');
    console.log(`   http://localhost:3000/member/view/${item.id}`);

    console.log('\n✅ Expected Result:');
    console.log('   - Document viewer should load');
    console.log('   - Document content should display');
    console.log('   - Should NOT redirect to My Documents');
    console.log('   - Should show watermark with user name');

    console.log('\n🔧 If it still redirects:');
    console.log('   1. Check browser console for errors');
    console.log('   2. Verify you are logged in as the correct user');
    console.log('   3. Clear browser cache and cookies');
    console.log('   4. Check network tab for failed requests');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

verifyMemberViewAccess().catch(console.error);