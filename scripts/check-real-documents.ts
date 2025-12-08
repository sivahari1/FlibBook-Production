import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkRealDocuments() {
  console.log('🔍 Checking REAL user documents (not test data)...\n');

  try {
    // Get documents from real users (not test users)
    const realDocs = await prisma.document.findMany({
      where: {
        user: {
          email: {
            not: {
              contains: 'test-'
            }
          }
        }
      },
      include: {
        user: {
          select: {
            email: true
          }
        },
        pages: {
          select: {
            pageNumber: true,
            pageUrl: true
          },
          take: 1
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    console.log(`Found ${realDocs.length} REAL documents (excluding test data)\n`);

    for (const doc of realDocs) {
      console.log(`📄 ${doc.filename}`);
      console.log(`   Owner: ${doc.user.email}`);
      console.log(`   Type: ${doc.contentType}`);
      console.log(`   Size: ${(Number(doc.fileSize) / 1024).toFixed(2)} KB`);
      console.log(`   Storage: ${doc.storagePath}`);
      console.log(`   Created: ${doc.createdAt.toISOString()}`);
      
      if (doc.pages.length > 0) {
        console.log(`   ✅ HAS PAGES - Converted for preview`);
        console.log(`   Sample page URL: ${doc.pages[0].pageUrl.substring(0, 60)}...`);
      } else {
        console.log(`   ❌ NO PAGES - Not converted, preview won't work`);
      }
      console.log('');
    }

    // Check if there are actual PDF files in storage
    console.log('\n📊 Summary:');
    const withPages = realDocs.filter(d => d.pages.length > 0).length;
    const withoutPages = realDocs.filter(d => d.pages.length === 0).length;
    console.log(`   Documents with pages (working preview): ${withPages}`);
    console.log(`   Documents without pages (broken preview): ${withoutPages}`);

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkRealDocuments();
