#!/usr/bin/env tsx

/**
 * Admin cleanup script for orphaned my_jstudyroom_items
 * Removes MyJstudyroom items where:
 * 1. BookShopItem no longer exists
 * 2. Underlying Document no longer exists
 * 3. BookShopItem is unpublished
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function cleanupOrphanedItems() {
  console.log('🧹 Starting cleanup of orphaned MyJstudyroom items...');

  try {
    // Find orphaned items where BookShopItem doesn't exist
    const orphanedByBookshop = await prisma.myJstudyroomItem.findMany({
      where: {
        bookShopItem: null
      },
      select: {
        id: true,
        userId: true,
        bookShopItemId: true
      }
    });

    console.log(`Found ${orphanedByBookshop.length} items with missing BookShopItem`);

    // Find orphaned items where underlying Document doesn't exist
    const orphanedByDocument = await prisma.myJstudyroomItem.findMany({
      where: {
        bookShopItem: {
          document: null
        }
      },
      include: {
        bookShopItem: {
          select: {
            id: true,
            title: true
          }
        }
      }
    });

    console.log(`Found ${orphanedByDocument.length} items with missing underlying Document`);

    // Find items where BookShopItem is unpublished
    const unpublishedItems = await prisma.myJstudyroomItem.findMany({
      where: {
        bookShopItem: {
          isPublished: false
        }
      },
      include: {
        bookShopItem: {
          select: {
            id: true,
            title: true,
            isPublished: true
          }
        }
      }
    });

    console.log(`Found ${unpublishedItems.length} items with unpublished BookShopItem`);

    // Collect all orphaned item IDs
    const allOrphanedIds = [
      ...orphanedByBookshop.map(item => item.id),
      ...orphanedByDocument.map(item => item.id),
      ...unpublishedItems.map(item => item.id)
    ];

    // Remove duplicates
    const uniqueOrphanedIds = [...new Set(allOrphanedIds)];

    if (uniqueOrphanedIds.length === 0) {
      console.log('✅ No orphaned items found. Database is clean!');
      return;
    }

    console.log(`\n📊 Summary of orphaned items to be cleaned up:`);
    console.log(`- Missing BookShopItem: ${orphanedByBookshop.length}`);
    console.log(`- Missing Document: ${orphanedByDocument.length}`);
    console.log(`- Unpublished BookShopItem: ${unpublishedItems.length}`);
    console.log(`- Total unique orphaned items: ${uniqueOrphanedIds.length}`);

    // Delete orphaned items
    const deleteResult = await prisma.myJstudyroomItem.deleteMany({
      where: {
        id: {
          in: uniqueOrphanedIds
        }
      }
    });

    console.log(`\n✅ Cleanup completed successfully!`);
    console.log(`Deleted ${deleteResult.count} orphaned MyJstudyroom items`);

    // Verify cleanup
    const remainingOrphaned = await prisma.myJstudyroomItem.count({
      where: {
        OR: [
          { bookShopItem: null },
          { bookShopItem: { document: null } },
          { bookShopItem: { isPublished: false } }
        ]
      }
    });

    if (remainingOrphaned === 0) {
      console.log('✅ Verification passed: No orphaned items remain');
    } else {
      console.log(`⚠️  Warning: ${remainingOrphaned} orphaned items still exist`);
    }

  } catch (error) {
    console.error('❌ Error during cleanup:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the cleanup if this script is executed directly
if (require.main === module) {
  cleanupOrphanedItems()
    .then(() => {
      console.log('🎉 Cleanup script completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Cleanup script failed:', error);
      process.exit(1);
    });
}

export { cleanupOrphanedItems };