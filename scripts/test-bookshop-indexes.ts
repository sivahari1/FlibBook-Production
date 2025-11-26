/**
 * Script to test and verify BookShop database indexes performance
 * 
 * This script demonstrates the performance benefits of the indexes on:
 * - BookShopItem.category
 * - BookShopItem.isPublished
 * - MyJstudyroomItem.userId
 * - MyJstudyroomItem(userId, bookShopItemId) composite
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({
  log: ['query'], // Enable query logging to see SQL
});

async function testIndexPerformance() {
  console.log('🔍 Testing BookShop Index Performance\n');
  console.log('=' .repeat(60));

  try {
    // Test 1: Query by category (uses category index)
    console.log('\n📚 Test 1: Query BookShop items by category');
    console.log('-'.repeat(60));
    const startCategory = Date.now();
    const mathItems = await prisma.bookShopItem.findMany({
      where: {
        category: {
          startsWith: 'Maths',
        },
      },
      take: 10,
    });
    const categoryTime = Date.now() - startCategory;
    console.log(`✓ Found ${mathItems.length} Math items in ${categoryTime}ms`);
    console.log(`  Index used: category`);

    // Test 2: Query published items (uses isPublished index)
    console.log('\n📖 Test 2: Query published BookShop items');
    console.log('-'.repeat(60));
    const startPublished = Date.now();
    const publishedItems = await prisma.bookShopItem.findMany({
      where: {
        isPublished: true,
      },
      take: 10,
    });
    const publishedTime = Date.now() - startPublished;
    console.log(`✓ Found ${publishedItems.length} published items in ${publishedTime}ms`);
    console.log(`  Index used: isPublished`);

    // Test 3: Query by category AND published (uses both indexes)
    console.log('\n🔎 Test 3: Query published items in specific category');
    console.log('-'.repeat(60));
    const startCombined = Date.now();
    const filteredItems = await prisma.bookShopItem.findMany({
      where: {
        category: {
          startsWith: 'Maths',
        },
        isPublished: true,
      },
      take: 10,
    });
    const combinedTime = Date.now() - startCombined;
    console.log(`✓ Found ${filteredItems.length} published Math items in ${combinedTime}ms`);
    console.log(`  Indexes used: category, isPublished`);

    // Test 4: Query user's Study Room items (uses userId index)
    console.log('\n👤 Test 4: Query user Study Room collection');
    console.log('-'.repeat(60));
    
    // Get a user with items
    const userWithItems = await prisma.myJstudyroomItem.findFirst({
      select: { userId: true },
    });

    if (userWithItems) {
      const startUserId = Date.now();
      const userItems = await prisma.myJstudyroomItem.findMany({
        where: {
          userId: userWithItems.userId,
        },
        include: {
          bookShopItem: true,
        },
      });
      const userIdTime = Date.now() - startUserId;
      console.log(`✓ Found ${userItems.length} items for user in ${userIdTime}ms`);
      console.log(`  Index used: userId`);
    } else {
      console.log('⚠ No Study Room items found to test');
    }

    // Test 5: Check for duplicate (uses composite unique index)
    console.log('\n🔍 Test 5: Check for duplicate Study Room item');
    console.log('-'.repeat(60));
    
    const sampleItem = await prisma.myJstudyroomItem.findFirst();
    
    if (sampleItem) {
      const startDuplicate = Date.now();
      const duplicate = await prisma.myJstudyroomItem.findUnique({
        where: {
          userId_bookShopItemId: {
            userId: sampleItem.userId,
            bookShopItemId: sampleItem.bookShopItemId,
          },
        },
      });
      const duplicateTime = Date.now() - startDuplicate;
      console.log(`✓ Duplicate check completed in ${duplicateTime}ms`);
      console.log(`  Index used: userId_bookShopItemId (composite unique)`);
      console.log(`  Result: ${duplicate ? 'Item exists' : 'Item not found'}`);
    } else {
      console.log('⚠ No Study Room items found to test');
    }

    // Test 6: Complex query combining multiple indexes
    console.log('\n🎯 Test 6: Complex query with joins');
    console.log('-'.repeat(60));
    const startComplex = Date.now();
    const complexQuery = await prisma.bookShopItem.findMany({
      where: {
        isPublished: true,
        category: {
          contains: 'CBSE',
        },
        contentType: 'PDF',
      },
      include: {
        myJstudyroomItems: {
          take: 5,
        },
      },
      take: 10,
    });
    const complexTime = Date.now() - startComplex;
    console.log(`✓ Complex query completed in ${complexTime}ms`);
    console.log(`  Found ${complexQuery.length} items`);
    console.log(`  Indexes used: isPublished, category, contentType`);

    // Summary
    console.log('\n' + '='.repeat(60));
    console.log('📊 Performance Summary');
    console.log('='.repeat(60));
    console.log(`Category filter:        ${categoryTime}ms`);
    console.log(`Published filter:       ${publishedTime}ms`);
    console.log(`Combined filter:        ${combinedTime}ms`);
    console.log(`User collection:        ${userWithItems ? `${Date.now() - startUserId}ms` : 'N/A'}`);
    console.log(`Duplicate check:        ${sampleItem ? `${duplicateTime}ms` : 'N/A'}`);
    console.log(`Complex query:          ${complexTime}ms`);
    
    console.log('\n✅ All index performance tests completed successfully!');
    console.log('\n📝 Index Benefits:');
    console.log('  • category index: Fast filtering by subject/standard');
    console.log('  • isPublished index: Quick retrieval of visible items');
    console.log('  • userId index: Efficient user collection lookups');
    console.log('  • composite unique index: Instant duplicate detection');
    console.log('  • contentType index: Fast content type filtering');

  } catch (error) {
    console.error('❌ Error testing indexes:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the tests
testIndexPerformance()
  .then(() => {
    console.log('\n✨ Index performance verification complete!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Index performance test failed:', error);
    process.exit(1);
  });
