#!/usr/bin/env tsx

/**
 * Diagnostic script to check why uploaded free documents aren't appearing in bookshop
 */

import { prisma } from '../lib/db';

async function diagnoseBookshopVisibility() {
  console.log('🔍 Diagnosing bookshop visibility issues...\n');

  try {
    // 1. Check all bookshop items
    console.log('📚 All BookShop Items:');
    const allBookshopItems = await prisma.bookShopItem.findMany({
      include: {
        document: {
          select: {
            id: true,
            title: true,
            contentType: true,
            userId: true,
            createdAt: true,
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    console.log(`Total bookshop items: ${allBookshopItems.length}\n`);

    allBookshopItems.forEach((item, index) => {
      console.log(`${index + 1}. ${item.title}`);
      console.log(`   ID: ${item.id}`);
      console.log(`   Document ID: ${item.documentId}`);
      console.log(`   Category: ${item.category}`);
      console.log(`   Price: ₹${item.price}`);
      console.log(`   Is Free: ${item.isFree}`);
      console.log(`   Is Published: ${item.isPublished}`);
      console.log(`   Content Type: ${item.contentType}`);
      console.log(`   Created: ${item.createdAt}`);
      console.log(`   Document Title: ${item.document?.title || 'N/A'}`);
      console.log(`   Document User ID: ${item.document?.userId || 'N/A'}`);
      console.log('');
    });

    // 2. Check published items specifically
    console.log('✅ Published BookShop Items:');
    const publishedItems = await prisma.bookShopItem.findMany({
      where: {
        isPublished: true
      },
      include: {
        document: {
          select: {
            id: true,
            title: true,
            contentType: true,
            userId: true,
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    console.log(`Published items: ${publishedItems.length}\n`);

    publishedItems.forEach((item, index) => {
      console.log(`${index + 1}. ${item.title} (₹${item.price}${item.isFree ? ' - FREE' : ''})`);
      console.log(`   Category: ${item.category}`);
      console.log(`   Created: ${item.createdAt}`);
      console.log('');
    });

    // 3. Check free items specifically
    console.log('🆓 Free BookShop Items:');
    const freeItems = await prisma.bookShopItem.findMany({
      where: {
        isFree: true
      },
      include: {
        document: {
          select: {
            id: true,
            title: true,
            contentType: true,
            userId: true,
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    console.log(`Free items: ${freeItems.length}\n`);

    freeItems.forEach((item, index) => {
      console.log(`${index + 1}. ${item.title}`);
      console.log(`   Price: ₹${item.price}`);
      console.log(`   Is Published: ${item.isPublished}`);
      console.log(`   Category: ${item.category}`);
      console.log(`   Created: ${item.createdAt}`);
      console.log('');
    });

    // 4. Check recent documents that might have been uploaded
    console.log('📄 Recent Documents (last 10):');
    const recentDocs = await prisma.document.findMany({
      take: 10,
      orderBy: {
        createdAt: 'desc'
      },
      select: {
        id: true,
        title: true,
        contentType: true,
        userId: true,
        createdAt: true,
        bookShopItems: {
          select: {
            id: true,
            title: true,
            price: true,
            isFree: true,
            isPublished: true,
            category: true,
          }
        }
      }
    });

    recentDocs.forEach((doc, index) => {
      console.log(`${index + 1}. ${doc.title}`);
      console.log(`   Document ID: ${doc.id}`);
      console.log(`   Content Type: ${doc.contentType}`);
      console.log(`   Created: ${doc.createdAt}`);
      console.log(`   User ID: ${doc.userId}`);
      
      if (doc.bookShopItems.length > 0) {
        console.log(`   📚 BookShop Items:`);
        doc.bookShopItems.forEach((item, itemIndex) => {
          console.log(`      ${itemIndex + 1}. ${item.title} (₹${item.price}${item.isFree ? ' - FREE' : ''})`);
          console.log(`         Published: ${item.isPublished}`);
          console.log(`         Category: ${item.category}`);
        });
      } else {
        console.log(`   📚 No BookShop Items`);
      }
      console.log('');
    });

    // 5. Check for any database inconsistencies
    console.log('🔧 Database Consistency Check:');
    
    // Check for bookshop items without documents
    const orphanedBookshopItems = await prisma.bookShopItem.findMany({
      where: {
        document: null
      }
    });

    if (orphanedBookshopItems.length > 0) {
      console.log(`⚠️  Found ${orphanedBookshopItems.length} orphaned bookshop items (no document):`);
      orphanedBookshopItems.forEach(item => {
        console.log(`   - ${item.title} (ID: ${item.id}, Document ID: ${item.documentId})`);
      });
    } else {
      console.log('✅ No orphaned bookshop items found');
    }

    // Check for documents with bookshop items that aren't published
    const unpublishedBookshopItems = await prisma.bookShopItem.findMany({
      where: {
        isPublished: false
      },
      include: {
        document: {
          select: {
            title: true,
            userId: true,
          }
        }
      }
    });

    if (unpublishedBookshopItems.length > 0) {
      console.log(`\n📝 Found ${unpublishedBookshopItems.length} unpublished bookshop items:`);
      unpublishedBookshopItems.forEach(item => {
        console.log(`   - ${item.title} (Document: ${item.document?.title})`);
      });
    } else {
      console.log('\n✅ All bookshop items are published');
    }

  } catch (error) {
    console.error('❌ Error during diagnosis:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the diagnosis
diagnoseBookshopVisibility().catch(console.error);