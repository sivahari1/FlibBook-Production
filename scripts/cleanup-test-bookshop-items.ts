#!/usr/bin/env tsx

/**
 * Script to clean up test bookshop items
 */

import { prisma } from '../lib/db';

async function cleanupTestBookshopItems() {
  console.log('🧹 Cleaning up test bookshop items...\n');

  try {
    // Find test bookshop items (those with test user IDs or test titles)
    const testItems = await prisma.bookShopItem.findMany({
      where: {
        OR: [
          { title: { contains: 'Test Book' } },
          { title: { contains: 'Test Document' } },
          { category: 'Test Category' },
          {
            document: {
              userId: { contains: 'test-pbt-user' }
            }
          }
        ]
      },
      include: {
        document: {
          select: {
            id: true,
            title: true,
            userId: true,
          }
        }
      }
    });

    console.log(`Found ${testItems.length} test bookshop items to clean up:`);
    testItems.forEach((item, index) => {
      console.log(`   ${index + 1}. ${item.title} (Category: ${item.category})`);
      console.log(`      Document: ${item.document?.title}`);
      console.log(`      User ID: ${item.document?.userId}`);
    });

    if (testItems.length === 0) {
      console.log('✅ No test items found to clean up');
      return;
    }

    console.log('\n🗑️  Deleting test bookshop items...');
    
    // Delete test bookshop items
    const deleteResult = await prisma.bookShopItem.deleteMany({
      where: {
        OR: [
          { title: { contains: 'Test Book' } },
          { title: { contains: 'Test Document' } },
          { category: 'Test Category' },
          {
            document: {
              userId: { contains: 'test-pbt-user' }
            }
          }
        ]
      }
    });

    console.log(`✅ Deleted ${deleteResult.count} test bookshop items`);

    // Also clean up test documents
    console.log('\n🗑️  Cleaning up test documents...');
    const testDocs = await prisma.document.findMany({
      where: {
        OR: [
          { title: { contains: 'Test Document' } },
          { userId: { contains: 'test-pbt-user' } }
        ]
      },
      select: {
        id: true,
        title: true,
        userId: true,
      }
    });

    console.log(`Found ${testDocs.length} test documents to clean up:`);
    testDocs.forEach((doc, index) => {
      console.log(`   ${index + 1}. ${doc.title} (User: ${doc.userId})`);
    });

    if (testDocs.length > 0) {
      const deleteDocsResult = await prisma.document.deleteMany({
        where: {
          OR: [
            { title: { contains: 'Test Document' } },
            { userId: { contains: 'test-pbt-user' } }
          ]
        }
      });

      console.log(`✅ Deleted ${deleteDocsResult.count} test documents`);
    }

    // Show remaining bookshop items
    console.log('\n📚 Remaining bookshop items:');
    const remainingItems = await prisma.bookShopItem.findMany({
      where: {
        isPublished: true
      },
      include: {
        document: {
          select: {
            title: true,
            userId: true,
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    if (remainingItems.length === 0) {
      console.log('   No items remaining');
    } else {
      remainingItems.forEach((item, index) => {
        console.log(`   ${index + 1}. ${item.title} (₹${item.price}${item.isFree ? ' - FREE' : ''})`);
        console.log(`      Category: ${item.category}`);
        console.log(`      Document: ${item.document?.title}`);
      });
    }

  } catch (error) {
    console.error('❌ Error cleaning up test items:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
cleanupTestBookshopItems().catch(console.error);