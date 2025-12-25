import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function listAvailableDocuments() {
  try {
    console.log('📋 Listing available documents and MyJstudyroomItems...\n');
    
    // List all documents
    const documents = await prisma.document.findMany({
      select: { 
        id: true, 
        title: true, 
        filename: true,
        contentType: true,
        createdAt: true 
      },
      orderBy: { createdAt: 'desc' },
      take: 10
    });
    
    console.log('📄 Recent Documents:');
    documents.forEach((doc, index) => {
      console.log(`${index + 1}. ID: ${doc.id}`);
      console.log(`   Title: ${doc.title}`);
      console.log(`   Filename: ${doc.filename}`);
      console.log(`   Type: ${doc.contentType}`);
      console.log(`   Created: ${doc.createdAt}`);
      console.log('');
    });
    
    // List MyJstudyroomItems
    const items = await prisma.myJstudyroomItem.findMany({
      include: {
        bookShopItem: {
          include: {
            document: {
              select: { id: true, title: true, filename: true }
            }
          }
        }
      },
      orderBy: { addedAt: 'desc' },
      take: 10
    });
    
    console.log('🎒 Recent MyJstudyroomItems:');
    items.forEach((item, index) => {
      console.log(`${index + 1}. Item ID: ${item.id}`);
      console.log(`   BookShop Title: ${item.bookShopItem.title}`);
      console.log(`   Document ID: ${item.bookShopItem.document?.id || 'N/A'}`);
      console.log(`   Document Title: ${item.bookShopItem.document?.title || 'N/A'}`);
      console.log(`   Added: ${item.addedAt}`);
      console.log('');
    });
    
    // Check for documents with pages
    const documentsWithPages = await prisma.document.findMany({
      where: {
        pages: {
          some: {}
        }
      },
      select: { 
        id: true, 
        title: true,
        _count: {
          select: { pages: true }
        }
      },
      take: 5
    });
    
    console.log('📄 Documents with pages:');
    documentsWithPages.forEach((doc, index) => {
      console.log(`${index + 1}. ID: ${doc.id}`);
      console.log(`   Title: ${doc.title}`);
      console.log(`   Pages: ${doc._count.pages}`);
      console.log('');
    });
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

listAvailableDocuments();