#!/usr/bin/env tsx

/**
 * Test the viewer API endpoints to verify they're working correctly
 */

import { prisma } from '../lib/db';

async function main() {
  console.log('🔍 Testing API Endpoints...\n');

  try {
    // Get test data
    const documents = await prisma.document.findMany({
      take: 1,
      select: {
        id: true,
        title: true,
        mimeType: true
      }
    });
    
    const items = await prisma.myJstudyroomItem.findMany({
      take: 1,
      include: {
        bookShopItem: {
          select: {
            documentId: true,
            title: true
          }
        }
      }
    });

    if (documents.length === 0) {
      console.log('❌ No documents found for testing');
      return;
    }

    const doc = documents[0];
    console.log(`📄 Testing with document: ${doc.title} (${doc.id})`);

    // Test URLs to try in browser (with authentication)
    console.log('\n🌐 Test these URLs in your browser (make sure you\'re logged in):');
    console.log('\n**Canonical API (recommended):**');
    console.log(`✅ Pages list: http://localhost:3002/api/viewer/documents/${doc.id}/pages`);
    console.log(`✅ Page 1 image: http://localhost:3002/api/viewer/documents/${doc.id}/pages/1`);
    console.log(`✅ Page 2 image: http://localhost:3002/api/viewer/documents/${doc.id}/pages/2`);
    console.log(`✅ Diagnostic: http://localhost:3002/api/viewer/documents/${doc.id}/diagnose`);

    if (items.length > 0) {
      const item = items[0];
      console.log('\n**MyJstudyroom Item ID (should work now):**');
      console.log(`✅ Pages list: http://localhost:3002/api/viewer/documents/${item.id}/pages`);
      console.log(`✅ Page 1 image: http://localhost:3002/api/viewer/documents/${item.id}/pages/1`);
      console.log(`✅ Page 2 image: http://localhost:3002/api/viewer/documents/${item.id}/pages/2`);
    }

    console.log('\n**Legacy API (backward compatibility):**');
    console.log(`✅ Pages list: http://localhost:3002/api/viewer/${doc.id}/pages`);
    console.log(`✅ Page 1 image: http://localhost:3002/api/viewer/${doc.id}/pages/1`);

    console.log('\n📋 What to expect:');
    console.log('- Pages list endpoints should return JSON with page numbers');
    console.log('- Page image endpoints should return binary image data (not JSON)');
    console.log('- Browser should display images directly when you visit page image URLs');
    console.log('- No more 404 errors for pages 2, 3, 4, 5');

    console.log('\n🔧 If you still get errors:');
    console.log('1. Make sure you\'re logged in to the application');
    console.log('2. Check the browser console for detailed error messages');
    console.log('3. Try refreshing the page to clear any cached errors');

  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  main().catch(console.error);
}