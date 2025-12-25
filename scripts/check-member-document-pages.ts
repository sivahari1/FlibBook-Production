import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkDocumentPages() {
  try {
    // Get a sample document with pages
    const document = await prisma.document.findFirst({
      include: {
        pages: {
          take: 3,
          orderBy: { pageNumber: 'asc' }
        }
      },
      where: {
        pages: {
          some: {}
        }
      }
    });
    
    if (document) {
      console.log('Document found:', document.title);
      console.log('Pages count:', document.pages.length);
      console.log('Sample pages:', document.pages.map(p => ({
        pageNumber: p.pageNumber,
        imageUrl: p.imageUrl ? 'Has imageUrl' : 'No imageUrl',
        storagePath: p.storagePath ? 'Has storagePath' : 'No storagePath'
      })));
    } else {
      console.log('No documents with pages found');
    }
    
    // Check MyJstudyroom items
    const myJstudyroomItems = await prisma.myJstudyroomItem.findMany({
      take: 3,
      include: {
        bookShopItem: {
          include: {
            document: {
              include: {
                pages: {
                  take: 1
                }
              }
            }
          }
        }
      }
    });
    
    console.log('MyJstudyroom items:', myJstudyroomItems.length);
    myJstudyroomItems.forEach(item => {
      console.log('Item:', item.bookShopItem.title, 'Pages:', item.bookShopItem.document.pages.length);
    });
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkDocumentPages();