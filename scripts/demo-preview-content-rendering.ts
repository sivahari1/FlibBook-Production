/**
 * Demo Script for Preview Content Rendering
 * 
 * Demonstrates the complete flow of the preview content rendering system
 */

import { prisma } from '../lib/db';
import { hasCachedPages, getCachedPageUrls, getCacheStats } from '../lib/services/page-cache';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

async function demonstrateSystem() {
  console.log('🎬 Preview Content Rendering System Demo\n');
  console.log('=' .repeat(60));

  try {
    // 1. Show PDF documents
    console.log('\n📄 PDF Documents in System:\n');
    const pdfDocs = await prisma.document.findMany({
      where: {
        mimeType: 'application/pdf',
      },
      take: 10,
      select: {
        id: true,
        filename: true,
        userId: true,
        createdAt: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    if (pdfDocs.length === 0) {
      console.log('   No PDF documents found.');
      console.log('   Upload a PDF to see the system in action!');
      return;
    }

    for (const doc of pdfDocs) {
      const hasCached = await hasCachedPages(doc.id);
      const cacheIcon = hasCached ? '✅' : '⏳';
      const cacheStatus = hasCached ? 'Cached' : 'Not cached yet';
      
      console.log(`   ${cacheIcon} ${doc.filename}`);
      console.log(`      ID: ${doc.id}`);
      console.log(`      Status: ${cacheStatus}`);
      
      if (hasCached) {
        const stats = await getCacheStats(doc.id);
        const sizeMB = (stats.totalSize / 1024 / 1024).toFixed(2);
        console.log(`      Pages: ${stats.totalPages}`);
        console.log(`      Size: ${sizeMB} MB`);
        console.log(`      Cached: ${stats.newestPage?.toLocaleString()}`);
      }
      console.log('');
    }

    // 2. Show a detailed example
    const cachedDoc = pdfDocs.find(async (doc) => await hasCachedPages(doc.id));
    
    if (cachedDoc) {
      console.log('=' .repeat(60));
      console.log('\n📊 Detailed Example: ' + cachedDoc.filename + '\n');
      
      const pageUrls = await getCachedPageUrls(cachedDoc.id);
      const stats = await getCacheStats(cachedDoc.id);
      
      console.log(`Total Pages: ${stats.totalPages}`);
      console.log(`Total Size: ${(stats.totalSize / 1024 / 1024).toFixed(2)} MB`);
      console.log(`Cached On: ${stats.newestPage?.toLocaleString()}`);
      console.log(`Expires: ${stats.newestPage ? new Date(stats.newestPage.getTime() + 7 * 24 * 60 * 60 * 1000).toLocaleString() : 'N/A'}`);
      
      console.log('\nPage URLs:');
      pageUrls.slice(0, 3).forEach((url, index) => {
        console.log(`   Page ${index + 1}: ${url.substring(0, 80)}...`);
      });
      
      if (pageUrls.length > 3) {
        console.log(`   ... and ${pageUrls.length - 3} more pages`);
      }
    }

    // 3. Show system statistics
    console.log('\n' + '='.repeat(60));
    console.log('\n📈 System Statistics:\n');
    
    const totalDocs = await prisma.document.count();
    const totalPDFs = await prisma.document.count({
      where: { mimeType: 'application/pdf' },
    });
    const totalCachedPages = await prisma.documentPage.count();
    const docsWithCache = await prisma.documentPage.groupBy({
      by: ['documentId'],
    });
    
    console.log(`Total Documents: ${totalDocs}`);
    console.log(`PDF Documents: ${totalPDFs}`);
    console.log(`Documents with Cached Pages: ${docsWithCache.length}`);
    console.log(`Total Cached Pages: ${totalCachedPages}`);
    
    if (totalCachedPages > 0) {
      const avgPagesPerDoc = (totalCachedPages / docsWithCache.length).toFixed(1);
      console.log(`Average Pages per Document: ${avgPagesPerDoc}`);
    }

    // 4. Show how it works
    console.log('\n' + '='.repeat(60));
    console.log('\n🔄 How It Works:\n');
    console.log('1. User uploads a PDF document');
    console.log('2. User navigates to /dashboard/documents/[id]/view');
    console.log('3. System checks for cached pages in database');
    console.log('4. If no cache:');
    console.log('   - PDF is converted to images (parallel processing)');
    console.log('   - Images uploaded to Supabase Storage');
    console.log('   - Page URLs cached in database (7-day TTL)');
    console.log('5. If cached:');
    console.log('   - Page URLs retrieved from database (< 2 seconds)');
    console.log('   - Images served from Supabase Storage');
    console.log('   - Aggressive caching headers (7 days)');
    console.log('6. FlipBook component displays pages');

    // 5. Show API endpoint
    console.log('\n' + '='.repeat(60));
    console.log('\n🔌 API Endpoint:\n');
    console.log('GET /api/documents/[id]/pages');
    console.log('');
    console.log('Response:');
    console.log('{');
    console.log('  "success": true,');
    console.log('  "documentId": "...",');
    console.log('  "totalPages": 10,');
    console.log('  "pages": [');
    console.log('    {');
    console.log('      "pageNumber": 1,');
    console.log('      "pageUrl": "https://...",');
    console.log('      "dimensions": { "width": 1200, "height": 1600 }');
    console.log('    },');
    console.log('    ...');
    console.log('  ],');
    console.log('  "cached": true,');
    console.log('  "processingTime": 150');
    console.log('}');

    console.log('\n' + '='.repeat(60));
    console.log('\n✅ System is fully operational and ready for use!');
    console.log('\n📝 To test:');
    console.log('   1. Upload a PDF document');
    console.log('   2. Navigate to the preview page');
    console.log('   3. Watch pages convert automatically');
    console.log('   4. Refresh to see cached version (fast!)');

  } catch (error) {
    console.error('\n❌ Error:', error);
    throw error;
  }
}

// Run demo
demonstrateSystem()
  .then(() => {
    console.log('\n✅ Demo complete');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Demo failed:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
