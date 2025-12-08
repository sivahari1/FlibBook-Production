import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function diagnosePreviewIssue() {
  console.log('🔍 Diagnosing Preview Issue...\n');

  try {
    // Get the most recent document
    const recentDoc = await prisma.document.findFirst({
      orderBy: { createdAt: 'desc' },
      include: {
        user: {
          select: { email: true, name: true }
        }
      }
    });

    if (!recentDoc) {
      console.log('❌ No documents found in database');
      return;
    }

    console.log('📄 Most Recent Document:');
    console.log(`   ID: ${recentDoc.id}`);
    console.log(`   Title: ${recentDoc.title}`);
    console.log(`   Content Type: ${recentDoc.contentType}`);
    console.log(`   File Path: ${recentDoc.filePath}`);
    console.log(`   Owner: ${recentDoc.user.email}`);
    console.log(`   Created: ${recentDoc.createdAt}\n`);

    // Check if document has been converted
    if (recentDoc.contentType === 'PDF') {
      const pages = await prisma.documentPage.findMany({
        where: { documentId: recentDoc.id },
        orderBy: { pageNumber: 'asc' },
        take: 3
      });

      console.log(`📑 Document Pages: ${pages.length} pages found`);
      
      if (pages.length === 0) {
        console.log('⚠️  ISSUE FOUND: PDF has not been converted to pages!');
        console.log('   This is why preview is not working.\n');
        console.log('💡 Solution: Run conversion for this document');
        console.log(`   Document ID: ${recentDoc.id}\n`);
      } else {
        console.log('✅ Pages exist. Checking page URLs...\n');
        
        pages.forEach((page, idx) => {
          console.log(`   Page ${page.pageNumber}:`);
          console.log(`      Has URL: ${!!page.imageUrl}`);
          console.log(`      URL Length: ${page.imageUrl?.length || 0}`);
          if (idx === 0 && page.imageUrl) {
            console.log(`      URL Preview: ${page.imageUrl.substring(0, 80)}...`);
          }
        });
      }
    }

    console.log('\n📊 Summary:');
    console.log(`   Document Type: ${recentDoc.contentType}`);
    console.log(`   File exists: ${!!recentDoc.filePath}`);
    
    if (recentDoc.contentType === 'PDF') {
      const pageCount = await prisma.documentPage.count({
        where: { documentId: recentDoc.id }
      });
      console.log(`   Pages converted: ${pageCount > 0 ? 'YES' : 'NO'}`);
      console.log(`   Page count: ${pageCount}`);
    }

  } catch (error) {
    console.error('❌ Error during diagnosis:', error);
  } finally {
    await prisma.$disconnect();
  }
}

diagnosePreviewIssue();
