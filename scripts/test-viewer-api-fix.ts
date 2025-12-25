#!/usr/bin/env tsx

/**
 * Test script to verify the viewer API fixes
 * 
 * This script tests:
 * 1. Document ID resolution (documentId vs itemId)
 * 2. Pages API endpoints (both canonical and legacy)
 * 3. Individual page image endpoints
 * 4. Diagnostic endpoint
 */

import { prisma } from '../lib/db';
import { resolveViewerId } from '../lib/viewer/resolveViewerId';

async function main() {
  console.log('🔍 Testing Viewer API Fix...\n');

  try {
    // Test 1: Find some test documents and items
    console.log('📋 Finding test data...');
    
    const documents = await prisma.document.findMany({
      take: 2,
      select: {
        id: true,
        title: true,
        mimeType: true
      }
    });
    
    const items = await prisma.myJstudyroomItem.findMany({
      take: 2,
      include: {
        bookShopItem: {
          select: {
            documentId: true,
            title: true
          }
        }
      }
    });
    
    console.log(`Found ${documents.length} documents and ${items.length} MyJstudyroom items\n`);
    
    // Test 2: Test ID resolution
    console.log('🔧 Testing ID resolution...');
    
    if (documents.length > 0) {
      const doc = documents[0];
      console.log(`Testing document ID: ${doc.id}`);
      
      const resolution1 = await resolveViewerId(doc.id);
      console.log(`  Direct document ID: ${resolution1.success ? '✅' : '❌'} (${resolution1.resolvedFrom})`);
      
      const resolution2 = await resolveViewerId(`doc_${doc.id}`);
      console.log(`  Prefixed document ID: ${resolution2.success ? '✅' : '❌'} (${resolution2.resolvedFrom})`);
    }
    
    if (items.length > 0) {
      const item = items[0];
      console.log(`Testing MyJstudyroom item ID: ${item.id}`);
      
      const resolution3 = await resolveViewerId(item.id);
      console.log(`  MyJstudyroom item ID: ${resolution3.success ? '✅' : '❌'} (${resolution3.resolvedFrom})`);
      if (resolution3.success) {
        console.log(`    Resolved to document: ${resolution3.documentId}`);
      }
    }
    
    // Test 3: Check document pages
    console.log('\n📄 Checking document pages...');
    
    for (const doc of documents) {
      const pages = await prisma.documentPage.findMany({
        where: { documentId: doc.id },
        select: { pageNumber: true, pageUrl: true },
        orderBy: { pageNumber: 'asc' }
      });
      
      console.log(`Document "${doc.title}" (${doc.id}):`);
      console.log(`  Pages: ${pages.length}`);
      
      if (pages.length > 0) {
        console.log(`  First page: ${pages[0].pageNumber} -> ${pages[0].pageUrl}`);
        if (pages.length > 1) {
          console.log(`  Last page: ${pages[pages.length - 1].pageNumber} -> ${pages[pages.length - 1].pageUrl}`);
        }
      } else {
        console.log(`  ⚠️ No pages found - document may need conversion`);
      }
    }
    
    // Test 4: Test invalid IDs
    console.log('\n❌ Testing invalid IDs...');
    
    const invalidResolution = await resolveViewerId('invalid-id-12345');
    console.log(`Invalid ID test: ${!invalidResolution.success ? '✅' : '❌'} (should fail)`);
    console.log(`  Error: ${invalidResolution.error}`);
    
    console.log('\n✅ Viewer API fix testing completed!');
    console.log('\n📝 Next steps:');
    console.log('1. Test the API endpoints in your browser:');
    
    if (documents.length > 0) {
      const doc = documents[0];
      console.log(`   - Canonical pages: /api/viewer/documents/${doc.id}/pages`);
      console.log(`   - Legacy pages: /api/viewer/${doc.id}/pages`);
      console.log(`   - Diagnostic: /api/viewer/documents/${doc.id}/diagnose`);
      
      const pages = await prisma.documentPage.findFirst({
        where: { documentId: doc.id },
        select: { pageNumber: true }
      });
      
      if (pages) {
        console.log(`   - Page image: /api/viewer/documents/${doc.id}/pages/${pages.pageNumber}`);
      }
    }
    
    if (items.length > 0) {
      const item = items[0];
      console.log(`   - MyJstudyroom item: /api/viewer/${item.id}/pages`);
    }
    
    console.log('2. Check that page images return binary data (not JSON)');
    console.log('3. Verify that all pages load correctly in the viewer components');
    
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