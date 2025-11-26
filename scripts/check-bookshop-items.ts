import { prisma } from '../lib/db';

async function checkBookShopItems() {
  try {
    console.log('Checking BookShop items...\n');

    // Get all bookshop items
    const items = await prisma.bookShopItem.findMany({
      include: {
        document: {
          select: {
            id: true,
            title: true,
            contentType: true,
            linkUrl: true,
            filename: true
          }
        }
      }
    });

    console.log(`Total BookShop items: ${items.length}\n`);

    if (items.length === 0) {
      console.log('No items found in BookShop!');
      console.log('\nChecking if there are any documents...');
      
      const documents = await prisma.document.findMany({
        select: {
          id: true,
          title: true,
          contentType: true,
          linkUrl: true,
          createdAt: true
        },
        orderBy: {
          createdAt: 'desc'
        },
        take: 5
      });

      console.log(`\nFound ${documents.length} recent documents:`);
      documents.forEach((doc, i) => {
        console.log(`${i + 1}. ${doc.title} (${doc.contentType}) - ${doc.linkUrl || 'file'}`);
      });
    } else {
      items.forEach((item, i) => {
        console.log(`${i + 1}. ${item.title}`);
        console.log(`   Category: ${item.category}`);
        console.log(`   Content Type: ${item.contentType || 'N/A'}`);
        console.log(`   Published: ${item.isPublished}`);
        console.log(`   Free: ${item.isFree}`);
        console.log(`   Price: ${item.price ? `₹${item.price / 100}` : 'Free'}`);
        console.log(`   Document: ${item.document.title} (${item.document.contentType})`);
        if (item.document.linkUrl) {
          console.log(`   Link: ${item.document.linkUrl}`);
        }
        console.log('');
      });
    }

    await prisma.$disconnect();
  } catch (error) {
    console.error('Error:', error);
    await prisma.$disconnect();
    process.exit(1);
  }
}

checkBookShopItems();
