/**
 * Script to verify all required BookShop indexes exist in the database
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function verifyIndexes() {
  console.log('🔍 Verifying BookShop Database Indexes\n');
  console.log('=' .repeat(60));

  try {
    // Query to get all indexes for our tables
    const bookShopIndexes = await prisma.$queryRaw<Array<{
      tablename: string;
      indexname: string;
      indexdef: string;
    }>>`
      SELECT 
        tablename,
        indexname,
        indexdef
      FROM pg_indexes
      WHERE schemaname = 'public'
        AND tablename IN ('book_shop_items', 'my_jstudyroom_items')
      ORDER BY tablename, indexname;
    `;

    console.log('\n📊 Found Indexes:\n');

    const bookShopItemIndexes = bookShopIndexes.filter(idx => idx.tablename === 'book_shop_items');
    const myJstudyroomIndexes = bookShopIndexes.filter(idx => idx.tablename === 'my_jstudyroom_items');

    console.log('📚 BookShopItem Table Indexes:');
    console.log('-'.repeat(60));
    bookShopItemIndexes.forEach(idx => {
      console.log(`  ✓ ${idx.indexname}`);
      console.log(`    ${idx.indexdef}`);
      console.log();
    });

    console.log('\n📖 MyJstudyroomItem Table Indexes:');
    console.log('-'.repeat(60));
    myJstudyroomIndexes.forEach(idx => {
      console.log(`  ✓ ${idx.indexname}`);
      console.log(`    ${idx.indexdef}`);
      console.log();
    });

    // Verify required indexes
    console.log('\n✅ Required Index Verification:');
    console.log('='.repeat(60));

    const requiredIndexes = {
      'book_shop_items_category_idx': 'BookShopItem.category',
      'book_shop_items_isPublished_idx': 'BookShopItem.isPublished',
      'book_shop_items_contentType_idx': 'BookShopItem.contentType',
      'book_shop_items_documentId_idx': 'BookShopItem.documentId',
      'my_jstudyroom_items_userId_idx': 'MyJstudyroomItem.userId',
      'my_jstudyroom_items_bookShopItemId_idx': 'MyJstudyroomItem.bookShopItemId',
      'my_jstudyroom_items_userId_bookShopItemId_key': 'MyJstudyroomItem(userId, bookShopItemId) composite',
    };

    const allIndexNames = bookShopIndexes.map(idx => idx.indexname);
    let allPresent = true;

    for (const [indexName, description] of Object.entries(requiredIndexes)) {
      const present = allIndexNames.includes(indexName);
      if (present) {
        console.log(`  ✅ ${description}`);
      } else {
        console.log(`  ❌ ${description} - MISSING!`);
        allPresent = false;
      }
    }

    console.log('\n' + '='.repeat(60));
    
    if (allPresent) {
      console.log('✅ All required indexes are present and verified!');
      console.log('\n📝 Summary:');
      console.log(`  • Total BookShopItem indexes: ${bookShopItemIndexes.length}`);
      console.log(`  • Total MyJstudyroomItem indexes: ${myJstudyroomIndexes.length}`);
      console.log(`  • All required indexes: ✓ Present`);
      return true;
    } else {
      console.log('❌ Some required indexes are missing!');
      return false;
    }

  } catch (error) {
    console.error('❌ Error verifying indexes:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run verification
verifyIndexes()
  .then((success) => {
    if (success) {
      console.log('\n✨ Index verification complete!');
      process.exit(0);
    } else {
      console.log('\n💥 Index verification failed!');
      process.exit(1);
    }
  })
  .catch((error) => {
    console.error('\n💥 Verification error:', error);
    process.exit(1);
  });
