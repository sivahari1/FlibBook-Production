import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function findConvertedDocs() {
  console.log('🔍 Looking for ANY documents with pages...\n');

  try {
    // Count total documents
    const totalDocs = await prisma.document.count();
    console.log(`Total documents in database: ${totalDocs}`);

    // Count documents with pages
    const docsWithPages = await prisma.document.findMany({
      where: {
        pages: {
          some: {}
        }
      },
      include: {
        pages: {
          select: {
            pageNumber: true,
            pageUrl: true
          },
          orderBy: {
            pageNumber: 'asc'
          },
          take: 3
        }
      }
    });

    console.log(`Documents with pages: ${docsWithPages.length}\n`);

    if (docsWithPages.length > 0) {
      console.log('✅ Found converted documents:');
      for (const doc of docsWithPages) {
        console.log(`\n📄 ${doc.filename} (${doc.id})`);
        console.log(`   Pages: ${doc.pages.length}`);
        if (doc.pages.length > 0) {
          console.log(`   Sample URL: ${doc.pages[0].pageUrl}`);
        }
      }
    } else {
      console.log('❌ NO DOCUMENTS HAVE BEEN CONVERTED TO PAGES!');
      console.log('\nThis means:');
      console.log('  1. Documents were uploaded but never processed');
      console.log('  2. The conversion API was never called');
      console.log('  3. Preview will not work until documents are converted');
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

findConvertedDocs();
