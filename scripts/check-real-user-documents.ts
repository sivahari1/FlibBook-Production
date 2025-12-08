import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkRealDocuments() {
  console.log('🔍 Checking REAL user documents (excluding test data)...\n');

  try {
    // Get documents for the logged-in user (sivaramj83@gmail.com)
    const realUser = await prisma.user.findUnique({
      where: { email: 'sivaramj83@gmail.com' },
      include: {
        documents: {
          orderBy: { createdAt: 'desc' },
          include: {
            pages: {
              select: {
                pageNumber: true,
                pageUrl: true
              },
              take: 1
            }
          }
        }
      }
    });

    if (!realUser) {
      console.log('❌ User not found');
      return;
    }

    console.log(`📧 User: ${realUser.email}`);
    console.log(`📄 Total documents: ${realUser.documents.length}\n`);

    for (const doc of realUser.documents) {
      console.log(`\n📄 ${doc.filename}`);
      console.log(`   ID: ${doc.id}`);
      console.log(`   Type: ${doc.contentType}`);
      console.log(`   Storage: ${doc.storagePath}`);
      console.log(`   Size: ${doc.fileSize.toString()} bytes`);
      console.log(`   Created: ${doc.createdAt}`);
      
      if (doc.pages.length > 0) {
        console.log(`   ✅ HAS PAGES - ${doc.pages.length} page(s) converted`);
        console.log(`   First page: ${doc.pages[0].pageUrl.substring(0, 80)}...`);
      } else {
        console.log(`   ❌ NO PAGES - Not converted for preview`);
      }
    }

    const convertedCount = realUser.documents.filter(d => d.pages.length > 0).length;
    const unconvertedCount = realUser.documents.filter(d => d.pages.length === 0).length;

    console.log(`\n\n📊 Summary for ${realUser.email}:`);
    console.log(`   Total documents: ${realUser.documents.length}`);
    console.log(`   ✅ Converted (can preview): ${convertedCount}`);
    console.log(`   ❌ Not converted (cannot preview): ${unconvertedCount}`);

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkRealDocuments();
