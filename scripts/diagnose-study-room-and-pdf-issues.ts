#!/usr/bin/env tsx

/**
 * Diagnostic Script: Study Room and PDF Issues
 * 
 * This script diagnoses two main issues:
 * 1. "Add to My Study Room" button not working
 * 2. PDF preview issues
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🔍 Diagnosing Study Room and PDF Issues...\n');

  try {
    // 1. Check if ma10-rn01 document exists
    console.log('1. Checking for ma10-rn01 document...');
    const document = await prisma.document.findFirst({
      where: {
        OR: [
          { title: { contains: 'ma10-rn01', mode: 'insensitive' } },
          { filename: { contains: 'ma10-rn01', mode: 'insensitive' } }
        ]
      },
      include: {
        bookShopItems: true
      }
    });

    if (!document) {
      console.log('❌ Document ma10-rn01 not found');
      
      // List all documents to help identify the correct one
      const allDocs = await prisma.document.findMany({
        select: {
          id: true,
          title: true,
          filename: true,
          contentType: true
        },
        orderBy: { createdAt: 'desc' },
        take: 10
      });
      
      console.log('\n📋 Recent documents:');
      allDocs.forEach(doc => {
        console.log(`  - ${doc.title} (${doc.filename}) - ${doc.contentType}`);
      });
    } else {
      console.log('✅ Document found:', {
        id: document.id,
        title: document.title,
        filename: document.filename,
        contentType: document.contentType,
        bookShopItems: document.bookShopItems.length
      });

      // 2. Check if document has bookshop items
      if (document.bookShopItems.length === 0) {
        console.log('❌ Document has no bookshop items - this is the issue!');
        console.log('   The document needs to be added to the bookshop first');
      } else {
        console.log('✅ Document has bookshop items:', document.bookShopItems.length);
        
        // Check bookshop item details
        for (const item of document.bookShopItems) {
          const bookshopItem = await prisma.bookShopItem.findUnique({
            where: { id: item.id },
            include: {
              myJstudyroomItems: true
            }
          });
          
          console.log(`  📦 Bookshop Item: ${bookshopItem?.title}`);
          console.log(`     - Published: ${bookshopItem?.isPublished}`);
          console.log(`     - Free: ${bookshopItem?.isFree}`);
          console.log(`     - Price: ${bookshopItem?.price}`);
          console.log(`     - In Study Rooms: ${bookshopItem?.myJstudyroomItems.length}`);
        }
      }

      // 3. Check PDF conversion status
      if (document.contentType === 'PDF') {
        console.log('\n3. Checking PDF conversion status...');
        
        const pages = await prisma.documentPage.findMany({
          where: { documentId: document.id },
          orderBy: { pageNumber: 'asc' }
        });

        if (pages.length === 0) {
          console.log('❌ No document pages found - PDF not converted!');
          console.log('   This explains the PDF preview issues');
        } else {
          console.log(`✅ Found ${pages.length} document pages`);
          
          // Check if pages have valid URLs
          let validPages = 0;
          let invalidPages = 0;
          
          for (const page of pages.slice(0, 3)) { // Check first 3 pages
            if (page.imageUrl && page.imageUrl.trim() !== '') {
              validPages++;
            } else {
              invalidPages++;
            }
          }
          
          console.log(`   - Valid pages: ${validPages}`);
          console.log(`   - Invalid pages: ${invalidPages}`);
          
          if (invalidPages > 0) {
            console.log('⚠️  Some pages have missing image URLs');
          }
        }
      }
    }

    // 4. Check user's study room status
    console.log('\n4. Checking user study room status...');
    const users = await prisma.user.findMany({
      where: {
        userRole: 'MEMBER'
      },
      include: {
        myJstudyroomItems: {
          include: {
            bookShopItem: true
          }
        }
      },
      take: 5
    });

    console.log(`Found ${users.length} members:`);
    users.forEach(user => {
      console.log(`  👤 ${user.email}:`);
      console.log(`     - Study room items: ${user.myJstudyroomItems.length}`);
      console.log(`     - Free count: ${user.freeDocumentCount}`);
      console.log(`     - Paid count: ${user.paidDocumentCount}`);
    });

    // 5. Check API endpoint accessibility
    console.log('\n5. Testing API endpoints...');
    
    // Test bookshop API
    try {
      const bookshopItems = await prisma.bookShopItem.findMany({
        where: { isPublished: true },
        take: 1
      });
      console.log(`✅ Bookshop API accessible - ${bookshopItems.length} published items`);
    } catch (error) {
      console.log('❌ Bookshop API error:', error);
    }

    // 6. Check for any recent errors in the database
    console.log('\n6. Checking for recent issues...');
    
    // Check if there are any unpublished bookshop items
    const unpublishedItems = await prisma.bookShopItem.count({
      where: { isPublished: false }
    });
    
    if (unpublishedItems > 0) {
      console.log(`⚠️  Found ${unpublishedItems} unpublished bookshop items`);
    }

    // Check for documents without bookshop items
    const docsWithoutBookshop = await prisma.document.count({
      where: {
        bookShopItems: {
          none: {}
        }
      }
    });
    
    if (docsWithoutBookshop > 0) {
      console.log(`⚠️  Found ${docsWithoutBookshop} documents not in bookshop`);
    }

  } catch (error) {
    console.error('❌ Error during diagnosis:', error);
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  main().catch(console.error);
}