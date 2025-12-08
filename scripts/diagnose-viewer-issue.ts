import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function diagnoseViewerIssue() {
  try {
    console.log('🔍 Diagnosing viewer issue...\n');

    // Get the most recent document
    const document = await prisma.document.findFirst({
      where: {
        contentType: 'PDF',
      },
      orderBy: {
        createdAt: 'desc',
      },
      include: {
        pages: {
          orderBy: {
            pageNumber: 'asc',
          },
        },
      },
    });

    if (!document) {
      console.log('❌ No PDF documents found');
      return;
    }

    console.log('📄 Document:', {
      id: document.id,
      title: document.title,
      contentType: document.contentType,
      pageCount: document.pages.length,
    });

    if (document.pages.length === 0) {
      console.log('\n⚠️  Document has no pages! It needs to be converted.');
      console.log('Run: npm run convert-document', document.id);
      return;
    }

    console.log('\n📑 Pages:');
    document.pages.slice(0, 3).forEach((page) => {
      console.log(`  Page ${page.pageNumber}:`, {
        url: page.pageUrl.substring(0, 80) + '...',
        dimensions: page.dimensions,
      });
    });

    console.log('\n✅ Document has pages and should display correctly');
    console.log('\n🔗 View URL:');
    console.log(`   http://localhost:3000/dashboard/documents/${document.id}/view`);
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

diagnoseViewerIssue();
