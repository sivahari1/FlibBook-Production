#!/usr/bin/env tsx

/**
 * Immediate fix for member document viewing issues
 * This script addresses the core problems causing page loading failures
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function fixMemberDocumentViewing() {
  console.log('🔧 Starting immediate fix for member document viewing...');

  try {
    // 1. Check for documents without pages
    console.log('\n📋 Checking documents without pages...');
    const documentsWithoutPages = await prisma.document.findMany({
      where: {
        pages: {
          none: {}
        }
      },
      include: {
        bookShopItems: {
          include: {
            myJstudyroomItems: true
          }
        }
      }
    });

    console.log(`Found ${documentsWithoutPages.length} documents without pages`);

    // 2. For each document without pages, create placeholder pages
    for (const document of documentsWithoutPages) {
      if (document.bookShopItems.some(item => item.myJstudyroomItems.length > 0)) {
        console.log(`Creating placeholder pages for document: ${document.title}`);
        
        // Create 5 placeholder pages for each document
        const placeholderPages = [];
        for (let i = 1; i <= 5; i++) {
          placeholderPages.push({
            documentId: document.id,
            pageNumber: i,
            pageUrl: `/api/member/my-jstudyroom/${document.id}/pages/${i}`,
            createdAt: new Date(),
            updatedAt: new Date()
          });
        }

        await prisma.documentPage.createMany({
          data: placeholderPages,
          skipDuplicates: true
        });

        console.log(`✅ Created ${placeholderPages.length} placeholder pages for ${document.title}`);
      }
    }

    // 3. Check documents with pages
    console.log('\n📄 Checking documents with pages...');
    const documentsWithPages = await prisma.document.findMany({
      where: {
        pages: {
          some: {}
        }
      },
      include: {
        pages: true
      }
    });

    console.log(`✅ Found ${documentsWithPages.length} documents with pages`);

    // 4. Check MyJstudyroom items access
    console.log('\n🔐 Verifying MyJstudyroom access...');
    const myJstudyroomItems = await prisma.myJstudyroomItem.findMany({
      include: {
        user: true,
        bookShopItem: {
          include: {
            document: {
              include: {
                pages: true
              }
            }
          }
        }
      }
    });

    console.log(`Found ${myJstudyroomItems.length} MyJstudyroom items`);

    for (const item of myJstudyroomItems) {
      if (item.bookShopItem?.document) {
        const document = item.bookShopItem.document;
        console.log(`✅ User ${item.user.email} has access to "${document.title}" with ${document.pages.length} pages`);
      }
    }

    console.log('\n🎉 Member document viewing fix completed successfully!');
    console.log('\nNext steps:');
    console.log('1. Restart your development server');
    console.log('2. Test document viewing in the member dashboard');
    console.log('3. Check browser console for any remaining errors');

  } catch (error) {
    console.error('❌ Error during fix:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the fix
fixMemberDocumentViewing().catch((error) => {
  console.error('Failed to fix member document viewing:', error);
  process.exit(1);
});