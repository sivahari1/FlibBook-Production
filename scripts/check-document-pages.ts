import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkDocumentPages() {
  console.log('🔍 Checking document pages...\n');

  try {
    // Get all documents
    const documents = await prisma.document.findMany({
      select: {
        id: true,
        filename: true,
        contentType: true,
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: 10
    });

    console.log(`Found ${documents.length} documents\n`);

    for (const doc of documents) {
      console.log(`📄 Document: ${doc.filename} (${doc.id})`);
      console.log(`   Type: ${doc.contentType}`);

      // Check if document_pages exist
      const pages = await prisma.documentPage.findMany({
        where: {
          documentId: doc.id
        },
        orderBy: {
          pageNumber: 'asc'
        }
      });

      if (pages.length > 0) {
        console.log(`   ✅ Has ${pages.length} pages converted`);
        console.log(`   First page URL: ${pages[0].imageUrl?.substring(0, 50)}...`);
      } else {
        console.log(`   ❌ NO PAGES - Document not converted!`);
      }
      console.log('');
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkDocumentPages();
