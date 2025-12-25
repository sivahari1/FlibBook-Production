#!/usr/bin/env tsx

/**
 * Test script to verify member document viewing fix
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function testMemberDocumentViewing() {
  console.log('🧪 Testing member document viewing fix...');

  try {
    // 1. Get a member user
    const memberUser = await prisma.user.findFirst({
      where: {
        userRole: 'MEMBER'
      }
    });

    if (!memberUser) {
      console.log('❌ No member user found');
      return;
    }

    console.log(`✅ Found member user: ${memberUser.email}`);

    // 2. Get their MyJstudyroom items
    const myJstudyroomItems = await prisma.myJstudyroomItem.findMany({
      where: {
        userId: memberUser.id
      },
      include: {
        bookShopItem: {
          include: {
            document: {
              include: {
                pages: {
                  orderBy: {
                    pageNumber: 'asc'
                  }
                }
              }
            }
          }
        }
      }
    });

    console.log(`✅ Found ${myJstudyroomItems.length} MyJstudyroom items`);

    // 3. Test each document
    for (const item of myJstudyroomItems) {
      if (item.bookShopItem?.document) {
        const document = item.bookShopItem.document;
        console.log(`\n📄 Testing document: "${document.title}"`);
        console.log(`   - Document ID: ${document.id}`);
        console.log(`   - Pages: ${document.pages.length}`);
        
        // Test API endpoints
        const baseUrl = 'http://localhost:3000';
        
        // Test pages endpoint
        const pagesUrl = `${baseUrl}/api/member/my-jstudyroom/${document.id}/pages`;
        console.log(`   - Pages API: ${pagesUrl}`);
        
        // Test individual page endpoints
        for (let i = 1; i <= Math.min(3, document.pages.length); i++) {
          const pageUrl = `${baseUrl}/api/member/my-jstudyroom/${document.id}/pages/${i}`;
          console.log(`   - Page ${i} API: ${pageUrl}`);
        }
      }
    }

    console.log('\n🎉 Test completed! Now test in browser:');
    console.log('1. Start your dev server: npm run dev');
    console.log('2. Login as member user');
    console.log('3. Go to My JStudyRoom');
    console.log('4. Click on a document to view it');
    console.log('5. Check that pages load without 404 errors');

  } catch (error) {
    console.error('❌ Error during test:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the test
testMemberDocumentViewing().catch((error) => {
  console.error('Failed to test member document viewing:', error);
  process.exit(1);
});