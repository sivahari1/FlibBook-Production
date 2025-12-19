#!/usr/bin/env tsx

/**
 * Check Member Access and Available Documents
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkMemberAccess() {
  console.log('🔍 Checking Member Access...\n');

  try {
    // 1. Check all bookshop items
    const bookshopItems = await prisma.bookShopItem.findMany({
      include: {
        document: true,
      },
      orderBy: { createdAt: 'desc' }
    });

    console.log(`🛒 Bookshop Items: ${bookshopItems.length} items found`);
    for (const item of bookshopItems) {
      console.log(`   📚 ${item.title}`);
      console.log(`      ID: ${item.id}`);
      console.log(`      Document ID: ${item.documentId}`);
      console.log(`      Price: ₹${item.price}`);
      console.log(`      Category: ${item.category}`);
      if (item.document) {
        console.log(`      Document: ${item.document.title} (${item.document.contentType})`);
      }
      console.log('');
    }

    // 2. Check member access (MyJstudyroomItem)
    const memberAccess = await prisma.myJstudyroomItem.findMany({
      include: {
        user: true,
        bookShopItem: {
          include: {
            document: true
          }
        }
      },
      orderBy: { addedAt: 'desc' }
    });

    console.log(`👤 Member Access Records: ${memberAccess.length} found`);
    for (const access of memberAccess) {
      console.log(`   🎓 ${access.user.name} (${access.user.email})`);
      console.log(`      Item: ${access.bookShopItem.title}`);
      console.log(`      Document ID: ${access.bookShopItem.documentId}`);
      console.log(`      Access Date: ${access.addedAt}`);
      console.log(`      View URL: /member/view/${access.bookShopItem.documentId}`);
      console.log('');
    }

    // 3. Check users
    const users = await prisma.user.findMany({
      where: {
        role: 'MEMBER'
      }
    });

    console.log(`👥 Members: ${users.length} found`);
    for (const user of users) {
      console.log(`   ${user.name} (${user.email}) - Role: ${user.role}`);
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkMemberAccess().catch(console.error);