#!/usr/bin/env tsx

/**
 * Get Correct MyJstudyroom URLs
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function getCorrectUrls() {
  console.log('🔍 Getting Correct MyJstudyroom URLs...\n');

  try {
    const items = await prisma.myJstudyroomItem.findMany({
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

    console.log('✅ Correct URLs for Member Document Viewing:\n');

    for (const item of items) {
      console.log(`📚 ${item.bookShopItem.title}`);
      console.log(`   Member: ${item.user.name} (${item.user.email})`);
      console.log(`   Document: ${item.bookShopItem.document.title}`);
      console.log(`   ✅ Correct URL: http://localhost:3000/member/view/${item.id}`);
      console.log(`   ❌ Wrong URL:   http://localhost:3000/member/view/${item.bookShopItem.documentId}`);
      console.log('');
    }

    console.log('🎯 The issue was using document IDs instead of MyJstudyroom item IDs!');
    console.log('');
    console.log('📝 To test navigation:');
    console.log('1. Use one of the correct URLs above');
    console.log('2. Login as the corresponding member');
    console.log('3. The document should load and navigation should work');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

getCorrectUrls().catch(console.error);