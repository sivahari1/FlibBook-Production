#!/usr/bin/env tsx

/**
 * Check document pages structure
 */

import { prisma } from '../lib/db';

async function checkDocumentPagesStructure() {
  try {
    console.log('🔍 Checking document pages structure...');

    // Get a sample document page
    const samplePage = await prisma.documentPage.findFirst({
      where: {
        documentId: '27b35557-868f-4faa-b66d-4a28d65e6ab7'
      }
    });

    if (!samplePage) {
      console.log('❌ No document pages found');
      return;
    }

    console.log('📄 Sample page structure:');
    console.log(JSON.stringify(samplePage, null, 2));

    // Check all pages for this document
    const allPages = await prisma.documentPage.findMany({
      where: {
        documentId: '27b35557-868f-4faa-b66d-4a28d65e6ab7'
      },
      orderBy: {
        pageNumber: 'asc'
      }
    });

    console.log(`\n📑 Found ${allPages.length} pages:`);
    allPages.forEach((page, index) => {
      console.log(`   Page ${page.pageNumber}: ${page.pageUrl}`);
    });

    // Check if pageUrl contains actual storage paths or API endpoints
    const hasStoragePaths = allPages.some(page => 
      page.pageUrl && !page.pageUrl.startsWith('/api/')
    );

    if (!hasStoragePaths) {
      console.log('\n⚠️ ISSUE FOUND: All pageUrl values are API endpoints, not storage paths!');
      console.log('💡 This means signed URL generation will fail.');
      console.log('🔧 Need to update pages with actual storage paths.');
    } else {
      console.log('\n✅ Pages have proper storage paths');
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkDocumentPagesStructure();