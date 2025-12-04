import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkTable() {
  console.log('🔍 Checking document_pages table...\n');

  try {
    // Check if table exists and get structure
    const result = await prisma.$queryRaw`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'document_pages'
      ORDER BY ordinal_position;
    `;

    console.log('✅ document_pages table structure:');
    console.log(result);

    // Check row count
    const count = await prisma.$queryRaw`SELECT COUNT(*) FROM "document_pages"`;
    console.log('\n📊 Row count:', count);

    // Try to query using Prisma model
    console.log('\n🔍 Testing Prisma model access...');
    const pages = await prisma.documentPage.findMany({
      take: 5,
      select: {
        id: true,
        documentId: true,
        pageNumber: true,
        pageUrl: true,
      }
    });
    console.log('✅ Prisma model works! Found', pages.length, 'pages');
    if (pages.length > 0) {
      console.log('Sample page:', pages[0]);
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkTable();
