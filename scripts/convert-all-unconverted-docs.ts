import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function convertAllDocuments() {
  console.log('🔄 Finding unconverted documents...\n');

  try {
    // Find all PDF documents without pages
    const unconvertedDocs = await prisma.document.findMany({
      where: {
        contentType: 'PDF',
        pages: {
          none: {}
        }
      },
      select: {
        id: true,
        filename: true,
        storagePath: true
      }
    });

    console.log(`Found ${unconvertedDocs.length} documents to convert\n`);

    if (unconvertedDocs.length === 0) {
      console.log('✅ All documents are already converted!');
      return;
    }

    let successCount = 0;
    let failCount = 0;

    for (let i = 0; i < unconvertedDocs.length; i++) {
      const doc = unconvertedDocs[i];
      console.log(`[${i + 1}/${unconvertedDocs.length}] Converting: ${doc.filename}`);

      try {
        // Call the conversion API
        const response = await fetch('http://localhost:3000/api/documents/convert', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            documentId: doc.id,
            storagePath: doc.storagePath
          })
        });

        if (response.ok) {
          const result = await response.json();
          console.log(`   ✅ Success - ${result.pageCount} pages created`);
          successCount++;
        } else {
          const error = await response.text();
          console.log(`   ❌ Failed: ${error}`);
          failCount++;
        }
      } catch (error) {
        console.log(`   ❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
        failCount++;
      }

      // Small delay to avoid overwhelming the server
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    console.log(`\n📊 Conversion Summary:`);
    console.log(`   ✅ Successful: ${successCount}`);
    console.log(`   ❌ Failed: ${failCount}`);
    console.log(`   📄 Total: ${unconvertedDocs.length}`);

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

console.log('⚠️  Make sure your Next.js dev server is running on http://localhost:3000');
console.log('   Run: npm run dev\n');

convertAllDocuments();
