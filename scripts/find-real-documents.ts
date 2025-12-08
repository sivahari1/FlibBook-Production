import { prisma } from '@/lib/db';
import { getSignedUrl } from '@/lib/storage';

/**
 * Find real (non-test) documents in the database
 */

async function findRealDocuments() {
  console.log('=== Finding Real Documents ===\n');

  try {
    // Find documents that are NOT test documents
    const realDocuments = await prisma.document.findMany({
      where: {
        AND: [
          {
            mimeType: 'application/pdf',
          },
          {
            NOT: {
              id: {
                contains: 'test-pbt',
              },
            },
          },
          {
            NOT: {
              filename: {
                startsWith: 'test',
              },
            },
          },
        ],
      },
      select: {
        id: true,
        title: true,
        filename: true,
        storagePath: true,
        contentType: true,
        userId: true,
        createdAt: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 10,
    });

    if (realDocuments.length === 0) {
      console.log('❌ No real PDF documents found');
      console.log('\nYou need to upload a real PDF document to test the preview feature.');
      console.log('\nSteps to upload a document:');
      console.log('1. Go to http://localhost:3000/dashboard');
      console.log('2. Click the "Upload" button');
      console.log('3. Select a PDF file from your computer');
      console.log('4. Wait for the upload to complete');
      console.log('5. Click on the document to preview it');
      return;
    }

    console.log(`✅ Found ${realDocuments.length} real PDF documents\n`);

    // Check each document
    for (const doc of realDocuments) {
      console.log(`\n--- Document: ${doc.title} ---`);
      console.log(`ID: ${doc.id}`);
      console.log(`Filename: ${doc.filename}`);
      console.log(`Storage Path: ${doc.storagePath}`);
      console.log(`Created: ${doc.createdAt}`);

      // Test signed URL
      if (doc.storagePath) {
        const { url, error } = await getSignedUrl(doc.storagePath, 3600, 'documents');
        
        if (error) {
          console.log(`❌ Signed URL error: ${error}`);
        } else if (url) {
          console.log(`✅ Signed URL generated`);
          
          // Test accessibility
          try {
            const response = await fetch(url, { method: 'HEAD' });
            if (response.ok) {
              console.log(`✅ File is accessible`);
              console.log(`   Content-Type: ${response.headers.get('content-type')}`);
              console.log(`   Content-Length: ${response.headers.get('content-length')} bytes`);
              console.log(`\n📄 Preview URL: http://localhost:3000/dashboard/documents/${doc.id}/view`);
            } else {
              console.log(`❌ File not accessible: ${response.status} ${response.statusText}`);
            }
          } catch (fetchError) {
            console.log(`❌ Fetch error: ${fetchError instanceof Error ? fetchError.message : String(fetchError)}`);
          }
        }
      }
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

findRealDocuments()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Error:', error);
    process.exit(1);
  });
