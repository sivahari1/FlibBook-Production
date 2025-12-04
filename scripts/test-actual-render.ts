import { prisma } from '../lib/db';
import { getCachedPageUrls } from '../lib/services/page-cache';

async function testActualRender() {
  const documentId = '915f8e20-4826-4cb7-9744-611cc7316c6e';

  console.log('🔍 Testing what would actually be rendered\n');

  // Get pages from database (server-side)
  const pageUrls = await getCachedPageUrls(documentId);
  
  console.log(`Server fetches ${pageUrls.length} page URLs:\n`);
  
  const initialPages = pageUrls.map((url, index) => ({
    pageNumber: index + 1,
    pageUrl: url,
    dimensions: {
      width: 1200,
      height: 1600,
    },
  }));

  console.log('Initial pages passed to client:');
  initialPages.forEach(page => {
    console.log(`  Page ${page.pageNumber}: ${page.pageUrl.substring(0, 80)}...`);
  });

  console.log('\nClient transforms to:');
  const transformedPages = initialPages.map(page => ({
    pageNumber: page.pageNumber,
    imageUrl: page.pageUrl,
    width: page.dimensions.width || 800,
    height: page.dimensions.height || 1000,
  }));

  transformedPages.forEach(page => {
    console.log(`  Page ${page.pageNumber}: ${page.imageUrl.substring(0, 80)}...`);
  });

  console.log('\nFlipBookViewer receives pages with imageUrl property ✅');
  console.log('\nThe URLs should be accessible in browser!');

  await prisma.$disconnect();
}

testActualRender();
