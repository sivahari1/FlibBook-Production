import { prisma } from '../lib/db';

async function testPagesAPI() {
  console.log('🔍 Testing Pages API Data\n');

  const documentId = '915f8e20-4826-4cb7-9744-611cc7316c6e';

  // Check what's in the database
  const pages = await prisma.documentPage.findMany({
    where: { documentId },
    orderBy: { pageNumber: 'asc' },
  });

  console.log(`Found ${pages.length} pages in database:\n`);

  pages.forEach((page) => {
    console.log(`Page ${page.pageNumber}:`);
    console.log(`  URL: ${page.pageUrl}`);
    console.log(`  Expires: ${page.expiresAt}`);
    console.log(`  Size: ${page.fileSize} bytes\n`);
  });

  await prisma.$disconnect();
}

testPagesAPI().catch(console.error);
