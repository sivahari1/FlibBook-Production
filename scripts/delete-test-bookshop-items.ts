import { prisma } from '../lib/db';

async function deleteTestBookshopItems() {
  console.log('Deleting test bookshop items...\n');

  try {
    // Find all test bookshop items (those with "Test" in the title or "Test Category")
    const testItems = await prisma.bookShopItem.findMany({
      where: {
        OR: [
          { title: { contains: 'Test', mode: 'insensitive' } },
          { category: { contains: 'Test Category', mode: 'insensitive' } }
        ]
      },
      include: {
        document: true
      }
    });

    console.log(`Found ${testItems.length} test items to delete\n`);

    // Delete each test item
    for (const item of testItems) {
      console.log(`Deleting: ${item.title} (${item.category})`);
      
      // Delete the bookshop item
      await prisma.bookShopItem.delete({
        where: { id: item.id }
      });
      
      console.log(`  ✓ Deleted bookshop item`);
    }

    console.log(`\n✅ Successfully deleted ${testItems.length} test bookshop items`);

    // Show remaining items
    const remainingItems = await prisma.bookShopItem.count();
    console.log(`\nRemaining bookshop items: ${remainingItems}`);

  } catch (error) {
    console.error('Error deleting test bookshop items:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

deleteTestBookshopItems();
