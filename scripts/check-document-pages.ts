import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkDocumentPages() {
  try {
    const documents = await prisma.document.findMany({
      select: {
        id: true,
        title: true,
        filename: true,
        mimeType: true,
        _count: {
          select: {
            pages: true
          }
        }
      },
      take: 5
    });
    
    console.log('Documents and their page counts:');
    documents.forEach(doc => {
      console.log(`- ${doc.title || doc.filename}: ${doc._count.pages} pages (${doc.mimeType})`);
    });
    
    const totalPages = await prisma.documentPage.count();
    console.log(`\nTotal document pages in database: ${totalPages}`);
    
    if (totalPages > 0) {
      const samplePages = await prisma.documentPage.findMany({
        take: 3,
        select: {
          id: true,
          documentId: true,
          pageNumber: true,
          pageUrl: true
        }
      });
      
      console.log('\nSample pages:');
      samplePages.forEach(page => {
        console.log(`- Document ${page.documentId}, Page ${page.pageNumber}: ${page.pageUrl ? 'Has page URL' : 'No page URL'}`);
      });
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkDocumentPages();