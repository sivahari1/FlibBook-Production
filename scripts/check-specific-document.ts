import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkDocument() {
  const documentId = '164fbf91-9471-4d88-96a0-2dfc6611a282';
  
  try {
    const document = await prisma.document.findUnique({
      where: { id: documentId },
      include: {
        pages: {
          orderBy: {
            pageNumber: 'asc',
          },
        },
      },
    });

    if (!document) {
      console.log('❌ Document not found');
      return;
    }

    console.log('📄 Document:', {
      id: document.id,
      title: document.title,
      contentType: document.contentType,
      pageCount: document.pages.length,
    });

    if (document.pages.length > 0) {
      console.log('\n📑 First 3 pages:');
      document.pages.slice(0, 3).forEach((page) => {
        console.log(`\nPage ${page.pageNumber}:`);
        console.log('  URL:', page.pageUrl);
        console.log('  Dimensions:', page.dimensions);
      });
    }
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkDocument();
