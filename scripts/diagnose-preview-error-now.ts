import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function diagnosePreviewError() {
  try {
    console.log('🔍 Diagnosing Preview Error...\n');

    // Get all documents
    const documents = await prisma.document.findMany({
      include: {
        pages: {
          orderBy: { pageNumber: 'asc' },
          take: 3
        }
      }
    });

    console.log(`📄 Found ${documents.length} document(s)\n`);

    for (const doc of documents) {
      console.log(`\n📋 Document: ${doc.title}`);
      console.log(`   ID: ${doc.id}`);
      console.log(`   Type: ${doc.contentType}`);
      console.log(`   Status: ${doc.status}`);
      console.log(`   Pages: ${doc.pages.length}`);
      
      if (doc.pages.length > 0) {
        console.log(`\n   First 3 pages:`);
        doc.pages.forEach(page => {
          console.log(`   - Page ${page.pageNumber}: ${page.imageUrl?.substring(0, 80)}...`);
        });
      }

      // Check if document has proper structure for preview
      if (doc.contentType === 'PDF' && doc.status === 'CONVERTED') {
        console.log(`\n   ✅ Document ready for preview`);
        console.log(`   📍 Preview URL: /dashboard/documents/${doc.id}/view?watermark=false`);
      } else {
        console.log(`\n   ⚠️  Document may not be ready:`);
        console.log(`      - Type: ${doc.contentType}`);
        console.log(`      - Status: ${doc.status}`);
      }
    }

    console.log('\n✅ Diagnosis complete');

  } catch (error) {
    console.error('❌ Error during diagnosis:', error);
  } finally {
    await prisma.$disconnect();
  }
}

diagnosePreviewError();
